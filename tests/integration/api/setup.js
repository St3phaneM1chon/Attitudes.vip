const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Test configuration
const TEST_CONFIG = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'http://localhost:54321',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon-key',
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  TEST_DB_NAME: 'attitudes_test',
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100
};

// Initialize test database client
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(TEST_CONFIG.SUPABASE_URL, TEST_CONFIG.SUPABASE_ANON_KEY);
}

// Test data cleanup
const cleanupDatabase = async () => {
  if (!supabase) return;
  
  try {
    // Delete in reverse order of dependencies
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('vendor_bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('guest_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('wedding_guests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('weddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (error) {
    console.error('Database cleanup error:', error);
  }
};

// Generate test JWT token
const generateTestToken = (userId, role = 'customer', expiresIn = '24h') => {
  const payload = {
    id: userId,
    role,
    email: `test-${userId}@attitudes.test`,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, TEST_CONFIG.JWT_SECRET, { expiresIn });
};

// Wait helper for async operations
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Setup and teardown hooks
const setupTestEnvironment = () => {
  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupDatabase();
  });
};

module.exports = {
  TEST_CONFIG,
  supabase,
  cleanupDatabase,
  generateTestToken,
  wait,
  setupTestEnvironment
};