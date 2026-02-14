/**
 * Exemple d'utilisation de Taskmaster
 * Démonstration des fonctionnalités principales
 */

const TaskmasterService = require('../src/services/taskmaster/taskmaster-service');

async function demo() {
  console.log('🚀 Démonstration Taskmaster\n');
  
  // 1. Initialiser le service (sans persistance pour la démo)
  const taskmaster = new TaskmasterService({
    enablePersistence: false, // Mode mémoire pour la démo
    enableAI: true,
    maxConcurrentTasks: 5
  });
  
  console.log('✅ Service Taskmaster initialisé\n');
  
  // 2. Créer une tâche manuelle
  console.log('📋 Création d\'une tâche manuelle...');
  const manualTask = await taskmaster.createTask({
    title: 'Confirmer le nombre d\'invités',
    description: 'Obtenir la confirmation finale du nombre d\'invités pour le traiteur',
    type: 'manual',
    priority: 'high',
    weddingId: 'wedding-demo-123',
    assignedTo: 'couple-owner',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
    category: 'guests'
  });
  
  console.log(`✅ Tâche créée: ${manualTask.title}`);
  console.log(`   ID: ${manualTask.id}`);
  console.log(`   Priorité IA: ${manualTask.aiPriority}`);
  console.log(`   Suggestions: ${manualTask.aiSuggestions.length}\n`);
  
  // 3. Créer une tâche automatisée
  console.log('🤖 Création d\'une tâche automatisée...');
  const autoTask = await taskmaster.createTask({
    title: 'Envoyer rappel RSVP',
    type: 'notification',
    priority: 'medium',
    weddingId: 'wedding-demo-123',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
    category: 'guests',
    automation: {
      enabled: true,
      executor: 'notification',
      params: {
        template: 'rsvp_reminder',
        recipients: ['guest1@example.com', 'guest2@example.com']
      }
    }
  });
  
  console.log(`✅ Tâche automatisée créée: ${autoTask.title}`);
  console.log(`   Executor: ${autoTask.automation.executor}\n`);
  
  // 4. Créer un workflow
  console.log('🔄 Création d\'un workflow personnalisé...');
  const workflow = await taskmaster.createWorkflow({
    name: 'Préparation Semaine Avant Mariage',
    description: 'Toutes les tâches critiques 7 jours avant le mariage',
    steps: [
      {
        name: 'Confirmation finale fournisseurs',
        taskTemplate: 'vendor_reminder',
        conditions: ['daysUntilWedding <= 7']
      },
      {
        name: 'Collecte RSVPs manquants',
        taskTemplate: 'rsvp_reminder',
        conditions: ['rsvpRate < 0.95']
      },
      {
        name: 'Finalisation plan de table',
        taskTemplate: 'seating_finalization',
        conditions: []
      }
    ]
  });
  
  console.log(`✅ Workflow créé: ${workflow.name}`);
  console.log(`   Étapes: ${workflow.steps.length}\n`);
  
  // 5. Exécuter une tâche automatique
  console.log('⚡ Exécution de la tâche automatisée...');
  try {
    const result = await taskmaster.executeTask(autoTask.id);
    console.log(`✅ Tâche exécutée avec succès!`);
    console.log(`   Statut: ${result.status}\n`);
  } catch (error) {
    console.log(`⚠️  Erreur d'exécution: ${error.message}\n`);
  }
  
  // 6. Afficher les métriques
  console.log('📊 Métriques du système:');
  const metrics = taskmaster.getMetrics();
  console.log(`   Tâches créées: ${metrics.tasksCreated}`);
  console.log(`   Tâches complétées: ${metrics.tasksCompleted}`);
  console.log(`   Tâches échouées: ${metrics.tasksFailed}`);
  console.log(`   Tâches actives: ${metrics.activeTasks}`);
  console.log(`   Workflows: ${metrics.workflows}\n`);
  
  // 7. Écouter les événements
  console.log('👂 Configuration des écouteurs d\'événements...');
  
  taskmaster.on('task:completed', (task) => {
    console.log(`   ✅ Événement: Tâche "${task.title}" complétée`);
  });
  
  taskmaster.on('task:failed', (task, error) => {
    console.log(`   ❌ Événement: Tâche "${task.title}" échouée - ${error.message}`);
  });
  
  taskmaster.on('health', (health) => {
    if (health.status !== 'healthy') {
      console.log(`   ⚠️  Santé système: ${health.status}`);
      health.issues.forEach(issue => console.log(`      - ${issue}`));
    }
  });
  
  // 8. Créer des tâches avec dépendances
  console.log('\n🔗 Création de tâches avec dépendances...');
  
  const task1 = await taskmaster.createTask({
    title: 'Confirmer le menu avec le traiteur',
    weddingId: 'wedding-demo-123',
    category: 'vendor'
  });
  
  const task2 = await taskmaster.createTask({
    title: 'Communiquer les allergies au traiteur',
    weddingId: 'wedding-demo-123',
    category: 'vendor',
    automation: {
      enabled: true,
      dependencies: [task1.id] // Dépend de task1
    }
  });
  
  console.log(`✅ Tâche "${task2.title}" créée avec dépendance sur "${task1.title}"\n`);
  
  // 9. Analyser les priorités avec l'IA
  console.log('🧠 Analyse IA des priorités...');
  
  // Créer une tâche urgente pour tester l'IA
  const urgentTask = await taskmaster.createTask({
    title: 'URGENT: Paiement final du lieu',
    priority: 'urgent',
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // Dans 12 heures
    weddingId: 'wedding-demo-123',
    category: 'venue'
  });
  
  console.log(`✅ Tâche urgente créée`);
  console.log(`   Priorité IA: ${urgentTask.aiPriority} (devrait être > 90)`);
  console.log(`   Durée estimée: ${urgentTask.aiEstimatedDuration} minutes`);
  
  if (urgentTask.aiSuggestions.length > 0) {
    console.log('   Suggestions IA:');
    urgentTask.aiSuggestions.forEach(s => {
      console.log(`     - [${s.type}] ${s.message}`);
    });
  }
  
  // 10. Tester la détection de conflits
  console.log('\n🔍 Test de détection de conflits...');
  const sameDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  // Créer plusieurs tâches le même jour pour le même responsable
  for (let i = 0; i < 5; i++) {
    await taskmaster.createTask({
      title: `Tâche test ${i + 1}`,
      dueDate: sameDay,
      assignedTo: 'wedding-planner',
      weddingId: 'wedding-demo-123'
    });
  }
  
  console.log('✅ 5 tâches créées pour le même jour');
  console.log('   L\'IA devrait détecter une surcharge potentielle\n');
  
  // 11. Health check
  console.log('🏥 Vérification de la santé du système...');
  taskmaster.healthCheck();
  
  // 12. Cleanup
  console.log('\n🧹 Nettoyage...');
  await taskmaster.cleanup();
  console.log('✅ Service Taskmaster fermé proprement\n');
  
  console.log('🎉 Démonstration terminée!');
  console.log('\n📝 Notes:');
  console.log('- Pour une utilisation réelle, activez enablePersistence: true');
  console.log('- Configurez les variables Supabase dans .env');
  console.log('- Consultez docs/taskmaster-quickstart.md pour plus d\'exemples');
}

// Exécuter la démo
demo().catch(console.error);