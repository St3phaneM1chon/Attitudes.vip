# Cartographie Complète des Rôles - Attitudes.vip

## Vue d'ensemble du projet
Attitudes.vip est une application complète de gestion de la planification, l'organisation et d'outils à la réalisation d'un mariage parfait.

### Objectifs clés
- **Coordination parfaite**: Tous les acteurs du mariage connectés
- **Engagement maximal**: Jeux, animations, interactions pour tous les invités  
- **Souvenirs préservés**: Album numérique et mini-site post-mariage automatiques

## Matrice des Rôles et Dashboards

| Rôle | Dashboard | URL | Droits principaux | Modules accessibles |
|------|-----------|-----|-------------------|-------------------|
| **CIO** | Dashboard CIO | `/dashboard/cio` | Tous droits, accès global | Administration, analytics, marque blanche |
| **Admin** | Dashboard Admin | `/dashboard/admin` | Gestion backend/frontend | Création clients/customers, support |
| **Client** | Dashboard Client | `/dashboard/client` | Marque blanche | Gestion customers, forfaits, personnalisation |
| **Customer** | Dashboard Customer | `/dashboard/customer` | 3 modules optionnels | Préparation, mise en œuvre, jour J |
| **Invité** | Dashboard Invité | `/dashboard/invite` | Accès événement | Profil, photos, jeux, interactions |
| **DJ** | Dashboard DJ | `/dashboard/dj` | Hub communications | Tablette horizontale, musique, micro |
| **Photographe** | Dashboard Photographe | `/dashboard/photographe` | Upload photos | Répertoires par thème, album officiel |
| **Traiteur** | Dashboard Traiteur | `/dashboard/traiteur` | Gestion catering | Menus, allergies, plan de table |
| **Wedding Planner** | Dashboard WP | `/dashboard/wedding-planner` | Hub central | Accès information complète projet |
| **Pâtissier** | Dashboard Pâtissier | `/dashboard/patissier` | Ententes | Livrables et services |
| **Location** | Dashboard Location | `/dashboard/location` | Équipements | Ententes location, responsabilités |

## Flux d'Authentification

### Onboarding Public
1. **Page d'accueil** → Choix du profil
2. **Customer** → Création compte → Dashboard Customer
3. **Invité** → Création compte → Dashboard Invité  
4. **Client/Fournisseur** → Création compte → Dashboard spécialisé

### Providers OAuth2 supportés
- Gmail, Apple, TikTok, Facebook, X

## Permissions par Module

### Module Customer (3 sous-produits)
- **Gestion de la préparation**: Budget, TODO, assistant IA
- **Gestion de la mise en œuvre**: Communication, coordination
- **Gestion du jour J**: Hub temps réel, statistiques live

### Module Invité (Engagement maximal)
- Profil interactif avec jeux "Connaissez-vous les mariés"
- Photo Booth avec filtres
- Demandes musicales avec votes
- Micro virtuel (via DJ)
- Album photos partagé
- Livre d'or (écrit/vocal/vidéo)

## Architecture Multi-Tenant
- **Marque blanche** pour revendeurs/fournisseurs
- **Régionalisation** dynamique (50+ langues)
- **Forfaits différenciés** selon le nombre de customers
