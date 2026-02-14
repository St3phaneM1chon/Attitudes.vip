# Guide Environnement Staging - Attitudes.vip

## 🎯 Vue d'ensemble

L'environnement staging est une réplique exacte de la production, utilisée pour :
- Tests finaux avant déploiement
- Validation des nouvelles fonctionnalités
- Tests de performance et charge
- Formation des utilisateurs

## 🏗️ Architecture Staging

### Infrastructure
```
┌─────────────────────────────────────────────────────────┐
│                    NGINX (SSL/TLS)                      │
│  - staging.attitudes.vip                                │
│  - api-staging.attitudes.vip                            │
│  - monitoring-staging.attitudes.vip                     │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┴───────────────┬──────────────┐
     │                               │              │
┌────▼─────┐               ┌────────▼────┐  ┌─────▼─────┐
│   App    │               │  PostgreSQL │  │   Redis   │
│ Node.js  │               │   Staging   │  │  Staging  │
│ Port:3010│               │  Port:5442  │  │ Port:6389 │
└──────────┘               └─────────────┘  └───────────┘
     │
┌────▼──────────────────────────────────────────────────┐
│              Monitoring Stack                          │
│  - Prometheus (Port:9091)                             │
│  - Grafana (Port:3011)                                │
│  - AlertManager                                        │
└────────────────────────────────────────────────────────┘
```

### URLs d'accès
- **Application**: https://staging.attitudes.vip
- **API**: https://api-staging.attitudes.vip
- **Monitoring**: https://monitoring-staging.attitudes.vip
- **Documentation API**: https://api-staging.attitudes.vip/api/v1/docs

## 🚀 Déploiement

### 1. Déploiement automatique (CI/CD)

Le déploiement est automatique via GitHub Actions lors d'un push sur `staging` ou `develop`.

### 2. Déploiement manuel

```bash
# Cloner le repository
git clone https://github.com/attitudes/attitudes-framework.git
cd attitudes-framework

# Checkout la branche staging
git checkout staging

# Copier et configurer l'environnement
cp .env.staging.example .env.staging
# Éditer .env.staging avec les bonnes valeurs

# Lancer le déploiement
./scripts/deploy-staging.sh
```

### 3. Configuration Docker Compose

```bash
# Build et démarrer tous les services
docker-compose -f docker-compose.staging.yml up -d --build

# Voir les logs
docker-compose -f docker-compose.staging.yml logs -f

# Arrêter les services
docker-compose -f docker-compose.staging.yml down
```

## 🔧 Configuration

### Variables d'environnement critiques

```env
# Base de données
DATABASE_URL=postgresql://postgres:StagingPass123!@postgres-staging:5432/attitudes_staging

# Redis
REDIS_URL=redis://:StagingRedis123!@redis-staging:6379

# JWT
JWT_SECRET_STAGING=<secret-fort>

# Stripe (Mode Test)
STRIPE_API_KEY_STAGING=sk_test_...

# SMTP (Mailtrap recommandé)
SMTP_HOST_STAGING=smtp.mailtrap.io
SMTP_USER_STAGING=<user>
SMTP_PASS_STAGING=<pass>
```

### SSL/TLS

Les certificats SSL doivent être placés dans :
```
nginx/certs/staging/
├── staging.attitudes.vip.crt
├── staging.attitudes.vip.key
├── api-staging.attitudes.vip.crt
├── api-staging.attitudes.vip.key
├── monitoring-staging.attitudes.vip.crt
└── monitoring-staging.attitudes.vip.key
```

Pour générer des certificats auto-signés (dev uniquement) :
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout staging.attitudes.vip.key \
  -out staging.attitudes.vip.crt \
  -subj "/CN=staging.attitudes.vip"
```

## 📊 Monitoring

### Accès Grafana
- URL: https://monitoring-staging.attitudes.vip
- Login: `admin`
- Password: Défini dans `GRAFANA_PASSWORD_STAGING`

### Dashboards disponibles
1. **Overview** - Métriques générales
2. **API Performance** - Temps de réponse, erreurs
3. **Business Metrics** - Mariages, vendors, paiements
4. **Infrastructure** - CPU, mémoire, disque

### Alertes configurées
- API down > 2 minutes
- Taux d'erreur > 5%
- CPU > 80%
- Espace disque < 15%

## 🔍 Tests

### Tests de santé
```bash
# API Health
curl https://api-staging.attitudes.vip/api/v1/health

# Application
curl https://staging.attitudes.vip

# WebSocket
wscat -c wss://api-staging.attitudes.vip/socket.io/
```

### Tests E2E staging
```bash
# Configuration
export E2E_BASE_URL=https://staging.attitudes.vip
export E2E_HEADLESS=true

# Lancer les tests
npm run test:e2e:staging
```

### Tests de charge
```bash
# Installation k6
brew install k6

# Lancer test de charge
k6 run tests/load/staging-load-test.js
```

## 🔒 Sécurité

### Authentification monitoring
L'accès au monitoring nécessite une authentification Basic Auth :
```bash
# Créer/mettre à jour le fichier .htpasswd
htpasswd -c nginx/.htpasswd admin
```

### Firewall
Ports exposés publiquement :
- 80 (HTTP → redirect HTTPS)
- 443 (HTTPS)

Ports internes uniquement :
- 3010 (App Node.js)
- 5442 (PostgreSQL)
- 6389 (Redis)
- 9091 (Prometheus)
- 3011 (Grafana)

### Backup automatique
- Fréquence : Toutes les nuits à 2h
- Rétention : 7 jours
- Localisation : `./backups/staging/`

## 📝 Procédures

### Mise à jour de l'application
```bash
# 1. Pull les derniers changements
git pull origin staging

# 2. Rebuild et redéployer
docker-compose -f docker-compose.staging.yml up -d --build app-staging

# 3. Vérifier les logs
docker-compose -f docker-compose.staging.yml logs -f app-staging
```

### Rollback
```bash
# 1. Identifier l'image précédente
docker images | grep attitudes_app_staging

# 2. Retagger l'image précédente
docker tag attitudes_app_staging:previous attitudes_app_staging:latest

# 3. Redéployer
docker-compose -f docker-compose.staging.yml up -d app-staging
```

### Debug
```bash
# Accéder au container
docker exec -it attitudes_app_staging sh

# Voir les logs en temps réel
docker logs -f attitudes_app_staging

# Inspecter les variables d'environnement
docker exec attitudes_app_staging env | grep -E '^(NODE_ENV|DATABASE_URL|REDIS_URL)'
```

## 🚨 Troubleshooting

### L'application ne démarre pas
1. Vérifier les logs : `docker logs attitudes_app_staging`
2. Vérifier la connexion DB : `docker exec attitudes_postgres_staging pg_isready`
3. Vérifier Redis : `docker exec attitudes_redis_staging redis-cli ping`

### Erreur 502 Bad Gateway
1. Vérifier que l'app est démarrée : `docker ps | grep app-staging`
2. Vérifier Nginx : `docker logs attitudes_nginx_staging`
3. Tester en direct : `curl http://localhost:3010/api/v1/health`

### Performance dégradée
1. Vérifier les métriques : https://monitoring-staging.attitudes.vip
2. Analyser les requêtes lentes dans PostgreSQL
3. Vérifier le cache Redis

## 📞 Support

- **Slack**: #staging-support
- **Email**: devops@attitudes.vip
- **Docs**: https://docs.attitudes.vip/staging