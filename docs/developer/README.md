# Developer Guide - Attitudes.vip

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Coding Standards](#coding-standards)
5. [Development Workflow](#development-workflow)
6. [Testing Guidelines](#testing-guidelines)
7. [API Development](#api-development)
8. [Frontend Development](#frontend-development)
9. [Database Development](#database-development)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)

## Getting Started

Welcome to the Attitudes.vip development team! This guide will help you set up your development environment and understand our coding practices.

### Prerequisites

Before you begin, ensure you have the following installed:

```bash
# Required versions
node >= 18.0.0
npm >= 9.0.0
git >= 2.30.0
docker >= 20.10.0
docker-compose >= 2.0.0

# Optional but recommended
nvm (Node Version Manager)
direnv (Environment variable management)
```

### Initial Setup

1. **Clone the Repository**

```bash
# Clone with SSH (recommended)
git clone git@github.com:attitudes-vip/attitudes-framework.git

# Or with HTTPS
git clone https://github.com/attitudes-vip/attitudes-framework.git

cd attitudes-framework
```

2. **Install Dependencies**

```bash
# Install Node.js dependencies
npm install

# Install pre-commit hooks
npm run prepare

# Install global development tools
npm install -g nodemon jest eslint prettier
```

3. **Environment Configuration**

```bash
# Copy environment template
cp .env.example .env.development

# Edit with your local configuration
nano .env.development
```

4. **Start Development Services**

```bash
# Start Docker services (PostgreSQL, Redis, etc.)
docker-compose -f docker-compose.dev.yml up -d

# Initialize database
npm run db:init
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

## Development Environment

### IDE Setup

#### Visual Studio Code (Recommended)

1. **Install Required Extensions**

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "ms-vscode.vscode-typescript-next",
    "christian-kohler.path-intellisense",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker",
    "wayou.vscode-todo-highlight",
    "gruntfuggly.todo-tree",
    "eamodio.gitlens",
    "prisma.prisma",
    "bradlc.vscode-tailwindcss"
  ]
}
```

2. **Workspace Settings**

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

#### JetBrains IDEs (WebStorm, IntelliJ)

1. **Import Code Style**

Import `attitudes-code-style.xml` from the project root.

2. **Configure Node.js**

- Set Node interpreter to project's node version
- Enable ESLint and Prettier integration
- Configure file watchers for automatic formatting

### Development Tools

#### Database Management

```bash
# pgAdmin for PostgreSQL
docker run -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@attitudes.vip \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  -d dpage/pgadmin4

# Redis Commander
docker run -p 8081:8081 \
  -e REDIS_HOST=host.docker.internal \
  -d rediscommander/redis-commander
```

#### API Testing

```bash
# Install Insomnia
brew install --cask insomnia

# Or Postman
brew install --cask postman

# Import collection
# File: attitudes-vip.postman_collection.json
```

#### Performance Monitoring

```bash
# Start local monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
# - Jaeger: http://localhost:16686
```

## Project Structure

```
attitudes-framework/
├── src/                      # Source code
│   ├── api/                 # API endpoints
│   │   ├── routes/         # Route definitions
│   │   ├── controllers/    # Request handlers
│   │   └── middlewares/    # Custom middleware
│   ├── auth/               # Authentication service
│   │   ├── strategies/     # Passport strategies
│   │   ├── guards/         # Auth guards
│   │   └── providers/      # OAuth providers
│   ├── services/           # Business logic
│   │   ├── wedding/        # Wedding management
│   │   ├── guest/          # Guest management
│   │   ├── vendor/         # Vendor coordination
│   │   ├── payment/        # Payment processing
│   │   └── notification/   # Notifications
│   ├── models/             # Data models
│   │   ├── schemas/        # Database schemas
│   │   └── validators/     # Model validators
│   ├── utils/              # Utility functions
│   │   ├── logger/         # Logging utilities
│   │   ├── errors/         # Error handling
│   │   └── helpers/        # Helper functions
│   ├── config/             # Configuration
│   │   ├── database.js     # Database config
│   │   ├── redis.js        # Redis config
│   │   └── constants.js    # App constants
│   └── i18n/               # Internationalization
│       ├── locales/        # Translation files
│       └── index.js        # i18n setup
├── tests/                   # Test files
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   ├── e2e/               # End-to-end tests
│   └── fixtures/          # Test data
├── scripts/                # Utility scripts
│   ├── db/                # Database scripts
│   ├── deploy/            # Deployment scripts
│   └── dev/               # Development scripts
├── docs/                   # Documentation
├── public/                 # Static files
├── config/                 # Configuration files
└── ops/                    # Operations (K8s, Docker)
```

### File Naming Conventions

```javascript
// Controllers: PascalCase with .controller.js
UserController.js
WeddingController.js

// Services: PascalCase with .service.js
AuthService.js
NotificationService.js

// Models: PascalCase with .model.js
User.model.js
Wedding.model.js

// Utilities: camelCase with descriptive names
dateHelpers.js
validationUtils.js

// Tests: match source file with .test.js or .spec.js
UserController.test.js
AuthService.spec.js

// React Components: PascalCase
DashboardLayout.jsx
GuestListTable.jsx

// React Hooks: camelCase with 'use' prefix
useAuth.js
useWeddingData.js
```

## Coding Standards

### JavaScript/TypeScript Style Guide

We follow the Airbnb JavaScript Style Guide with some modifications:

#### General Rules

```javascript
// Use const for all references; avoid using var
const wedding = new Wedding();

// Use let only when reassigning
let guestCount = 0;
guestCount += 1;

// Use template literals for string interpolation
const message = `Welcome to ${weddingName}!`;

// Use destructuring
const { firstName, lastName } = user;

// Use default parameters
function createWedding(date = new Date()) {
  // ...
}

// Use arrow functions for callbacks
const guests = users.filter(user => user.role === 'guest');

// Use async/await over promises
async function fetchWedding(id) {
  try {
    const wedding = await Wedding.findById(id);
    return wedding;
  } catch (error) {
    logger.error('Failed to fetch wedding:', error);
    throw error;
  }
}
```

#### Naming Conventions

```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_GUESTS = 500;
const DEFAULT_TIMEZONE = 'Europe/Paris';

// Classes: PascalCase
class WeddingService {
  // ...
}

// Functions and variables: camelCase
function calculateTotalCost(items) {
  const totalCost = items.reduce((sum, item) => sum + item.price, 0);
  return totalCost;
}

// Private properties: underscore prefix (avoid if possible)
class User {
  constructor() {
    this._id = generateId();
  }
}

// Boolean variables: is/has/should prefix
const isAuthenticated = true;
const hasPermission = false;
const shouldUpdate = true;
```

#### Comments and Documentation

```javascript
/**
 * Creates a new wedding event
 * @param {Object} weddingData - Wedding information
 * @param {string} weddingData.date - Wedding date in ISO format
 * @param {string} weddingData.venue - Venue name
 * @param {number} weddingData.guestCount - Expected number of guests
 * @param {string} userId - ID of the user creating the wedding
 * @returns {Promise<Wedding>} Created wedding object
 * @throws {ValidationError} If wedding data is invalid
 * @throws {AuthorizationError} If user lacks permission
 * @example
 * const wedding = await createWedding({
 *   date: '2024-06-15',
 *   venue: 'Château de Versailles',
 *   guestCount: 150
 * }, userId);
 */
async function createWedding(weddingData, userId) {
  // Validate input
  validateWeddingData(weddingData);
  
  // Check user permissions
  await checkUserPermission(userId, 'wedding.create');
  
  // Create wedding
  const wedding = new Wedding({
    ...weddingData,
    createdBy: userId,
    createdAt: new Date()
  });
  
  // Save to database
  await wedding.save();
  
  // Trigger post-creation events
  await eventBus.emit('wedding.created', { wedding, userId });
  
  return wedding;
}

// Single-line comments for clarification
const guests = await fetchGuests(weddingId); // Includes plus-ones

// TODO comments for future work
// TODO: Implement guest seating optimization algorithm
// FIXME: Handle edge case when venue capacity is exceeded
// NOTE: This calculation includes service fees
```

### React/Component Guidelines

```jsx
// Functional components with hooks (preferred)
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const WeddingDashboard = ({ weddingId, userId }) => {
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeddingData();
  }, [weddingId]);

  const fetchWeddingData = async () => {
    try {
      setLoading(true);
      const data = await weddingService.getWedding(weddingId);
      setWedding(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!wedding) return <EmptyState />;

  return (
    <div className="wedding-dashboard">
      <h1>{wedding.coupleName}'s Wedding</h1>
      <WeddingStats wedding={wedding} />
      <GuestList weddingId={weddingId} />
    </div>
  );
};

WeddingDashboard.propTypes = {
  weddingId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired
};

export default WeddingDashboard;

// Custom hooks in separate files
// hooks/useWedding.js
export const useWedding = (weddingId) => {
  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch logic
  }, [weddingId]);

  return { wedding, loading };
};
```

### API Design Guidelines

```javascript
// RESTful route structure
// routes/weddings.js

router.get('/weddings', authenticate, getWeddings);           // List
router.get('/weddings/:id', authenticate, getWedding);        // Get one
router.post('/weddings', authenticate, createWedding);        // Create
router.put('/weddings/:id', authenticate, updateWedding);     // Update
router.delete('/weddings/:id', authenticate, deleteWedding);  // Delete

// Nested resources
router.get('/weddings/:weddingId/guests', getWeddingGuests);
router.post('/weddings/:weddingId/guests', addWeddingGuest);

// Controller implementation
const getWeddings = async (req, res, next) => {
  try {
    // Parse query parameters
    const {
      page = 1,
      limit = 20,
      sort = '-createdAt',
      status,
      search
    } = req.query;

    // Build query
    const query = {
      userId: req.user.id
    };

    if (status) query.status = status;
    if (search) query.$text = { $search: search };

    // Execute query with pagination
    const weddings = await Wedding.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('venue')
      .lean();

    const count = await Wedding.countDocuments(query);

    // Return response
    res.json({
      success: true,
      data: {
        weddings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
```

### Error Handling

```javascript
// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    error: err,
    request: req.url,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError('Validation failed', errors);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ValidationError(`${field} already exists`);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
```

## Development Workflow

### Git Workflow

We use Git Flow with the following branch structure:

```bash
main          # Production-ready code
├── develop   # Integration branch
├── feature/  # New features
├── bugfix/   # Bug fixes
├── hotfix/   # Production hotfixes
└── release/  # Release preparation
```

#### Creating a Feature

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/guest-seating-chart

# Work on feature
git add .
git commit -m "feat: add guest seating chart functionality"

# Push to remote
git push -u origin feature/guest-seating-chart

# Create pull request to develop
```

#### Commit Message Convention

We follow Conventional Commits specification:

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/modifications
- `chore`: Build process or auxiliary tool changes

Examples:

```bash
feat(wedding): add venue availability check

fix(auth): resolve token expiration issue

docs(api): update wedding endpoints documentation

perf(guest): optimize guest list query

chore(deps): update dependencies
```

### Code Review Process

1. **Self-Review Checklist**

Before submitting PR:
- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs or debugger statements
- [ ] Translations added for new strings
- [ ] Performance impact considered

2. **Pull Request Template**

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows project guidelines
- [ ] I have performed self-review
- [ ] I have added tests
- [ ] I have updated documentation
```

3. **Review Guidelines**

Reviewers should check:
- Functionality correctness
- Code quality and standards
- Test coverage
- Performance implications
- Security considerations
- Documentation completeness

## Testing Guidelines

### Test Structure

```javascript
// user.service.test.js
const UserService = require('../src/services/UserService');
const User = require('../src/models/User');

// Mock dependencies
jest.mock('../src/models/User');

describe('UserService', () => {
  let userService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@attitudes.vip',
        firstName: 'John',
        lastName: 'Doe'
      };
      const mockUser = { id: '123', ...userData };
      User.create.mockResolvedValue(mockUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(User.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockUser);
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### Integration Tests

```javascript
// api.integration.test.js
const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, teardownTestDB } = require('./helpers/testDb');

describe('Wedding API Integration', () => {
  let authToken;

  beforeAll(async () => {
    await setupTestDB();
    // Create test user and get auth token
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@attitudes.vip',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User'
      });
    authToken = response.body.data.token;
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  describe('POST /api/v1/weddings', () => {
    it('should create a wedding', async () => {
      const response = await request(app)
        .post('/api/v1/weddings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: '2024-06-15',
          venue: 'Test Venue',
          guestCount: 100
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wedding).toHaveProperty('id');
    });
  });
});
```

### E2E Tests

```javascript
// wedding-flow.e2e.js
const { test, expect } = require('@playwright/test');

test.describe('Wedding Planning Flow', () => {
  test('should complete wedding setup', async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('#email', 'test@attitudes.vip');
    await page.fill('#password', 'Test123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForSelector('.dashboard');

    // Create wedding
    await page.click('button:has-text("Create Wedding")');
    await page.fill('#wedding-date', '2024-06-15');
    await page.fill('#venue-name', 'Beautiful Venue');
    await page.fill('#guest-count', '150');
    await page.click('button:has-text("Save")');

    // Verify creation
    await expect(page.locator('.wedding-card')).toBeVisible();
    await expect(page.locator('.wedding-date')).toContainText('June 15, 2024');
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test user.service.test.js

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests in debug mode
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## API Development

### Creating a New Endpoint

1. **Define Route**

```javascript
// routes/vendors.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor
} = require('../controllers/vendorController');

// Apply authentication to all routes
router.use(authenticate);

// Routes
router.route('/')
  .get(getVendors)
  .post(authorize('vendor.create'), createVendor);

router.route('/:id')
  .get(getVendor)
  .put(authorize('vendor.update'), updateVendor)
  .delete(authorize('vendor.delete'), deleteVendor);

module.exports = router;
```

2. **Implement Controller**

```javascript
// controllers/vendorController.js
const { VendorService } = require('../services');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getVendors = asyncHandler(async (req, res) => {
  const vendors = await VendorService.getVendors(req.query, req.user);
  
  res.json({
    success: true,
    data: vendors
  });
});

exports.createVendor = asyncHandler(async (req, res) => {
  const vendor = await VendorService.createVendor(req.body, req.user);
  
  res.status(201).json({
    success: true,
    data: vendor
  });
});
```

3. **Add Service Logic**

```javascript
// services/VendorService.js
class VendorService {
  async getVendors(filters, user) {
    const query = this.buildQuery(filters, user);
    const vendors = await Vendor.find(query)
      .populate('reviews')
      .lean();
    
    return vendors;
  }

  async createVendor(vendorData, user) {
    // Validate data
    await this.validateVendorData(vendorData);
    
    // Check permissions
    await this.checkPermissions(user, 'create');
    
    // Create vendor
    const vendor = await Vendor.create({
      ...vendorData,
      createdBy: user.id
    });
    
    // Send notifications
    await NotificationService.notifyVendorCreated(vendor);
    
    return vendor;
  }
}
```

### API Documentation

Use JSDoc comments for automatic API documentation:

```javascript
/**
 * @swagger
 * /api/v1/vendors:
 *   get:
 *     summary: Get list of vendors
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [photographer, dj, caterer, florist]
 *         description: Filter by vendor type
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *     responses:
 *       200:
 *         description: List of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 */
```

## Frontend Development

### Component Development

1. **Component Structure**

```jsx
// components/GuestList/GuestList.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWedding } from '../../hooks/useWedding';
import GuestTable from './GuestTable';
import GuestFilters from './GuestFilters';
import GuestActions from './GuestActions';
import './GuestList.css';

const GuestList = ({ weddingId }) => {
  const { t } = useTranslation();
  const { wedding, loading } = useWedding(weddingId);
  const [guests, setGuests] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (wedding) {
      fetchGuests();
    }
  }, [wedding, filters]);

  const fetchGuests = async () => {
    // Fetch logic
  };

  return (
    <div className="guest-list">
      <div className="guest-list__header">
        <h2>{t('guests.title')}</h2>
        <GuestActions onAction={handleAction} />
      </div>
      
      <GuestFilters 
        filters={filters}
        onChange={setFilters}
      />
      
      <GuestTable 
        guests={guests}
        loading={loading}
        onUpdate={fetchGuests}
      />
    </div>
  );
};

export default GuestList;
```

2. **Styling with Tailwind CSS**

```jsx
// Using Tailwind utility classes
<div className="flex flex-col space-y-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-gray-800">
    {wedding.title}
  </h2>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-blue-50 p-4 rounded">
      <p className="text-sm text-gray-600">{t('wedding.date')}</p>
      <p className="text-lg font-semibold">{formatDate(wedding.date)}</p>
    </div>
  </div>
</div>

// Custom CSS when needed
/* components/GuestList/GuestList.css */
.guest-list {
  @apply container mx-auto py-8;
}

.guest-list__header {
  @apply flex justify-between items-center mb-6;
}

/* Complex animations or specific styles */
@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.guest-list__item {
  animation: slideIn 0.3s ease-out;
}
```

### State Management

```javascript
// Using React Context for global state
// contexts/WeddingContext.js
import React, { createContext, useContext, useReducer } from 'react';

const WeddingContext = createContext();

const weddingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_WEDDING':
      return { ...state, wedding: action.payload };
    case 'UPDATE_GUEST_COUNT':
      return {
        ...state,
        wedding: {
          ...state.wedding,
          guestCount: action.payload
        }
      };
    default:
      return state;
  }
};

export const WeddingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(weddingReducer, {
    wedding: null,
    loading: false
  });

  return (
    <WeddingContext.Provider value={{ state, dispatch }}>
      {children}
    </WeddingContext.Provider>
  );
};

export const useWeddingContext = () => {
  const context = useContext(WeddingContext);
  if (!context) {
    throw new Error('useWeddingContext must be used within WeddingProvider');
  }
  return context;
};
```

### Performance Optimization

```jsx
// Memoization for expensive calculations
import React, { useMemo, useCallback, memo } from 'react';

const GuestStatistics = memo(({ guests }) => {
  const statistics = useMemo(() => {
    return {
      total: guests.length,
      confirmed: guests.filter(g => g.rsvpStatus === 'confirmed').length,
      pending: guests.filter(g => g.rsvpStatus === 'pending').length,
      dietary: guests.filter(g => g.dietaryRestrictions).length
    };
  }, [guests]);

  return (
    <div className="statistics">
      <Stat label="Total" value={statistics.total} />
      <Stat label="Confirmed" value={statistics.confirmed} />
      <Stat label="Pending" value={statistics.pending} />
      <Stat label="Dietary" value={statistics.dietary} />
    </div>
  );
});

// Lazy loading for code splitting
const VendorDashboard = React.lazy(() => 
  import('./dashboards/VendorDashboard')
);

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <VendorDashboard />
</Suspense>

// Virtualization for long lists
import { FixedSizeList } from 'react-window';

const GuestVirtualList = ({ guests }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <GuestRow guest={guests[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={guests.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

## Database Development

### Migration Management

```javascript
// migrations/20240115_create_vendors_table.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendors', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM(
          'photographer',
          'dj',
          'caterer',
          'florist',
          'planner'
        ),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      rating: {
        type: Sequelize.DECIMAL(2, 1),
        defaultValue: 0,
        validate: {
          min: 0,
          max: 5
        }
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('vendors', ['type']);
    await queryInterface.addIndex('vendors', ['rating']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendors');
  }
};
```

### Query Optimization

```javascript
// Efficient queries with proper indexing
class WeddingRepository {
  async getWeddingsWithStats(userId, options = {}) {
    const weddings = await Wedding.findAll({
      where: { userId },
      include: [
        {
          model: Guest,
          attributes: [],
          duplicating: false
        },
        {
          model: Vendor,
          attributes: [],
          duplicating: false
        }
      ],
      attributes: {
        include: [
          // Count guests
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM guests
              WHERE guests.wedding_id = Wedding.id
            )`),
            'guestCount'
          ],
          // Count confirmed guests
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM guests
              WHERE guests.wedding_id = Wedding.id
              AND guests.rsvp_status = 'confirmed'
            )`),
            'confirmedGuestCount'
          ],
          // Calculate total vendor cost
          [
            sequelize.literal(`(
              SELECT COALESCE(SUM(pricing), 0)
              FROM vendors
              WHERE vendors.wedding_id = Wedding.id
              AND vendors.status = 'booked'
            )`),
            'totalVendorCost'
          ]
        ]
      },
      order: [['weddingDate', 'ASC']],
      limit: options.limit || 10,
      offset: options.offset || 0
    });

    return weddings;
  }
}

// Using database views for complex queries
CREATE VIEW wedding_summary AS
SELECT 
  w.id,
  w.wedding_date,
  w.venue_name,
  COUNT(DISTINCT g.id) as guest_count,
  COUNT(DISTINCT v.id) as vendor_count,
  SUM(v.pricing) as total_cost
FROM weddings w
LEFT JOIN guests g ON g.wedding_id = w.id
LEFT JOIN vendors v ON v.wedding_id = w.id
GROUP BY w.id;
```

## Common Tasks

### Adding a New Feature

1. **Plan the Feature**
   - Create design document
   - Define API endpoints
   - Plan database schema
   - Create test scenarios

2. **Implementation Steps**

```bash
# 1. Create feature branch
git checkout -b feature/vendor-reviews

# 2. Add database migration
npm run migration:create add-vendor-reviews

# 3. Update models
# models/VendorReview.js

# 4. Add service logic
# services/VendorReviewService.js

# 5. Create API endpoints
# routes/vendorReviews.js

# 6. Add tests
# tests/vendorReviews.test.js

# 7. Update documentation
# docs/api/vendor-reviews.md

# 8. Create UI components
# components/VendorReviews/

# 9. Add translations
# i18n/locales/*/vendorReviews.json
```

### Debugging

```javascript
// Using debug module
const debug = require('debug')('app:wedding');

debug('Creating wedding for user %s', userId);

// Set DEBUG environment variable
DEBUG=app:* npm run dev

// VS Code debugging configuration
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/src/server.js",
      "envFile": "${workspaceFolder}/.env.development"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}

// Chrome DevTools for Node.js
node --inspect src/server.js
# Open chrome://inspect in Chrome
```

### Performance Profiling

```javascript
// Using built-in profiler
node --prof src/server.js
# Process the log
node --prof-process isolate-*.log > profile.txt

// Memory profiling
const v8 = require('v8');
const heapSnapshot = v8.writeHeapSnapshot();

// CPU profiling with clinic.js
npx clinic doctor -- node src/server.js
npx clinic flame -- node src/server.js
npx clinic bubbleprof -- node src/server.js
```

## Troubleshooting

### Common Issues

#### 1. Module Not Found

```bash
Error: Cannot find module 'express'

# Solution
rm -rf node_modules package-lock.json
npm install
```

#### 2. Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

#### 3. Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### 4. Tests Failing

```bash
# Clear Jest cache
npm run test -- --clearCache

# Run single test
npm test -- --testNamePattern="should create user"

# Update snapshots
npm test -- -u
```

### Logging and Monitoring

```javascript
// Structured logging
const logger = require('./utils/logger');

logger.info('Server started', {
  port: 3000,
  environment: 'development',
  nodeVersion: process.version
});

logger.error('Database query failed', {
  query: 'SELECT * FROM users',
  error: err.message,
  stack: err.stack
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      userAgent: req.get('user-agent')
    });
  });
  
  next();
});
```

### Development Tips

1. **Use Environment Variables**

```bash
# .env.development
DEBUG=app:*
LOG_LEVEL=debug
PRETTY_LOGS=true
```

2. **Hot Reloading**

```json
// nodemon.json
{
  "watch": ["src"],
  "ext": "js,json",
  "ignore": ["src/**/*.test.js"],
  "exec": "node src/server.js",
  "env": {
    "NODE_ENV": "development"
  }
}
```

3. **Database Seeding**

```javascript
// scripts/seed.js
const faker = require('faker');

async function seedDatabase() {
  // Create users
  const users = await Promise.all(
    Array(10).fill().map(() => 
      User.create({
        email: faker.internet.email(),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
      })
    )
  );

  // Create weddings
  for (const user of users) {
    await Wedding.create({
      userId: user.id,
      date: faker.date.future(),
      venue: faker.company.companyName(),
      guestCount: faker.random.number({ min: 50, max: 300 })
    });
  }
}
```

## Resources

### Internal Documentation
- [API Documentation](/docs/api)
- [Architecture Guide](/docs/architecture)
- [Deployment Guide](/docs/deployment)
- [Security Guide](/docs/security)

### External Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Documentation](https://reactjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Learning Resources
- Team knowledge base
- Code review guidelines
- Architecture decision records
- Performance optimization guides

## Getting Help

- **Slack**: #dev-attitudes-vip
- **Wiki**: https://wiki.attitudes.vip
- **Issue Tracker**: https://github.com/attitudes-vip/attitudes-framework/issues

Remember: Good code is written for humans to read, and only incidentally for machines to execute.