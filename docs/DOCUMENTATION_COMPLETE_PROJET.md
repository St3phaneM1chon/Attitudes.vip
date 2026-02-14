# Documentation Complète - Attitudes.vip Framework

## 🎯 Vue d'ensemble du projet

**Attitudes.vip** est une plateforme SaaS complète de gestion de mariages, multi-tenant et multilingue, conçue pour orchestrer tous les aspects d'un mariage moderne. Le projet utilise une architecture microservices conteneurisée avec support pour 13 types d'utilisateurs différents et plus de 100 langues.

## 📊 Architecture technique

### Stack technologique
- **Backend**: Node.js 18+, Express.js
- **Base de données**: PostgreSQL 15 (via Supabase)
- **Cache**: Redis 7
- **Authentification**: Passport.js, JWT, OAuth2 multi-providers
- **Temps réel**: Socket.io (WebSockets)
- **Conteneurisation**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Monitoring**: Prometheus, Grafana
- **Sécurité**: Architecture Zero Trust, Helmet.js, bcrypt

### Architecture globale
```
┌─────────────────────────────────────────────────────────────┐
│                   Clients (Multi-Dashboards)                 │
├─────────────────────────────────────────────────────────────┤
│                  API Gateway (Nginx)                         │
├─────────────────────────────────────────────────────────────┤
│  Auth Service  │  Business Services  │  Real-time Services  │
├─────────────────────────────────────────────────────────────┤
│     PostgreSQL (Supabase)    │    Redis Cache/Queue         │
└─────────────────────────────────────────────────────────────┘
```

## 👥 Types d'utilisateurs et permissions

### Utilisateurs internes Attitudes.vip
1. **CIO (Chief Information Officer)**
   - Permissions: Accès total système (`["*"]`)
   - Dashboard: `/dashboard/cio`
   - Rôle: Supervision technique complète

2. **Admin (Employés Attitudes.vip)**
   - Permissions: `["backend", "frontend", "support"]`
   - Dashboard: `/dashboard/admin`
   - Rôle: Support client et gestion opérationnelle

3. **Client (Revendeurs marque blanche)**
   - Permissions: `["white_label", "customer_management"]`
   - Dashboard: `/dashboard/client`
   - Rôle: Gestion de leur propre instance

### Utilisateurs externes

4. **Customer (Couples mariés)**
   - Permissions: `["wedding_planning", "guest_management", "vendor_communication"]`
   - Dashboard: `/dashboard/customer`
   - Rôle: Organisateurs principaux du mariage

5. **Invite (Invités)**
   - Permissions: `["profile_edit", "rsvp", "games", "photo_upload"]`
   - Dashboard: `/dashboard/invite`
   - Rôle: Participants au mariage

### Fournisseurs de services

6. **DJ**
   - Permissions: `["music_management", "micro_requests", "games_results"]`
   - Dashboard: `/dashboard/dj` et `/dashboard/dj-tablet`
   - Rôle: Animation musicale et gestion événements

7. **Wedding Planner**
   - Permissions: `["project_overview", "communication_hub"]`
   - Dashboard: `/dashboard/wedding-planner`
   - Rôle: Coordination générale

8. **Photographe**
   - Permissions: `["photo_upload", "album_creation"]`
   - Dashboard: `/dashboard/photographe`
   - Rôle: Capture et gestion photos

9. **Traiteur**
   - Permissions: `["menu_management", "allergy_tracking"]`
   - Dashboard: `/dashboard/traiteur`
   - Rôle: Gestion restauration

10. **Pâtissier**
    - Permissions: `["order_management"]`
    - Dashboard: `/dashboard/patissier`
    - Rôle: Gestion gâteaux et desserts

11. **Location**
    - Permissions: `["equipment_management"]`
    - Dashboard: `/dashboard/location`
    - Rôle: Gestion matériel et équipements

## 🚀 Fonctionnalités principales

### Dashboard Customer (Couples mariés)
- **Tableau de bord principal**
  - Progression temps réel (barre de pourcentage)
  - Compteur J-XX jours
  - Budget tracker avec alertes
  - Communication d'urgence (bouton panique)
  
- **Gestion des invités**
  - Import/export Excel
  - Plan de table interactif
  - Suivi RSVP
  - Gestion allergies/régimes
  
- **Communication**
  - Chat intégré avec fournisseurs
  - Notifications push
  - Centre de messages
  - Assistant IA personnalisé
  
- **Outils créatifs**
  - Générateur Save the Date
  - Templates culturels/régionaux
  - Éditeur de faire-part
  - Galerie d'inspiration

- **Modules optionnels** (3 disponibles)
  - Interface DJ
  - Marketplace fournisseurs régionaux
  - Petites annonces communautaires

### Dashboard DJ (Optimisé tablette)
- Vue timeline de la journée
- Gestion demandes micro avec approbation
- Système de votes pour musiques
- Contrôle diaporama grand écran
- Résultats jeux en temps réel
- Hub communication fournisseurs
- Vidéothèque intégrée

### Dashboard Invite
- Profil personnalisable avec photo
- Annuaire "Qui est qui"
- Photo booth virtuel
- Demandes musicales
- Participation jeux interactifs
- Upload photos souvenirs
- Livre d'or numérique

## 🌍 Internationalisation et régionalisation

### Support linguistique
- **100+ langues** dont 10 dialectes créoles
- **Langues principales**: Français, Anglais, Espagnol, Arabe, Chinois, Hindi
- **Créoles supportés**: Guadeloupe, Martinique, Haïti, Maurice, Réunion, etc.
- **Support RTL** pour Arabe et Hébreu

### Adaptations régionales (9 régions)
1. **Amérique du Nord**: USA, Canada
2. **Europe**: France, UK, Allemagne
3. **Moyen-Orient**: Émirats, Arabie Saoudite
4. **Asie**: Chine, Japon, Inde
5. **Afrique**: Nigeria, Afrique du Sud
6. **Amérique Latine**: Mexique, Brésil
7. **Caraïbes**: Antilles françaises
8. **Océanie**: Australie
9. **Océan Indien**: Maurice, Réunion

### Personnalisations culturelles
- **6 religions supportées**: Christianisme, Islam, Judaïsme, Hindouisme, Bouddhisme, Laïque
- **Adaptations par religion**:
  - Cérémonies traditionnelles
  - Restrictions alimentaires
  - Codes vestimentaires
  - Musiques et danses
  - Décorations appropriées

## 🔒 Sécurité et conformité

### Architecture Zero Trust
- Isolation stricte entre types d'utilisateurs
- Network policies Kubernetes par rôle
- Chiffrement end-to-end communications
- Audit logs complets

### Authentification robuste
- OAuth2 multi-providers (Google, Facebook, Twitter, Apple)
- JWT avec refresh tokens (24h expiration)
- Bcrypt 12 rounds pour passwords
- Rate limiting (100 tentatives/15min)
- Détection automatique rôle/tenant

### Conformité RGPD
- Consentement explicite
- Droit à l'oubli
- Export données personnelles
- Logs de traçabilité

## 📁 Structure du projet

### Répertoires principaux
```
AttitudesFramework/
├── src/
│   ├── auth/              # Service authentification
│   ├── dashboards/        # Interfaces utilisateurs
│   ├── services/          # Services métiers
│   ├── i18n/              # Fichiers traduction
│   └── styles/            # CSS et thèmes
├── ops/
│   └── kubernetes/        # Configuration K8s
├── supabase/              # Backend as a Service
├── docs/                  # Documentation
├── tests/                 # Tests automatisés
├── scripts/               # Scripts utilitaires
└── monitoring/            # Configuration monitoring
```

### Services métiers principaux
1. **auth-service.js**: Gestion authentification OAuth2/JWT
2. **regionalization-service.js**: Adaptations culturelles
3. **i18n-service.js**: Internationalisation
4. **chat/**: Communication temps réel
5. **payment/**: Intégration Stripe
6. **notification/**: Push notifications
7. **music/**: Gestion musicale
8. **games/**: Jeux interactifs

## 💻 Guide pour développeur débutant

### Prérequis
- Node.js 18+
- Docker et Docker Compose
- PostgreSQL 15+
- Redis 7+
- Compte Supabase

### Installation rapide
```bash
# 1. Cloner le repository
git clone [repository-url]
cd AttitudesFramework

# 2. Copier les variables d'environnement
cp env.example .env
# Éditer .env avec vos configurations

# 3. Installer les dépendances
npm install

# 4. Lancer avec Docker Compose
docker-compose up -d

# 5. Initialiser la base de données
npm run db:init

# 6. Lancer le serveur de développement
npm run dev
```

### Comprendre le flux de données

1. **Requête utilisateur** → Nginx (API Gateway)
2. **Authentification** → Auth Service vérifie JWT
3. **Autorisation** → Vérification permissions par rôle
4. **Traitement** → Service métier approprié
5. **Base de données** → PostgreSQL via Supabase
6. **Cache** → Redis pour performances
7. **Réponse** → JSON formaté retour client

### Ajouter une nouvelle fonctionnalité

1. **Identifier le dashboard concerné** dans `src/dashboards/`
2. **Créer/modifier le service** dans `src/services/`
3. **Ajouter les traductions** dans `src/i18n/`
4. **Implémenter les tests** dans `tests/`
5. **Documenter** dans `docs/`
6. **Tester localement** puis en environnement Docker

### Conventions de code
- **Nommage**: camelCase pour variables, PascalCase pour classes
- **Async/Await**: Privilégier sur les callbacks
- **Erreurs**: Gestion centralisée avec codes standards
- **Logs**: Utiliser Winston avec niveaux appropriés
- **Tests**: Coverage minimum 80%

## 🛠️ Technologies et intégrations

### Services externes
- **Stripe**: Paiements multi-devises
- **Twilio**: SMS notifications
- **Nodemailer**: Emails transactionnels
- **OAuth providers**: Google, Facebook, Twitter, Apple
- **CDN**: Distribution contenus statiques

### Librairies principales
- **Express.js**: Framework web
- **Passport.js**: Authentification
- **Socket.io**: WebSockets
- **Helmet**: Sécurité headers
- **Winston**: Logging
- **Jest**: Testing
- **Puppeteer**: Génération PDF
- **Sharp**: Manipulation images
- **QRCode**: Codes QR invitations

## 📈 Monitoring et performance

### Métriques surveillées
- Temps de réponse API
- Taux d'erreur par endpoint
- Utilisation CPU/mémoire
- Connexions actives
- Cache hit rate
- Queue length

### Dashboards Grafana
- Vue d'ensemble système
- Performance par service
- Alertes temps réel
- Analyse utilisateurs
- Tracking erreurs

## 🔄 Déploiement et CI/CD

### Environnements
1. **Development**: Local avec Docker Compose
2. **Staging**: Kubernetes cluster test
3. **Production**: Kubernetes multi-région

### Pipeline déploiement
1. Push code → GitHub
2. Tests automatiques (unit, integration, e2e)
3. Build images Docker
4. Push registry
5. Deploy Kubernetes
6. Health checks
7. Rollback automatique si erreur

## 📝 Maintenance et support

### Tâches régulières
- Backup base données (quotidien)
- Rotation logs (hebdomadaire)
- Updates sécurité (mensuel)
- Performance review (trimestriel)

### Support utilisateurs
- Documentation utilisateur par rôle
- FAQ intégrée
- Chat support temps réel
- Tickets via dashboard admin

## 🚧 Évolutions futures planifiées

1. **Intelligence artificielle**
   - Assistant planning avancé
   - Suggestions personnalisées
   - Prédiction budget

2. **Réalité augmentée**
   - Essayage virtuel tenues
   - Visualisation décoration
   - Plan de table 3D

3. **Blockchain**
   - Contrats fournisseurs
   - Certification photos
   - Livre d'or permanent

4. **IoT Integration**
   - Capteurs ambiance
   - Éclairage intelligent
   - Sonorisation adaptative

Cette documentation constitue une base solide pour comprendre l'ensemble du projet Attitudes.vip. Chaque composant est conçu pour être modulaire et extensible, permettant une évolution continue de la plateforme.