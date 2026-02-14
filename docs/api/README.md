# API Documentation - Attitudes.vip

## Overview

The Attitudes.vip API is a RESTful service that powers the wedding management platform. It provides endpoints for authentication, user management, wedding planning, vendor coordination, and multi-tenant operations.

## Base URL

```
https://api.attitudes.vip/api/v1
```

For local development:
```
http://localhost:3000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication with OAuth2 integration for social logins.

### JWT Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "customer",
  "tenantId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authentication Headers

```
Authorization: Bearer <token>
X-Tenant-ID: <tenant-uuid> (for multi-tenant operations)
```

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Rate Limiting

- Global limit: 100 requests per 15 minutes per IP
- Authenticated users: 1000 requests per 15 minutes
- Headers returned:
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "locale": "fr",
  "timezone": "Europe/Paris"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "customer"
    },
    "token": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

#### OAuth2 Login
```http
GET /api/v1/auth/oauth/{provider}
Providers: google, facebook, apple, twitter

Redirects to OAuth provider for authentication
```

#### Refresh Token
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "token": "new-jwt-token",
    "refreshToken": "new-refresh-token"
  }
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Logged out successfully"
}
```

### User Management

#### Get Current User
```http
GET /api/v1/users/me
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "tenantId": "uuid",
    "locale": "fr",
    "timezone": "Europe/Paris",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "locale": "en",
  "timezone": "America/New_York"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

#### Change Password
```http
POST /api/v1/users/me/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword123"
}

Response: 200 OK
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Wedding Management

#### List Weddings
```http
GET /api/v1/weddings
Authorization: Bearer <token>
Query Parameters:
  - status: planning|in_progress|completed|cancelled
  - page: 1
  - limit: 20
  - sort: createdAt|-createdAt|weddingDate|-weddingDate

Response: 200 OK
{
  "success": true,
  "data": {
    "weddings": [
      {
        "id": "uuid",
        "customerId": "uuid",
        "partnerName": "Jane Doe",
        "weddingDate": "2024-06-15",
        "venueName": "Château de Versailles",
        "venueAddress": "Place d'Armes, 78000 Versailles",
        "guestCount": 150,
        "budget": 50000.00,
        "status": "planning",
        "theme": "Classic Elegance",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### Create Wedding
```http
POST /api/v1/weddings
Authorization: Bearer <token>
Content-Type: application/json

{
  "partnerName": "Jane Doe",
  "weddingDate": "2024-06-15",
  "venueName": "Château de Versailles",
  "venueAddress": "Place d'Armes, 78000 Versailles",
  "guestCount": 150,
  "budget": 50000.00,
  "theme": "Classic Elegance"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "wedding": { ... }
  }
}
```

#### Get Wedding Details
```http
GET /api/v1/weddings/{weddingId}
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "wedding": { ... },
    "guests": { "total": 150, "confirmed": 120, "pending": 30 },
    "vendors": { "total": 8, "booked": 6, "pending": 2 },
    "tasks": { "total": 45, "completed": 30, "inProgress": 10, "pending": 5 }
  }
}
```

#### Update Wedding
```http
PUT /api/v1/weddings/{weddingId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "venueName": "New Venue",
  "guestCount": 200,
  "budget": 60000.00
}

Response: 200 OK
{
  "success": true,
  "data": {
    "wedding": { ... }
  }
}
```

#### Delete Wedding
```http
DELETE /api/v1/weddings/{weddingId}
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Wedding deleted successfully"
}
```

### Guest Management

#### List Wedding Guests
```http
GET /api/v1/weddings/{weddingId}/guests
Authorization: Bearer <token>
Query Parameters:
  - rsvpStatus: pending|confirmed|declined
  - tableNumber: 1-50
  - search: "John"
  - page: 1
  - limit: 50

Response: 200 OK
{
  "success": true,
  "data": {
    "guests": [
      {
        "id": "uuid",
        "weddingId": "uuid",
        "email": "guest@example.com",
        "firstName": "John",
        "lastName": "Smith",
        "phone": "+33612345678",
        "rsvpStatus": "confirmed",
        "dietaryRestrictions": "Vegetarian",
        "plusOne": true,
        "plusOneName": "Jane Smith",
        "tableNumber": 5
      }
    ],
    "statistics": {
      "total": 150,
      "confirmed": 120,
      "declined": 10,
      "pending": 20
    },
    "pagination": { ... }
  }
}
```

#### Add Guest
```http
POST /api/v1/weddings/{weddingId}/guests
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "guest@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+33612345678",
  "plusOne": true,
  "plusOneName": "Jane Smith"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "guest": { ... }
  }
}
```

#### Bulk Import Guests
```http
POST /api/v1/weddings/{weddingId}/guests/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

CSV file with columns: firstName, lastName, email, phone, plusOne, plusOneName

Response: 201 Created
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 2,
    "errors": [
      { "row": 12, "error": "Invalid email format" }
    ]
  }
}
```

#### Update Guest
```http
PUT /api/v1/weddings/{weddingId}/guests/{guestId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "rsvpStatus": "confirmed",
  "dietaryRestrictions": "Gluten-free",
  "tableNumber": 8
}

Response: 200 OK
{
  "success": true,
  "data": {
    "guest": { ... }
  }
}
```

#### Send RSVP Invitation
```http
POST /api/v1/weddings/{weddingId}/guests/{guestId}/send-invitation
Authorization: Bearer <token>
Content-Type: application/json

{
  "method": "email", // or "sms"
  "customMessage": "We would love to have you at our wedding!"
}

Response: 200 OK
{
  "success": true,
  "message": "Invitation sent successfully"
}
```

### Vendor Management

#### List Wedding Vendors
```http
GET /api/v1/weddings/{weddingId}/vendors
Authorization: Bearer <token>
Query Parameters:
  - type: photographer|dj|caterer|florist|planner|venue|patissier
  - status: contacted|quoted|booked|completed
  - search: "Studio"

Response: 200 OK
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "weddingId": "uuid",
        "userId": "uuid",
        "vendorType": "photographer",
        "name": "Elite Photography Studio",
        "email": "contact@elitephoto.com",
        "phone": "+33612345678",
        "services": {
          "packages": ["Premium", "Deluxe"],
          "duration": "8 hours",
          "deliverables": ["300+ edited photos", "Online gallery"]
        },
        "pricing": 3500.00,
        "status": "booked",
        "notes": "Includes drone photography"
      }
    ],
    "statistics": {
      "total": 8,
      "booked": 6,
      "totalSpent": 25000.00,
      "budgetRemaining": 25000.00
    }
  }
}
```

#### Add Vendor
```http
POST /api/v1/weddings/{weddingId}/vendors
Authorization: Bearer <token>
Content-Type: application/json

{
  "vendorType": "photographer",
  "name": "Elite Photography Studio",
  "email": "contact@elitephoto.com",
  "phone": "+33612345678",
  "services": {
    "packages": ["Premium", "Deluxe"],
    "duration": "8 hours"
  },
  "pricing": 3500.00,
  "status": "contacted"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "vendor": { ... }
  }
}
```

#### Search Marketplace Vendors
```http
GET /api/v1/vendors/marketplace
Authorization: Bearer <token>
Query Parameters:
  - type: photographer|dj|caterer|etc
  - location: "Paris"
  - priceMin: 1000
  - priceMax: 5000
  - rating: 4
  - availability: "2024-06-15"

Response: 200 OK
{
  "success": true,
  "data": {
    "vendors": [
      {
        "id": "uuid",
        "businessName": "Elite Photography",
        "type": "photographer",
        "location": "Paris",
        "rating": 4.8,
        "reviewCount": 127,
        "priceRange": "€€€",
        "portfolio": ["url1", "url2"],
        "availability": true
      }
    ],
    "filters": {
      "locations": ["Paris", "Lyon", "Marseille"],
      "priceRanges": ["€", "€€", "€€€", "€€€€"]
    }
  }
}
```

### Payment Management

#### Get Payment Summary
```http
GET /api/v1/weddings/{weddingId}/payments
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "data": {
    "budget": 50000.00,
    "spent": 25000.00,
    "pending": 5000.00,
    "remaining": 20000.00,
    "payments": [
      {
        "id": "uuid",
        "vendorId": "uuid",
        "amount": 3500.00,
        "status": "completed",
        "method": "card",
        "date": "2024-01-15T00:00:00Z"
      }
    ]
  }
}
```

#### Process Payment
```http
POST /api/v1/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "weddingId": "uuid",
  "vendorId": "uuid",
  "amount": 3500.00,
  "method": "card",
  "stripeToken": "tok_xxx"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "paymentId": "uuid",
    "status": "completed",
    "chargeId": "ch_xxx"
  }
}
```

### Notification Endpoints

#### Get Notifications
```http
GET /api/v1/notifications
Authorization: Bearer <token>
Query Parameters:
  - unread: true|false
  - type: task|payment|rsvp|vendor
  - page: 1
  - limit: 20

Response: 200 OK
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "rsvp",
        "title": "New RSVP Confirmation",
        "message": "John Smith has confirmed attendance",
        "read": false,
        "createdAt": "2024-01-15T10:30:00Z",
        "data": {
          "guestId": "uuid",
          "weddingId": "uuid"
        }
      }
    ],
    "unreadCount": 5
  }
}
```

#### Mark Notification as Read
```http
PUT /api/v1/notifications/{notificationId}/read
Authorization: Bearer <token>

Response: 200 OK
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### Update Notification Preferences
```http
PUT /api/v1/users/me/notification-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": {
    "taskReminders": true,
    "rsvpUpdates": true,
    "paymentReminders": true,
    "weeklyDigest": false
  },
  "push": {
    "enabled": true,
    "taskReminders": true,
    "rsvpUpdates": false
  },
  "sms": {
    "enabled": false
  }
}

Response: 200 OK
{
  "success": true,
  "data": {
    "preferences": { ... }
  }
}
```

### Dashboard Endpoints

#### Get Dashboard Data
```http
GET /api/v1/dashboards/{role}
Authorization: Bearer <token>
Roles: cio|admin|client|customer|invite|vendor|dj|wedding-planner|photographe|traiteur|patissier|location

Response: 200 OK
{
  "success": true,
  "data": {
    "role": "customer",
    "widgets": {
      "overview": {
        "daysUntilWedding": 120,
        "completionPercentage": 65,
        "activeAlerts": 3
      },
      "tasks": {
        "total": 45,
        "completed": 30,
        "upcoming": [...]
      },
      "budget": {
        "total": 50000,
        "spent": 25000,
        "breakdown": [...]
      },
      "guests": {
        "total": 150,
        "confirmed": 120,
        "recentActivity": [...]
      }
    }
  }
}
```

### WebSocket Events

The API supports real-time updates via WebSocket connections.

#### Connection
```javascript
const socket = io('wss://api.attitudes.vip', {
  auth: {
    token: 'jwt-token'
  }
});
```

#### Events

**Guest RSVP Update**
```javascript
socket.on('guest:rsvp', (data) => {
  // { guestId, weddingId, rsvpStatus, timestamp }
});
```

**Task Update**
```javascript
socket.on('task:update', (data) => {
  // { taskId, weddingId, status, assignee, timestamp }
});
```

**Vendor Status Change**
```javascript
socket.on('vendor:status', (data) => {
  // { vendorId, weddingId, status, timestamp }
});
```

**Notification**
```javascript
socket.on('notification', (data) => {
  // { id, type, title, message, priority, timestamp }
});
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH001 | Invalid credentials |
| AUTH002 | Token expired |
| AUTH003 | Insufficient permissions |
| AUTH004 | Account locked |
| VAL001 | Validation error |
| VAL002 | Missing required field |
| VAL003 | Invalid format |
| RES001 | Resource not found |
| RES002 | Resource already exists |
| RATE001 | Rate limit exceeded |
| PAY001 | Payment failed |
| PAY002 | Insufficient funds |
| SYS001 | Internal server error |
| SYS002 | Service unavailable |

## Pagination

All list endpoints support pagination:

```
GET /api/v1/resource?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Filtering and Sorting

Most list endpoints support filtering and sorting:

```
GET /api/v1/resource?filter[status]=active&filter[type]=premium&sort=-createdAt
```

- Use `filter[field]=value` for filtering
- Use `sort=field` for ascending sort
- Use `sort=-field` for descending sort
- Multiple sorts: `sort=field1,-field2`

## Internationalization

The API supports multiple languages. Set the `Accept-Language` header:

```
Accept-Language: fr-FR
```

Supported languages:
- fr-FR (French)
- en-US (English)
- es-ES (Spanish)
- de-DE (German)
- it-IT (Italian)
- pt-PT (Portuguese)
- ar-SA (Arabic)
- zh-CN (Chinese)
- ja-JP (Japanese)

## Webhooks

Configure webhooks for event notifications:

```http
POST /api/v1/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["guest.rsvp", "payment.completed", "vendor.booked"],
  "secret": "webhook-secret"
}
```

Webhook payload includes HMAC-SHA256 signature in `X-Webhook-Signature` header.

## Testing

### Test Endpoints

In development/staging environments:

```http
POST /api/v1/test/reset-db
POST /api/v1/test/seed-data
GET /api/v1/test/health
```

### Sample cURL Commands

```bash
# Register
curl -X POST https://api.attitudes.vip/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Login
curl -X POST https://api.attitudes.vip/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get weddings
curl -X GET https://api.attitudes.vip/api/v1/weddings \
  -H "Authorization: Bearer <token>"
```

## SDK Support

Official SDKs available:
- JavaScript/TypeScript: `npm install @attitudes-vip/sdk`
- Python: `pip install attitudes-vip`
- PHP: `composer require attitudes-vip/sdk`

## Support

- Documentation: https://docs.attitudes.vip
- API Status: https://status.attitudes.vip
- Support: support@attitudes.vip