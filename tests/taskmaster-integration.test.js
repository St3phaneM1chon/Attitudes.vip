/**
 * Tests d'intégration Taskmaster avec base de données
 */

const TaskmasterService = require('../src/services/taskmaster/taskmaster-service');
const TaskmasterPersistence = require('../src/services/taskmaster/taskmaster-persistence');
const { v4: uuidv4 } = require('uuid');

// Mock Supabase pour les tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      order: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis()
    }))
  }))
}));

describe('Taskmaster Integration Tests', () => {
  let taskmaster;
  let testWeddingId;
  let testTenantId;

  beforeEach(() => {
    testWeddingId = uuidv4();
    testTenantId = uuidv4();
    
    taskmaster = new TaskmasterService({
      enablePersistence: true,
      enableAI: true,
      maxConcurrentTasks: 5
    });
  });

  afterEach(async () => {
    await taskmaster.cleanup();
  });

  describe('Task Management avec Persistance', () => {
    it('devrait créer et persister une tâche', async () => {
      const taskData = {
        title: 'Confirmer le traiteur',
        description: 'Appeler le traiteur pour confirmer le menu',
        type: 'manual',
        priority: 'high',
        weddingId: testWeddingId,
        assignedTo: 'user-123',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        category: 'vendor',
        automation: {
          enabled: true,
          executor: 'notification',
          schedule: '0 9 * * *' // 9h tous les jours
        }
      };

      const task = await taskmaster.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.automation.enabled).toBe(true);
      expect(task.aiPriority).toBeDefined(); // Score IA calculé
    });

    it('devrait charger les tâches depuis la base de données', async () => {
      // Simuler des tâches existantes
      const mockTasks = [
        {
          id: uuidv4(),
          wedding_id: testWeddingId,
          title: 'Tâche 1',
          status: 'pending',
          automation_config: { enabled: true },
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          wedding_id: testWeddingId,
          title: 'Tâche 2',
          status: 'in_progress',
          automation_config: {},
          created_at: new Date().toISOString()
        }
      ];

      // Mock la réponse de la base
      taskmaster.persistence.getTasksByWedding = jest.fn()
        .mockResolvedValue(mockTasks);

      const count = await taskmaster.loadTasksFromDB(testWeddingId);

      expect(count).toBe(2);
      expect(taskmaster.tasks.size).toBe(2);
    });

    it('devrait exécuter une tâche automatique', async () => {
      const task = await taskmaster.createTask({
        title: 'Envoyer rappel RSVP',
        type: 'notification',
        weddingId: testWeddingId,
        automation: {
          enabled: true,
          executor: 'notification',
          params: {
            recipient: 'guest@example.com',
            template: 'rsvp_reminder'
          }
        }
      });

      const result = await taskmaster.executeTask(task.id);

      expect(result.status).toBe('completed');
      expect(taskmaster.metrics.tasksCompleted).toBe(1);
    });
  });

  describe('Workflow Management', () => {
    it('devrait créer et exécuter un workflow', async () => {
      const workflow = await taskmaster.createWorkflow({
        name: 'Coordination Fournisseurs Test',
        description: 'Workflow de test',
        steps: [
          {
            name: 'Notification initiale',
            taskTemplate: 'vendor_reminder',
            conditions: []
          },
          {
            name: 'Suivi',
            taskTemplate: 'vendor_confirmation',
            conditions: []
          }
        ]
      });

      expect(workflow).toBeDefined();
      expect(workflow.id).toBeDefined();
      expect(workflow.steps.length).toBe(2);

      // Mock les templates
      taskmaster.createTaskFromTemplate = jest.fn()
        .mockResolvedValue({
          id: uuidv4(),
          status: 'completed'
        });

      const execution = await taskmaster.executeWorkflow(workflow.id, {
        weddingId: testWeddingId
      });

      expect(execution.status).toBe('completed');
      expect(execution.completedSteps.length).toBe(2);
    });
  });

  describe('Configuration Multi-Tenant', () => {
    it('devrait charger la configuration par tenant', async () => {
      const mockConfig = {
        enabled: true,
        ai_enabled: false,
        max_concurrent_tasks: 20,
        features: {
          auto_scheduling: true,
          smart_notifications: false
        }
      };

      taskmaster.persistence.getTenantConfig = jest.fn()
        .mockResolvedValue(mockConfig);

      const config = await taskmaster.getTaskmasterConfig(testTenantId);

      expect(config.ai_enabled).toBe(false);
      expect(config.max_concurrent_tasks).toBe(20);
    });

    it('devrait mettre à jour la configuration dynamiquement', async () => {
      const updates = {
        ai_enabled: true,
        max_concurrent_tasks: 30
      };

      taskmaster.persistence.updateTenantConfig = jest.fn()
        .mockResolvedValue(updates);

      const newConfig = await taskmaster.updateTaskmasterConfig(
        testTenantId, 
        updates
      );

      expect(taskmaster.config.maxConcurrentTasks).toBe(30);
      expect(taskmaster.config.enableAI).toBe(true);
    });
  });

  describe('Métriques et Monitoring', () => {
    it('devrait enregistrer les métriques système', async () => {
      // Créer quelques tâches pour générer des métriques
      await taskmaster.createTask({
        title: 'Tâche 1',
        weddingId: testWeddingId
      });

      await taskmaster.createTask({
        title: 'Tâche 2',
        weddingId: testWeddingId
      });

      const saveSpy = jest.spyOn(taskmaster.persistence, 'saveMetric');

      await taskmaster.saveMetricsToDB();

      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'system_metrics',
          value: expect.objectContaining({
            tasksCreated: 2
          })
        })
      );
    });

    it('devrait détecter les tâches bloquées', () => {
      // Simuler une tâche bloquée
      taskmaster.tasks.set('blocked-task', {
        id: 'blocked-task',
        status: 'in_progress',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 heures
      });

      const healthSpy = jest.fn();
      taskmaster.on('health', healthSpy);

      taskmaster.healthCheck();

      expect(healthSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'warning',
          issues: expect.arrayContaining(['1 tâches bloquées'])
        })
      );
    });
  });

  describe('Temps Réel et Synchronisation', () => {
    it('devrait s\'abonner aux mises à jour de tâches', async () => {
      const subscribeSpy = jest.spyOn(
        taskmaster.persistence, 
        'subscribeToTaskUpdates'
      );

      await taskmaster.subscribeToWeddingUpdates(testWeddingId);

      expect(subscribeSpy).toHaveBeenCalledWith(
        testWeddingId,
        expect.any(Function)
      );
    });

    it('devrait mettre à jour les tâches locales en temps réel', async () => {
      await taskmaster.subscribeToWeddingUpdates(testWeddingId);

      // Simuler une mise à jour reçue
      const update = {
        type: 'UPDATE',
        task: {
          id: 'task-123',
          title: 'Tâche mise à jour',
          status: 'completed'
        }
      };

      // Déclencher manuellement le callback
      const callback = taskmaster.persistence.subscribeToTaskUpdates.mock.calls[0][1];
      callback(update);

      expect(taskmaster.tasks.has('task-123')).toBe(true);
      expect(taskmaster.tasks.get('task-123').status).toBe('completed');
    });
  });

  describe('IA et Automatisation', () => {
    it('devrait analyser les priorités avec l\'IA', async () => {
      const task = await taskmaster.createTask({
        title: 'Tâche urgente',
        priority: 'urgent',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        weddingId: testWeddingId,
        category: 'ceremony'
      });

      expect(task.aiPriority).toBeGreaterThan(80);
      expect(task.aiSuggestions).toBeDefined();
      expect(task.aiSuggestions.length).toBeGreaterThan(0);
    });

    it('devrait détecter les conflits potentiels', async () => {
      // Créer plusieurs tâches le même jour
      const sameDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const assignee = 'user-123';

      for (let i = 0; i < 5; i++) {
        await taskmaster.createTask({
          title: `Tâche ${i}`,
          dueDate: sameDate,
          assignedTo: assignee,
          weddingId: testWeddingId
        });
      }

      // La dernière tâche devrait avoir une suggestion de conflit
      const lastTask = Array.from(taskmaster.tasks.values()).pop();
      const conflictSuggestion = lastTask.aiSuggestions.find(
        s => s.message.includes('Surcharge')
      );

      expect(conflictSuggestion).toBeDefined();
    });
  });
});

describe('Taskmaster Persistence Service', () => {
  let persistence;

  beforeEach(() => {
    persistence = new TaskmasterPersistence({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    });
  });

  afterEach(async () => {
    await persistence.cleanup();
  });

  it('devrait gérer le cache correctement', async () => {
    const taskId = uuidv4();
    const mockTask = {
      id: taskId,
      title: 'Test Cache'
    };

    // Premier appel - pas en cache
    persistence.supabase.from().select().single
      .mockResolvedValueOnce({ data: mockTask, error: null });

    const task1 = await persistence.getTask(taskId);
    expect(task1).toEqual(mockTask);

    // Deuxième appel - devrait utiliser le cache
    const task2 = await persistence.getTask(taskId);
    expect(task2).toEqual(mockTask);

    // Vérifier que Supabase n'a été appelé qu'une fois
    expect(persistence.supabase.from).toHaveBeenCalledTimes(1);
  });
});