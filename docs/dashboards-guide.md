# 📊 Guide des Dashboards - AttitudesFramework

## Vue d'ensemble

AttitudesFramework propose des dashboards spécialisés pour chaque type d'utilisateur, optimisés pour leurs besoins spécifiques.

## 🎯 Dashboard Customer (Couples)

### Caractéristiques principales

- **Vue d'ensemble complète** du mariage avec compte à rebours
- **Statistiques en temps réel** : invités, budget, tâches, photos
- **Tâches urgentes** avec priorités IA
- **Actions rapides** pour les fonctions fréquentes

### Sections du dashboard

#### 1. Vue d'ensemble (Overview)
```jsx
// Widgets principaux affichés
- Compte à rebours jusqu'au jour J
- Invités confirmés / total
- Budget utilisé / total avec barre de progression
- Tâches complétées / total avec pourcentage
```

#### 2. Gestion des invités
- Liste complète avec statuts RSVP
- Filtres par table, groupe, statut
- Export Excel pour le traiteur
- Gestion des allergies et préférences

#### 3. Budget
- Suivi en temps réel des dépenses
- Catégorisation automatique
- Alertes de dépassement
- Graphiques de répartition

#### 4. Tâches (Intégration Taskmaster)
- Tâches triées par priorité IA
- Vue calendrier et liste
- Création rapide avec suggestions
- Workflows automatisés

### Intégration Taskmaster

Le dashboard utilise le hook `useTaskmaster` pour :
- Charger les tâches du mariage
- Afficher les priorités IA (0-100%)
- Suggérer des actions basées sur l'échéance
- Exécuter des workflows prédéfinis

```javascript
// Exemple d'utilisation
const { tasks, metrics, createTask } = useTaskmaster();

// Créer une tâche avec IA
await createTask({
  title: "Confirmer le traiteur",
  dueDate: new Date('2024-03-15'),
  category: 'vendor',
  priority: 'high'
});
// La priorité IA sera calculée automatiquement
```

## 🎵 Dashboard DJ

### Optimisations tablette

- **Interface horizontale** obligatoire
- **Pas de zoom** pour éviter les erreurs tactiles
- **Écran toujours allumé** pendant l'événement
- **Mode plein écran** automatique

### Layout 3 colonnes

#### Colonne gauche
- **Programme de la journée** avec suivi en temps réel
- **Actions rapides** pour annonces prédéfinies

#### Colonne centrale
- **Lecteur musical** avec contrôles
- **Demandes musicales** avec acceptation/rejet
- **Demandes micro** avec alertes visuelles et sonores

#### Colonne droite
- **Flux photos** en temps réel (max 20)
- **Résultats des jeux** interactifs

### Fonctionnalités temps réel

```javascript
// WebSocket pour communications instantanées
socket.on('music_request', (request) => {
  // Nouvelle demande musicale
  playNotificationSound();
  addToRequestQueue(request);
});

socket.on('mic_request', (request) => {
  // Alerte visuelle + sonore
  showUrgentAlert(request);
});

socket.on('new_photo', (photo) => {
  // Ajouter au flux avec limite
  updatePhotoStream(photo);
});
```

### Gestion des demandes

#### Demandes musicales
1. Affichage avec titre, artiste, demandeur
2. Boutons accepter/refuser
3. Ajout automatique à la playlist si accepté
4. Notification au demandeur

#### Demandes micro
1. **Alerte prioritaire** avec son
2. Identification du demandeur et motif
3. Réponse en un clic
4. Message automatique à l'invité

## 🔧 Configuration technique

### Variables d'environnement requises

```bash
# React App
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Installation des dépendances

```bash
# Frontend
npm install react react-dom
npm install @supabase/supabase-js
npm install socket.io-client
npm install lucide-react
npm install tailwindcss

# Backend
npm install express
npm install socket.io
npm install jsonwebtoken
```

## 📱 Responsive Design

### Customer Dashboard
- **Mobile** (375px+) : Layout vertical, widgets empilés
- **Tablet** (768px+) : 2 colonnes
- **Desktop** (1024px+) : 4 colonnes pour widgets

### DJ Dashboard
- **Tablette uniquement** : Minimum 1024x768
- **Orientation paysage** forcée
- Message d'erreur si portrait

## 🚀 Déploiement

### Build production

```bash
# Build React
npm run build

# Servir avec Express
app.use('/dashboard', express.static('build'));
```

### Optimisations performance

1. **Lazy loading** des composants non critiques
2. **Debounce** sur les mises à jour fréquentes
3. **Virtualisation** des longues listes
4. **Cache** des données statiques

## 🧪 Tests

### Tests unitaires
```bash
npm test dashboards.test.js
```

### Tests E2E recommandés
- Connexion et redirection selon rôle
- Chargement des données
- Actions temps réel
- Responsive design

## 🔒 Sécurité

### Authentification
- JWT obligatoire pour toutes les routes
- Refresh token automatique
- Session timeout configurable

### Autorisation
- Vérification du rôle côté serveur
- Isolation des données par wedding_id
- Rate limiting sur les actions

## 📊 Métriques à suivre

### Customer Dashboard
- Temps moyen sur le dashboard
- Features les plus utilisées
- Taux de complétion des tâches
- Fréquence de connexion

### DJ Dashboard
- Nombre de demandes traitées
- Temps de réponse moyen
- Stabilité de la connexion
- Utilisation des features

## 🎯 Roadmap

### V2 - Améliorations prévues
1. **Mode hors ligne** pour DJ (PWA)
2. **Widgets personnalisables** pour couples
3. **IA prédictive** pour suggestions
4. **Intégration vocale** pour DJ
5. **Multi-langue** complet

---

Pour toute question ou amélioration, consultez la documentation complète ou contactez l'équipe technique.