const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { app } = require('../../src/auth/auth-service');

describe('Security Tests', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('Tests d\'injection SQL', () => {
    it('devrait rejeter les tentatives d\'injection SQL', async () => {
      const maliciousEmails = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin@test.com' UNION SELECT * FROM users --"
      ];

      for (const email of maliciousEmails) {
        const response = await request(server)
          .post('/auth/login')
          .send({
            email: email,
            password: 'Password123!'
          });

        expect(response.status).not.toBe(500);
        expect(response.status).toBeOneOf([400, 401, 403]);
      }
    });

    it('devrait rejeter les tentatives d\'injection SQL dans le mot de passe', async () => {
      const maliciousPasswords = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "password' UNION SELECT * FROM users --"
      ];

      for (const password of maliciousPasswords) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: 'test@attitudes.vip',
            password: password,
            firstName: 'Marie',
            lastName: 'Dupont'
          });

        expect(response.status).not.toBe(500);
        expect(response.status).toBeOneOf([400, 401, 403]);
      }
    });
  });

  describe('Tests XSS', () => {
    it('devrait échapper les scripts dans les champs', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: 'test@attitudes.vip',
            password: 'Password123!',
            firstName: payload,
            lastName: 'Dupont'
          });

        expect(response.status).not.toBe(500);
        
        if (response.status === 201) {
          expect(response.body.user.firstName).not.toContain('<script>');
        }
      }
    });

    it('devrait échapper les scripts dans les en-têtes HTTP', async () => {
      const maliciousHeaders = {
        'X-Forwarded-For': '<script>alert("XSS")</script>',
        'User-Agent': 'javascript:alert("XSS")',
        'Referer': '"><script>alert("XSS")</script>'
      };

      const response = await request(server)
        .get('/auth/profile')
        .set(maliciousHeaders)
        .set('Authorization', 'Bearer valid-token');

      // Le serveur devrait traiter la requête sans erreur
      expect(response.status).not.toBe(500);
    });
  });

  describe('Tests CSRF (Cross-Site Request Forgery)', () => {
    it('devrait rejeter les requêtes sans token CSRF', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          email: 'test@attitudes.vip',
          password: 'Password123!',
          firstName: 'Marie',
          lastName: 'Dupont'
        })
        .set('Origin', 'https://malicious-site.com');

      // Devrait rejeter la requête CSRF
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    });

    it('devrait accepter les requêtes avec un token CSRF valide', async () => {
      // Obtenir un token CSRF
      const csrfResponse = await request(server)
        .get('/auth/csrf-token');

      const csrfToken = csrfResponse.body.csrfToken;

      const response = await request(server)
        .post('/auth/register')
        .send({
          email: 'test@attitudes.vip',
          password: 'Password123!',
          firstName: 'Marie',
          lastName: 'Dupont'
        })
        .set('X-CSRF-Token', csrfToken)
        .set('Origin', 'https://attitudes.vip');

      expect(response.status).toBe(201);
    });
  });

  describe('Tests d\'authentification', () => {
    it('devrait rejeter les tokens JWT invalides', async () => {
      const invalidTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjF9.invalid-signature',
        ''
      ];

      for (const token of invalidTokens) {
        const response = await request(server)
          .get('/auth/profile')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toContain('Invalid token');
      }
    });

    it('devrait rejeter les tokens JWT expirés', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@attitudes.vip' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' } // Expire immédiatement
      );

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('expired');
    });

    it('devrait rejeter les tokens JWT avec une signature invalide', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: 1, email: 'test@attitudes.vip' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tokenWithWrongSecret}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('devrait valider les permissions des utilisateurs', async () => {
      // Créer un token pour un utilisateur customer
      const customerToken = jwt.sign(
        { userId: 1, email: 'customer@attitudes.vip', role: 'customer' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      // Tenter d'accéder à une route admin
      const response = await request(server)
        .get('/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Tests de mots de passe', () => {
    it('devrait rejeter les mots de passe faibles', async () => {
      const weakPasswords = [
        '123',
        'password',
        'qwerty',
        'abc123',
        '123456789',
        'password123',
        'admin',
        'letmein'
      ];

      for (const password of weakPasswords) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: 'test@attitudes.vip',
            password: password,
            firstName: 'Marie',
            lastName: 'Dupont'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      }
    });

    it('devrait accepter les mots de passe forts', async () => {
      const strongPasswords = [
        'Password123!',
        'MySecureP@ssw0rd',
        'Str0ng#P@ss!',
        'C0mpl3x!P@ssw0rd'
      ];

      for (const password of strongPasswords) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: `test-${Date.now()}@attitudes.vip`,
            password: password,
            firstName: 'Marie',
            lastName: 'Dupont'
          });

        expect(response.status).toBe(201);
      }
    });

    it('devrait hasher les mots de passe avec bcrypt', async () => {
      const password = 'Password123!';
      
      const response = await request(server)
        .post('/auth/register')
        .send({
          email: 'hash-test@attitudes.vip',
          password: password,
          firstName: 'Marie',
          lastName: 'Dupont'
        });

      expect(response.status).toBe(201);
      
      // Vérifier que le mot de passe a été hashé
      const User = require('../../src/auth/models/user');
      const user = await User.findByEmail('hash-test@attitudes.vip');
      
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[aby]\$\d{1,2}\$[./A-Za-z0-9]{53}$/); // Format bcrypt
      
      // Vérifier que le hash correspond au mot de passe
      const isValid = await bcrypt.compare(password, user.password);
      expect(isValid).toBe(true);
    });
  });

  describe('Tests de rate limiting', () => {
    it('devrait limiter les tentatives de connexion', async () => {
      const loginData = {
        email: 'rate-limit@attitudes.vip',
        password: 'WrongPassword123!'
      };

      // Effectuer plusieurs tentatives de connexion
      for (let i = 0; i < 6; i++) {
        const response = await request(server)
          .post('/auth/login')
          .send(loginData);

        if (i < 5) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
          expect(response.body.error).toContain('rate limit');
        }
      }
    });

    it('devrait limiter les tentatives d\'inscription', async () => {
      const registerData = {
        email: 'rate-limit-register@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      // Effectuer plusieurs tentatives d'inscription
      for (let i = 0; i < 6; i++) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            ...registerData,
            email: `rate-limit-register-${i}@attitudes.vip`
          });

        if (i < 5) {
          expect(response.status).toBe(201);
        } else {
          expect(response.status).toBe(429); // Too Many Requests
          expect(response.body.error).toContain('rate limit');
        }
      }
    });
  });

  describe('Tests d\'en-têtes de sécurité', () => {
    it('devrait inclure les en-têtes de sécurité', async () => {
      const response = await request(server)
        .get('/auth/login');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('devrait configurer correctement Content-Security-Policy', async () => {
      const response = await request(server)
        .get('/auth/login');

      const csp = response.headers['content-security-policy'];
      
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("img-src 'self'");
      expect(csp).toContain("connect-src 'self'");
    });
  });

  describe('Tests de validation des données', () => {
    it('devrait valider les formats d\'email', async () => {
      const invalidEmails = [
        'invalid-email',
        '@attitudes.vip',
        'test@',
        'test..test@attitudes.vip',
        'test@attitudes..vip',
        'test@attitudes.vip.',
        'test@attitudes.vip..'
      ];

      for (const email of invalidEmails) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: email,
            password: 'Password123!',
            firstName: 'Marie',
            lastName: 'Dupont'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      }
    });

    it('devrait valider les longueurs des champs', async () => {
      const longString = 'a'.repeat(1000);
      
      const response = await request(server)
        .post('/auth/register')
        .send({
          email: 'test@attitudes.vip',
          password: 'Password123!',
          firstName: longString,
          lastName: 'Dupont'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('length');
    });

    it('devrait rejeter les caractères dangereux', async () => {
      const dangerousChars = [
        '\x00', // Null byte
        '\x1a', // EOF
        '\x1b', // ESC
        '\x7f', // DEL
        '\x80', // Extended ASCII
        '\xff'  // Extended ASCII
      ];

      for (const char of dangerousChars) {
        const response = await request(server)
          .post('/auth/register')
          .send({
            email: 'test@attitudes.vip',
            password: 'Password123!',
            firstName: `Marie${char}`,
            lastName: 'Dupont'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('invalid');
      }
    });
  });

  describe('Tests de logs de sécurité', () => {
    it('devrait logger les tentatives d\'accès non autorisées', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(server)
        .get('/admin/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unauthorized access attempt')
      );

      consoleSpy.mockRestore();
    });

    it('devrait logger les tentatives d\'injection SQL', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await request(server)
        .post('/auth/login')
        .send({
          email: "'; DROP TABLE users; --",
          password: 'Password123!'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('SQL injection attempt')
      );

      consoleSpy.mockRestore();
    });

    it('devrait logger les tentatives XSS', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await request(server)
        .post('/auth/register')
        .send({
          email: 'test@attitudes.vip',
          password: 'Password123!',
          firstName: '<script>alert("XSS")</script>',
          lastName: 'Dupont'
        });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('XSS attempt')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Tests de chiffrement', () => {
    it('devrait chiffrer les données sensibles', async () => {
      const sensitiveData = {
        email: 'encrypted@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont',
        ssn: '123-45-6789' // Données sensibles
      };

      const response = await request(server)
        .post('/auth/register')
        .send(sensitiveData);

      expect(response.status).toBe(201);
      
      // Vérifier que les données sensibles sont chiffrées en base
      const User = require('../../src/auth/models/user');
      const user = await User.findByEmail(sensitiveData.email);
      
      expect(user.ssn).not.toBe(sensitiveData.ssn);
      expect(user.ssn).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 encoded
    });

    it('devrait utiliser HTTPS en production', async () => {
      const response = await request(server)
        .get('/auth/login');

      const hsts = response.headers['strict-transport-security'];
      
      if (process.env.NODE_ENV === 'production') {
        expect(hsts).toContain('max-age=31536000');
        expect(hsts).toContain('includeSubDomains');
      }
    });
  });
}); 