# 🚀 Taskmaster - Guide de Démarrage Rapide

## ✅ Installation Complétée!

Taskmaster est maintenant intégré à AttitudesFramework. Voici comment l'utiliser:

## 📋 Statut de l'Installation

- ✅ Service Taskmaster installé
- ✅ 7 workflows de mariage prédéfinis
- ✅ 30+ templates de tâches
- ✅ Routes API configurées
- ✅ Intégration Claude active
- ⚠️  Base de données: Exécuter le script SQL manuellement

## 🗄️ Configuration Base de Données

Exécutez cette commande pour appliquer le schéma Taskmaster:

```bash
psql -d attitudes_db -f scripts/taskmaster-schema.sql
```

Ou si vous utilisez Supabase:
1. Ouvrez Supabase Studio
2. Allez dans SQL Editor
3. Copiez-collez le contenu de `scripts/taskmaster-schema.sql`
4. Exécutez

## 🎯 Utilisation Rapide

### 1. Via l'API REST

```bash
# Obtenir le statut
curl http://localhost:3000/api/taskmaster/status

# Créer une tâche
curl -X POST http://localhost:3000/api/taskmaster/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Confirmer le lieu de réception",
    "priority": "high",
    "dueDate": "2025-06-01",
    "weddingId": "123"
  }'

# Lister les workflows
curl http://localhost:3000/api/taskmaster/workflows

# Exécuter un workflow
curl -X POST http://localhost:3000/api/taskmaster/workflows/guestManagement/execute \
  -H "Content-Type: application/json" \
  -d '{
    "weddingId": "123",
    "weddingDate": "2025-06-15"
  }'
```

### 2. Via JavaScript

```javascript
const TaskmasterService = require('./src/services/taskmaster/taskmaster-service');
const taskmaster = new TaskmasterService();

// Créer une tâche automatisée
const task = await taskmaster.createTask({
  title: 'Envoyer save-the-date',
  automation: {
    enabled: true,
    executor: 'email_campaign',
    schedule: '2025-01-15 10:00'
  }
});

// Lancer un workflow complet
await taskmaster.executeWorkflow('completePlanning', {
  weddingId: 'abc123',
  budget: 50000,
  guestCount: 150
});
```

## 📊 Workflows Disponibles

1. **completePlanning** - Planification complète (40+ étapes)
2. **guestManagement** - Gestion des invités avec RSVP
3. **vendorCoordination** - Suivi des fournisseurs
4. **budgetManagement** - Contrôle du budget
5. **weddingDay** - Coordination jour J
6. **postWedding** - Actions post-mariage
7. **emergencyResponse** - Gestion de crise

## 🔌 Intégration avec l'App Existante

Ajoutez les routes Taskmaster à votre app Express:

```javascript
// Dans app.js ou server.js
const taskmasterRoutes = require('./src/routes/taskmaster.routes');
app.use('/api/taskmaster', taskmasterRoutes);
```

## 📈 Monitoring

Accédez aux métriques:
```bash
curl http://localhost:3000/api/taskmaster/metrics
```

Réponse exemple:
```json
{
  "success": true,
  "data": {
    "tasksCreated": 156,
    "tasksCompleted": 142,
    "tasksFailed": 3,
    "automationRate": "87.2%",
    "averageExecutionTime": 2.4
  }
}
```

## 🎨 Interface Web (Optionnelle)

Créez une page simple pour visualiser Taskmaster:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Taskmaster Dashboard</title>
</head>
<body>
    <h1>🤖 Taskmaster Dashboard</h1>
    <div id="metrics"></div>
    <div id="tasks"></div>
    
    <script>
        // Charger les métriques
        fetch('/api/taskmaster/metrics')
            .then(r => r.json())
            .then(data => {
                document.getElementById('metrics').innerHTML = `
                    <h2>Métriques</h2>
                    <p>Tâches créées: ${data.data.tasksCreated}</p>
                    <p>Taux d'automatisation: ${data.data.automationRate}</p>
                `;
            });
    </script>
</body>
</html>
```

## 🚨 Dépannage

### Erreur: "Cannot find module"
```bash
npm install --legacy-peer-deps
```

### Erreur: "Table does not exist"
Exécutez le script SQL:
```bash
psql -d attitudes_db -f scripts/taskmaster-schema.sql
```

### Services manquants
Les services comme `notification-service` sont des mocks pour l'instant. Implémentez-les selon vos besoins.

## 📚 Prochaines Étapes

1. **Personnaliser les Workflows**
   - Modifier `src/services/taskmaster/wedding-workflows.js`
   - Ajouter vos propres étapes

2. **Créer des Executors Custom**
   - Ajouter dans `taskmaster-service.js`
   - Exemples: SMS, WhatsApp, Slack

3. **Configurer les Notifications**
   - Email avec SendGrid/Mailgun
   - SMS avec Twilio
   - Push avec Firebase

4. **Activer l'IA**
   - Connecter à OpenAI/Anthropic
   - Améliorer la priorisation
   - Prédictions intelligentes

## 🎉 C'est Parti!

Taskmaster est prêt à automatiser la gestion des mariages. Commencez par:

1. Créer quelques tâches de test
2. Exécuter un workflow simple
3. Explorer les métriques
4. Personnaliser selon vos besoins

**Besoin d'aide?** Consultez la documentation complète dans `/docs/TASKMASTER_INTEGRATION.md`