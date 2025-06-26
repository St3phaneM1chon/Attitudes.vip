const request = require('supertest');
const app = require('../src/auth/auth-service');

describe('Auth Service', () => {
  test('GET /auth/google should redirect', async () => {
    const response = await request(app)
      .get('/auth/google')
      .expect(302);
    
    expect(response.headers.location).toContain('google.com');
  });
});
