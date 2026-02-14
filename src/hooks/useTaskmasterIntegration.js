/**
 * Hook pour l'intégration avec Taskmaster IA
 * Gestion intelligente des tâches avec automatisation
 */

import { useState, useEffect, useCallback, useContext } from 'react'
import { useSupabase } from './useSupabase'
import { useWebSocket } from './useWebSocket'

// Context pour Taskmaster Service
import { TaskmasterContext } from '../context/TaskmasterContext'

export const useTaskmasterIntegration = (weddingId) => {
  const { supabase } = useSupabase()
  const { socket } = useWebSocket()
  const taskmasterService = useContext(TaskmasterContext)

  const [tasks, setTasks] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [metrics, setMetrics] = useState({
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    averageExecutionTime: 0,
    workflowsExecuted: 0,
    activeTasks: 0,
    pendingTasks: 0
  })
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Charger toutes les tâches du mariage
  const loadTasks = useCallback(async () => {
    if (!weddingId || !taskmasterService) return

    setLoading(true)
    try {
      // Charger depuis la base de données via Taskmaster
      await taskmasterService.loadTasksFromDB(weddingId)

      // Obtenir les tâches en mémoire
      const allTasks = Array.from(taskmasterService.tasks.values())
        .filter(task => task.weddingId === weddingId)

      setTasks(allTasks)

      // Charger les workflows disponibles
      const availableWorkflows = Object.keys(taskmasterService.getWeddingWorkflowTemplates())
      setWorkflows(availableWorkflows)

      // Obtenir les métriques
      const currentMetrics = taskmasterService.getMetrics()
      setMetrics(currentMetrics)

      // Obtenir les suggestions IA
      const suggestions = await generateAISuggestions(allTasks)
      setAiSuggestions(suggestions)
    } catch (err) {
      console.error('Error loading tasks:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weddingId, taskmasterService])

  // Créer une nouvelle tâche
  const createTask = async (taskData) => {
    if (!taskmasterService) return { success: false, error: 'Taskmaster not available' }

    try {
      const task = await taskmasterService.createTask({
        ...taskData,
        weddingId,
        automation: {
          enabled: taskData.automation?.enabled || false,
          executor: taskData.automation?.executor,
          params: taskData.automation?.params || {},
          schedule: taskData.automation?.schedule,
          conditions: taskData.automation?.conditions || [],
          dependencies: taskData.automation?.dependencies || []
        }
      })

      // Mettre à jour l'état local
      setTasks(prev => [task, ...prev])

      // Notification WebSocket
      if (socket) {
        socket.emit('task_created', {
          weddingId,
          task
        })
      }

      return { success: true, data: task }
    } catch (err) {
      console.error('Error creating task:', err)
      return { success: false, error: err.message }
    }
  }

  // Exécuter une tâche
  const executeTask = async (taskId, options = {}) => {
    if (!taskmasterService) return { success: false, error: 'Taskmaster not available' }

    try {
      const result = await taskmasterService.executeTask(taskId, options)

      // Recharger les tâches pour avoir l'état mis à jour
      await loadTasks()

      // Notification WebSocket
      if (socket) {
        socket.emit('task_executed', {
          weddingId,
          taskId,
          result
        })
      }

      return { success: true, data: result }
    } catch (err) {
      console.error('Error executing task:', err)
      return { success: false, error: err.message }
    }
  }

  // Mettre à jour une tâche
  const updateTask = async (taskId, updates) => {
    if (!taskmasterService) return { success: false, error: 'Taskmaster not available' }

    try {
      const task = taskmasterService.tasks.get(taskId)
      if (!task) {
        throw new Error('Task not found')
      }

      // Mettre à jour en mémoire
      const updatedTask = { ...task, ...updates, updatedAt: new Date() }
      taskmasterService.tasks.set(taskId, updatedTask)

      // Persister si activé
      if (taskmasterService.config.enablePersistence) {
        await taskmasterService.persistence.updateTaskStatus(taskId, updates.status, updates)
      }

      // Mettre à jour l'état local
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t))

      // Notification WebSocket
      if (socket) {
        socket.emit('task_updated', {
          weddingId,
          taskId,
          updates: updatedTask
        })
      }

      return { success: true, data: updatedTask }
    } catch (err) {
      console.error('Error updating task:', err)
      return { success: false, error: err.message }
    }
  }

  // Supprimer une tâche
  const deleteTask = async (taskId) => {
    if (!taskmasterService) return { success: false, error: 'Taskmaster not available' }

    try {
      taskmasterService.tasks.delete(taskId)

      // Supprimer de la base de données si persistance activée
      if (taskmasterService.config.enablePersistence) {
        await supabase
          .from('taskmaster_tasks')
          .delete()
          .eq('id', taskId)
          .eq('wedding_id', weddingId)
      }

      // Mettre à jour l'état local
      setTasks(prev => prev.filter(t => t.id !== taskId))

      // Notification WebSocket
      if (socket) {
        socket.emit('task_deleted', {
          weddingId,
          taskId
        })
      }

      return { success: true }
    } catch (err) {
      console.error('Error deleting task:', err)
      return { success: false, error: err.message }
    }
  }

  // Exécuter un workflow
  const executeWorkflow = async (workflowName, context = {}) => {
    if (!taskmasterService) return { success: false, error: 'Taskmaster not available' }

    try {
      // Obtenir le template du workflow
      const templates = taskmasterService.getWeddingWorkflowTemplates()
      const workflowTemplate = templates[workflowName]

      if (!workflowTemplate) {
        throw new Error(`Workflow ${workflowName} not found`)
      }

      // Créer le workflow
      const workflow = await taskmasterService.createWorkflow({
        ...workflowTemplate,
        context: { weddingId, ...context }
      })

      // Exécuter le workflow
      const execution = await taskmasterService.executeWorkflow(workflow.id, { weddingId, ...context })

      // Recharger les tâches
      await loadTasks()

      // Notification WebSocket
      if (socket) {
        socket.emit('workflow_executed', {
          weddingId,
          workflowName,
          execution
        })
      }

      return { success: true, data: execution }
    } catch (err) {
      console.error('Error executing workflow:', err)
      return { success: false, error: err.message }
    }
  }

  // Obtenir les suggestions IA
  const generateAISuggestions = async (taskList) => {
    if (!taskmasterService || !taskmasterService.config.enableAI) return []

    try {
      const suggestions = []

      // Analyser les tâches en retard
      const overdueTasks = taskList.filter(task =>
        task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed'
      )

      if (overdueTasks.length > 0) {
        suggestions.push({
          type: 'urgent',
          title: 'Tâches en retard détectées',
          message: `${overdueTasks.length} tâche(s) en retard nécessitent votre attention`,
          action: 'view_overdue',
          tasks: overdueTasks
        })
      }

      // Analyser les goulots d'étranglement
      const highPriorityTasks = taskList.filter(task =>
        task.priority === 'urgent' && task.status === 'pending'
      )

      if (highPriorityTasks.length > 3) {
        suggestions.push({
          type: 'warning',
          title: 'Goulot d\'étranglement détecté',
          message: 'Trop de tâches urgentes en attente. Considérez la délégation.',
          action: 'optimize_workload',
          tasks: highPriorityTasks
        })
      }

      // Suggestions d'automatisation
      const repetitiveTasks = taskList.filter(task =>
        task.type === 'notification' || task.type === 'email'
      )

      if (repetitiveTasks.length > 0) {
        suggestions.push({
          type: 'info',
          title: 'Opportunités d\'automatisation',
          message: `${repetitiveTasks.length} tâche(s) peuvent être automatisées`,
          action: 'setup_automation',
          tasks: repetitiveTasks
        })
      }

      // Suggestions de workflows
      const weddingDate = await getWeddingDate()
      if (weddingDate) {
        const daysUntilWedding = Math.ceil((new Date(weddingDate) - new Date()) / (1000 * 60 * 60 * 24))

        if (daysUntilWedding <= 30 && daysUntilWedding > 0) {
          suggestions.push({
            type: 'info',
            title: 'Workflow de coordination recommandé',
            message: 'Moins de 30 jours avant le mariage. Activez la coordination des fournisseurs.',
            action: 'start_vendor_coordination',
            workflow: 'vendorCoordination'
          })
        }

        if (daysUntilWedding <= 14 && daysUntilWedding > 0) {
          suggestions.push({
            type: 'warning',
            title: 'Workflow finalisation recommandé',
            message: 'Moins de 2 semaines avant le mariage. Préparez la finalisation.',
            action: 'start_final_preparation',
            workflow: 'finalPreparation'
          })
        }
      }

      return suggestions
    } catch (err) {
      console.error('Error generating AI suggestions:', err)
      return []
    }
  }

  // Obtenir la date du mariage
  const getWeddingDate = async () => {
    try {
      const { data, error } = await supabase
        .from('weddings')
        .select('event_date')
        .eq('id', weddingId)
        .single()

      if (error) throw error
      return data?.event_date
    } catch (err) {
      console.error('Error getting wedding date:', err)
      return null
    }
  }

  // Filtrer les tâches
  const filterTasks = useCallback((filters) => {
    return tasks.filter(task => {
      const matchesStatus = !filters.status || task.status === filters.status
      const matchesPriority = !filters.priority || task.priority === filters.priority
      const matchesCategory = !filters.category || task.category === filters.category
      const matchesSearch = !filters.search ||
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        task.description?.toLowerCase().includes(filters.search.toLowerCase())

      return matchesStatus && matchesPriority && matchesCategory && matchesSearch
    })
  }, [tasks])

  // Obtenir les statistiques des tâches
  const getTaskStats = useCallback(() => {
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      overdue: tasks.filter(t =>
        t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'
      ).length
    }

    stats.completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

    return stats
  }, [tasks])

  // Écouter les événements Taskmaster
  useEffect(() => {
    if (!taskmasterService) return

    const handleTaskEvent = (task) => {
      if (task.weddingId === weddingId) {
        loadTasks()
      }
    }

    const handleMetricsUpdate = (newMetrics) => {
      setMetrics(newMetrics)
    }

    taskmasterService.on('task:created', handleTaskEvent)
    taskmasterService.on('task:completed', handleTaskEvent)
    taskmasterService.on('task:failed', handleTaskEvent)
    taskmasterService.on('workflow:completed', handleTaskEvent)
    taskmasterService.on('metrics', handleMetricsUpdate)

    return () => {
      taskmasterService.off('task:created', handleTaskEvent)
      taskmasterService.off('task:completed', handleTaskEvent)
      taskmasterService.off('task:failed', handleTaskEvent)
      taskmasterService.off('workflow:completed', handleTaskEvent)
      taskmasterService.off('metrics', handleMetricsUpdate)
    }
  }, [taskmasterService, weddingId, loadTasks])

  // Écouter les mises à jour WebSocket
  useEffect(() => {
    if (!socket || !weddingId) return

    const handleTaskUpdate = (data) => {
      if (data.weddingId === weddingId) {
        loadTasks()
      }
    }

    socket.on('task_created', handleTaskUpdate)
    socket.on('task_updated', handleTaskUpdate)
    socket.on('task_executed', handleTaskUpdate)
    socket.on('task_deleted', handleTaskUpdate)
    socket.on('workflow_executed', handleTaskUpdate)

    return () => {
      socket.off('task_created', handleTaskUpdate)
      socket.off('task_updated', handleTaskUpdate)
      socket.off('task_executed', handleTaskUpdate)
      socket.off('task_deleted', handleTaskUpdate)
      socket.off('workflow_executed', handleTaskUpdate)
    }
  }, [socket, weddingId, loadTasks])

  // S'abonner aux mises à jour du mariage
  useEffect(() => {
    if (!taskmasterService || !weddingId) return

    taskmasterService.subscribeToWeddingUpdates(weddingId)

    return () => {
      // Cleanup sera géré par Taskmaster
    }
  }, [taskmasterService, weddingId])

  // Charger les données au montage
  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  return {
    tasks,
    workflows,
    metrics,
    aiSuggestions,
    loading,
    error,
    stats: getTaskStats(),
    actions: {
      createTask,
      updateTask,
      deleteTask,
      executeTask,
      executeWorkflow,
      filterTasks,
      reload: loadTasks
    }
  }
}
