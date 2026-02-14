# API Documentation - Attitudes.vip

## 📚 Vue d'ensemble

L'API Attitudes.vip est une API RESTful complète pour la gestion de mariages, offrant des fonctionnalités pour les couples, vendors, et invités.

### 🌐 Base URLs

- **Development**: `http://localhost:3000/api/v1`
- **Staging**: `https://staging.attitudes.vip/api/v1`
- **Production**: `https://api.attitudes.vip/v1`

### 📖 Documentation Interactive

La documentation Swagger/OpenAPI est disponible à : `/api/v1/docs`

## 🔐 Authentification

L'API utilise JWT (JSON Web Tokens) pour l'authentification.

### Obtenir un token

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Utiliser le token

Incluez le token dans l'header `Authorization`:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 🚀 Endpoints Principaux

### Authentication
- `POST /auth/register` - Créer un compte
- `POST /auth/login` - Se connecter
- `POST /auth/logout` - Se déconnecter
- `POST /auth/refresh` - Rafraîchir le token
- `POST /auth/forgot-password` - Mot de passe oublié
- `POST /auth/reset-password` - Réinitialiser le mot de passe
- `GET /auth/oauth/:provider` - OAuth login

### Users
- `GET /users/me` - Profil utilisateur
- `PUT /users/me` - Mettre à jour le profil
- `POST /users/me/avatar` - Upload avatar
- `DELETE /users/me` - Supprimer le compte

### Vendors
- `GET /vendors` - Lister les vendors
- `GET /vendors/:id` - Détails d'un vendor
- `POST /vendors` - Créer un vendor
- `PUT /vendors/:id` - Mettre à jour
- `GET /vendors/:id/availability` - Disponibilités
- `GET /vendors/:id/reviews` - Avis
- `POST /vendors/search` - Recherche avancée

### Weddings
- `GET /weddings` - Mes mariages
- `POST /weddings` - Créer un mariage
- `GET /weddings/:id` - Détails
- `PUT /weddings/:id` - Mettre à jour
- `GET /weddings/:id/guests` - Liste des invités
- `POST /weddings/:id/guests` - Ajouter des invités
- `GET /weddings/:id/vendors` - Vendors assignés
- `GET /weddings/:id/timeline` - Timeline du jour J
- `GET /weddings/:id/budget` - Budget détaillé

### Payments
- `POST /payments/checkout` - Créer une session de paiement
- `GET /payments` - Historique des paiements
- `GET /payments/:id` - Détails d'un paiement
- `POST /payments/:id/refund` - Remboursement
- `GET /payments/invoices` - Factures
- `GET /payments/methods` - Moyens de paiement

### Notifications
- `GET /notifications` - Mes notifications
- `PUT /notifications/:id/read` - Marquer comme lu
- `GET /notifications/preferences` - Préférences
- `PUT /notifications/preferences` - Mettre à jour préférences

### Analytics
- `GET /analytics/dashboard` - Stats dashboard
- `GET /analytics/revenue` - Stats revenus
- `GET /analytics/vendors` - Stats vendors
- `GET /analytics/guests` - Stats invités
- `POST /analytics/export` - Export données

## 📊 Formats de Réponse

### Succès
```json
{
  "success": true,
  "data": {
    // Données de la réponse
  }
}
```

### Erreur
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Pagination
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## 🔧 Rate Limiting

Les limites varient selon les endpoints:

- Auth endpoints: 5 requêtes / 15 min
- Search: 30 requêtes / minute
- Général: 100 requêtes / 15 min

Headers de réponse:
- `X-RateLimit-Limit`: Limite totale
- `X-RateLimit-Remaining`: Requêtes restantes
- `X-RateLimit-Reset`: Timestamp de reset

## 🛡️ Sécurité

### Headers requis
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (endpoints authentifiés)

### CORS
Les origines autorisées doivent être configurées. Par défaut:
- `http://localhost:3000`
- `https://attitudes.vip`
- `https://*.attitudes.vip`

### Validation
Toutes les entrées sont validées. Les erreurs retournent:
```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 🚀 Optimisations

### Cache
- Les réponses GET sont cachées (5-60 min selon l'endpoint)
- Headers `ETag` pour validation conditionnelle
- Cache-Control configuré par type de contenu

### Compression
- Gzip activé pour réponses > 1KB
- Brotli disponible si supporté

### Performance
- Connection pooling PostgreSQL
- Redis cache multi-niveaux
- Requêtes optimisées avec indexes

## 📝 Exemples

### Créer un vendor
```bash
curl -X POST https://api.attitudes.vip/v1/vendors \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elite Photography",
    "type": "photographer",
    "description": "Photographe professionnel",
    "base_price": 2500
  }'
```

### Rechercher des vendors
```bash
curl -X POST https://api.attitudes.vip/v1/vendors/search \
  -H "Content-Type: application/json" \
  -d '{
    "q": "photographe paris",
    "filters": {
      "type": "photographer",
      "minRating": 4.5,
      "maxPrice": 3000
    }
  }'
```

### Créer une session de paiement
```bash
curl -X POST https://api.attitudes.vip/v1/payments/checkout \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "123e4567-e89b-12d3-a456-426614174000",
    "wedding_id": "456e7890-e89b-12d3-a456-426614174000",
    "amount": 2500,
    "payment_type": "deposit",
    "deposit_percentage": 30
  }'
```

## 🐛 Debugging

### Health Check
```bash
GET /api/v1/health
```

### Métriques
```bash
GET /api/v1/metrics/performance
GET /api/v1/metrics/cache
```

## 📞 Support

- Email: api@attitudes.vip
- Documentation: https://docs.attitudes.vip
- Status: https://status.attitudes.vip