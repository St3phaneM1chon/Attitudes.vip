#!/usr/bin/env node

/**
 * Démonstration de Taskmaster
 * 
 * Exemples d'utilisation du système de gestion de tâches automatisé
 */

const TaskmasterService = require('../src/services/taskmaster/taskmaster-service');
const weddingWorkflows = require('../src/services/taskmaster/wedding-workflows');

async function demo() {
  console.log('🤖 Démonstration Taskmaster\n');
  
  // Initialiser Taskmaster
  const taskmaster = new TaskmasterService({
    enableAI: true,
    maxConcurrentTasks: 5
  });
  
  // Écouter les événements
  taskmaster.on('task:created', (task) => {
    console.log(`✅ Tâche créée: ${task.title}`);
  });
  
  taskmaster.on('task:completed', (task) => {
    console.log(`🎉 Tâche complétée: ${task.title}`);
  });
  
  taskmaster.on('task:failed', (task, error) => {
    console.log(`❌ Tâche échouée: ${task.title} - ${error.message}`);
  });
  
  console.log('📋 1. Création de tâches simples\n');
  
  // Créer une tâche manuelle
  const manualTask = await taskmaster.createTask({
    title: 'Appeler le fleuriste',
    description: 'Confirmer la commande de fleurs pour la cérémonie',
    category: 'vendor',
    priority: 'high',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
    weddingId: 'demo-wedding-001'
  });
  
  console.log(`   Tâche manuelle créée: ${manualTask.id}`);
  
  // Créer une tâche automatisée
  const autoTask = await taskmaster.createTask({
    title: 'Envoyer rappel RSVP',
    description: 'Rappeler aux invités de confirmer leur présence',
    category: 'guest',
    priority: 'medium',
    automation: {
      enabled: true,
      executor: 'notification',
      params: {
        type: 'email',
        subject: 'N\'oubliez pas de confirmer votre présence!',
        recipients: ['guests@example.com']
      }
    }
  });
  
  console.log(`   Tâche automatisée créée: ${autoTask.id}`);
  
  // Créer une tâche planifiée
  const scheduledTask = await taskmaster.createTask({
    title: 'Rapport hebdomadaire du budget',
    description: 'Générer et envoyer le rapport de suivi budgétaire',
    category: 'planning',
    priority: 'low',
    automation: {
      enabled: true,
      executor: 'report_generator',
      schedule: '0 9 * * MON', // Tous les lundis à 9h
      params: {
        reportType: 'budget',
        recipients: ['couple@example.com']
      }
    }
  });
  
  console.log(`   Tâche planifiée créée: ${scheduledTask.id}`);
  
  console.log('\n🔄 2. Création de workflows\n');
  
  // Créer un workflow personnalisé
  const customWorkflow = await taskmaster.createWorkflow({
    name: 'Coordination Dernière Semaine',
    description: 'Toutes les tâches critiques de la dernière semaine',
    steps: [
      {
        name: 'Confirmer tous les fournisseurs',
        taskTemplate: 'vendor_confirmation_all',
        priority: 'critical'
      },
      {
        name: 'Finaliser le plan de table',
        taskTemplate: 'seating_chart',
        priority: 'high',
        conditions: ['rsvp.completed']
      },
      {
        name: 'Préparer les paiements',
        taskTemplate: 'final_payments_prep',
        priority: 'high',
        parallel: true
      },
      {
        name: 'Brief final équipe',
        taskTemplate: 'team_briefing',
        priority: 'critical'
      }
    ],
    config: {
      notifications: ['email', 'sms'],
      stopOnFailure: false
    }
  });
  
  console.log(`   Workflow créé: ${customWorkflow.name}`);
  
  console.log('\n📊 3. Métriques et monitoring\n');
  
  // Obtenir les métriques
  const metrics = taskmaster.getMetrics();
  console.log('   Métriques actuelles:');
  console.log(`   - Tâches créées: ${metrics.tasksCreated}`);
  console.log(`   - Tâches complétées: ${metrics.tasksCompleted}`);
  console.log(`   - Tâches échouées: ${metrics.tasksFailed}`);
  console.log(`   - Workflows exécutés: ${metrics.workflowsExecuted}`);
  
  console.log('\n🎯 4. Cas d\'usage spécifiques au mariage\n');
  
  // Simuler un cas d'urgence
  console.log('   Simulation: Le traiteur annule 2 jours avant!');
  
  const emergencyTask = await taskmaster.createTask({
    title: 'URGENT: Trouver nouveau traiteur',
    description: 'Le traiteur a annulé, trouver une alternative immédiatement',
    category: 'vendor',
    priority: 'urgent',
    automation: {
      enabled: true,
      executor: 'crisis_handler',
      params: {
        notifyAll: true,
        activateBackupPlan: true,
        searchAlternatives: true
      }
    }
  });
  
  console.log(`   Tâche d'urgence créée et notifications envoyées!`);
  
  // Exemple de workflow complet de mariage
  console.log('\n🎊 5. Lancement d\'un workflow complet\n');
  
  console.log('   Workflows disponibles:');
  Object.keys(weddingWorkflows).forEach(key => {
    console.log(`   - ${key}: ${weddingWorkflows[key].name}`);
  });
  
  console.log('\n💡 Exemples de commandes utiles:');
  console.log('   - Exécuter une tâche: await taskmaster.executeTask(taskId)');
  console.log('   - Lancer un workflow: await taskmaster.executeWorkflow("guestManagement", context)');
  console.log('   - Voir les tâches en attente: taskmaster.tasks (filtrer par status: "pending")');
  console.log('   - Arrêter une tâche: taskmaster.cancelTask(taskId)');
  
  console.log('\n✅ Démonstration terminée!');
  console.log('\nPour utiliser Taskmaster dans votre application:');
  console.log('1. Importez le service: const TaskmasterService = require("./services/taskmaster/taskmaster-service")');
  console.log('2. Créez une instance: const taskmaster = new TaskmasterService()');
  console.log('3. Commencez à automatiser!');
}

// Exécuter la démo
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = demo;