# Attitudes.vip - Plateforme de Gestion de Mariages

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

## 🎯 Vue d'ensemble

Attitudes.vip est une plateforme SaaS complète de gestion de mariages, conçue pour simplifier la planification et la coordination des événements de mariage. La plateforme connecte les couples, les invités et les fournisseurs dans un écosystème unifié et multilingue.

### 🌟 Caractéristiques principales

- **Multi-tenant** : Architecture SaaS avec marque blanche
- **Multilingue** : Support de 100+ langues
- **Multi-régional** : Adapté à 9 régions géographiques
- **Temps réel** : Communication WebSocket pour les mises à jour instantanées
- **Sécurisé** : OAuth2, JWT, chiffrement AES-256
- **Scalable** : Architecture microservices avec Docker/Kubernetes

## 🚀 Installation rapide

### Prérequis

- Node.js 18+
- Docker et Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/attitudes-vip/attitudes-vip.git
cd attitudes-vip

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Lancer les services Docker
docker-compose up -d

# Initialiser la base de données
npm run db:init
npm run db:migrate
npm run db:seed

# Lancer l'application
npm run dev
```

L'application sera accessible sur http://localhost:3000

## 🏗️ Architecture

### Structure du projet

```
attitudes-vip/
├── src/
│   ├── app.js              # Application Express principale
│   ├── server.js           # Serveur HTTP et initialisation
│   ├── auth/               # Services d'authentification
│   ├── models/             # Modèles Sequelize
│   ├── routes/             # Routes API
│   ├── services/           # Services métier
│   ├── middleware/         # Middlewares Express
│   ├── utils/              # Utilitaires
│   └── dashboards/         # Interfaces utilisateur
├── tests/                  # Tests unitaires et E2E
├── docs/                   # Documentation
├── scripts/                # Scripts utilitaires
├── ops/                    # Configuration DevOps
└── docker-compose.yml      # Configuration Docker
```

### Stack technique

- **Backend** : Node.js, Express.js
- **Base de données** : PostgreSQL avec Sequelize ORM
- **Cache** : Redis
- **Temps réel** : Socket.io
- **Authentification** : Passport.js (OAuth2)
- **Paiements** : Stripe
- **Notifications** : Twilio (SMS), SendGrid (Email)
- **Stockage** : Cloudinary
- **Monitoring** : Prometheus + Grafana

## 📦 API

### Endpoints principaux

```bash
# Authentification
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/logout

# Utilisateurs
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
DELETE /api/v1/users/account

# Mariages
GET    /api/v1/weddings
POST   /api/v1/weddings
GET    /api/v1/weddings/:id
PUT    /api/v1/weddings/:id
DELETE /api/v1/weddings/:id

# Invités
GET    /api/v1/weddings/:id/invites
POST   /api/v1/weddings/:id/invites
PUT    /api/v1/invites/:id/rsvp

# Vendors
GET    /api/v1/vendors
GET    /api/v1/vendors/:id
POST   /api/v1/vendors/:id/book
```

### Documentation API complète

La documentation Swagger est disponible sur `/api-docs` en développement.

## 🔐 Sécurité

### Authentification

- OAuth2 avec Google, Facebook, Twitter, Apple
- JWT avec rotation de tokens
- Session Redis avec expiration
- 2FA optionnel pour les comptes sensibles

### Mesures de sécurité

- Helmet.js pour les headers de sécurité
- Rate limiting par rôle
- Protection CSRF
- Validation des entrées avec Joi
- Chiffrement des données sensibles
- Audit logs pour les actions critiques

## 🧪 Tests

```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests de charge
npm run test:load
```

### Standards de qualité

- Couverture de code minimum : 80%
- ESLint pour le style de code
- Prettier pour le formatage
- Husky pour les pre-commit hooks

## 🚀 Déploiement

### Environnement de staging

```bash
npm run deploy:staging
```

### Production

```bash
# Build
npm run build

# Déploiement
npm run deploy:production

# Vérification santé
npm run deploy:health
```

### Configuration Kubernetes

Les manifests Kubernetes sont dans `ops/kubernetes/`. Utiliser:

```bash
kubectl apply -f ops/kubernetes/
```

## 🌍 Internationalisation

### Langues supportées

- Français (défaut)
- Anglais
- Espagnol
- Allemand
- Italien
- Portugais
- Arabe
- Chinois
- Japonais
- Russe
- Et 90+ autres langues

### Adaptations régionales

- Formats de date/heure
- Devises
- Traditions culturelles
- Restrictions alimentaires
- Cérémonies religieuses

## 📊 Monitoring

### Métriques disponibles

- Temps de réponse API
- Taux d'erreur
- Utilisation CPU/Mémoire
- Connexions actives
- Transactions par seconde

### Tableaux de bord

- Grafana : http://localhost:3001
- Prometheus : http://localhost:9090

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Guidelines

- Suivre les conventions de code ESLint
- Ajouter des tests pour toute nouvelle fonctionnalité
- Mettre à jour la documentation
- Les commits doivent suivre [Conventional Commits](https://www.conventionalcommits.org/)

## 📝 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

- Documentation : [docs.attitudes.vip](https://docs.attitudes.vip)
- Email : support@attitudes.vip
- Discord : [Rejoindre la communauté](https://discord.gg/attitudes)

## 🙏 Remerciements

- L'équipe de développement Attitudes.vip
- Tous les contributeurs open source
- Les beta testeurs et la communauté

---

Fait avec ❤️ par l'équipe Attitudes.vip