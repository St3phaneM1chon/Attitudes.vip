const request = require('supertest');
const app = require('../../../src/auth/auth-service');
const { 
  createUser,
  createWedding,
  createGuest,
  createWeddingWithGuests
} = require('./factories');
const { 
  generateTestToken, 
  setupTestEnvironment 
} = require('./setup');

setupTestEnvironment();

describe('Guest Management API Integration Tests', () => {
  let authToken;
  let userId;
  let weddingId;
  let testGuest;
  
  beforeEach(async () => {
    // Create user, authenticate, and create wedding
    const user = createUser();
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(user);
    
    userId = registerResponse.body.data.user.id;
    authToken = registerResponse.body.data.token;
    
    const wedding = createWedding(userId);
    const weddingResponse = await request(app)
      .post('/api/weddings')
      .set('Authorization', `Bearer ${authToken}`)
      .send(wedding);
    
    weddingId = weddingResponse.body.data.id;
    testGuest = createGuest(weddingId);
  });

  describe('POST /api/weddings/:weddingId/guests', () => {
    it('should add a guest to wedding', async () => {
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.firstName).toBe(testGuest.firstName);
      expect(response.body.data.lastName).toBe(testGuest.lastName);
      expect(response.body.data.weddingId).toBe(weddingId);
      expect(response.body.data.rsvpStatus).toBe('pending');
    });

    it('should add multiple guests in batch', async () => {
      const guests = await createWeddingWithGuests(weddingId, 5);
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests/batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ guests })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(5);
    });

    it('should validate guest email format', async () => {
      const invalidGuest = { ...testGuest, email: 'invalid-email' };
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidGuest)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('email');
    });

    it('should prevent duplicate guest emails for same wedding', async () => {
      // Add guest
      await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest)
        .expect(201);

      // Try to add duplicate
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already invited');
    });

    it('should handle plus one guests', async () => {
      const guestWithPlusOne = {
        ...testGuest,
        plusOne: true,
        plusOneName: 'John Doe'
      };
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(guestWithPlusOne)
        .expect(201);

      expect(response.body.data.plusOne).toBe(true);
      expect(response.body.data.plusOneName).toBe('John Doe');
    });

    it('should not allow adding guests to other users wedding', async () => {
      // Create another user
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(testGuest)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/weddings/:weddingId/guests', () => {
    beforeEach(async () => {
      // Add some guests
      const guests = await createWeddingWithGuests(weddingId, 10);
      for (const guest of guests) {
        await request(app)
          .post(`/api/weddings/${weddingId}/guests`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(guest);
      }
    });

    it('should get all guests for wedding', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toHaveLength(10);
    });

    it('should filter guests by RSVP status', async () => {
      // Update some guests to confirmed
      const guestsResponse = await request(app)
        .get(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const guestIds = guestsResponse.body.data.slice(0, 3).map(g => g.id);
      
      for (const guestId of guestIds) {
        await request(app)
          .put(`/api/weddings/${weddingId}/guests/${guestId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ rsvpStatus: 'confirmed' });
      }

      // Filter by confirmed status
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests?rsvpStatus=confirmed`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every(g => g.rsvpStatus === 'confirmed')).toBe(true);
    });

    it('should paginate guest list', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests?page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total', 10);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.pagination).toHaveProperty('totalPages', 2);
    });

    it('should search guests by name', async () => {
      // Add a guest with specific name
      const namedGuest = createGuest(weddingId, {
        firstName: 'SearchableFirst',
        lastName: 'SearchableLast'
      });
      
      await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(namedGuest);

      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests?search=Searchable`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('SearchableFirst');
    });

    it('should sort guests by various fields', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests?sort=lastName&order=asc`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      
      // Check if properly sorted
      for (let i = 1; i < response.body.data.length; i++) {
        expect(
          response.body.data[i].lastName >= response.body.data[i-1].lastName
        ).toBe(true);
      }
    });
  });

  describe('GET /api/weddings/:weddingId/guests/:guestId', () => {
    let guestId;
    
    beforeEach(async () => {
      const guestResponse = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest);
      
      guestId = guestResponse.body.data.id;
    });

    it('should get specific guest details', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.id).toBe(guestId);
      expect(response.body.data.email).toBe(testGuest.email);
    });

    it('should return 404 for non-existent guest', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests/99999999-9999-9999-9999-999999999999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/weddings/:weddingId/guests/:guestId', () => {
    let guestId;
    
    beforeEach(async () => {
      const guestResponse = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest);
      
      guestId = guestResponse.body.data.id;
    });

    it('should update guest information', async () => {
      const updates = {
        rsvpStatus: 'confirmed',
        tableNumber: 5,
        dietaryRestrictions: 'Vegetarian',
        plusOne: true,
        plusOneName: 'Jane Doe'
      };
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.rsvpStatus).toBe('confirmed');
      expect(response.body.data.tableNumber).toBe(5);
      expect(response.body.data.dietaryRestrictions).toBe('Vegetarian');
      expect(response.body.data.plusOne).toBe(true);
      expect(response.body.data.plusOneName).toBe('Jane Doe');
    });

    it('should validate RSVP status values', async () => {
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rsvpStatus: 'invalid-status' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('rsvpStatus');
    });

    it('should track RSVP response timestamp', async () => {
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rsvpStatus: 'confirmed' })
        .expect(200);

      expect(response.body.data).toHaveProperty('rsvpRespondedAt');
      expect(new Date(response.body.data.rsvpRespondedAt)).toBeInstanceOf(Date);
    });
  });

  describe('DELETE /api/weddings/:weddingId/guests/:guestId', () => {
    let guestId;
    
    beforeEach(async () => {
      const guestResponse = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest);
      
      guestId = guestResponse.body.data.id;
    });

    it('should remove guest from wedding', async () => {
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Verify guest is removed
      await request(app)
        .get(`/api/weddings/${weddingId}/guests/${guestId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle removing non-existent guest', async () => {
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}/guests/99999999-9999-9999-9999-999999999999`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Guest Communication', () => {
    let guestId;
    
    beforeEach(async () => {
      const guestResponse = await request(app)
        .post(`/api/weddings/${weddingId}/guests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testGuest);
      
      guestId = guestResponse.body.data.id;
    });

    it('should send invitation to guest', async () => {
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests/${guestId}/invite`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template: 'formal',
          message: 'We would be honored by your presence'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('invitationSentAt');
    });

    it('should send reminder to pending guests', async () => {
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/guests/remind`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rsvpStatus: 'pending',
          message: 'Please RSVP by next week'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sentCount');
    });

    it('should export guest list', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests/export?format=csv`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('Guest Statistics', () => {
    beforeEach(async () => {
      // Add various guests with different statuses
      const guests = [
        ...Array(5).fill(null).map(() => createGuest(weddingId, { rsvpStatus: 'confirmed' })),
        ...Array(3).fill(null).map(() => createGuest(weddingId, { rsvpStatus: 'declined' })),
        ...Array(7).fill(null).map(() => createGuest(weddingId, { rsvpStatus: 'pending' }))
      ];
      
      for (const guest of guests) {
        await request(app)
          .post(`/api/weddings/${weddingId}/guests`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(guest);
      }
    });

    it('should get guest statistics', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/guests/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('total', 15);
      expect(response.body.data).toHaveProperty('confirmed', 5);
      expect(response.body.data).toHaveProperty('declined', 3);
      expect(response.body.data).toHaveProperty('pending', 7);
      expect(response.body.data).toHaveProperty('responseRate');
      expect(response.body.data.responseRate).toBe(53.33); // 8/15 * 100
    });
  });
});