/**
 * Routes API Taskmaster
 */

const express = require('express')
const router = express.Router()
const TaskmasterService = require('../services/taskmaster/taskmaster-service')
const weddingWorkflows = require('../services/taskmaster/wedding-workflows')

// Instance unique de Taskmaster
const taskmaster = new TaskmasterService()

/**
 * GET /api/taskmaster/status
 * Obtenir le statut du système
 */
router.get('/status', (req, res) => {
  const metrics = taskmaster.getMetrics()
  res.json({
    status: 'operational',
    metrics,
    uptime: process.uptime()
  })
})

/**
 * POST /api/taskmaster/tasks
 * Créer une nouvelle tâche
 */
router.post('/tasks', async (req, res) => {
  try {
    const task = await taskmaster.createTask(req.body)
    res.status(201).json({
      success: true,
      data: task
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/taskmaster/tasks/:id
 * Obtenir une tâche spécifique
 */
router.get('/tasks/:id', (req, res) => {
  const task = taskmaster.tasks.get(req.params.id)

  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    })
  }

  res.json({
    success: true,
    data: task
  })
})

/**
 * POST /api/taskmaster/tasks/:id/execute
 * Exécuter une tâche
 */
router.post('/tasks/:id/execute', async (req, res) => {
  try {
    const result = await taskmaster.executeTask(req.params.id, req.body)
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/taskmaster/workflows
 * Lister les workflows disponibles
 */
router.get('/workflows', (req, res) => {
  const workflows = Object.entries(weddingWorkflows).map(([key, workflow]) => ({
    id: key,
    name: workflow.name,
    description: workflow.description,
    steps: workflow.steps.length
  }))

  res.json({
    success: true,
    data: workflows
  })
})

/**
 * POST /api/taskmaster/workflows/:id/execute
 * Exécuter un workflow
 */
router.post('/workflows/:id/execute', async (req, res) => {
  try {
    const workflowConfig = weddingWorkflows[req.params.id]

    if (!workflowConfig) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      })
    }

    // Créer le workflow s'il n'existe pas
    const workflow = await taskmaster.createWorkflow(workflowConfig)

    // L'exécuter
    const execution = await taskmaster.executeWorkflow(workflow.id, req.body)

    res.json({
      success: true,
      data: execution
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/taskmaster/metrics
 * Obtenir les métriques détaillées
 */
router.get('/metrics', (req, res) => {
  const metrics = taskmaster.getMetrics()
  const tasks = Array.from(taskmaster.tasks.values())

  const detailed = {
    ...metrics,
    tasksByStatus: {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length
    },
    tasksByPriority: {
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    },
    automationRate: tasks.length > 0
      ? (tasks.filter(t => t.automation.enabled).length / tasks.length * 100).toFixed(1) + '%'
      : '0%'
  }

  res.json({
    success: true,
    data: detailed
  })
})

/**
 * GET /api/taskmaster/tasks/wedding/:weddingId
 * Obtenir toutes les tâches d'un mariage
 */
router.get('/tasks/wedding/:weddingId', (req, res) => {
  const tasks = Array.from(taskmaster.tasks.values())
    .filter(t => t.weddingId === req.params.weddingId)

  res.json({
    success: true,
    data: tasks,
    count: tasks.length
  })
})

module.exports = router
