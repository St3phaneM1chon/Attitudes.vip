// Test data factories for consistent test data generation

const crypto = require('crypto');

// Generate random data helpers
const randomString = (length = 10) => crypto.randomBytes(length).toString('hex').slice(0, length);
const randomEmail = () => `test-${randomString(8)}@attitudes.test`;
const randomPhone = () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
const randomDate = (start = new Date(), end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// User factory
const createUser = (overrides = {}) => ({
  email: randomEmail(),
  password: 'Test123!@#',
  firstName: `Test${randomString(5)}`,
  lastName: `User${randomString(5)}`,
  role: 'customer',
  phone: randomPhone(),
  preferredLanguage: 'en',
  ...overrides
});

// Wedding factory
const createWedding = (userId, overrides = {}) => ({
  userId,
  brideName: `Bride${randomString(5)}`,
  groomName: `Groom${randomString(5)}`,
  weddingDate: randomDate().toISOString(),
  venue: `Venue ${randomString(8)}`,
  guestCount: Math.floor(Math.random() * 200) + 50,
  budget: Math.floor(Math.random() * 50000) + 10000,
  theme: 'classic',
  status: 'planning',
  ...overrides
});

// Guest factory
const createGuest = (weddingId, overrides = {}) => ({
  weddingId,
  firstName: `Guest${randomString(5)}`,
  lastName: randomString(5),
  email: randomEmail(),
  phone: randomPhone(),
  rsvpStatus: 'pending',
  tableNumber: Math.floor(Math.random() * 20) + 1,
  dietaryRestrictions: '',
  plusOne: false,
  ...overrides
});

// Vendor factory
const createVendor = (overrides = {}) => ({
  name: `Vendor ${randomString(8)}`,
  type: ['photographer', 'dj', 'caterer', 'florist', 'venue'][Math.floor(Math.random() * 5)],
  email: randomEmail(),
  phone: randomPhone(),
  description: `Professional ${randomString(20)} services`,
  basePrice: Math.floor(Math.random() * 5000) + 500,
  rating: (Math.random() * 2 + 3).toFixed(1),
  isActive: true,
  ...overrides
});

// Vendor booking factory
const createVendorBooking = (weddingId, vendorId, overrides = {}) => ({
  weddingId,
  vendorId,
  bookingDate: new Date().toISOString(),
  serviceDate: randomDate().toISOString(),
  status: 'pending',
  totalPrice: Math.floor(Math.random() * 5000) + 500,
  notes: '',
  ...overrides
});

// Payment factory
const createPayment = (userId, overrides = {}) => ({
  userId,
  amount: Math.floor(Math.random() * 1000) + 100,
  currency: 'USD',
  status: 'pending',
  paymentMethod: 'card',
  description: `Payment for ${randomString(10)}`,
  stripePaymentIntentId: `pi_${randomString(24)}`,
  ...overrides
});

// Batch creation helpers
const createUsersWithWeddings = async (count = 3) => {
  const users = [];
  const weddings = [];
  
  for (let i = 0; i < count; i++) {
    const user = createUser();
    users.push(user);
    
    const wedding = createWedding(user.email);
    weddings.push(wedding);
  }
  
  return { users, weddings };
};

const createWeddingWithGuests = async (weddingId, guestCount = 10) => {
  const guests = [];
  
  for (let i = 0; i < guestCount; i++) {
    guests.push(createGuest(weddingId));
  }
  
  return guests;
};

module.exports = {
  // Individual factories
  createUser,
  createWedding,
  createGuest,
  createVendor,
  createVendorBooking,
  createPayment,
  
  // Batch factories
  createUsersWithWeddings,
  createWeddingWithGuests,
  
  // Utilities
  randomString,
  randomEmail,
  randomPhone,
  randomDate
};