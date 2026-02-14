const request = require('supertest');
const app = require('../../../src/auth/auth-service');
const { 
  createUser,
  createWedding,
  createVendor,
  createVendorBooking
} = require('./factories');
const { 
  generateTestToken, 
  setupTestEnvironment 
} = require('./setup');

setupTestEnvironment();

describe('Vendor Booking API Integration Tests', () => {
  let authToken;
  let userId;
  let weddingId;
  let vendorId;
  let testVendor;
  
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
    
    // Create a vendor (admin operation)
    testVendor = createVendor();
  });

  describe('GET /api/vendors', () => {
    beforeEach(async () => {
      // Seed some vendors (would typically be done by admin)
      // For testing, we'll assume these exist
    });

    it('should list available vendors', async () => {
      const response = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should filter vendors by type', async () => {
      const response = await request(app)
        .get('/api/vendors?type=photographer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data.every(v => v.type === 'photographer')).toBe(true);
      }
    });

    it('should filter vendors by price range', async () => {
      const response = await request(app)
        .get('/api/vendors?minPrice=1000&maxPrice=5000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        response.body.data.forEach(vendor => {
          expect(vendor.basePrice).toBeGreaterThanOrEqual(1000);
          expect(vendor.basePrice).toBeLessThanOrEqual(5000);
        });
      }
    });

    it('should sort vendors by rating', async () => {
      const response = await request(app)
        .get('/api/vendors?sort=rating&order=desc')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(
            parseFloat(response.body.data[i].rating) <= parseFloat(response.body.data[i-1].rating)
          ).toBe(true);
        }
      }
    });

    it('should search vendors by name or description', async () => {
      const response = await request(app)
        .get('/api/vendors?search=professional')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should paginate vendor results', async () => {
      const response = await request(app)
        .get('/api/vendors?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('GET /api/vendors/:id', () => {
    it('should get vendor details with availability', async () => {
      // Assuming vendor ID 1 exists in test data
      const response = await request(app)
        .get('/api/vendors/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('type');
        expect(response.body.data).toHaveProperty('availability');
      }
    });

    it('should include vendor reviews', async () => {
      const response = await request(app)
        .get('/api/vendors/1?includeReviews=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('reviews');
        expect(response.body.data.reviews).toBeInstanceOf(Array);
      }
    });

    it('should return 404 for non-existent vendor', async () => {
      const response = await request(app)
        .get('/api/vendors/99999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/weddings/:weddingId/bookings', () => {
    beforeEach(async () => {
      // Assume vendor ID 1 exists
      vendorId = 1;
    });

    it('should create a vendor booking', async () => {
      const booking = createVendorBooking(weddingId, vendorId);
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.weddingId).toBe(weddingId);
      expect(response.body.data.vendorId).toBe(vendorId);
      expect(response.body.data.status).toBe('pending');
    });

    it('should validate service date is in the future', async () => {
      const pastBooking = createVendorBooking(weddingId, vendorId, {
        serviceDate: '2020-01-01'
      });
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pastBooking)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('future');
    });

    it('should check vendor availability', async () => {
      // Create first booking
      const booking1 = createVendorBooking(weddingId, vendorId);
      await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking1)
        .expect(201);

      // Try to book same vendor for same date (different wedding)
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      const otherUserId = otherRegisterResponse.body.data.user.id;
      
      const otherWedding = createWedding(otherUserId);
      const otherWeddingResponse = await request(app)
        .post('/api/weddings')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(otherWedding);
      
      const otherWeddingId = otherWeddingResponse.body.data.id;
      
      const conflictingBooking = createVendorBooking(otherWeddingId, vendorId, {
        serviceDate: booking1.serviceDate
      });
      
      const response = await request(app)
        .post(`/api/weddings/${otherWeddingId}/bookings`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(conflictingBooking)
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not available');
    });

    it('should apply vendor-specific pricing', async () => {
      const booking = createVendorBooking(weddingId, vendorId, {
        totalPrice: 0 // Let system calculate
      });
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking)
        .expect(201);

      expect(response.body.data.totalPrice).toBeGreaterThan(0);
    });
  });

  describe('GET /api/weddings/:weddingId/bookings', () => {
    beforeEach(async () => {
      vendorId = 1;
      // Create some bookings
      const bookings = [
        createVendorBooking(weddingId, vendorId),
        createVendorBooking(weddingId, 2), // Different vendor
        createVendorBooking(weddingId, 3)
      ];
      
      for (const booking of bookings) {
        await request(app)
          .post(`/api/weddings/${weddingId}/bookings`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(booking);
      }
    });

    it('should list all bookings for wedding', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter bookings by status', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/bookings?status=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      if (response.body.data.length > 0) {
        expect(response.body.data.every(b => b.status === 'pending')).toBe(true);
      }
    });

    it('should include vendor details', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/bookings?includeVendor=true`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('vendor');
        expect(response.body.data[0].vendor).toHaveProperty('name');
      }
    });

    it('should calculate total booking costs', async () => {
      const response = await request(app)
        .get(`/api/weddings/${weddingId}/bookings/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('totalCost');
      expect(response.body.data).toHaveProperty('confirmedCost');
      expect(response.body.data).toHaveProperty('pendingCost');
      expect(response.body.data).toHaveProperty('bookingsByType');
    });
  });

  describe('PUT /api/weddings/:weddingId/bookings/:bookingId', () => {
    let bookingId;
    
    beforeEach(async () => {
      vendorId = 1;
      const booking = createVendorBooking(weddingId, vendorId);
      const bookingResponse = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking);
      
      bookingId = bookingResponse.body.data.id;
    });

    it('should update booking status', async () => {
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.status).toBe('confirmed');
      expect(response.body.data).toHaveProperty('confirmedAt');
    });

    it('should update booking details', async () => {
      const updates = {
        notes: 'Please arrive 30 minutes early',
        totalPrice: 2500
      };
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.data.notes).toBe(updates.notes);
      expect(response.body.data.totalPrice).toBe(updates.totalPrice);
    });

    it('should validate status transitions', async () => {
      // First cancel the booking
      await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'cancelled' })
        .expect(200);
      
      // Try to confirm cancelled booking
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Cannot confirm cancelled booking');
    });

    it('should not allow updating other users bookings', async () => {
      const otherUser = createUser();
      const otherRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUser);
      
      const otherToken = otherRegisterResponse.body.data.token;
      
      const response = await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/weddings/:weddingId/bookings/:bookingId', () => {
    let bookingId;
    
    beforeEach(async () => {
      vendorId = 1;
      const booking = createVendorBooking(weddingId, vendorId);
      const bookingResponse = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking);
      
      bookingId = bookingResponse.body.data.id;
    });

    it('should cancel booking', async () => {
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      
      // Verify booking is cancelled
      const getResponse = await request(app)
        .get(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(getResponse.body.data.status).toBe('cancelled');
    });

    it('should handle cancellation policies', async () => {
      // Confirm booking first
      await request(app)
        .put(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'confirmed' })
        .expect(200);
      
      // Try to cancel (may have penalties)
      const response = await request(app)
        .delete(`/api/weddings/${weddingId}/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Change of plans' })
        .expect(200);

      expect(response.body.data).toHaveProperty('cancellationFee');
    });
  });

  describe('Vendor Reviews', () => {
    let bookingId;
    
    beforeEach(async () => {
      vendorId = 1;
      const booking = createVendorBooking(weddingId, vendorId, {
        status: 'completed'
      });
      const bookingResponse = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(booking);
      
      bookingId = bookingResponse.body.data.id;
    });

    it('should allow reviewing completed bookings', async () => {
      const review = {
        rating: 5,
        comment: 'Excellent service, highly recommended!',
        wouldRecommend: true
      };
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(review)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.vendorId).toBe(vendorId);
    });

    it('should not allow reviewing pending bookings', async () => {
      // Create pending booking
      const pendingBooking = createVendorBooking(weddingId, 2);
      const pendingResponse = await request(app)
        .post(`/api/weddings/${weddingId}/bookings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(pendingBooking);
      
      const pendingBookingId = pendingResponse.body.data.id;
      
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings/${pendingBookingId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 5, comment: 'Test' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('completed bookings');
    });

    it('should prevent duplicate reviews', async () => {
      // First review
      await request(app)
        .post(`/api/weddings/${weddingId}/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 5, comment: 'Great!' })
        .expect(201);
      
      // Duplicate review
      const response = await request(app)
        .post(`/api/weddings/${weddingId}/bookings/${bookingId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 4, comment: 'Good' })
        .expect(409);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already reviewed');
    });
  });
});