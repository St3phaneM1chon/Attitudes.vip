/**
 * Suite de tests de sécurité pour Attitudes.vip
 * Utilise OWASP ZAP et des tests personnalisés
 */

const axios = require('axios');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

describe('Security Test Suite', () => {
  let authToken;
  let testUser;

  before(async () => {
    // Créer un utilisateur de test
    testUser = {
      email: `security-test-${Date.now()}@test.com`,
      password: 'SecurePass123!@#',
      name: 'Security Tester'
    };

    try {
      await axios.post(`${API_BASE}/auth/register`, testUser);
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      authToken = loginRes.data.token;
    } catch (error) {
      console.error('Setup failed:', error.message);
    }
  });

  describe('1. Authentication Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'Password',
        'Password1',
        'Pass123'
      ];

      for (const password of weakPasswords) {
        try {
          await axios.post(`${API_BASE}/auth/register`, {
            email: `weak-${Date.now()}@test.com`,
            password,
            name: 'Test User'
          });
          throw new Error(`Weak password accepted: ${password}`);
        } catch (error) {
          expect(error.response.status).to.equal(400);
          expect(error.response.data.error).to.include('password');
        }
      }
    });

    it('should rate limit login attempts', async () => {
      const email = `ratelimit-${Date.now()}@test.com`;
      const attempts = [];

      // Faire 10 tentatives rapides
      for (let i = 0; i < 10; i++) {
        attempts.push(
          axios.post(`${API_BASE}/auth/login`, {
            email,
            password: 'wrong'
          }).catch(err => err.response)
        );
      }

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).to.be.true;
    });

    it('should not leak user existence on login', async () => {
      const nonExistent = await axios.post(`${API_BASE}/auth/login`, {
        email: 'nonexistent@test.com',
        password: 'Password123!'
      }).catch(err => err.response);

      const wrongPassword = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: 'WrongPassword123!'
      }).catch(err => err.response);

      expect(nonExistent.data.error).to.equal(wrongPassword.data.error);
    });

    it('should invalidate JWT on logout', async () => {
      // Logout
      await axios.post(`${API_BASE}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Tenter d'utiliser le token
      try {
        await axios.get(`${API_BASE}/users/me`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        throw new Error('Token still valid after logout');
      } catch (error) {
        expect(error.response.status).to.equal(401);
      }
    });

    it('should have secure JWT configuration', () => {
      const decoded = jwt.decode(authToken, { complete: true });
      
      // Vérifier l'algorithme
      expect(decoded.header.alg).to.be.oneOf(['HS256', 'RS256']);
      
      // Vérifier l'expiration
      expect(decoded.payload.exp).to.exist;
      const expiresIn = decoded.payload.exp - decoded.payload.iat;
      expect(expiresIn).to.be.at.most(86400); // Max 24h
    });
  });

  describe('2. Input Validation & Sanitization', () => {
    it('should prevent SQL injection', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "1; DROP TABLE users;--",
        "' UNION SELECT * FROM users--",
        "admin'--",
        "1' OR '1' = '1"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await axios.get(`${API_BASE}/vendors`, {
          params: { search: payload }
        }).catch(err => err.response);

        expect(response.status).to.not.equal(500);
        if (response.data.data) {
          expect(response.data.data).to.be.an('array');
        }
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await axios.post(`${API_BASE}/weddings`, {
          couple_names: payload,
          date: '2024-12-25',
          guest_count: 100
        }, {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => err.response);

        if (response.status === 201) {
          expect(response.data.data.couple_names).to.not.include('<script>');
          expect(response.data.data.couple_names).to.not.include('javascript:');
        }
      }
    });

    it('should prevent NoSQL injection', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' }
      ];

      for (const payload of noSqlPayloads) {
        const response = await axios.post(`${API_BASE}/auth/login`, {
          email: payload,
          password: 'test'
        }).catch(err => err.response);

        expect(response.status).to.be.oneOf([400, 401]);
      }
    });

    it('should validate file uploads', async () => {
      const maliciousFiles = [
        { name: 'test.php', type: 'application/x-php' },
        { name: 'test.exe', type: 'application/x-msdownload' },
        { name: '../../../etc/passwd', type: 'text/plain' }
      ];

      for (const file of maliciousFiles) {
        const formData = new FormData();
        formData.append('file', new Blob(['malicious'], { type: file.type }), file.name);

        const response = await axios.post(`${API_BASE}/upload`, formData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }).catch(err => err.response);

        expect(response.status).to.be.oneOf([400, 415]);
      }
    });
  });

  describe('3. Authorization & Access Control', () => {
    it('should enforce role-based access control', async () => {
      // Tenter d'accéder à des routes admin sans privilèges
      const adminRoutes = [
        '/api/v1/admin/users',
        '/api/v1/admin/stats',
        '/api/v1/admin/config'
      ];

      for (const route of adminRoutes) {
        const response = await axios.get(`${BASE_URL}${route}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }).catch(err => err.response);

        expect(response.status).to.equal(403);
      }
    });

    it('should prevent horizontal privilege escalation', async () => {
      // Créer un autre utilisateur
      const otherUser = {
        email: `other-${Date.now()}@test.com`,
        password: 'OtherPass123!',
        name: 'Other User'
      };

      const registerRes = await axios.post(`${API_BASE}/auth/register`, otherUser);
      const otherUserId = registerRes.data.user.id;

      // Tenter d'accéder aux données de l'autre utilisateur
      const response = await axios.get(`${API_BASE}/users/${otherUserId}/weddings`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).to.be.oneOf([403, 404]);
    });

    it('should validate object ownership', async () => {
      // Créer un wedding
      const weddingRes = await axios.post(`${API_BASE}/weddings`, {
        couple_names: 'Test Couple',
        date: '2024-12-25',
        guest_count: 100
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const weddingId = weddingRes.data.data.id;

      // Créer un autre utilisateur et essayer de modifier le wedding
      const otherToken = await createAndLoginUser();
      
      const response = await axios.put(`${API_BASE}/weddings/${weddingId}`, {
        guest_count: 200
      }, {
        headers: { Authorization: `Bearer ${otherToken}` }
      }).catch(err => err.response);

      expect(response.status).to.be.oneOf([403, 404]);
    });
  });

  describe('4. API Security Headers', () => {
    it('should have security headers', async () => {
      const response = await axios.get(`${API_BASE}/health`);
      const headers = response.headers;

      // Headers de sécurité essentiels
      expect(headers['x-content-type-options']).to.equal('nosniff');
      expect(headers['x-frame-options']).to.be.oneOf(['DENY', 'SAMEORIGIN']);
      expect(headers['x-xss-protection']).to.equal('1; mode=block');
      expect(headers['strict-transport-security']).to.exist;
      expect(headers['content-security-policy']).to.exist;
    });

    it('should not expose sensitive information', async () => {
      const response = await axios.get(`${API_BASE}/health`);
      const headers = response.headers;

      // Headers à ne pas exposer
      expect(headers['server']).to.not.match(/nginx\/[\d.]+/);
      expect(headers['x-powered-by']).to.not.exist;
    });

    it('should implement CORS properly', async () => {
      const response = await axios.options(`${API_BASE}/health`, {
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      }).catch(err => err.response);

      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin']).to.not.equal('*');
        expect(response.headers['access-control-allow-origin']).to.not.equal('https://malicious-site.com');
      }
    });
  });

  describe('5. Data Protection', () => {
    it('should hash passwords properly', async () => {
      // Cette vérification nécessiterait l'accès à la DB
      // On vérifie indirectement via l'API
      const oldPassword = 'OldPass123!@#';
      const newPassword = 'NewPass123!@#';

      // Changer le mot de passe
      await axios.post(`${API_BASE}/auth/change-password`, {
        oldPassword: testUser.password,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // L'ancien mot de passe ne doit plus fonctionner
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      }).catch(err => err.response);

      expect(response.status).to.equal(401);
    });

    it('should not expose sensitive data in responses', async () => {
      const response = await axios.get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const user = response.data.data;
      
      // Champs sensibles qui ne doivent pas être exposés
      expect(user.password).to.not.exist;
      expect(user.password_hash).to.not.exist;
      expect(user.reset_token).to.not.exist;
      expect(user.two_factor_secret).to.not.exist;
    });

    it('should encrypt sensitive data at rest', async () => {
      // Créer des données sensibles
      const paymentData = {
        card_number: '4242424242424242',
        cvv: '123',
        exp_month: 12,
        exp_year: 2025
      };

      const response = await axios.post(`${API_BASE}/payment-methods`, paymentData, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      if (response.status === 201) {
        // Les données sensibles ne doivent pas être retournées en clair
        expect(response.data.card_number).to.not.equal('4242424242424242');
        expect(response.data.cvv).to.not.exist;
      }
    });
  });

  describe('6. Session Security', () => {
    it('should timeout inactive sessions', async () => {
      // Ce test nécessiterait d'attendre le timeout réel
      // On vérifie la configuration à la place
      const decoded = jwt.decode(authToken);
      expect(decoded.exp - decoded.iat).to.be.at.most(86400); // Max 24h
    });

    it('should prevent session fixation', async () => {
      // Login deux fois avec le même compte
      const login1 = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      const login2 = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      // Les tokens doivent être différents
      expect(login1.data.token).to.not.equal(login2.data.token);
    });

    it('should invalidate all sessions on password change', async () => {
      const newPassword = 'NewSecurePass123!@#';
      
      // Changer le mot de passe
      await axios.post(`${API_BASE}/auth/change-password`, {
        oldPassword: testUser.password,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // L'ancien token ne doit plus fonctionner
      const response = await axios.get(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).to.equal(401);
    });
  });

  describe('7. API Rate Limiting', () => {
    it('should rate limit general API calls', async () => {
      const requests = [];
      
      // Faire 200 requêtes rapides
      for (let i = 0; i < 200; i++) {
        requests.push(
          axios.get(`${API_BASE}/vendors`).catch(err => err.response)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).to.be.above(0);
    });

    it('should have stricter limits for sensitive endpoints', async () => {
      const requests = [];
      
      // Faire 10 requêtes de reset password
      for (let i = 0; i < 10; i++) {
        requests.push(
          axios.post(`${API_BASE}/auth/forgot-password`, {
            email: `test${i}@test.com`
          }).catch(err => err.response)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).to.be.above(0);
    });
  });

  describe('8. Business Logic Security', () => {
    it('should prevent negative amounts in payments', async () => {
      const response = await axios.post(`${API_BASE}/payments`, {
        amount: -100,
        vendor_id: 'test-vendor',
        wedding_id: 'test-wedding'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).to.equal(400);
    });

    it('should validate date logic', async () => {
      // Créer un mariage dans le passé
      const response = await axios.post(`${API_BASE}/weddings`, {
        couple_names: 'Test Couple',
        date: '2020-01-01',
        guest_count: 100
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      }).catch(err => err.response);

      expect(response.status).to.equal(400);
    });

    it('should prevent race conditions in bookings', async () => {
      // Simuler des réservations simultanées
      const vendorId = 'test-vendor-id';
      const date = '2024-12-25';
      
      const bookings = [];
      for (let i = 0; i < 5; i++) {
        bookings.push(
          axios.post(`${API_BASE}/bookings`, {
            vendor_id: vendorId,
            date: date,
            wedding_id: `wedding-${i}`
          }, {
            headers: { Authorization: `Bearer ${authToken}` }
          }).catch(err => err.response)
        );
      }

      const responses = await Promise.all(bookings);
      const successful = responses.filter(r => r.status === 201);
      
      // Un seul booking devrait réussir pour la même date
      expect(successful.length).to.equal(1);
    });
  });
});

// Fonction helper pour créer et connecter un utilisateur
async function createAndLoginUser() {
  const user = {
    email: `test-${Date.now()}@test.com`,
    password: 'TestPass123!@#',
    name: 'Test User'
  };

  await axios.post(`${API_BASE}/auth/register`, user);
  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    email: user.email,
    password: user.password
  });

  return loginRes.data.token;
}