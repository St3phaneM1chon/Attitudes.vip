/**
 * Taskmaster Service - Système de Gestion de Tâches Intelligent
 *
 * Gère l'automatisation complète des tâches pour AttitudesFramework
 * avec IA intégrée et workflows adaptatifs
 */

const EventEmitter = require('events')
const cron = require('node-cron')
const { v4: uuidv4 } = require('uuid')
const TaskmasterPersistence = require('./taskmaster-persistence')

class TaskmasterService extends EventEmitter {
  constructor (config = {}) {
    super()

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 10,
      retryAttempts: config.retryAttempts || 3,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      enableAI: config.enableAI !== false,
      enablePersistence: config.enablePersistence !== false,
      ...config
    }

    // État du système
    this.tasks = new Map()
    this.workflows = new Map()
    this.executors = new Map()
    this.scheduledJobs = new Map()
    this.runningTasks = new Set()

    // Métriques
    this.metrics = {
      tasksCreated: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      workflowsExecuted: 0
    }

    // Initialiser la persistance si activée
    if (this.config.enablePersistence) {
      this.persistence = new TaskmasterPersistence(config)
      this.setupPersistenceListeners()
    }

    // Initialiser les executors par défaut
    this.registerDefaultExecutors()

    // Démarrer le moniteur
    this.startMonitoring()
  }

  /**
   * Créer une nouvelle tâche
   */
  async createTask (taskData) {
    const task = {
      id: uuidv4(),
      title: taskData.title,
      description: taskData.description,
      type: taskData.type || 'manual',
      priority: taskData.priority || 'medium',
      status: 'pending',
      category: taskData.category || 'general',

      // Données spécifiques au mariage
      weddingId: taskData.weddingId,
      assignedTo: taskData.assignedTo,
      dueDate: taskData.dueDate,

      // Automatisation
      automation: {
        enabled: taskData.automation?.enabled || false,
        executor: taskData.automation?.executor,
        params: taskData.automation?.params || {},
        schedule: taskData.automation?.schedule,
        conditions: taskData.automation?.conditions || [],
        dependencies: taskData.automation?.dependencies || []
      },

      // Métadonnées
      createdAt: new Date(),
      updatedAt: new Date(),
      attempts: 0,
      lastError: null,
      result: null,

      // IA
      aiSuggestions: [],
      aiPriority: null,
      aiEstimatedDuration: null
    }

    // Analyser avec l'IA si activé
    if (this.config.enableAI) {
      await this.enhanceTaskWithAI(task)
    }

    // Stocker la tâche
    this.tasks.set(task.id, task)
    this.metrics.tasksCreated++

    // Persister si activé
    if (this.config.enablePersistence) {
      await this.persistence.saveTask(task)
    }

    // Émettre l'événement
    this.emit('task:created', task)

    // Planifier si nécessaire
    if (task.automation.enabled && task.automation.schedule) {
      await this.scheduleTask(task)
    }

    // Vérifier les conditions d'exécution immédiate
    if (task.automation.enabled && await this.checkConditions(task)) {
      await this.executeTask(task.id)
    }

    return task
  }

  /**
   * Exécuter une tâche
   */
  async executeTask (taskId, options = {}) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Vérifier les dépendances
    if (!await this.checkDependencies(task)) {
      console.log(`⏸️  Task ${task.title} waiting for dependencies`)
      return { status: 'waiting', reason: 'dependencies' }
    }

    // Vérifier la limite de concurrence
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      console.log(`⏸️  Task ${task.title} queued (max concurrent reached)`)
      return { status: 'queued', reason: 'concurrency_limit' }
    }

    // Marquer comme en cours
    task.status = 'in_progress'
    task.startedAt = new Date()
    this.runningTasks.add(taskId)
    this.emit('task:started', task)

    try {
      // Obtenir l'executor
      const executor = this.executors.get(task.automation.executor || 'default')
      if (!executor) {
        throw new Error(`Executor ${task.automation.executor} not found`)
      }

      // Créer le contexte d'exécution
      const context = {
        task,
        params: { ...task.automation.params, ...options },
        services: this.getServices(),
        emit: (event, data) => this.emit(`task:${task.id}:${event}`, data)
      }

      // Exécuter avec timeout
      const timeoutMs = options.timeout || task.automation.timeout || this.config.defaultTimeout
      const result = await this.executeWithTimeout(
        executor.execute(context),
        timeoutMs
      )

      // Succès
      task.status = 'completed'
      task.completedAt = new Date()
      task.result = result
      task.executionTime = task.completedAt - task.startedAt

      // Mettre à jour les métriques
      this.metrics.tasksCompleted++
      this.updateAverageExecutionTime(task.executionTime)

      // Persister le statut
      if (this.config.enablePersistence) {
        await this.persistence.updateTaskStatus(taskId, 'completed', result)
      }

      this.emit('task:completed', task)

      // Déclencher les tâches dépendantes
      await this.triggerDependentTasks(taskId)

      return { status: 'completed', result }
    } catch (error) {
      // Échec
      task.status = 'failed'
      task.failedAt = new Date()
      task.lastError = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      }
      task.attempts++

      this.metrics.tasksFailed++

      // Persister l'échec
      if (this.config.enablePersistence) {
        await this.persistence.updateTaskStatus(taskId, 'failed', {
          message: error.message,
          stack: error.stack
        })
      }

      this.emit('task:failed', task, error)

      // Retry si configuré
      if (task.attempts < this.config.retryAttempts) {
        console.log(`🔄 Retrying task ${task.title} (attempt ${task.attempts + 1})`)
        setTimeout(() => this.executeTask(taskId, options), 5000 * task.attempts)
      }

      return { status: 'failed', error: error.message }
    } finally {
      this.runningTasks.delete(taskId)
      task.updatedAt = new Date()
    }
  }

  /**
   * Créer un workflow
   */
  async createWorkflow (workflowData) {
    const workflow = {
      id: uuidv4(),
      name: workflowData.name,
      description: workflowData.description,

      // Étapes du workflow
      steps: workflowData.steps.map(step => ({
        id: uuidv4(),
        name: step.name,
        taskTemplate: step.taskTemplate,
        conditions: step.conditions || [],
        onSuccess: step.onSuccess || 'next',
        onFailure: step.onFailure || 'stop',
        parallel: step.parallel || false
      })),

      // Configuration
      config: {
        maxRetries: workflowData.maxRetries || 3,
        stopOnFailure: workflowData.stopOnFailure !== false,
        notifications: workflowData.notifications || [],
        timeout: workflowData.timeout || 3600000 // 1 heure
      },

      // Métadonnées
      createdAt: new Date(),
      lastExecuted: null,
      executions: 0
    }

    this.workflows.set(workflow.id, workflow)
    this.emit('workflow:created', workflow)

    return workflow
  }

  /**
   * Exécuter un workflow
   */
  async executeWorkflow (workflowId, context = {}) {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`)
    }

    console.log(`🔄 Executing workflow: ${workflow.name}`)

    const execution = {
      id: uuidv4(),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      context,
      completedSteps: [],
      currentStep: null,
      results: {}
    }

    this.emit('workflow:started', workflow, execution)

    try {
      // Grouper les étapes par niveau (pour parallélisation)
      const stepLevels = this.groupStepsByLevel(workflow.steps)

      for (const level of stepLevels) {
        // Exécuter les étapes du niveau en parallèle si configuré
        const stepPromises = level.map(async (step) => {
          execution.currentStep = step.id

          // Vérifier les conditions
          if (!await this.evaluateConditions(step.conditions, execution)) {
            console.log(`⏭️  Skipping step ${step.name} (conditions not met)`)
            return { stepId: step.id, status: 'skipped' }
          }

          // Créer la tâche depuis le template
          const task = await this.createTaskFromTemplate(step.taskTemplate, {
            ...context,
            workflowId,
            stepId: step.id
          })

          // Exécuter la tâche
          const result = await this.executeTask(task.id)

          execution.completedSteps.push(step.id)
          execution.results[step.id] = result

          // Gérer le résultat
          if (result.status === 'failed' && step.onFailure === 'stop') {
            throw new Error(`Step ${step.name} failed: ${result.error}`)
          }

          return { stepId: step.id, status: result.status, result }
        })

        // Attendre que toutes les étapes du niveau soient terminées
        await Promise.all(stepPromises)
      }

      // Workflow complété
      execution.status = 'completed'
      execution.completedAt = new Date()

      workflow.lastExecuted = new Date()
      workflow.executions++
      this.metrics.workflowsExecuted++

      this.emit('workflow:completed', workflow, execution)

      return execution
    } catch (error) {
      execution.status = 'failed'
      execution.error = error.message
      execution.failedAt = new Date()

      this.emit('workflow:failed', workflow, execution, error)

      throw error
    }
  }

  /**
   * Améliorer une tâche avec l'IA
   */
  async enhanceTaskWithAI (task) {
    // Analyser le contexte du mariage
    const weddingContext = await this.getWeddingContext(task.weddingId)

    // Priorisation intelligente
    task.aiPriority = this.calculateAIPriority(task, weddingContext)

    // Estimation de durée
    task.aiEstimatedDuration = this.estimateTaskDuration(task)

    // Suggestions
    task.aiSuggestions = this.generateTaskSuggestions(task, weddingContext)

    // Détection de conflits potentiels
    const conflicts = await this.detectPotentialConflicts(task, weddingContext)
    if (conflicts.length > 0) {
      task.aiSuggestions.push({
        type: 'warning',
        message: `Conflits potentiels détectés: ${conflicts.join(', ')}`
      })
    }

    return task
  }

  /**
   * Enregistrer les executors par défaut
   */
  registerDefaultExecutors () {
    // Executor pour notifications
    this.registerExecutor('notification', {
      execute: async (context) => {
        const { task, params } = context
        const notificationService = context.services.notification

        await notificationService.send({
          to: params.recipient || task.assignedTo,
          subject: params.subject || task.title,
          message: params.message || task.description,
          type: params.type || 'task'
        })

        return { sent: true, timestamp: new Date() }
      }
    })

    // Executor pour webhooks
    this.registerExecutor('webhook', {
      execute: async (context) => {
        const { params } = context
        const response = await fetch(params.url, {
          method: params.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...params.headers
          },
          body: JSON.stringify(params.body)
        })

        return {
          status: response.status,
          body: await response.json()
        }
      }
    })

    // Executor pour commandes système
    this.registerExecutor('command', {
      execute: async (context) => {
        const { params } = context
        const { exec } = require('child_process').promises

        const { stdout, stderr } = await exec(params.command, {
          cwd: params.cwd,
          env: { ...process.env, ...params.env }
        })

        return { stdout, stderr }
      }
    })

    // Executor pour base de données
    this.registerExecutor('database', {
      execute: async (context) => {
        const { params, services } = context
        const db = services.database

        const result = await db.query(params.query, params.values)

        return {
          rows: result.rows,
          rowCount: result.rowCount
        }
      }
    })

    // Executor par défaut
    this.registerExecutor('default', {
      execute: async (context) => {
        console.log(`Executing default task: ${context.task.title}`)
        return { executed: true }
      }
    })
  }

  /**
   * Planifier une tâche
   */
  async scheduleTask (task) {
    if (this.scheduledJobs.has(task.id)) {
      // Annuler l'ancienne planification
      this.scheduledJobs.get(task.id).stop()
    }

    const job = cron.schedule(task.automation.schedule, async () => {
      console.log(`⏰ Scheduled task triggered: ${task.title}`)
      await this.executeTask(task.id)
    })

    this.scheduledJobs.set(task.id, job)
    job.start()
  }

  /**
   * Templates de workflows pour mariages
   */
  getWeddingWorkflowTemplates () {
    return {
      vendorCoordination: {
        name: 'Coordination Fournisseurs',
        steps: [
          {
            name: 'Rappel 1 mois avant',
            taskTemplate: 'vendor_reminder',
            conditions: ['daysUntilWedding <= 30']
          },
          {
            name: 'Confirmation 2 semaines avant',
            taskTemplate: 'vendor_confirmation',
            conditions: ['daysUntilWedding <= 14']
          },
          {
            name: 'Brief final 3 jours avant',
            taskTemplate: 'vendor_final_brief',
            conditions: ['daysUntilWedding <= 3']
          }
        ]
      },

      guestManagement: {
        name: 'Gestion des Invités',
        steps: [
          {
            name: 'Envoi invitations',
            taskTemplate: 'send_invitations'
          },
          {
            name: 'Rappel RSVP',
            taskTemplate: 'rsvp_reminder',
            conditions: ['rsvpRate < 0.7', 'daysUntilDeadline <= 14']
          },
          {
            name: 'Finalisation liste',
            taskTemplate: 'finalize_guest_list',
            conditions: ['daysUntilWedding <= 7']
          }
        ]
      },

      paymentTracking: {
        name: 'Suivi Paiements',
        steps: [
          {
            name: 'Rappel acompte',
            taskTemplate: 'deposit_reminder',
            conditions: ['depositPaid == false', 'daysSinceBooking >= 7']
          },
          {
            name: 'Collecte paiements intermédiaires',
            taskTemplate: 'intermediate_payment',
            conditions: ['paymentSchedule.hasNext()']
          },
          {
            name: 'Solde final',
            taskTemplate: 'final_payment',
            conditions: ['daysUntilWedding <= 30']
          }
        ]
      }
    }
  }

  // Méthodes utilitaires

  registerExecutor (name, executor) {
    this.executors.set(name, executor)
  }

  async checkConditions (task) {
    if (!task.automation.conditions || task.automation.conditions.length === 0) {
      return true
    }

    // Évaluer chaque condition
    for (const condition of task.automation.conditions) {
      if (!await this.evaluateCondition(condition, task)) {
        return false
      }
    }

    return true
  }

  async checkDependencies (task) {
    if (!task.automation.dependencies || task.automation.dependencies.length === 0) {
      return true
    }

    for (const depId of task.automation.dependencies) {
      const depTask = this.tasks.get(depId)
      if (!depTask || depTask.status !== 'completed') {
        return false
      }
    }

    return true
  }

  async triggerDependentTasks (completedTaskId) {
    for (const [taskId, task] of this.tasks) {
      if (task.automation.dependencies.includes(completedTaskId) &&
          task.status === 'pending' &&
          await this.checkDependencies(task)) {
        await this.executeTask(taskId)
      }
    }
  }

  executeWithTimeout (promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      )
    ])
  }

  getServices () {
    // Retourner les services disponibles
    return {
      notification: require('../notification/notification-service'),
      database: require('../../db'),
      payment: require('../payment/payment-service'),
      email: require('../email/email-service')
    }
  }

  calculateAIPriority (task, context) {
    let score = 0

    // Urgence basée sur la date d'échéance
    if (task.dueDate) {
      const daysUntilDue = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)
      if (daysUntilDue <= 1) score += 100
      else if (daysUntilDue <= 7) score += 50
      else if (daysUntilDue <= 30) score += 20
    }

    // Impact sur le mariage
    if (task.category === 'ceremony') score += 80
    else if (task.category === 'reception') score += 60
    else if (task.category === 'vendor') score += 40

    // Dépendances
    score += task.automation.dependencies.length * 10

    return Math.min(100, score)
  }

  estimateTaskDuration (task) {
    // Estimation basée sur le type et la complexité
    const baseDurations = {
      notification: 1,
      email: 2,
      vendor_contact: 15,
      payment_processing: 5,
      report_generation: 10,
      default: 5
    }

    return baseDurations[task.type] || baseDurations.default
  }

  generateTaskSuggestions (task, context) {
    const suggestions = []

    // Suggestions basées sur le timing
    if (task.dueDate) {
      const daysUntil = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24)

      if (daysUntil < 0) {
        suggestions.push({
          type: 'urgent',
          message: 'Cette tâche est en retard!'
        })
      } else if (daysUntil <= 3) {
        suggestions.push({
          type: 'warning',
          message: 'Date limite proche, prioriser cette tâche'
        })
      }
    }

    // Suggestions basées sur les dépendances
    if (task.automation.dependencies.length > 3) {
      suggestions.push({
        type: 'info',
        message: 'Nombreuses dépendances, considérer la parallélisation'
      })
    }

    return suggestions
  }

  async detectPotentialConflicts (task, context) {
    const conflicts = []

    // Vérifier les conflits de ressources
    const sameDayTasks = Array.from(this.tasks.values()).filter(t =>
      t.dueDate &&
      new Date(t.dueDate).toDateString() === new Date(task.dueDate).toDateString() &&
      t.assignedTo === task.assignedTo
    )

    if (sameDayTasks.length > 3) {
      conflicts.push('Surcharge de tâches le même jour')
    }

    return conflicts
  }

  async getWeddingContext (weddingId) {
    // Simuler la récupération du contexte
    return {
      weddingDate: new Date('2025-06-15'),
      venue: 'Grand Hotel',
      guestCount: 150,
      budget: 50000,
      vendors: []
    }
  }

  groupStepsByLevel (steps) {
    // Grouper les étapes qui peuvent s'exécuter en parallèle
    const levels = []
    const processed = new Set()

    while (processed.size < steps.length) {
      const level = steps.filter(step =>
        !processed.has(step.id) &&
        (!step.dependencies || step.dependencies.every(dep => processed.has(dep)))
      )

      if (level.length === 0) break // Éviter boucle infinie

      levels.push(level)
      level.forEach(step => processed.add(step.id))
    }

    return levels
  }

  async evaluateConditions (conditions, context) {
    // Évaluation simplifiée des conditions
    for (const condition of conditions) {
      // Parser et évaluer la condition
      // Pour l'instant, validation basique
      if (condition.includes('false')) return false
    }
    return true
  }

  async evaluateCondition (condition, task) {
    // Évaluation basique
    return true
  }

  async createTaskFromTemplate (templateName, context) {
    // Templates prédéfinis
    const templates = {
      vendor_reminder: {
        title: 'Rappel Fournisseur',
        type: 'notification',
        automation: {
          enabled: true,
          executor: 'notification'
        }
      },
      rsvp_reminder: {
        title: 'Rappel RSVP',
        type: 'email',
        automation: {
          enabled: true,
          executor: 'email'
        }
      }
    }

    const template = templates[templateName] || {}

    return this.createTask({
      ...template,
      ...context
    })
  }

  updateAverageExecutionTime (newTime) {
    const totalTasks = this.metrics.tasksCompleted
    const currentAvg = this.metrics.averageExecutionTime

    this.metrics.averageExecutionTime =
      (currentAvg * (totalTasks - 1) + newTime) / totalTasks
  }

  startMonitoring () {
    // Monitoring toutes les minutes
    setInterval(() => {
      this.emit('metrics', this.getMetrics())

      // Nettoyer les tâches anciennes
      this.cleanupOldTasks()

      // Vérifier la santé du système
      this.healthCheck()
    }, 60000)
  }

  getMetrics () {
    return {
      ...this.metrics,
      activeTasks: this.runningTasks.size,
      pendingTasks: Array.from(this.tasks.values()).filter(t => t.status === 'pending').length,
      scheduledTasks: this.scheduledJobs.size,
      workflows: this.workflows.size
    }
  }

  cleanupOldTasks () {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' && task.completedAt < oneMonthAgo) {
        this.tasks.delete(id)
      }
    }
  }

  healthCheck () {
    const health = {
      status: 'healthy',
      issues: []
    }

    // Vérifier les tâches bloquées
    const blockedTasks = Array.from(this.tasks.values()).filter(t =>
      t.status === 'in_progress' &&
      (new Date() - new Date(t.startedAt)) > 3600000 // 1 heure
    )

    if (blockedTasks.length > 0) {
      health.status = 'warning'
      health.issues.push(`${blockedTasks.length} tâches bloquées`)
    }

    // Vérifier le taux d'échec
    const failureRate = this.metrics.tasksFailed / this.metrics.tasksCreated
    if (failureRate > 0.1) {
      health.status = 'critical'
      health.issues.push(`Taux d'échec élevé: ${(failureRate * 100).toFixed(1)}%`)
    }

    this.emit('health', health)
  }

  // Méthodes de persistance

  setupPersistenceListeners () {
    // Écouter les événements de persistance
    this.persistence.on('task:saved', (task) => {
      console.log(`📁 Tâche persistée: ${task.title}`)
    })

    this.persistence.on('workflow:saved', (workflow) => {
      console.log(`📁 Workflow persisté: ${workflow.name}`)
    })

    this.persistence.on('metric:saved', (metric) => {
      console.log(`📊 Métrique enregistrée: ${metric.type}`)
    })
  }

  async loadTasksFromDB (weddingId) {
    if (!this.config.enablePersistence) {
      throw new Error('La persistance doit être activée')
    }

    console.log(`📥 Chargement des tâches pour le mariage ${weddingId}...`)

    const tasks = await this.persistence.getTasksByWedding(weddingId, {
      status: ['pending', 'in_progress']
    })

    // Charger dans la mémoire locale
    for (const task of tasks) {
      this.tasks.set(task.id, {
        ...task,
        automation: task.automation_config || {},
        aiMetadata: task.ai_metadata || {},
        weddingId: task.wedding_id,
        assignedTo: task.assigned_to,
        dueDate: task.due_date,
        createdAt: new Date(task.created_at),
        updatedAt: new Date(task.updated_at)
      })

      // Replanifier les tâches automatiques
      if (task.automation_config?.enabled && task.automation_config?.schedule) {
        await this.scheduleTask(this.tasks.get(task.id))
      }
    }

    console.log(`✅ ${tasks.length} tâches chargées`)
    return tasks.length
  }

  async loadWorkflowsFromDB () {
    if (!this.config.enablePersistence) {
      throw new Error('La persistance doit être activée')
    }

    console.log('📥 Chargement des workflows actifs...')

    const workflows = await this.persistence.getActiveWorkflows()

    for (const workflow of workflows) {
      this.workflows.set(workflow.id, workflow)
    }

    console.log(`✅ ${workflows.length} workflows chargés`)
    return workflows.length
  }

  async saveMetricsToDB () {
    if (!this.config.enablePersistence) return

    await this.persistence.saveMetric({
      type: 'system_metrics',
      value: this.metrics,
      metadata: {
        timestamp: new Date(),
        running_tasks: this.runningTasks.size,
        scheduled_jobs: this.scheduledJobs.size
      }
    })
  }

  async subscribeToWeddingUpdates (weddingId) {
    if (!this.config.enablePersistence) return

    // S'abonner aux mises à jour de tâches
    this.persistence.subscribeToTaskUpdates(weddingId, (update) => {
      console.log('🔄 Mise à jour tâche reçue:', update.type, update.task.title)

      if (update.type === 'INSERT' || update.type === 'UPDATE') {
        // Mettre à jour la tâche locale
        this.tasks.set(update.task.id, update.task)
      } else if (update.type === 'DELETE') {
        // Supprimer la tâche locale
        this.tasks.delete(update.task.id)
        // Annuler la planification si nécessaire
        if (this.scheduledJobs.has(update.task.id)) {
          this.scheduledJobs.get(update.task.id).stop()
          this.scheduledJobs.delete(update.task.id)
        }
      }
    })

    // S'abonner aux métriques
    this.persistence.subscribeToMetrics(weddingId, (metric) => {
      this.emit('metric:received', metric)
    })
  }

  async getTaskmasterConfig (tenantId) {
    if (!this.config.enablePersistence) {
      return this.config
    }

    const dbConfig = await this.persistence.getTenantConfig(tenantId)
    return { ...this.config, ...dbConfig }
  }

  async updateTaskmasterConfig (tenantId, updates) {
    if (!this.config.enablePersistence) {
      throw new Error('La persistance doit être activée pour modifier la configuration')
    }

    const newConfig = await this.persistence.updateTenantConfig(tenantId, updates)

    // Appliquer certaines configurations immédiatement
    if (updates.max_concurrent_tasks) {
      this.config.maxConcurrentTasks = updates.max_concurrent_tasks
    }
    if (updates.ai_enabled !== undefined) {
      this.config.enableAI = updates.ai_enabled
    }

    return newConfig
  }

  async cleanup () {
    // Arrêter tous les jobs planifiés
    for (const job of this.scheduledJobs.values()) {
      job.stop()
    }

    // Sauvegarder les métriques finales
    if (this.config.enablePersistence) {
      await this.saveMetricsToDB()
      await this.persistence.cleanup()
    }

    // Nettoyer les collections
    this.tasks.clear()
    this.workflows.clear()
    this.executors.clear()
    this.scheduledJobs.clear()
    this.runningTasks.clear()
  }
}

module.exports = TaskmasterService
