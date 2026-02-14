# 🚀 Guide de Démarrage Rapide - Taskmaster

## 📋 Prérequis

- Node.js 18+
- PostgreSQL avec Supabase configuré
- Variables d'environnement configurées

## 🔧 Installation

### 1. Configuration des Variables d'Environnement

Créez ou mettez à jour votre fichier `.env` :

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Base de données (optionnel si vous utilisez Supabase)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attitudes_db
DB_USER=postgres
DB_PASSWORD=your-password
```

### 2. Installation de la Base de Données

```bash
# Exécuter le script d'intégration
node scripts/taskmaster-db-integration.js

# Ou manuellement avec psql
psql -d attitudes_db -f scripts/taskmaster-schema.sql
```

### 3. Vérification de l'Installation

```bash
# Tester l'intégration
npm test tests/taskmaster-integration.test.js
```

## 💻 Utilisation

### Initialisation du Service

```javascript
const TaskmasterService = require('./src/services/taskmaster/taskmaster-service');

// Créer une instance avec persistance
const taskmaster = new TaskmasterService({
  enablePersistence: true,
  enableAI: true,
  maxConcurrentTasks: 10,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});

// Charger les tâches existantes
await taskmaster.loadTasksFromDB(weddingId);
await taskmaster.loadWorkflowsFromDB();
```

### Création de Tâches

```javascript
// Tâche manuelle simple
const manualTask = await taskmaster.createTask({
  title: 'Confirmer le nombre d\'invités',
  description: 'Obtenir la confirmation finale du nombre d\'invités',
  type: 'manual',
  priority: 'high',
  weddingId: 'wedding-123',
  assignedTo: 'user-456',
  dueDate: new Date('2024-02-15'),
  category: 'guests'
});

// Tâche automatisée
const autoTask = await taskmaster.createTask({
  title: 'Envoyer rappel RSVP',
  type: 'notification',
  priority: 'medium',
  weddingId: 'wedding-123',
  dueDate: new Date('2024-02-01'),
  category: 'guests',
  automation: {
    enabled: true,
    executor: 'email',
    params: {
      template: 'rsvp_reminder',
      recipients: 'pending_guests'
    },
    schedule: '0 9 * * *', // 9h tous les jours
    conditions: ['rsvp_rate < 0.7', 'days_until_deadline <= 14']
  }
});
```

### Workflows Prédéfinis

```javascript
// Utiliser un workflow prédéfini
const vendorWorkflow = await taskmaster.executeWorkflow(
  'vendorCoordination',
  {
    weddingId: 'wedding-123',
    vendorIds: ['vendor-1', 'vendor-2', 'vendor-3']
  }
);

// Créer un workflow personnalisé
const customWorkflow = await taskmaster.createWorkflow({
  name: 'Préparation Jour J',
  description: 'Toutes les tâches pour le jour du mariage',
  steps: [
    {
      name: 'Réveil et préparation',
      taskTemplate: 'morning_preparation',
      conditions: ['time >= 06:00']
    },
    {
      name: 'Coordination transport',
      taskTemplate: 'transport_coordination',
      conditions: ['time >= 08:00']
    },
    {
      name: 'Brief équipe',
      taskTemplate: 'team_briefing',
      conditions: ['time >= 09:00']
    }
  ],
  config: {
    auto_start: true,
    notify_on_complete: true,
    stopOnFailure: false
  }
});
```

### Temps Réel et Monitoring

```javascript
// S'abonner aux mises à jour temps réel
await taskmaster.subscribeToWeddingUpdates(weddingId);

// Écouter les événements
taskmaster.on('task:completed', (task) => {
  console.log(`✅ Tâche complétée: ${task.title}`);
  // Notifier l'utilisateur
});

taskmaster.on('task:failed', (task, error) => {
  console.error(`❌ Tâche échouée: ${task.title}`, error);
  // Alerter l'équipe
});

taskmaster.on('metric:received', (metric) => {
  console.log(`📊 Métrique reçue: ${metric.type}`, metric.value);
  // Mettre à jour le dashboard
});

// Vérifier la santé du système
taskmaster.on('health', (health) => {
  if (health.status === 'critical') {
    // Déclencher une alerte
    console.error('🚨 Problème critique détecté:', health.issues);
  }
});
```

### Configuration Multi-Tenant

```javascript
// Obtenir la configuration du tenant
const config = await taskmaster.getTaskmasterConfig(tenantId);

// Mettre à jour la configuration
await taskmaster.updateTaskmasterConfig(tenantId, {
  ai_enabled: true,
  max_concurrent_tasks: 20,
  features: {
    auto_scheduling: true,
    smart_notifications: true,
    workflow_templates: true,
    predictive_analytics: false
  }
});
```

## 📊 Dashboard et API

### Routes API Disponibles

```javascript
// Routes Taskmaster (ajouter à votre Express app)
const taskmasterRoutes = require('./src/routes/taskmaster.routes');
app.use('/api/taskmaster', taskmasterRoutes);

// Endpoints disponibles:
// GET    /api/taskmaster/tasks/:weddingId
// POST   /api/taskmaster/tasks
// PUT    /api/taskmaster/tasks/:taskId
// DELETE /api/taskmaster/tasks/:taskId
// POST   /api/taskmaster/tasks/:taskId/execute
// GET    /api/taskmaster/workflows
// POST   /api/taskmaster/workflows/:workflowId/execute
// GET    /api/taskmaster/metrics/:weddingId
// GET    /api/taskmaster/dashboard/:weddingId
```

### Intégration Frontend

```javascript
// Composant React exemple
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

function TaskmasterDashboard({ weddingId }) {
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState({});
  
  useEffect(() => {
    // Charger les tâches initiales
    fetchTasks();
    
    // S'abonner aux mises à jour temps réel
    const subscription = supabase
      .channel(`tasks:${weddingId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks' },
        handleTaskUpdate
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [weddingId]);
  
  const handleTaskUpdate = (payload) => {
    if (payload.eventType === 'INSERT') {
      setTasks(prev => [...prev, payload.new]);
    } else if (payload.eventType === 'UPDATE') {
      setTasks(prev => prev.map(t => 
        t.id === payload.new.id ? payload.new : t
      ));
    }
  };
  
  // Reste de l'implémentation...
}
```

## 🧪 Tests

```bash
# Tests unitaires
npm test tests/taskmaster-service.test.js

# Tests d'intégration
npm test tests/taskmaster-integration.test.js

# Tests de performance
npm run performance:test -- --target taskmaster
```

## 🐛 Débogage

### Logs Détaillés

```javascript
// Activer les logs détaillés
const taskmaster = new TaskmasterService({
  debug: true,
  logLevel: 'verbose'
});

// Vérifier les logs dans Supabase
SELECT * FROM taskmaster_audit 
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC
LIMIT 100;
```

### Problèmes Courants

1. **Tâches non exécutées**
   - Vérifier les conditions d'exécution
   - Vérifier les permissions de l'executor
   - Consulter les logs d'erreur

2. **Performance lente**
   - Réduire `maxConcurrentTasks`
   - Vérifier les index de base de données
   - Analyser les métriques système

3. **Erreurs de persistance**
   - Vérifier la connexion Supabase
   - Vérifier les politiques RLS
   - Consulter les logs Supabase

## 📚 Ressources

- [Documentation API complète](./api/taskmaster.md)
- [Guide des Workflows](./workflows-guide.md)
- [Configuration Avancée](./taskmaster-advanced.md)
- [Exemples de Code](../examples/taskmaster/)

## 🆘 Support

Pour obtenir de l'aide :
1. Consultez les logs : `npm run logs:taskmaster`
2. Vérifiez le dashboard : `/dashboard/taskmaster`
3. Contactez l'équipe : support@attitudes.vip

---

**Taskmaster transforme la gestion des tâches de mariage en expérience fluide et automatisée!** 🎯