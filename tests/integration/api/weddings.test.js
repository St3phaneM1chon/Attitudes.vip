const request = require('supertest');
const app = require('../../../src/auth/auth-service');
const { 
  createUser, 
  createWedding,
  randomDate 
} = require('./factories');
const { 
  generateTestToken, 
  setupTestEnvironment 
} = require('./setup');

setupTestEnvironment();

describe('Wedding API Integration Tests', () => {
  let authToken;
  let userId;
  let testWedding;
  
  beforeEach(async () => {
    // Create and authenticate user
    const user = createUser();
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(user);
    
    userId = registerResponse.body.data.user.id;
    authToken = registerResponse.body.data.token;
    testWedding = createWedding(userId);
  });

  describe('POST /api/weddings', () => {
    it('should create a new wedding for authenticated user', async () => {
      const response = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.brideName).toBe(testWedding.brideName);
      expect(response.body.data.groomName).toBe(testWedding.groomName);
      expect(response.body.data.userId).toBe(userId);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/weddings')
        .send(testWedding)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const incompleteWedding = { brideName: 'Test Bride' };
      
      const response = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteWedding)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('required');
    });

    it('should validate wedding date is in the future', async () => {
      const pastWedding = {
        ...testWedding,
        weddingDate: new Date('2020-01-01').toISOString()
      };
      
      const response = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pastWedding)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('future');
    });

    it('should allow only one active wedding per user', async () => {
      // Create first wedding
      await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding)
        .expect(201);

      // Try to create second wedding
      const secondWedding = createWedding(userId);
      const response = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(secondWedding)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already have an active wedding');
    });
  });

  describe('GET /api/weddings', () => {
    let weddingId;
    
    beforeEach(async () => {
      // Create a wedding
      const createResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding);
      
      weddingId = createResponse.body.data.id;
    });

    it('should get all weddings for authenticated user', async () => {
      const response = await request(app)
        .get('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(weddingId);
    });

    it('should not return other users weddings', async () => {
      // Create another user with a wedding
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      const otherUserId = otherRegisterResponse.body.data.user.id;
      
      await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(createWedding(otherUserId));

      // Get weddings for first user
      const response = await request(app)
        .get('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe(userId);
    });

    it('should fail without authentication', async () => {
      await request(app)
        .get('/api/weddings')
        .expect(401);
    });
  });

  describe('GET /api/weddings/:id', () => {
    let weddingId;
    
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding);
      
      weddingId = createResponse.body.data.id;
    });

    it('should get specific wedding by id', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(weddingId);
      expect(response.body.data.brideName).toBe(testWedding.brideName);
    });

    it('should not allow access to other users wedding', async () => {
      // Create another user
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      // Try to access first user's wedding
      const response = await request(app)
        .get(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('permission');
    });

    it('should return 404 for non-existent wedding', async () => {
      const response = await request(app)
        .get('/api/weddings/99999999-9999-9999-9999-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/weddings/:id', () => {
    let weddingId;
    
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding);
      
      weddingId = createResponse.body.data.id;
    });

    it('should update wedding details', async () => {
      const updates = {
        venue: 'New Venue Location',
        guestCount: 150,
        theme: 'modern'
      };
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.venue).toBe(updates.venue);
      expect(response.body.data.guestCount).toBe(updates.guestCount);
      expect(response.body.data.theme).toBe(updates.theme);
      // Unchanged fields should remain
      expect(response.body.data.brideName).toBe(testWedding.brideName);
    });

    it('should not allow updating other users wedding', async () => {
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ venue: 'Hacked Venue' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate updated fields', async () => {
      const invalidUpdates = {
        guestCount: -10
      };
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('guest count');
    });

    it('should not allow changing wedding to past date', async () => {
      const response = await request(app)
        .put(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ weddingDate: '2020-01-01' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/weddings/:id', () => {
    let weddingId;
    
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding);
      
      weddingId = createResponse.body.data.id;
    });

    it('should soft delete wedding', async () => {
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Verify wedding is not returned in list
      const listResponse = await request(app)
        .get('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(listResponse.body.data).toHaveLength(0);
    });

    it('should not allow deleting other users wedding', async () => {
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 404 for already deleted wedding', async () => {
      // Delete wedding
      await request(app)
        .delete(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // Try to delete again
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Wedding Statistics', () => {
    let weddingId;
    
    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testWedding);
      
      weddingId = createResponse.body.data.id;
    });

    it('should get wedding statistics', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalGuests');
      expect(response.body.data).toHaveProperty('confirmedGuests');
      expect(response.body.data).toHaveProperty('pendingGuests');
      expect(response.body.data).toHaveProperty('totalBudget');
      expect(response.body.data).toHaveProperty('spentBudget');
      expect(response.body.data).toHaveProperty('daysUntilWedding');
    });
  });
});