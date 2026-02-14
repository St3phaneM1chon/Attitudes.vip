/**
 * Tests d'intégration pour useTaskmasterIntegration Hook
 * Tests avec IA, workflows et temps réel
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskmasterIntegration } from '../../src/hooks/useTaskmasterIntegration';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock Taskmaster Service
jest.mock('../../src/services/taskmaster/taskmaster-service', () => {
  return jest.fn().mockImplementation(() => ({
    createTask: jest.fn().mockResolvedValue({
      id: 'task_new',
      title: 'Nouvelle tâche créée',
      status: 'pending'
    }),
    updateTask: jest.fn().mockResolvedValue(true),
    executeTask: jest.fn().mockResolvedValue({
      success: true,
      result: 'Tâche exécutée avec succès'
    }),
    executeWorkflow: jest.fn().mockResolvedValue({
      success: true,
      executionId: 'exec_123',
      results: []
    }),
    getAISuggestions: jest.fn().mockResolvedValue([
      {
        id: 'sugg_1',
        type: 'task',
        priority: 'high',
        title: 'Réserver le lieu de réception',
        reason: 'Les meilleurs lieux sont réservés 12-18 mois à l\'avance',
        deadline: new Date('2024-06-01')
      },
      {
        id: 'sugg_2',
        type: 'optimization',
        priority: 'medium',
        title: 'Regrouper les rendez-vous fournisseurs',
        reason: 'Économiser du temps en planifiant plusieurs rendez-vous le même jour'
      }
    ]),
    getMetrics: jest.fn().mockResolvedValue({
      totalTasks: 45,
      completedTasks: 20,
      overdueTasks: 3,
      completionRate: 44.4,
      averageCompletionTime: 2.5
    })
  }));
});

// Données de test
const mockTasks = [
  {
    id: 'task_1',
    wedding_id: 'wedding_123',
    title: 'Choisir le lieu de réception',
    description: 'Visiter et sélectionner le lieu idéal',
    status: 'in_progress',
    priority: 'high',
    category: 'venue',
    due_date: '2024-06-01T10:00:00Z',
    assigned_to: 'user_123',
    dependencies: [],
    tags: ['urgent', 'budget-impactant'],
    progress: 50,
    time_estimate: 480, // 8h
    time_spent: 240,    // 4h
    automation: {
      enabled: true,
      type: 'reminder',
      config: { frequency: 'daily' }
    },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-20T15:00:00Z'
  },
  {
    id: 'task_2',
    wedding_id: 'wedding_123',
    title: 'Envoyer les save-the-date',
    description: 'Concevoir et envoyer les save-the-date',
    status: 'pending',
    priority: 'medium',
    category: 'invitations',
    due_date: '2024-07-01T10:00:00Z',
    assigned_to: 'user_456',
    dependencies: ['task_1'],
    tags: ['design', 'communication'],
    progress: 0,
    time_estimate: 360, // 6h
    created_at: '2024-01-05T10:00:00Z'
  },
  {
    id: 'task_3',
    wedding_id: 'wedding_123',
    title: 'Déguster les menus',
    description: 'Session de dégustation avec le traiteur',
    status: 'completed',
    priority: 'high',
    category: 'catering',
    due_date: '2024-05-15T14:00:00Z',
    completed_at: '2024-05-10T16:00:00Z',
    assigned_to: 'user_123',
    progress: 100,
    time_estimate: 180,
    time_spent: 150,
    created_at: '2024-01-10T10:00:00Z'
  }
];

const mockWorkflows = [
  {
    id: 'wf_1',
    name: 'vendor_coordination',
    title: 'Coordination des Fournisseurs',
    description: 'Workflow automatisé pour coordonner tous les fournisseurs',
    status: 'active',
    tasks_count: 8,
    completed_count: 3,
    automation_enabled: true
  },
  {
    id: 'wf_2',
    name: 'guest_management',
    title: 'Gestion des Invités',
    description: 'Processus complet de gestion des invitations et RSVP',
    status: 'active',
    tasks_count: 5,
    completed_count: 1,
    automation_enabled: false
  }
];

describe('useTaskmasterIntegration Hook Tests', () => {
  let mockSupabase;
  let mockChannel;

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };

    mockSupabase = {
      from: jest.fn((table) => {
        if (table === 'taskmaster_tasks') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockTasks,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'taskmaster_workflows') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockWorkflows,
                error: null
              }))
            }))
          };
        }
      }),
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn()
    };

    createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chargement initial', () => {
    it('devrait charger les tâches et workflows', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Vérifier les tâches
      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks[0].title).toBe('Choisir le lieu de réception');

      // Vérifier les workflows
      expect(result.current.workflows).toHaveLength(2);
      expect(result.current.workflows[0].name).toBe('vendor_coordination');

      // Vérifier les métriques
      expect(result.current.metrics.totalTasks).toBe(45);
      expect(result.current.metrics.completionRate).toBe(44.4);
    });

    it('devrait charger les suggestions IA', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.aiSuggestions).toHaveLength(2);
      expect(result.current.aiSuggestions[0].title).toBe('Réserver le lieu de réception');
      expect(result.current.aiSuggestions[0].priority).toBe('high');
    });
  });

  describe('Gestion des tâches', () => {
    it('devrait créer une nouvelle tâche', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newTaskData = {
        title: 'Choisir les alliances',
        description: 'Sélectionner et commander les alliances',
        priority: 'high',
        category: 'jewelry',
        due_date: '2024-08-01',
        assigned_to: 'user_123'
      };

      await act(async () => {
        const task = await result.current.actions.createTask(newTaskData);
        expect(task).toBeTruthy();
        expect(task.id).toBe('task_new');
      });
    });

    it('devrait exécuter une tâche automatisée', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const execution = await result.current.actions.executeTask('task_1');
        expect(execution.success).toBe(true);
        expect(execution.result).toBe('Tâche exécutée avec succès');
      });
    });

    it('devrait mettre à jour le statut d\'une tâche', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.updateTaskStatus('task_2', 'in_progress');
        expect(success).toBe(true);
      });
    });
  });

  describe('Exécution de workflows', () => {
    it('devrait exécuter un workflow complet', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const execution = await result.current.actions.executeWorkflow('vendor_coordination', {
          autoSchedule: true,
          priority: 'high'
        });
        
        expect(execution.success).toBe(true);
        expect(execution.executionId).toBe('exec_123');
      });
    });
  });

  describe('Filtrage et organisation', () => {
    it('devrait filtrer les tâches par statut', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterTasks({ status: 'pending' });
        expect(filtered).toHaveLength(1);
        expect(filtered[0].title).toBe('Envoyer les save-the-date');
      });
    });

    it('devrait filtrer les tâches par priorité', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterTasks({ priority: 'high' });
        expect(filtered).toHaveLength(2);
      });
    });

    it('devrait filtrer les tâches par assignation', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterTasks({ assigned_to: 'user_123' });
        expect(filtered).toHaveLength(2);
      });
    });

    it('devrait filtrer les tâches en retard', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));

      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        const filtered = result.current.actions.filterTasks({ overdue: true });
        expect(filtered).toHaveLength(1); // task_1 est en retard
        expect(filtered[0].title).toBe('Choisir le lieu de réception');
      });

      jest.useRealTimers();
    });
  });

  describe('Métriques et analyse', () => {
    it('devrait calculer les métriques par catégorie', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const categoryMetrics = result.current.tasks.reduce((acc, task) => {
        if (!acc[task.category]) {
          acc[task.category] = { total: 0, completed: 0 };
        }
        acc[task.category].total++;
        if (task.status === 'completed') {
          acc[task.category].completed++;
        }
        return acc;
      }, {});

      expect(categoryMetrics.venue).toEqual({ total: 1, completed: 0 });
      expect(categoryMetrics.catering).toEqual({ total: 1, completed: 1 });
    });

    it('devrait calculer le temps total estimé vs réel', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const timeMetrics = result.current.tasks.reduce((acc, task) => {
        acc.estimated += task.time_estimate || 0;
        acc.spent += task.time_spent || 0;
        return acc;
      }, { estimated: 0, spent: 0 });

      expect(timeMetrics.estimated).toBe(1020); // 17h
      expect(timeMetrics.spent).toBe(390);       // 6.5h
    });
  });

  describe('WebSocket temps réel', () => {
    it('devrait gérer les nouvelles tâches en temps réel', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'taskmaster_tasks'
      )[2];

      const newTask = {
        id: 'task_4',
        wedding_id: 'wedding_123',
        title: 'Nouvelle tâche temps réel',
        status: 'pending',
        priority: 'low',
        created_at: new Date().toISOString()
      };

      act(() => {
        taskHandler({
          eventType: 'INSERT',
          new: newTask
        });
      });

      expect(result.current.tasks).toHaveLength(4);
      expect(result.current.tasks.find(t => t.id === 'task_4')).toBeTruthy();
    });

    it('devrait gérer les mises à jour de progression', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'taskmaster_tasks'
      )[2];

      act(() => {
        taskHandler({
          eventType: 'UPDATE',
          new: {
            ...mockTasks[0],
            progress: 75,
            time_spent: 360 // 6h
          }
        });
      });

      const updatedTask = result.current.tasks.find(t => t.id === 'task_1');
      expect(updatedTask.progress).toBe(75);
      expect(updatedTask.time_spent).toBe(360);
    });

    it('devrait gérer les changements de workflow', async () => {
      const { result } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const workflowHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'taskmaster_workflows'
      )[2];

      act(() => {
        workflowHandler({
          eventType: 'UPDATE',
          new: {
            ...mockWorkflows[0],
            completed_count: 5
          }
        });
      });

      const updatedWorkflow = result.current.workflows.find(w => w.id === 'wf_1');
      expect(updatedWorkflow.completed_count).toBe(5);
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer les subscriptions au démontage', async () => {
      const { result, unmount } = renderHook(() => useTaskmasterIntegration('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});