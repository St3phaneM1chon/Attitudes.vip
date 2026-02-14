/**
 * Exemple d'utilisation de Taskmaster avec persistance simulée
 * Démontre comment utiliser Taskmaster avec une base de données
 */

require('dotenv').config();

// Simuler une base de données en mémoire
class MockDatabase {
  constructor() {
    this.tasks = new Map();
    this.workflows = new Map();
    this.metrics = [];
    this.config = new Map();
  }

  async saveTask(task) {
    this.tasks.set(task.id, { ...task, saved_at: new Date() });
    console.log(`💾 [DB] Tâche sauvegardée: ${task.title}`);
    return task;
  }

  async getTask(id) {
    return this.tasks.get(id);
  }

  async updateTask(id, updates) {
    const task = this.tasks.get(id);
    if (task) {
      const updated = { ...task, ...updates, updated_at: new Date() };
      this.tasks.set(id, updated);
      console.log(`💾 [DB] Tâche mise à jour: ${task.title}`);
      return updated;
    }
    return null;
  }

  async getTasksByWedding(weddingId) {
    const tasks = Array.from(this.tasks.values())
      .filter(t => t.weddingId === weddingId);
    console.log(`💾 [DB] ${tasks.length} tâches récupérées pour le mariage ${weddingId}`);
    return tasks;
  }

  async saveWorkflow(workflow) {
    this.workflows.set(workflow.id, workflow);
    console.log(`💾 [DB] Workflow sauvegardé: ${workflow.name}`);
    return workflow;
  }

  async saveMetric(metric) {
    this.metrics.push({ ...metric, timestamp: new Date() });
    console.log(`💾 [DB] Métrique enregistrée: ${metric.type}`);
  }

  async getTenantConfig(tenantId) {
    return this.config.get(tenantId) || {
      enabled: true,
      ai_enabled: true,
      max_concurrent_tasks: 10
    };
  }
}

// Version modifiée du service Taskmaster pour la démo
const TaskmasterService = require('../src/services/taskmaster/taskmaster-service');

// Créer une version avec persistance simulée
class TaskmasterWithMockPersistence extends TaskmasterService {
  constructor(config) {
    super({ ...config, enablePersistence: false });
    this.mockDb = new MockDatabase();
    this.config.enablePersistence = true; // Simuler l'activation
  }

  // Override des méthodes de persistance
  async saveTask(task) {
    await super.createTask(task);
    return this.mockDb.saveTask(task);
  }

  async updateTaskStatus(taskId, status, result) {
    return this.mockDb.updateTask(taskId, { status, result });
  }

  async loadTasksFromDB(weddingId) {
    const tasks = await this.mockDb.getTasksByWedding(weddingId);
    
    // Charger dans la mémoire locale
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
    
    console.log(`✅ ${tasks.length} tâches chargées depuis la base de données`);
    return tasks.length;
  }

  async saveMetricsToDB() {
    await this.mockDb.saveMetric({
      type: 'system_metrics',
      value: this.metrics
    });
  }
}

// Démonstration
async function demoWithPersistence() {
  console.log('🚀 Démonstration Taskmaster avec Persistance\n');
  console.log('📝 Configuration de l\'environnement:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL || 'Non configuré'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);

  // 1. Initialiser avec "persistance"
  const taskmaster = new TaskmasterWithMockPersistence({
    enablePersistence: true,
    enableAI: true,
    maxConcurrentTasks: 10,
    supabaseUrl: process.env.SUPABASE_URL || 'https://demo.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-key'
  });

  console.log('✅ Taskmaster initialisé avec persistance\n');

  const weddingId = 'wedding-prod-456';
  const tenantId = 'tenant-abc-123';

  // 2. Créer et persister des tâches
  console.log('📋 Création de tâches avec persistance...\n');

  const tasks = [];

  // Tâche 1: Confirmation venue
  const task1 = await taskmaster.createTask({
    title: 'Confirmer la réservation du lieu',
    description: 'Appeler le lieu pour confirmer tous les détails',
    priority: 'urgent',
    weddingId,
    assignedTo: 'wedding-planner',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    category: 'venue'
  });
  await taskmaster.mockDb.saveTask(task1);
  tasks.push(task1);

  // Tâche 2: Menu final
  const task2 = await taskmaster.createTask({
    title: 'Finaliser le menu avec le traiteur',
    description: 'Confirmer le menu et le nombre de couverts',
    priority: 'high',
    weddingId,
    assignedTo: 'couple-owner',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    category: 'catering',
    automation: {
      enabled: true,
      executor: 'email',
      params: {
        template: 'menu_confirmation',
        recipient: 'traiteur@example.com'
      }
    }
  });
  await taskmaster.mockDb.saveTask(task2);
  tasks.push(task2);

  // Tâche 3: Photos
  const task3 = await taskmaster.createTask({
    title: 'Brief photographe pour les moments clés',
    priority: 'medium',
    weddingId,
    assignedTo: 'wedding-planner',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    category: 'photography'
  });
  await taskmaster.mockDb.saveTask(task3);
  tasks.push(task3);

  console.log(`✅ ${tasks.length} tâches créées et persistées\n`);

  // 3. Simuler un rechargement depuis la DB
  console.log('🔄 Simulation du rechargement depuis la base de données...');
  
  // Vider la mémoire locale
  taskmaster.tasks.clear();
  console.log('   Mémoire locale vidée');
  
  // Recharger depuis la "DB"
  const loadedCount = await taskmaster.loadTasksFromDB(weddingId);
  console.log(`   ${loadedCount} tâches rechargées\n`);

  // 4. Créer un workflow avec persistance
  console.log('🔄 Création d\'un workflow persisté...');
  const workflow = await taskmaster.createWorkflow({
    name: 'Checklist J-7',
    description: 'Toutes les vérifications 7 jours avant',
    steps: [
      {
        name: 'Confirmer tous les fournisseurs',
        taskTemplate: 'vendor_confirmation'
      },
      {
        name: 'Finaliser le plan de table',
        taskTemplate: 'seating_finalization'
      },
      {
        name: 'Préparer les welcome bags',
        taskTemplate: 'welcome_bags_preparation'
      }
    ]
  });
  await taskmaster.mockDb.saveWorkflow(workflow);
  console.log(`✅ Workflow "${workflow.name}" créé et persisté\n`);

  // 5. Mettre à jour le statut d'une tâche
  console.log('📝 Mise à jour du statut des tâches...');
  
  // Marquer task1 comme complétée
  await taskmaster.updateTaskStatus(task1.id, 'completed', {
    completedBy: 'wedding-planner',
    notes: 'Lieu confirmé, tout est OK'
  });
  
  // Marquer task2 comme en cours
  await taskmaster.updateTaskStatus(task2.id, 'in_progress', {
    startedAt: new Date()
  });
  
  console.log('✅ Statuts mis à jour dans la base de données\n');

  // 6. Sauvegarder les métriques
  console.log('📊 Sauvegarde des métriques...');
  await taskmaster.saveMetricsToDB();
  
  // 7. Configuration tenant
  console.log('\n⚙️  Configuration multi-tenant...');
  const config = await taskmaster.mockDb.getTenantConfig(tenantId);
  console.log(`   Configuration du tenant ${tenantId}:`);
  console.log(`   - IA activée: ${config.ai_enabled}`);
  console.log(`   - Tâches concurrentes max: ${config.max_concurrent_tasks}`);

  // 8. Rapport final
  console.log('\n📊 Rapport de persistance:');
  console.log(`   - Tâches en base: ${taskmaster.mockDb.tasks.size}`);
  console.log(`   - Workflows en base: ${taskmaster.mockDb.workflows.size}`);
  console.log(`   - Métriques enregistrées: ${taskmaster.mockDb.metrics.length}`);
  
  console.log('\n📋 État des tâches:');
  for (const [id, task] of taskmaster.mockDb.tasks) {
    console.log(`   - ${task.title}: ${task.status || 'pending'}`);
  }

  // 9. Cleanup
  console.log('\n🧹 Nettoyage...');
  await taskmaster.cleanup();
  console.log('✅ Taskmaster fermé proprement');

  console.log('\n🎉 Démonstration avec persistance terminée!');
  console.log('\n📝 Notes pour l\'implémentation réelle:');
  console.log('1. Configurez les vraies credentials Supabase dans .env');
  console.log('2. Exécutez: node scripts/taskmaster-db-integration.js');
  console.log('3. Les données seront réellement persistées dans PostgreSQL');
  console.log('4. Les mises à jour seront synchronisées en temps réel');
}

// Exécuter la démo
demoWithPersistence().catch(console.error);