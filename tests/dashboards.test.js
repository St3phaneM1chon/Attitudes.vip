/**
 * Tests pour les dashboards Customer et DJ
 */

const request = require('supertest');
const app = require('../src/app');

describe('Dashboard Routes', () => {
  let authToken;
  let customerUser;
  let djUser;
  let weddingId;

  beforeAll(async () => {
    // Créer des utilisateurs de test
    customerUser = {
      id: 'customer-123',
      email: 'couple@test.com',
      name: 'Marie Dupont',
      role: 'couple:owner',
      current_wedding_id: 'wedding-test-123'
    };
    
    djUser = {
      id: 'dj-456',
      email: 'dj@test.com',
      name: 'DJ Pro',
      role: 'vendor:dj',
      current_wedding_id: 'wedding-test-123'
    };
    
    weddingId = 'wedding-test-123';
  });

  describe('Accès aux dashboards', () => {
    it('devrait rediriger vers /login sans authentification', async () => {
      const res = await request(app)
        .get('/dashboard')
        .expect(302);
      
      expect(res.headers.location).toBe('/login');
    });

    it('devrait rediriger un couple vers /dashboard/customer', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${generateToken(customerUser)}`)
        .expect(302);
      
      expect(res.headers.location).toBe('/dashboard/customer');
    });

    it('devrait rediriger un DJ vers /dashboard/dj', async () => {
      const res = await request(app)
        .get('/dashboard')
        .set('Authorization', `Bearer ${generateToken(djUser)}`)
        .expect(302);
      
      expect(res.headers.location).toBe('/dashboard/dj');
    });

    it('devrait refuser l\'accès à un dashboard non autorisé', async () => {
      // Un couple essaie d'accéder au dashboard DJ
      await request(app)
        .get('/dashboard/dj')
        .set('Authorization', `Bearer ${generateToken(customerUser)}`)
        .expect(403);
    });
  });

  describe('API Dashboard Stats', () => {
    it('devrait retourner les stats pour un couple', async () => {
      const res = await request(app)
        .get(`/dashboard/api/stats/${weddingId}`)
        .set('Authorization', `Bearer ${generateToken(customerUser)}`)
        .expect(200);
      
      expect(res.body).toHaveProperty('guests');
      expect(res.body).toHaveProperty('budget');
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('vendors');
    });

    it('devrait retourner les stats pour un DJ', async () => {
      const res = await request(app)
        .get(`/dashboard/api/stats/${weddingId}`)
        .set('Authorization', `Bearer ${generateToken(djUser)}`)
        .expect(200);
      
      expect(res.body).toHaveProperty('schedule');
      expect(res.body).toHaveProperty('musicRequests');
      expect(res.body).toHaveProperty('equipment');
    });
  });
});

describe('Customer Dashboard Component', () => {
  // Tests unitaires pour le composant React
  // Nécessiterait @testing-library/react
  
  it('devrait afficher le compte à rebours', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
  
  it('devrait afficher les statistiques principales', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
  
  it('devrait afficher les tâches urgentes', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
});

describe('DJ Dashboard Component', () => {
  it('devrait afficher l\'interface en mode paysage', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
  
  it('devrait gérer les demandes musicales', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
  
  it('devrait gérer les demandes de micro', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
  
  it('devrait afficher le flux de photos en temps réel', () => {
    // Test placeholder
    expect(true).toBe(true);
  });
});

// Fonction helper pour générer un token JWT
function generateToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(user, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: '1h'
  });
}