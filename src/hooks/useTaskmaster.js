/**
 * Hook personnalisé pour l'intégration Taskmaster
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { useAuth } from './useAuth'

export const useTaskmaster = () => {
  const { supabase } = useSupabase()
  const { wedding } = useAuth()

  const [tasks, setTasks] = useState([])
  const [workflows, setWorkflows] = useState([])
  const [metrics, setMetrics] = useState({
    tasksCreated: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksInProgress: 0,
    averageAIPriority: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Charger les tâches
  const loadTasks = useCallback(async (weddingId = wedding?.id) => {
    if (!weddingId) return

    setLoading(true)
    setError(null)

    try {
      // Charger les tâches depuis la base
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!assigned_to(id, name, email)
        `)
        .eq('wedding_id', weddingId)
        .order('due_date', { ascending: true })

      if (tasksError) throw tasksError

      // Transformer les données pour l'UI
      const formattedTasks = tasksData.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        category: task.category,
        dueDate: task.due_date,
        assignedTo: task.assigned_user,
        aiPriority: task.ai_metadata?.priority_score || 50,
        aiSuggestions: task.ai_metadata?.suggestions || [],
        automation: task.automation_config || {},
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at)
      }))

      setTasks(formattedTasks)

      // Calculer les métriques
      updateMetrics(formattedTasks)
    } catch (err) {
      console.error('Erreur chargement tâches:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [wedding?.id, supabase])

  // Créer une nouvelle tâche
  const createTask = useCallback(async (taskData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          wedding_id: wedding.id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          category: taskData.category || 'general',
          due_date: taskData.dueDate,
          assigned_to: taskData.assignedTo,
          automation_config: taskData.automation || {},
          ai_metadata: {
            priority_score: calculateAIPriority(taskData),
            suggestions: generateSuggestions(taskData)
          }
        })
        .select()
        .single()

      if (error) throw error

      // Ajouter à la liste locale
      const newTask = {
        ...data,
        dueDate: data.due_date,
        aiPriority: data.ai_metadata?.priority_score,
        aiSuggestions: data.ai_metadata?.suggestions || []
      }

      setTasks(prev => [...prev, newTask])
      updateMetrics([...tasks, newTask])

      return newTask
    } catch (err) {
      console.error('Erreur création tâche:', err)
      throw err
    }
  }, [wedding?.id, supabase, tasks])

  // Mettre à jour une tâche
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour la liste locale
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, ...data } : task
      ))

      return data
    } catch (err) {
      console.error('Erreur mise à jour tâche:', err)
      throw err
    }
  }, [supabase])

  // Marquer une tâche comme complétée
  const completeTask = useCallback(async (taskId) => {
    return updateTask(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    })
  }, [updateTask])

  // Charger les workflows
  const loadWorkflows = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('taskmaster_workflows')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setWorkflows(data || [])
    } catch (err) {
      console.error('Erreur chargement workflows:', err)
    }
  }, [supabase])

  // Exécuter un workflow
  const executeWorkflow = useCallback(async (workflowId, context = {}) => {
    try {
      const { data, error } = await supabase
        .from('taskmaster_executions')
        .insert({
          workflow_id: workflowId,
          wedding_id: wedding.id,
          status: 'running',
          context: { ...context, wedding_id: wedding.id }
        })
        .select()
        .single()

      if (error) throw error

      // Recharger les tâches pour voir les nouvelles
      await loadTasks()

      return data
    } catch (err) {
      console.error('Erreur exécution workflow:', err)
      throw err
    }
  }, [wedding?.id, supabase, loadTasks])

  // Calculer la priorité IA
  const calculateAIPriority = (task) => {
    let score = 50 // Base

    // Urgence basée sur la date
    if (task.dueDate) {
      const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
      if (daysUntil <= 1) score = 100
      else if (daysUntil <= 3) score = 90
      else if (daysUntil <= 7) score = 75
      else if (daysUntil <= 14) score = 60
    }

    // Ajustement par priorité
    if (task.priority === 'urgent') score = Math.min(100, score + 30)
    else if (task.priority === 'high') score = Math.min(100, score + 15)

    // Ajustement par catégorie
    const criticalCategories = ['venue', 'ceremony', 'legal']
    if (criticalCategories.includes(task.category)) {
      score = Math.min(100, score + 10)
    }

    return score
  }

  // Générer des suggestions IA
  const generateSuggestions = (task) => {
    const suggestions = []

    if (task.dueDate) {
      const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)

      if (daysUntil < 0) {
        suggestions.push({
          type: 'urgent',
          message: 'Cette tâche est en retard !'
        })
      } else if (daysUntil <= 3) {
        suggestions.push({
          type: 'warning',
          message: 'Échéance très proche, prioriser cette tâche'
        })
      }
    }

    if (task.category === 'vendor' && !task.assignedTo) {
      suggestions.push({
        type: 'info',
        message: 'Assigner à un responsable pour un meilleur suivi'
      })
    }

    return suggestions
  }

  // Mettre à jour les métriques
  const updateMetrics = (tasksList) => {
    const completed = tasksList.filter(t => t.status === 'completed').length
    const failed = tasksList.filter(t => t.status === 'failed').length
    const inProgress = tasksList.filter(t => t.status === 'in_progress').length

    const avgPriority = tasksList.length > 0
      ? tasksList.reduce((sum, t) => sum + (t.aiPriority || 50), 0) / tasksList.length
      : 0

    setMetrics({
      tasksCreated: tasksList.length,
      tasksCompleted: completed,
      tasksFailed: failed,
      tasksInProgress: inProgress,
      averageAIPriority: Math.round(avgPriority)
    })
  }

  // S'abonner aux mises à jour temps réel
  useEffect(() => {
    if (!wedding?.id) return

    const subscription = supabase
      .channel(`tasks:${wedding.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `wedding_id=eq.${wedding.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task =>
              task.id === payload.new.id ? payload.new : task
            ))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(task => task.id !== payload.old.id))
          }

          // Recalculer les métriques
          updateMetrics(tasks)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [wedding?.id, supabase, tasks])

  return {
    tasks,
    workflows,
    metrics,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    completeTask,
    loadWorkflows,
    executeWorkflow
  }
}
