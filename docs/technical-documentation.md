# 📚 Documentation Technique - Attitudes.vip

## 📋 Table des matières

1. [Architecture générale](#architecture-générale)
2. [Infrastructure](#infrastructure)
3. [Services](#services)
4. [API](#api)
5. [Base de données](#base-de-données)
6. [Sécurité](#sécurité)
7. [Monitoring](#monitoring)
8. [Déploiement](#déploiement)
9. [Développement](#développement)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture générale

### Vue d'ensemble

Attitudes.vip est une plateforme de gestion de mariages multi-tenant avec 7 types d'utilisateurs, supportant 50+ langues et 9 dialectes créoles. L'architecture suit les principes de microservices avec une approche cloud-native.

### Composants principaux

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Auth Service  │    │   API Gateway   │
│   (React/Vue)   │◄──►│   (Node.js)     │◄──►│   (Nginx)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │     Redis       │    │   Monitoring    │
│   (Database)    │    │   (Cache/Session)│   │ (Prometheus)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Types d'utilisateurs

1. **CIO** - Administrateur système
2. **Admin** - Administrateur client
3. **Client** - Gestionnaire de marque
4. **Customer** - Mariés
5. **Invite** - Invités
6. **DJ** - Disc-jockey
7. **Photographe** - Photographe
8. **Traiteur** - Traiteur
9. **Wedding Planner** - Organisateur de mariage
10. **Patissier** - Pâtissier
11. **Location** - Gestionnaire de salle

---

## 🏢 Infrastructure

### Kubernetes

L'application est déployée sur Kubernetes avec les composants suivants :

#### Namespaces
- `attitudes-vip` - Production
- `attitudes-vip-staging` - Staging
- `attitudes-vip-monitoring` - Monitoring

#### Ressources
- **CPU**: 2 cores par pod
- **RAM**: 4GB par pod
- **Stockage**: 20GB par pod
- **Replicas**: 3 en production, 1 en staging

### Services

#### Frontend
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: attitudes-vip-ui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: attitudes-vip-ui
  template:
    spec:
      containers:
      - name: attitudes-vip-ui
        image: ghcr.io/attitudes-vip/ui:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
```

#### Base de données
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    spec:
      containers:
      - name: postgresql
        image: postgres:15
        env:
        - name: POSTGRES_DB
          value: attitudes_vip
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgresql-secret
              key: password
```

### Ingress et TLS

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: attitudes-vip-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - attitudes.vip
    - api.attitudes.vip
    secretName: attitudes-vip-tls
  rules:
  - host: attitudes.vip
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: attitudes-vip-ui
            port:
              number: 8080
```

---

## 🔧 Services

### Service d'authentification

Le service d'authentification gère l'authentification multi-provider avec OAuth2.

#### Endpoints principaux

```javascript
// Inscription
POST /auth/register
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "locale": "fr"
}

// Connexion
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123!"
}

// OAuth Google
POST /auth/oauth/google
{
  "accessToken": "google-access-token",
  "profile": {
    "id": "google-user-id",
    "emails": [{"value": "user@example.com"}],
    "name": {"givenName": "John", "familyName": "Doe"}
  }
}

// Vérification de token
GET /auth/verify
Authorization: Bearer <jwt-token>

// Profil utilisateur
GET /auth/profile
Authorization: Bearer <jwt-token>

// Déconnexion
POST /auth/logout
Authorization: Bearer <jwt-token>

// Refresh token
POST /auth/refresh
{
  "refreshToken": "refresh-token"
}
```

#### JWT Structure

```javascript
{
  "id": "user_1234567890",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "customer",
  "tenant": "default",
  "permissions": ["wedding_planning", "guest_management"],
  "dashboardUrl": "/dashboard/customer",
  "provider": "local",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Service d'internationalisation

Le service i18n gère la traduction et la régionalisation.

#### Configuration

```javascript
// src/i18n/config.js
module.exports = {
  defaultLocale: 'fr',
  supportedLocales: [
    'fr', 'en', 'es', 'ar', 'gcf', 'ht', 'mfe'
  ],
  fallbackLocale: 'en',
  loadPath: './src/i18n/locales/{locale}.json',
  debug: process.env.NODE_ENV === 'development'
};
```

#### Utilisation

```javascript
// Chargement d'une traduction
const i18n = require('./src/i18n/loader');
const message = i18n.t('welcome.message', { locale: 'fr' });

// Support RTL
const isRTL = i18n.isRTL('ar'); // true
```

---

## 🔌 API

### Structure des réponses

Toutes les réponses API suivent le format standard :

```javascript
// Succès
{
  "success": true,
  "data": {
    // Données de la réponse
  },
  "message": "Opération réussie"
}

// Erreur
{
  "success": false,
  "error": "Message d'erreur",
  "code": "ERROR_CODE",
  "details": {
    // Détails supplémentaires
  }
}
```

### Codes d'erreur

| Code | Description |
|------|-------------|
| `MISSING_FIELDS` | Champs requis manquants |
| `INVALID_EMAIL` | Format d'email invalide |
| `WEAK_PASSWORD` | Mot de passe trop faible |
| `USER_EXISTS` | Utilisateur déjà existant |
| `INVALID_CREDENTIALS` | Identifiants invalides |
| `ACCOUNT_DISABLED` | Compte désactivé |
| `MISSING_TOKEN` | Token d'authentification manquant |
| `INVALID_TOKEN` | Token invalide |
| `TOKEN_EXPIRED` | Token expiré |
| `INSUFFICIENT_PERMISSIONS` | Permissions insuffisantes |

### Rate Limiting

L'API implémente un rate limiting pour prévenir les abus :

- **Authentification**: 100 tentatives par IP par 15 minutes
- **API générale**: 1000 requêtes par IP par minute
- **Upload**: 10 fichiers par IP par minute

---

## 🗄️ Base de données

### Schéma principal

```sql
-- Table des utilisateurs
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  tenant VARCHAR(100) DEFAULT 'default',
  locale VARCHAR(10) DEFAULT 'fr',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Table des profils OAuth
CREATE TABLE oauth_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  profile_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_user_id)
);

-- Table des sessions
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  data JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des événements
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(500),
  organizer_id VARCHAR(50) REFERENCES users(id),
  tenant VARCHAR(100) DEFAULT 'default',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Index recommandés

```sql
-- Index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant ON users(tenant);
CREATE INDEX idx_oauth_provider_user ON oauth_profiles(provider, provider_user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_date ON events(event_date);
```

### Backup et récupération

```bash
# Backup automatique
pg_dump -h localhost -U postgres attitudes_vip > backup_$(date +%Y%m%d_%H%M%S).sql

# Restauration
psql -h localhost -U postgres attitudes_vip < backup_20240101_120000.sql
```

---

## 🔒 Sécurité

### Authentification

- **JWT** avec expiration de 24h
- **Refresh tokens** avec expiration de 7 jours
- **OAuth2** pour Google, Facebook, Twitter, Apple
- **Rate limiting** pour prévenir les attaques par force brute

### Autorisation

Système de permissions basé sur les rôles :

```javascript
// Matrice de permissions
const permissionsMatrix = {
  cio: {
    permissions: ["*"],
    dashboard: "/dashboard/cio"
  },
  admin: {
    permissions: ["backend", "frontend", "support"],
    dashboard: "/dashboard/admin"
  },
  customer: {
    permissions: ["wedding_planning", "guest_management", "vendor_communication"],
    dashboard: "/dashboard/customer"
  }
  // ... autres rôles
};
```

### Middleware de sécurité

```javascript
// Vérification de permission
function requirePermission(permission) {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.permissions.includes('*') || decoded.permissions.includes(permission)) {
        req.user = decoded;
        next();
      } else {
        return res.status(403).json({ error: 'Permission insuffisante' });
      }
    } catch (err) {
      return res.status(401).json({ error: 'Token invalide' });
    }
  };
}
```

### Headers de sécurité

```javascript
// Configuration Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.attitudes.vip"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 📊 Monitoring

### Prometheus

Configuration des métriques :

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'attitudes-vip'
    static_configs:
      - targets: ['attitudes-vip-ui:8080']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### Métriques personnalisées

```javascript
// Métriques Express
const prometheus = require('express-prometheus-middleware');

app.use(prometheus({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 2, 5],
  requestLengthBuckets: [512, 1024, 5120, 10240, 51200],
  responseLengthBuckets: [512, 1024, 5120, 10240, 51200]
}));
```

### Alertes

```yaml
# alerts.yaml
groups:
  - name: attitudes-vip
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"
```

### Grafana Dashboards

Dashboards disponibles :
- **Overview** - Vue d'ensemble de l'application
- **Database** - Métriques PostgreSQL
- **Redis** - Métriques Redis
- **Application** - Métriques spécifiques à l'app

---

## 🚀 Déploiement

### Pipeline CI/CD

Le pipeline GitHub Actions comprend :

1. **Code Quality** - ESLint, audit de sécurité
2. **Tests** - Unitaires, intégration, sécurité
3. **Build** - Construction de l'image Docker
4. **Security Scan** - Scan Trivy
5. **Deploy Staging** - Déploiement automatique sur staging
6. **Smoke Tests** - Tests de fumée
7. **Deploy Production** - Déploiement en production
8. **Health Checks** - Vérifications de santé
9. **Rollback** - Rollback automatique en cas d'échec

### Commandes de déploiement

```bash
# Déploiement Docker
./scripts/deploy.sh production

# Déploiement Kubernetes
./scripts/deploy-k8s.sh production

# Vérification de santé
./scripts/health-check.sh production

# Tests de fumée
./scripts/smoke-tests.sh production

# Rapport de déploiement
./scripts/generate-deployment-report.sh
```

### Variables d'environnement

```bash
# .env
NODE_ENV=production
PORT=8080
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Database
DB_HOST=postgresql
DB_PORT=5432
DB_NAME=attitudes_vip
DB_USER=postgres
DB_PASSWORD=your-db-password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
TWITTER_CONSUMER_KEY=your-twitter-consumer-key
TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Monitoring
PROMETHEUS_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
```

---

## 👨‍💻 Développement

### Prérequis

- Node.js 18+
- Docker & Docker Compose
- kubectl
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# Cloner le repository
git clone https://github.com/attitudes-vip/attitudes-framework.git
cd attitudes-framework

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp env.example .env

# Démarrer l'environnement de développement
docker-compose up -d

# Lancer les tests
npm test
```

### Structure du projet

```
AttitudesFramework/
├── src/
│   ├── auth/           # Service d'authentification
│   ├── dashboards/     # Dashboards utilisateurs
│   ├── i18n/          # Internationalisation
│   ├── services/      # Services métier
│   └── styles/        # Styles et design system
├── tests/             # Tests unitaires et d'intégration
├── docs/              # Documentation
├── scripts/           # Scripts de déploiement
├── ops/               # Configuration Kubernetes
└── monitoring/        # Configuration monitoring
```

### Tests

```bash
# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests de sécurité
npm run test:security

# Tests de performance
npm run test:performance

# Tests end-to-end
npm run test:e2e

# Couverture de code
npm run test:coverage
```

### Linting et formatage

```bash
# ESLint
npm run lint

# Prettier
npm run format

# Audit de sécurité
npm audit

# Scan Trivy
trivy fs .
```

---

## 🔧 Troubleshooting

### Problèmes courants

#### 1. Application ne démarre pas

```bash
# Vérifier les logs
kubectl logs -f deployment/attitudes-vip-ui -n attitudes-vip

# Vérifier les variables d'environnement
kubectl get configmap -n attitudes-vip -o yaml

# Vérifier les secrets
kubectl get secrets -n attitudes-vip
```

#### 2. Problèmes de base de données

```bash
# Vérifier la connectivité
kubectl exec -it deployment/postgresql -n attitudes-vip -- pg_isready

# Vérifier les logs PostgreSQL
kubectl logs -f deployment/postgresql -n attitudes-vip

# Se connecter à la base
kubectl exec -it deployment/postgresql -n attitudes-vip -- psql -U postgres -d attitudes_vip
```

#### 3. Problèmes d'authentification

```bash
# Vérifier les logs d'authentification
kubectl logs -f deployment/attitudes-vip-auth -n attitudes-vip

# Vérifier les secrets JWT
kubectl get secret jwt-secret -n attitudes-vip -o yaml

# Tester l'endpoint de santé
curl -f https://api.attitudes.vip/health
```

#### 4. Problèmes de performance

```bash
# Vérifier les métriques Prometheus
curl http://localhost:9090/api/v1/query?query=up

# Vérifier l'utilisation des ressources
kubectl top pods -n attitudes-vip

# Vérifier les logs d'erreur
kubectl logs deployment/attitudes-vip-ui -n attitudes-vip | grep ERROR
```

### Commandes utiles

```bash
# Redémarrer un déploiement
kubectl rollout restart deployment/attitudes-vip-ui -n attitudes-vip

# Vérifier le statut d'un rollout
kubectl rollout status deployment/attitudes-vip-ui -n attitudes-vip

# Rollback automatique
kubectl rollout undo deployment/attitudes-vip-ui -n attitudes-vip

# Vérifier les événements
kubectl get events -n attitudes-vip --sort-by='.lastTimestamp'

# Port-forward pour accéder aux services
kubectl port-forward svc/prometheus 9090:9090 -n attitudes-vip-monitoring
kubectl port-forward svc/grafana 3000:3000 -n attitudes-vip-monitoring
```

### Logs et debugging

```bash
# Suivre les logs en temps réel
kubectl logs -f deployment/attitudes-vip-ui -n attitudes-vip

# Logs avec timestamps
kubectl logs --timestamps deployment/attitudes-vip-ui -n attitudes-vip

# Logs des dernières 10 minutes
kubectl logs --since=10m deployment/attitudes-vip-ui -n attitudes-vip

# Logs d'un pod spécifique
kubectl logs -f pod/attitudes-vip-ui-abc123 -n attitudes-vip
```

---

## 📞 Support

### Contacts

- **Équipe DevOps**: devops@attitudes.vip
- **Équipe Développement**: dev@attitudes.vip
- **Support Technique**: support@attitudes.vip

### Ressources

- **Documentation API**: https://api.attitudes.vip/docs
- **Dashboard Monitoring**: https://monitoring.attitudes.vip
- **Repository GitHub**: https://github.com/attitudes-vip/attitudes-framework
- **Issues**: https://github.com/attitudes-vip/attitudes-framework/issues

---

*Dernière mise à jour : $(date)* 