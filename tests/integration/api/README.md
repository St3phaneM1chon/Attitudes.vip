# API Integration Tests

Comprehensive integration tests for the Attitudes.vip API endpoints.

## Test Coverage

### 1. Authentication Tests (`auth.test.js`)
- User registration with validation
- Login with credentials
- Logout functionality
- Token refresh mechanism
- Rate limiting enforcement
- Security headers validation

### 2. Wedding Management Tests (`weddings.test.js`)
- Wedding CRUD operations
- Validation rules (future dates, one active wedding per user)
- Access control between users
- Wedding statistics endpoint

### 3. Guest Management Tests (`guests.test.js`)
- Guest CRUD operations
- Batch guest operations
- RSVP status management
- Guest communication (invitations, reminders)
- Guest list export
- Search and filtering
- Guest statistics

### 4. Vendor Booking Tests (`vendors.test.js`)
- Vendor listing with filters
- Booking creation and management
- Availability checking
- Booking status workflows
- Vendor reviews
- Cancellation policies

### 5. Payment Flow Tests (`payments.test.js`)
- Payment intent creation
- Payment confirmation
- Refund processing
- Payment method management
- Webhook handling
- Invoice generation
- Payment summaries

## Running Tests

### Run all integration tests:
```bash
npm run test:integration:api
# or
./tests/integration/api/run-tests.js
```

### Run specific test suite:
```bash
# By file name
./tests/integration/api/run-tests.js auth.test.js

# By suite name
./tests/integration/api/run-tests.js authentication
```

### Run with coverage:
```bash
./tests/integration/api/run-tests.js --coverage
```

### Run in watch mode:
```bash
./tests/integration/api/run-tests.js --watch
```

## Environment Setup

Tests require the following services:
- PostgreSQL (via Supabase)
- Redis
- Node.js API server

### Required Environment Variables:
```env
NODE_ENV=test
JWT_SECRET=test-secret-key
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://localhost:6379
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx
```

## Test Data Management

### Factories
Test data factories provide consistent, realistic test data:
- `createUser()` - Generate user data
- `createWedding()` - Generate wedding data
- `createGuest()` - Generate guest data
- `createVendor()` - Generate vendor data
- `createVendorBooking()` - Generate booking data
- `createPayment()` - Generate payment data

### Database Cleanup
- Tests automatically clean up after each test
- No test data persists between test runs
- Uses transactions where possible

## Best Practices

1. **Independent Tests**: Each test can run independently
2. **Real-World Scenarios**: Tests cover actual user workflows
3. **Error Cases**: Tests include validation and error scenarios
4. **Security**: Tests verify authentication and authorization
5. **Performance**: Tests include rate limiting and load scenarios

## Adding New Tests

1. Create test file in `tests/integration/api/`
2. Import setup and factories:
   ```javascript
   const { setupTestEnvironment } = require('./setup');
   const { createUser, createWedding } = require('./factories');
   ```
3. Use `setupTestEnvironment()` to configure test hooks
4. Write tests using supertest for API calls
5. Add test suite to `run-tests.js`

## Debugging

### Enable verbose output:
```bash
./tests/integration/api/run-tests.js --verbose
```

### Check test database:
```bash
# Connect to test database
psql -h localhost -U postgres attitudes_test
```

### View test logs:
```bash
# API server logs
tail -f logs/test.log

# Database logs
docker logs supabase-db -f
```

## CI/CD Integration

Tests are configured to run in CI/CD pipelines:
- GitHub Actions: `.github/workflows/test.yml`
- Timeout: 30 seconds per test
- Parallel execution: Disabled (tests run serially)
- Exit codes: 0 for success, non-zero for failure