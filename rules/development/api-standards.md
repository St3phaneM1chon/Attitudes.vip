# 🌐 Standards API REST

## 📖 Documentation OpenAPI Obligatoire

### ✅ OBLIGATOIRE - Spécification OpenAPI 3.0
```yaml
openapi: 3.0.3
info:
  title: Attitudes.vip API
  version: 1.0.0
  description: |
    API pour la plateforme de gestion de mariages
    
    ## Authentification
    Toutes les requêtes nécessitent un token JWT
    
    ## Rate Limiting
    - 100 requêtes/minute pour les utilisateurs authentifiés
    - 20 requêtes/minute pour les utilisateurs anonymes
  
servers:
  - url: https://api.attitudes.vip/v1
    description: Production
  - url: https://staging-api.attitudes.vip/v1
    description: Staging

security:
  - bearerAuth: []

paths:
  /weddings:
    get:
      summary: Liste des mariages
      operationId: listWeddings
      tags:
        - Weddings
      parameters:
        - $ref: '#/components/parameters/PageParam'
        - $ref: '#/components/parameters/LimitParam'
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, published, archived]
      responses:
        200:
          description: Liste paginée des mariages
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WeddingList'
              examples:
                success:
                  $ref: '#/components/examples/WeddingListExample'
        401:
          $ref: '#/components/responses/Unauthorized'
        429:
          $ref: '#/components/responses/RateLimited'
```

## 🔄 Versioning API

### ✅ OBLIGATOIRE - Stratégie de Versioning
```javascript
// Version dans l'URL
app.use('/v1', v1Routes);
app.use('/v2', v2Routes);

// Headers de version
app.use((req, res, next) => {
  res.set({
    'X-API-Version': '1.0.0',
    'X-API-Deprecation': req.path.includes('/v1') ? '2025-12-31' : null
  });
  next();
});

// ✅ OBLIGATOIRE - Rétrocompatibilité
const weddingTransformer = {
  v1ToV2: (v1Wedding) => ({
    ...v1Wedding,
    eventDate: v1Wedding.date, // Renommage
    venue: {
      name: v1Wedding.venueName,
      address: v1Wedding.venueAddress
    }
  }),
  
  v2ToV1: (v2Wedding) => ({
    ...v2Wedding,
    date: v2Wedding.eventDate,
    venueName: v2Wedding.venue?.name,
    venueAddress: v2Wedding.venue?.address
  })
};
```

## 📐 Structure des Endpoints

### ✅ OBLIGATOIRE - Conventions REST
```javascript
// Resources au pluriel
GET    /api/v1/weddings         // Liste
POST   /api/v1/weddings         // Créer
GET    /api/v1/weddings/:id     // Détails
PUT    /api/v1/weddings/:id     // Remplacer
PATCH  /api/v1/weddings/:id     // Modifier partiellement
DELETE /api/v1/weddings/:id     // Supprimer

// Sous-resources
GET    /api/v1/weddings/:id/guests
POST   /api/v1/weddings/:id/guests
DELETE /api/v1/weddings/:id/guests/:guestId

// Actions (verbes)
POST   /api/v1/weddings/:id/publish
POST   /api/v1/weddings/:id/archive
POST   /api/v1/weddings/:id/clone
```

## 📊 Format des Réponses

### ✅ OBLIGATOIRE - Structure JSON Standard
```javascript
// Succès - Resource unique
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "wedding",
    "attributes": {
      "date": "2025-06-15",
      "venue": "Grand Hotel",
      "status": "published"
    },
    "relationships": {
      "organizer": {
        "data": { "type": "user", "id": "123" }
      },
      "guests": {
        "data": [
          { "type": "guest", "id": "456" }
        ],
        "meta": { "count": 150 }
      }
    }
  },
  "meta": {
    "version": "1.0.0",
    "timestamp": "2025-06-27T10:00:00Z"
  }
}

// Succès - Collection
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 100,
      "totalPages": 5
    }
  },
  "links": {
    "self": "/api/v1/weddings?page=1",
    "first": "/api/v1/weddings?page=1",
    "last": "/api/v1/weddings?page=5",
    "next": "/api/v1/weddings?page=2",
    "prev": null
  }
}

// Erreur
{
  "errors": [
    {
      "id": "err_123",
      "status": "400",
      "code": "VALIDATION_ERROR",
      "title": "Validation Failed",
      "detail": "The date field must be in the future",
      "source": {
        "pointer": "/data/attributes/date",
        "parameter": "date"
      },
      "meta": {
        "timestamp": "2025-06-27T10:00:00Z",
        "request_id": "req_abc123"
      }
    }
  ]
}
```

## 🔒 Codes de Statut HTTP

### ✅ OBLIGATOIRE - Utilisation Correcte
```javascript
// 2xx - Succès
200 OK                  // GET, PUT, PATCH
201 Created             // POST avec création
202 Accepted            // Traitement asynchrone
204 No Content          // DELETE, PUT sans body

// 3xx - Redirection
301 Moved Permanently   // Resource déplacée
304 Not Modified        // Cache valide

// 4xx - Erreur client
400 Bad Request         // Validation échouée
401 Unauthorized        // Non authentifié
403 Forbidden           // Pas les permissions
404 Not Found           // Resource inexistante
409 Conflict            // Conflit (ex: duplicate)
422 Unprocessable       // Validation métier échouée
429 Too Many Requests   // Rate limit atteint

// 5xx - Erreur serveur
500 Internal Error      // Erreur non gérée
502 Bad Gateway         // Service down
503 Service Unavailable // Maintenance
504 Gateway Timeout     // Timeout
```

## 🔍 Filtrage et Recherche

### ✅ OBLIGATOIRE - Query Parameters Standards
```javascript
// Filtrage
GET /api/v1/weddings?status=published&year=2025

// Recherche
GET /api/v1/weddings?q=beach+wedding

// Tri
GET /api/v1/weddings?sort=-date,venue  // - pour DESC

// Pagination
GET /api/v1/weddings?page=2&limit=20

// Projection (fields)
GET /api/v1/weddings?fields=id,date,venue

// Inclusion de relations
GET /api/v1/weddings?include=organizer,venue.address

// Implémentation
const parseQueryParams = (req) => {
  const {
    q,                      // search
    sort = '-createdAt',    // default sort
    page = 1,
    limit = 20,
    fields,
    include,
    ...filters              // autres sont des filtres
  } = req.query;
  
  return {
    search: q,
    sort: parseSort(sort),
    pagination: { page: +page, limit: Math.min(+limit, 100) },
    projection: fields?.split(','),
    includes: include?.split(','),
    filters
  };
};
```

## 🔐 Headers de Sécurité

### ✅ OBLIGATOIRE - Headers API
```javascript
app.use((req, res, next) => {
  res.set({
    // Sécurité
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    // API
    'X-API-Version': API_VERSION,
    'X-RateLimit-Limit': req.rateLimit?.limit,
    'X-RateLimit-Remaining': req.rateLimit?.remaining,
    'X-RateLimit-Reset': req.rateLimit?.resetTime,
    
    // CORS
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  });
  next();
});
```

## 📝 Validation des Données

### ✅ OBLIGATOIRE - Validation avec Joi/Yup
```javascript
const weddingSchema = Joi.object({
  date: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'La date doit être dans le futur',
      'any.required': 'La date est requise'
    }),
    
  venue: Joi.string()
    .min(3)
    .max(100)
    .required(),
    
  budget: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
    
  guestCount: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .optional()
});

// Middleware de validation
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      code: 'VALIDATION_ERROR',
      title: 'Validation Failed',
      detail: detail.message,
      source: { pointer: `/data/attributes/${detail.path.join('.')}` }
    }));
    
    return res.status(400).json({ errors });
  }
  
  req.validatedBody = value;
  next();
};
```

## 🚀 Performance API

### ✅ OBLIGATOIRE - Optimisations
```javascript
// 1. Compression
app.use(compression());

// 2. Caching
app.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 min
      'ETag': generateETag(req.url)
    });
  }
  next();
});

// 3. Pagination obligatoire
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// 4. Query optimization
const optimizedQuery = async (query, options) => {
  return await db.query(query)
    .select(options.fields || '*')
    .limit(options.limit || DEFAULT_PAGE_SIZE)
    .offset(options.offset || 0)
    .cache(300); // 5 min cache
};
```

## 📊 Monitoring et Métriques

### ✅ OBLIGATOIRE - Métriques API
```javascript
// Prometheus metrics
const promClient = require('prom-client');

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});
```

## 🧪 Tests d'API

### ✅ OBLIGATOIRE - Tests Postman/Newman
```json
{
  "info": {
    "name": "Attitudes API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Wedding",
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status code is 201', () => {",
              "  pm.response.to.have.status(201);",
              "});",
              "",
              "pm.test('Response has wedding ID', () => {",
              "  const jsonData = pm.response.json();",
              "  pm.expect(jsonData.data).to.have.property('id');",
              "  pm.environment.set('weddingId', jsonData.data.id);",
              "});",
              "",
              "pm.test('Response time < 200ms', () => {",
              "  pm.expect(pm.response.responseTime).to.be.below(200);",
              "});"
            ]
          }
        }
      ],
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{authToken}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"date\": \"2025-06-15\",\n  \"venue\": \"Grand Hotel\"\n}"
        },
        "url": "{{baseUrl}}/api/v1/weddings"
      }
    }
  ]
}
```

## 📋 Checklist de Conformité API

- [ ] Documentation OpenAPI complète
- [ ] Exemples pour chaque endpoint
- [ ] Codes d'erreur documentés
- [ ] Versioning implémenté
- [ ] Format JSON:API respecté
- [ ] Validation des entrées
- [ ] Headers de sécurité
- [ ] Rate limiting configuré
- [ ] Monitoring en place
- [ ] Tests automatisés

---

**Une API bien conçue est le fondement d'une application scalable et maintenable!** 🏗️