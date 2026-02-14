# Unit Tests for Attitudes.vip

This directory contains comprehensive unit tests for critical services in the Attitudes.vip project.

## Test Coverage

### 1. Auth Service Tests (`auth-service.test.js`)
Comprehensive tests for authentication functionality:
- **JWT Generation**: Token creation with proper payload and expiry
- **Permission Middleware**: Access control based on permissions
- **Role Middleware**: Role-based access control
- **Registration**: User creation with validation
- **Login**: Authentication with credentials
- **OAuth**: Google, Facebook, Twitter, Apple integrations
- **Profile Management**: User profile endpoints
- **Token Refresh**: JWT refresh mechanism
- **Role Determination**: Automatic role assignment logic

### 2. Redis Cache Tests (`redis-cache.test.js`)
Complete coverage of caching operations:
- **Connection Management**: Connect, disconnect, reconnection strategy
- **Basic Operations**: get, set, delete, exists
- **Advanced Operations**: mget, mset, batch operations
- **Tag-based Invalidation**: Invalidate by tags
- **Namespace Management**: Namespace-specific operations
- **Pattern Operations**: getOrSet, getOrSetWithLock
- **Atomic Operations**: Increment operations
- **List Operations**: Push/get lists with max length
- **Statistics & Utilities**: Stats, flush operations
- **Edge Cases**: JSON errors, circular references, large keys

### 3. WebSocket Service Tests (`websocket-service.test.js`)
Real-time communication testing:
- **Initialization**: Server setup and configuration
- **Authentication**: Socket authentication middleware
- **Connection Handling**: Connect, disconnect, reconnect
- **Wedding Namespace**: Wedding-specific events
- **Vendor Namespace**: Vendor status and bookings
- **Admin Namespace**: Admin monitoring and broadcasts
- **Notifications**: Real-time notification delivery
- **Redis Pub/Sub**: Multi-server communication
- **Public API**: Emit methods and user management
- **System Metrics**: Performance monitoring

### 4. Error Handler Tests (`error-handler.test.js`)
Error handling middleware coverage:
- **AppError Class**: Custom error creation
- **Error Handler**: Central error processing
- **Specific Error Types**: Validation, JWT, Database errors
- **Production vs Development**: Error detail exposure
- **404 Handler**: Not found routes
- **Async Handler**: Async function wrapper
- **Process Events**: Unhandled rejections and exceptions
- **Error Codes**: Standardized error code usage

### 5. Vendor Model Tests (`vendor-model.test.js`)
Database model testing:
- **Model Definition**: Field definitions and types
- **Instance Methods**: isAvailable, calculatePrice, updateStatistics
- **Field Validations**: Email, required fields
- **Default Values**: JSONB fields, settings
- **Complex Scenarios**: Multi-service vendors, pricing packages

## Running Tests

```bash
# Run all unit tests
npm test tests/unit

# Run specific test file
npm test tests/unit/auth-service.test.js

# Run with coverage
npm test -- --coverage tests/unit

# Run in watch mode
npm test -- --watch tests/unit
```

## Test Structure

Each test file follows a consistent structure:
1. **Imports and Mocks**: Dependencies and mock setup
2. **BeforeEach/AfterEach**: Test environment setup/cleanup
3. **Describe Blocks**: Logical grouping of related tests
4. **Test Cases**: Individual test scenarios
5. **Edge Cases**: Handling of errors and unusual inputs

## Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: External dependencies are mocked
3. **Clear Names**: Descriptive test names
4. **Comprehensive**: Both happy path and error cases
5. **Maintainable**: Easy to update with code changes

## Coverage Goals

- Target: 80%+ code coverage
- Critical paths: 100% coverage
- Edge cases: Comprehensive testing
- Error handling: Full coverage

## Adding New Tests

When adding new tests:
1. Follow existing naming conventions
2. Group related tests in describe blocks
3. Mock external dependencies
4. Test both success and failure cases
5. Include edge cases
6. Update this README with test descriptions