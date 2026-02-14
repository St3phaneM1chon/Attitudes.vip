# 🤖 Intégration Taskmaster dans AttitudesFramework

## 📋 Vue d'ensemble

Taskmaster est un système de gestion de tâches intelligent et automatisé, parfaitement intégré à AttitudesFramework pour orchestrer tous les aspects de l'organisation d'un mariage.

## 🎯 Capacités Principales

### 1. **Automatisation Intelligente**
- Création et exécution de tâches automatisées
- Workflows prédéfinis pour mariages
- Planification basée sur l'IA
- Apprentissage continu des patterns

### 2. **Workflows Spécialisés Mariage**
- **Planification Complète** - 40+ étapes de A à Z
- **Gestion des Invités** - RSVP, rappels, segmentation
- **Coordination Fournisseurs** - Suivi, paiements, confirmations
- **Budget** - Tracking en temps réel, alertes
- **Jour J** - Orchestration minute par minute
- **Post-Mariage** - Remerciements, photos, clôture
- **Gestion de Crise** - Réponse rapide aux urgences

### 3. **Intelligence Artificielle**
- Priorisation automatique des tâches
- Prédiction des risques et délais
- Suggestions d'optimisation
- Détection d'anomalies
- Adaptation aux préférences

## 🚀 Installation et Configuration

### 1. Exécuter le script d'intégration
```bash
node scripts/integrate-taskmaster.js
```

### 2. Appliquer les changements de base de données
```bash
psql -d attitudes_db -f scripts/taskmaster-schema.sql
```

### 3. Redémarrer l'application
```bash
npm run dev
# ou avec Docker
docker-compose restart
```

## 📖 Guide d'Utilisation

### Créer une Tâche Automatisée
```javascript
const TaskmasterService = require('./services/taskmaster/taskmaster-service');
const taskmaster = new TaskmasterService();

// Créer une tâche simple
const task = await taskmaster.createTask({
  title: 'Confirmer le traiteur',
  description: 'Appeler le traiteur pour confirmer le menu final',
  weddingId: '123e4567-e89b-12d3-a456-426614174000',
  dueDate: '2025-06-01',
  priority: 'high',
  automation: {
    enabled: true,
    executor: 'notification',
    params: {
      recipient: 'vendor@catering.com',
      type: 'email'
    }
  }
});
```

### Exécuter un Workflow Complet
```javascript
// Lancer le workflow de planification complète
const execution = await taskmaster.executeWorkflow('completePlanning', {
  weddingId: weddingId,
  weddingDate: '2025-06-15',
  budget: 50000,
  guestCount: 150
});

// Le système va automatiquement:
// - Créer toutes les tâches nécessaires
// - Les planifier selon les délais optimaux
// - Envoyer les rappels
// - Gérer les dépendances
// - Escalader si nécessaire
```

### Planifier des Tâches Récurrentes
```javascript
// Rappel hebdomadaire pour mise à jour budget
await taskmaster.createTask({
  title: 'Revue du budget',
  type: 'budget_review',
  automation: {
    enabled: true,
    schedule: '0 9 * * MON', // Tous les lundis à 9h
    executor: 'report_generator'
  }
});
```

## 📊 API Endpoints

### Tâches
- `POST /api/taskmaster/tasks` - Créer une tâche
- `GET /api/taskmaster/tasks/:id` - Obtenir une tâche
- `PUT /api/taskmaster/tasks/:id` - Modifier une tâche
- `POST /api/taskmaster/tasks/:id/execute` - Exécuter une tâche
- `GET /api/taskmaster/tasks/wedding/:weddingId` - Tâches d'un mariage

### Workflows
- `GET /api/taskmaster/workflows` - Liste des workflows
- `POST /api/taskmaster/workflows` - Créer un workflow custom
- `POST /api/taskmaster/workflows/:id/execute` - Exécuter un workflow
- `GET /api/taskmaster/workflows/:id/status` - Statut d'exécution

### Métriques
- `GET /api/taskmaster/metrics` - Métriques globales
- `GET /api/taskmaster/metrics/wedding/:id` - Métriques par mariage
- `GET /api/taskmaster/metrics/performance` - Performance système

## 🎨 Interface Utilisateur

### Dashboard Principal
```
┌─────────────────────────────────────────────┐
│           Taskmaster Dashboard              │
├─────────────────────────────────────────────┤
│ Tâches Actives: 24    Complétées: 156      │
│ Workflows: 8          Automatisées: 89%     │
│                                             │
│ Prochaines Tâches:                          │
│ ⚡ Confirmer fleuriste (2 jours)            │
│ ⚡ Envoyer rappel RSVP (5 jours)           │
│ ⚡ Paiement photographe (7 jours)           │
│                                             │
│ [Créer Tâche] [Lancer Workflow] [Rapports] │
└─────────────────────────────────────────────┘
```

### Vue Timeline
```
Mai 2025
─────────────────────────────────────────────
1  │ • Confirmation venue finale
5  │ • Essayage robe #2
10 │ • Dégustation menu traiteur
15 │ ▼ DEADLINE: Liste invités finale
20 │ • Meeting décoration
25 │ • Répétition cérémonie
30 │ ▼ DEADLINE: Plan de table

[← Avril] [Juin →] [Vue Liste] [Exporter]
```

## 🔧 Configuration Avancée

### Personnaliser les Executors
```javascript
// Ajouter un executor custom
taskmaster.registerExecutor('sms_reminder', {
  execute: async (context) => {
    const { task, params } = context;
    
    // Logique d'envoi SMS
    await smsService.send({
      to: params.phoneNumber,
      message: params.message
    });
    
    return { sent: true, timestamp: new Date() };
  }
});
```

### Créer des Workflows Personnalisés
```javascript
const customWorkflow = await taskmaster.createWorkflow({
  name: 'Mariage Traditionnel Québécois',
  description: 'Workflow adapté aux traditions québécoises',
  steps: [
    {
      name: 'Réserver église',
      taskTemplate: 'church_booking',
      priority: 'critical'
    },
    {
      name: 'Commander tourtière',
      taskTemplate: 'catering_special',
      conditions: ['season == "winter"']
    },
    // ... autres étapes
  ]
});
```

## 📈 Monitoring et Analytics

### Métriques Clés
- **Taux de Completion**: 95%+ attendu
- **Temps Moyen d'Exécution**: < 30 secondes
- **Taux d'Automatisation**: 80%+ des tâches
- **Satisfaction Utilisateur**: Score NPS

### Alertes Automatiques
- Tâches en retard
- Échecs répétés
- Dépassement de budget
- Conflits de planning
- Taux de RSVP faible

## 🛡️ Sécurité et Conformité

### Sécurité
- Chiffrement des données sensibles
- Authentification multi-facteurs
- Audit trail complet
- Isolation multi-tenant

### Conformité
- RGPD / Loi 25 compliant
- Consentement pour automatisations
- Droit à l'effacement
- Export des données

## 🚨 Troubleshooting

### Problèmes Courants

**Tâche bloquée**
```bash
# Vérifier le statut
curl /api/taskmaster/tasks/:id/status

# Forcer la réexécution
curl -X POST /api/taskmaster/tasks/:id/retry
```

**Workflow échoué**
```bash
# Voir les logs
docker logs attitudes-taskmaster

# Relancer avec compensation
curl -X POST /api/taskmaster/workflows/:id/compensate
```

**Performance dégradée**
```bash
# Vérifier les métriques
curl /api/taskmaster/metrics/performance

# Optimiser la queue
node scripts/optimize-taskmaster-queue.js
```

## 💡 Best Practices

1. **Granularité des Tâches**
   - Tâches atomiques (une seule responsabilité)
   - Durée cible: 5-30 minutes
   - Résultat mesurable

2. **Gestion des Échecs**
   - Toujours prévoir un plan B
   - Notifications appropriées
   - Escalade progressive

3. **Optimisation**
   - Paralléliser quand possible
   - Cacher les résultats fréquents
   - Monitorer les goulots

4. **Documentation**
   - Décrire clairement chaque tâche
   - Documenter les dépendances
   - Maintenir les templates à jour

## 🎯 Cas d'Usage Avancés

### Multi-Mariages Simultanés
```javascript
// Gérer plusieurs mariages le même jour
const sameDayWeddings = await taskmaster.coordinated({
  weddings: [wedding1Id, wedding2Id, wedding3Id],
  sharedResources: ['photographer', 'transportation'],
  conflictResolution: 'time_slots'
});
```

### Intégration Externe
```javascript
// Synchroniser avec Google Calendar
taskmaster.syncWithCalendar({
  provider: 'google',
  calendarId: 'wedding@gmail.com',
  twoWaySync: true
});

// Webhooks pour intégrations tierces
taskmaster.registerWebhook({
  event: 'task.completed',
  url: 'https://zapier.com/hooks/...',
  secret: process.env.WEBHOOK_SECRET
});
```

## 📚 Ressources

- [API Documentation](/api/docs/taskmaster)
- [Workflow Templates](/docs/taskmaster-workflows)
- [Video Tutorials](https://attitudes.vip/tutorials/taskmaster)
- [Support](mailto:support@attitudes.vip)

---

**Taskmaster transforme la complexité de l'organisation d'un mariage en un processus fluide et automatisé!** 🎉