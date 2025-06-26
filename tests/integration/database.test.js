const request = require('supertest');
const { Pool } = require('pg');
const { app } = require('../../src/auth/auth-service');

describe('Database Integration Tests', () => {
  let server;
  let pool;

  beforeAll(async () => {
    server = app.listen(0);
    
    // Connexion à la base de données de test
    pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      database: process.env.TEST_DB_NAME || 'attitudes_vip_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password'
    });

    // Créer les tables de test
    await createTestTables();
  });

  afterAll(async () => {
    await server.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Nettoyer les données de test
    await cleanTestData();
  });

  async function createTestTables() {
    const client = await pool.connect();
    try {
      // Créer les tables de test
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'customer',
          tenant_id UUID,
          locale VARCHAR(10) DEFAULT 'fr',
          timezone VARCHAR(50) DEFAULT 'Europe/Paris',
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS oauth_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL,
          provider_user_id VARCHAR(255) NOT NULL,
          access_token TEXT,
          refresh_token TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          profile_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(provider, provider_user_id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          ip_address INET,
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } finally {
      client.release();
    }
  }

  async function cleanTestData() {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM sessions');
      await client.query('DELETE FROM oauth_profiles');
      await client.query('DELETE FROM users');
    } finally {
      client.release();
    }
  }

  describe('User Management', () => {
    it('devrait créer un utilisateur dans la base de données', async () => {
      const userData = {
        email: 'test@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont',
        role: 'customer'
      };

      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Vérifier que l'utilisateur existe en base
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [userData.email]
        );
        
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].email).toBe(userData.email);
        expect(result.rows[0].first_name).toBe(userData.firstName);
        expect(result.rows[0].last_name).toBe(userData.lastName);
        expect(result.rows[0].role).toBe(userData.role);
        expect(result.rows[0].is_active).toBe(true);
      } finally {
        client.release();
      }
    });

    it('devrait empêcher la création d\'un utilisateur avec un email dupliqué', async () => {
      const userData = {
        email: 'duplicate@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      // Créer le premier utilisateur
      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Tenter de créer un deuxième utilisateur avec le même email
      const response = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');

      // Vérifier qu'il n'y a qu'un seul utilisateur en base
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM users WHERE email = $1',
          [userData.email]
        );
        
        expect(parseInt(result.rows[0].count)).toBe(1);
      } finally {
        client.release();
      }
    });

    it('devrait authentifier un utilisateur et créer une session', async () => {
      const userData = {
        email: 'auth@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      // Créer l'utilisateur
      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      // Authentifier l'utilisateur
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');

      // Vérifier que la session a été créée en base
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1)',
          [userData.email]
        );
        
        expect(parseInt(result.rows[0].count)).toBeGreaterThan(0);
      } finally {
        client.release();
      }
    });

    it('devrait supprimer la session lors de la déconnexion', async () => {
      const userData = {
        email: 'logout@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      // Créer et authentifier l'utilisateur
      await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const token = loginResponse.body.token;

      // Déconnecter l'utilisateur
      await request(server)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Vérifier que la session a été supprimée
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = $1) AND is_active = true',
          [userData.email]
        );
        
        expect(parseInt(result.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });
  });

  describe('OAuth Integration', () => {
    it('devrait créer un profil OAuth pour un nouvel utilisateur Google', async () => {
      const oauthData = {
        accessToken: 'google-access-token',
        profile: {
          id: 'google-user-id-123',
          emails: [{ value: 'google@attitudes.vip' }],
          name: { givenName: 'Marie', familyName: 'Dupont' }
        }
      };

      const response = await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(201);

      // Vérifier que l'utilisateur et le profil OAuth ont été créés
      const client = await pool.connect();
      try {
        // Vérifier l'utilisateur
        const userResult = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [oauthData.profile.emails[0].value]
        );
        
        expect(userResult.rows).toHaveLength(1);
        expect(userResult.rows[0].email).toBe(oauthData.profile.emails[0].value);

        // Vérifier le profil OAuth
        const oauthResult = await client.query(
          'SELECT * FROM oauth_profiles WHERE provider = $1 AND provider_user_id = $2',
          ['google', oauthData.profile.id]
        );
        
        expect(oauthResult.rows).toHaveLength(1);
        expect(oauthResult.rows[0].provider).toBe('google');
        expect(oauthResult.rows[0].provider_user_id).toBe(oauthData.profile.id);
        expect(oauthResult.rows[0].access_token).toBe(oauthData.accessToken);
      } finally {
        client.release();
      }
    });

    it('devrait réutiliser un profil OAuth existant', async () => {
      const oauthData = {
        accessToken: 'google-access-token-updated',
        profile: {
          id: 'existing-google-user',
          emails: [{ value: 'existing@attitudes.vip' }],
          name: { givenName: 'Marie', familyName: 'Dupont' }
        }
      };

      // Créer le premier profil OAuth
      await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(201);

      // Réutiliser le même profil OAuth
      const response = await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(200);

      // Vérifier qu'il n'y a qu'un seul profil OAuth
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM oauth_profiles WHERE provider = $1 AND provider_user_id = $2',
          ['google', oauthData.profile.id]
        );
        
        expect(parseInt(result.rows[0].count)).toBe(1);
      } finally {
        client.release();
      }
    });
  });

  describe('Data Integrity', () => {
    it('devrait maintenir l\'intégrité référentielle lors de la suppression d\'un utilisateur', async () => {
      const userData = {
        email: 'delete@attitudes.vip',
        password: 'Password123!',
        firstName: 'Marie',
        lastName: 'Dupont'
      };

      // Créer l'utilisateur
      const registerResponse = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Créer une session
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      // Créer un profil OAuth
      const oauthData = {
        accessToken: 'test-token',
        profile: {
          id: 'test-oauth-id',
          emails: [{ value: userData.email }],
          name: { givenName: userData.firstName, familyName: userData.lastName }
        }
      };

      await request(server)
        .post('/auth/oauth/google')
        .send(oauthData)
        .expect(200);

      // Supprimer l'utilisateur (via une route admin)
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM users WHERE id = $1', [userId]);

        // Vérifier que les sessions ont été supprimées
        const sessionsResult = await client.query(
          'SELECT COUNT(*) FROM sessions WHERE user_id = $1',
          [userId]
        );
        expect(parseInt(sessionsResult.rows[0].count)).toBe(0);

        // Vérifier que les profils OAuth ont été supprimés
        const oauthResult = await client.query(
          'SELECT COUNT(*) FROM oauth_profiles WHERE user_id = $1',
          [userId]
        );
        expect(parseInt(oauthResult.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });

    it('devrait valider les contraintes de données', async () => {
      const client = await pool.connect();
      try {
        // Tenter d'insérer un utilisateur sans email (contrainte NOT NULL)
        await expect(
          client.query('INSERT INTO users (first_name, last_name) VALUES ($1, $2)', ['Marie', 'Dupont'])
        ).rejects.toThrow();

        // Tenter d'insérer un utilisateur avec un email invalide (contrainte UNIQUE)
        await client.query(
          'INSERT INTO users (email, first_name, last_name) VALUES ($1, $2, $3)',
          ['unique@attitudes.vip', 'Marie', 'Dupont']
        );

        await expect(
          client.query(
            'INSERT INTO users (email, first_name, last_name) VALUES ($1, $2, $3)',
            ['unique@attitudes.vip', 'Marie', 'Dupont']
          )
        ).rejects.toThrow();
      } finally {
        client.release();
      }
    });
  });

  describe('Performance', () => {
    it('devrait gérer efficacement les requêtes concurrentes', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const userData = {
          email: `concurrent${i}@attitudes.vip`,
          password: 'Password123!',
          firstName: 'Marie',
          lastName: 'Dupont'
        };

        promises.push(
          request(server)
            .post('/auth/register')
            .send(userData)
        );
      }

      const responses = await Promise.all(promises);

      // Vérifier que toutes les requêtes ont réussi
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Vérifier que tous les utilisateurs ont été créés
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM users WHERE email LIKE $1',
          ['concurrent%@attitudes.vip']
        );
        
        expect(parseInt(result.rows[0].count)).toBe(concurrentRequests);
      } finally {
        client.release();
      }
    });

    it('devrait maintenir les performances avec de nombreux utilisateurs', async () => {
      const startTime = Date.now();

      // Créer 100 utilisateurs
      for (let i = 0; i < 100; i++) {
        const userData = {
          email: `perf${i}@attitudes.vip`,
          password: 'Password123!',
          firstName: 'Marie',
          lastName: 'Dupont'
        };

        await request(server)
          .post('/auth/register')
          .send(userData)
          .expect(201);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // La création de 100 utilisateurs ne devrait pas prendre plus de 10 secondes
      expect(duration).toBeLessThan(10000);

      // Vérifier que tous les utilisateurs ont été créés
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT COUNT(*) FROM users WHERE email LIKE $1',
          ['perf%@attitudes.vip']
        );
        
        expect(parseInt(result.rows[0].count)).toBe(100);
      } finally {
        client.release();
      }
    });
  });
}); 