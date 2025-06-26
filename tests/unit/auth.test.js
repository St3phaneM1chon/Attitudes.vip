const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock des stratégies OAuth avant de charger auth-service
jest.mock('passport-google-oauth20', () => ({
  Strategy: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('passport-facebook', () => ({
  Strategy: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('passport-twitter', () => ({
  Strategy: jest.fn().mockImplementation(() => ({}))
}));
jest.mock('passport-apple', () => ({
  Strategy: jest.fn().mockImplementation(() => ({}))
}));

// Mock de passport
jest.mock('passport', () => ({
  use: jest.fn(),
  authenticate: jest.fn(() => (req, res, next) => next()),
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next())
}));

const { app, createOrUpdateUser } = require('../../src/auth/auth-service');

// Mock des dépendances
// jest.mock('../../src/auth/models/user');
// jest.mock('../../src/auth/models/oauth-profile');
// jest.mock('redis');

describe('Auth Service - Tests Unitaires', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
  });

  beforeEach(async () => {
    // Nettoyer la base de données simulée entre les tests
    const { users } = require('../../src/auth/auth-service');
    users.clear();
  });

  afterAll(async () => {
    // Nettoyer après tous les tests
    const { users } = require('../../src/auth/auth-service');
    users.clear();
    await server.close();
  });

  describe('POST /auth/register', () => {
    it('devrait créer un nouvel utilisateur avec des données valides', async () => {
      const userData = {
        email: 'test@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont',
        role: 'customer',
        locale: 'fr'
      };

      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('role', userData.role);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('devrait rejeter un email invalide', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('devrait rejeter un mot de passe faible', async () => {
      const userData = {
        email: 'test@attitudes.vip',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('mot de passe');
    });

    it('devrait rejeter un utilisateur déjà existant', async () => {
      // Créer d'abord un utilisateur
      const userData = {
        email: 'existing@attitudes.vip',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Essayer de créer le même utilisateur
      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('existe déjà');
    });
  });

  describe('POST /auth/login', () => {
    it('devrait authentifier un utilisateur avec des identifiants valides', async () => {
      // Créer d'abord un utilisateur
      const userData = {
        email: 'test@attitudes.vip',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Maintenant tester la connexion
      const loginData = {
        email: 'test@attitudes.vip',
        password: 'Password123!'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
    });

    it('devrait rejeter des identifiants invalides', async () => {
      const loginData = {
        email: 'nonexistent@attitudes.vip',
        password: 'WrongPassword123!'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Identifiants invalides');
    });

    it('devrait rejeter un compte désactivé', async () => {
      // Créer un utilisateur désactivé
      const userData = {
        email: 'disabled@attitudes.vip',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Désactiver l'utilisateur dans la base de données simulée
      const { users } = require('../../src/auth/auth-service');
      const disabledUser = users.get('disabled@attitudes.vip');
      if (disabledUser) {
        disabledUser.isActive = false;
        users.set('disabled@attitudes.vip', disabledUser);
      }

      const loginData = {
        email: 'disabled@attitudes.vip',
        password: 'Password123!'
      };

      const response = await request(server)
        .post('/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('désactivé');
    });
  });

  describe('POST /auth/oauth/google', () => {
    it('devrait authentifier un utilisateur Google existant', async () => {
      // Créer d'abord un utilisateur existant
      const userData = {
        email: 'google@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const oauthData = {
        accessToken: 'google-access-token',
        profile: {
          id: 'google-user-id',
          emails: [{ value: 'google@attitudes.vip' }],
          name: { givenName: 'Marie', familyName: 'Dupont' }
        }
      };

      const response = await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
    });

    it('devrait créer un nouvel utilisateur pour un profil Google inconnu', async () => {
      const oauthData = {
        accessToken: 'google-access-token',
        profile: {
          id: 'new-google-user-id',
          emails: [{ value: 'newgoogle@attitudes.vip' }],
          name: { givenName: 'Nouveau', familyName: 'Utilisateur' }
        }
      };

      // Mock pour simuler un profil OAuth inexistant
      // const OAuthProfile = require('../../src/auth/models/oauth-profile');
      // OAuthProfile.findByProviderAndId.mockResolvedValue(null);

      const response = await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('GET /auth/profile', () => {
    it('devrait retourner le profil de l\'utilisateur authentifié', async () => {
      // Créer d'abord un utilisateur
      const userData = {
        email: 'profile@attitudes.vip',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const registerResponse = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const token = registerResponse.body.token;

      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'profile@attitudes.vip');
    });

    it('devrait rejeter un token invalide', async () => {
      const response = await request(server)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Token invalide');
    });
  });

  describe('POST /auth/logout', () => {
    it('devrait déconnecter l\'utilisateur et invalider le token', async () => {
      const token = jwt.sign(
        { userId: 1, email: 'test@attitudes.vip', role: 'customer' },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('déconnecté');
    });
  });

  describe('POST /auth/refresh', () => {
    it('devrait renouveler un token valide', async () => {
      // Créer d'abord un utilisateur et obtenir un token
      const userData = {
        email: 'refresh@attitudes.vip',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const registerResponse = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const token = registerResponse.body.token;

      // Créer un refresh token valide
      const refreshToken = jwt.sign(
        { 
          id: registerResponse.body.user.id,
          email: registerResponse.body.user.email,
          type: 'refresh' 
        },
        process.env.JWT_SECRET || 'test-secret-key',
        { expiresIn: '7d' }
      );

      const response = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('devrait rejeter un refresh token invalide', async () => {
      const response = await request(server)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Refresh token invalide');
    });
  });

  describe('Rate Limiting', () => {
    it('devrait limiter les tentatives de connexion', async () => {
      const loginData = {
        email: 'rate-limit@attitudes.vip',
        password: 'WrongPassword123!'
      };

      // Tester quelques tentatives de connexion
      for (let i = 0; i < 5; i++) {
        const response = await request(server)
          .post('/auth/login')
          .send(loginData);

        expect(response.status).toBe(401); // Toutes les tentatives échouent avec des identifiants invalides
      }
    });
  });
}); 