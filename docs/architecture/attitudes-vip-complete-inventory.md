# Inventaire Complet Attitudes.vip - Architecture Zero Trust

## 7 TYPES D'UTILISATEURS PRINCIPAUX

### 1. CIO
- **Accès** : Droits complets système
- **Dashboard** : /dashboard/cio
- **Criticité** : MAXIMALE

### 2. Administrateurs (Employés Attitudes.vip)
- **Accès** : Gestion backend/frontend, création clients/customers
- **Dashboard** : /dashboard/admin  
- **Criticité** : ÉLEVÉE

### 3. Clients (Licence marque blanche)
- **Types** : Fournisseurs revendeurs, Revendeurs
- **Accès** : Customisation, forfaits mensuels, gestion customers
- **Dashboard** : /dashboard/client
- **Criticité** : ÉLEVÉE

### 4. Customers (Couples mariés)
- **Accès** : 3 modules optionnels (préparation/mise en œuvre/jour J)
- **Dashboard** : /dashboard/customer
- **Fonctions critiques** :
  - Gestion invités + plan de table
  - Communication multi-acteurs
  - Budget + TODO liste
  - Assistant IA
  - Création Save Date/faire-part
  - Statistiques temps réel

### 5. Invités
- **Accès** : Interface événement-spécifique
- **Dashboard** : /dashboard/invite
- **Fonctions** :
  - Profil + confirmation présence
  - Choix menu + allergies
  - Upload photos/vidéos + Photo Booth
  - Demandes spéciales DJ + micro virtuel
  - Jeux interactifs
  - Livre d'or (écrit/vocal/vidéo)

### 6. Fournisseurs (6 sous-types)

#### 6.1 Wedding Planner
- **Privilèges** : Accès information complète projet
- **Dashboard** : /dashboard/wedding-planner
- **Rôle** : Hub central communications

#### 6.2 DJ (Interface tablette horizontale)
- **Dashboard** : /dashboard/dj
- **Fonctions** :
  - Horaire journée + musiques étapes
  - Gestion demandes micro/spéciales
  - Hub communications (si pas Wedding Planner)
  - Diaporama photos + vidéothèque
  - Résultats jeux + votes

#### 6.3 Photographe
- **Dashboard** : /dashboard/photographe
- **Fonctions** :
  - Création répertoires par thème
  - Upload photos massif
  - Album mariage officiel

#### 6.4 Traiteur
- **Dashboard** : /dashboard/traiteur
- **Fonctions** :
  - Comptage adultes/enfants
  - Gestion menus + allergies
  - Plan de table avec allergies

#### 6.5 Pâtissier
- **Dashboard** : /dashboard/patissier
- **Fonctions** : Entente + livrables

#### 6.6 Location/Salle
- **Dashboard** : /dashboard/location
- **Fonctions** : Entente location + responsabilités

## SERVICES COMPLEXES IDENTIFIÉS

### Communication Temps Réel
- **ChatService** : Communication multi-acteurs
- **VoiceService** : Micro virtuel via WebRTC
- **NotificationService** : Push notifications

### Médias & Contenu
- **PhotoBoothService** : Cabine photo avec filtres
- **MediaUploadService** : Upload simultané photos/vidéos
- **VideoStreamingService** : Diaporama + vidéothèque

### Internationalisation Avancée
- **I18nService** : 50+ langues/dialectes
- **RegionalizationService** : Contenu adaptatif par pays/religion
- **DynamicContentService** : Images/vidéos dynamiques

### Jeux & Interactions
- **GamesService** : "Connaissez-vous les mariés"
- **VotingService** : Votes et sondages
- **InteractiveService** : Jeux personnalisés

### Services Métier
- **BudgetTrackingService** : Suivi finances temps réel
- **AIAssistantService** : Assistant planification mariage
- **StatisticsService** : Graphiques temps réel progression
- **MarketplaceService** : Petites annonces partagées

## DÉFIS ARCHITECTURAUX MAJEURS

### 1. Multi-Tenant Complexe
- Isolation stricte entre revendeurs
- Marque blanche personnalisable
- Forfaits différenciés

### 2. Collaboration Temps Réel
- Communication DJ ↔ Mariés ↔ Photographe ↔ Traiteur
- Mise à jour live photos/vidéos
- Synchronisation demandes musicales

### 3. Gestion Permissions Ultra-Granulaire
- 7 types utilisateurs
- Sous-permissions par fournisseur
- Accès événement-spécifique

### 4. Performance Mobile
- Interface 375x812px
- Tablette horizontale pour DJ
- Upload massif médias

## INTÉGRATIONS CRITIQUES

### Authentification Tiers
- Gmail, Apple, TikTok, Facebook, X
- OAuth2 + MFA adaptatif

### Paiements
- Contributions invités
- Forfaits clients
- Marketplace

### Communications
- SMS notifications
- Email marketing
- WebRTC audio/vidéo
