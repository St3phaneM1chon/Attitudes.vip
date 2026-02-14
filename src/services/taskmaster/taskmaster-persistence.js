/**
 * Service de persistance Taskmaster
 * Gère toutes les interactions avec la base de données
 */

const { createClient } = require('@supabase/supabase-js')
const EventEmitter = require('events')

class TaskmasterPersistence extends EventEmitter {
  constructor (config = {}) {
    super()

    this.supabase = createClient(
      config.supabaseUrl || process.env.SUPABASE_URL,
      config.supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    this.cache = new Map()
    this.subscriptions = new Map()
  }

  /**
   * Tâches
   */

  async saveTask (task) {
    const { data, error } = await this.supabase
      .from('tasks')
      .upsert({
        id: task.id,
        wedding_id: task.weddingId,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: task.status,
        category: task.category,
        assigned_to: task.assignedTo,
        due_date: task.dueDate,
        automation_config: task.automation || {},
        dependencies: task.automation?.dependencies || [],
        trigger_conditions: task.automation?.conditions || [],
        ai_metadata: task.aiMetadata || {},
        created_at: task.createdAt,
        updated_at: task.updatedAt
      })
      .select()
      .single()

    if (error) throw error

    // Mettre à jour le cache
    this.cache.set(`task:${data.id}`, data)

    // Émettre l'événement
    this.emit('task:saved', data)

    return data
  }

  async getTask (taskId) {
    // Vérifier le cache
    const cached = this.cache.get(`task:${taskId}`)
    if (cached) return cached

    const { data, error } = await this.supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw error

    this.cache.set(`task:${taskId}`, data)
    return data
  }

  async updateTaskStatus (taskId, status, result = null) {
    const updates = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
      updates.result = result
    } else if (status === 'failed') {
      updates.failed_at = new Date().toISOString()
      updates.last_error = result
    }

    const { data, error } = await this.supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()

    if (error) throw error

    // Ajouter à l'historique d'exécution
    await this.addExecutionHistory(taskId, status, result)

    return data
  }

  async addExecutionHistory (taskId, status, result) {
    const { data: task } = await this.supabase
      .from('tasks')
      .select('execution_history')
      .eq('id', taskId)
      .single()

    const history = task?.execution_history || []
    history.push({
      timestamp: new Date().toISOString(),
      status,
      result: result || null
    })

    // Garder seulement les 50 dernières entrées
    const trimmedHistory = history.slice(-50)

    await this.supabase
      .from('tasks')
      .update({ execution_history: trimmedHistory })
      .eq('id', taskId)
  }

  /**
   * Workflows
   */

  async saveWorkflow (workflow) {
    const { data, error } = await this.supabase
      .from('taskmaster_workflows')
      .insert({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        steps: workflow.steps,
        config: workflow.config,
        created_by: workflow.createdBy,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error

    this.emit('workflow:saved', data)
    return data
  }

  async getWorkflow (workflowId) {
    const { data, error } = await this.supabase
      .from('taskmaster_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()

    if (error) throw error
    return data
  }

  async getActiveWorkflows () {
    const { data, error } = await this.supabase
      .from('taskmaster_workflows')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async saveWorkflowExecution (execution) {
    const { data, error } = await this.supabase
      .from('taskmaster_executions')
      .insert({
        id: execution.id,
        workflow_id: execution.workflowId,
        wedding_id: execution.context?.weddingId,
        status: execution.status,
        started_at: execution.startedAt,
        completed_at: execution.completedAt,
        context: execution.context || {},
        results: execution.results || {},
        error: execution.error
      })
      .select()
      .single()

    if (error) throw error

    // Mettre à jour le compteur d'exécutions
    await this.incrementWorkflowExecutions(execution.workflowId)

    return data
  }

  async updateWorkflowExecution (executionId, updates) {
    const { data, error } = await this.supabase
      .from('taskmaster_executions')
      .update(updates)
      .eq('id', executionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async incrementWorkflowExecutions (workflowId) {
    await this.supabase.rpc('increment', {
      table_name: 'taskmaster_workflows',
      column_name: 'execution_count',
      row_id: workflowId
    })

    await this.supabase
      .from('taskmaster_workflows')
      .update({ last_executed: new Date().toISOString() })
      .eq('id', workflowId)
  }

  /**
   * Templates
   */

  async getTemplate (templateName) {
    const { data, error } = await this.supabase
      .from('taskmaster_templates')
      .select('*')
      .eq('name', templateName)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async getAllTemplates () {
    const { data, error } = await this.supabase
      .from('taskmaster_templates')
      .select('*')
      .order('category', { ascending: true })

    if (error) throw error
    return data
  }

  /**
   * Métriques
   */

  async saveMetric (metric) {
    const { data, error } = await this.supabase
      .from('taskmaster_metrics')
      .insert({
        metric_type: metric.type,
        metric_value: metric.value,
        wedding_id: metric.weddingId,
        metadata: metric.metadata || {}
      })

    if (error) throw error

    this.emit('metric:saved', metric)
    return data
  }

  async getMetrics (filters = {}) {
    let query = this.supabase
      .from('taskmaster_metrics')
      .select('*')

    if (filters.type) {
      query = query.eq('metric_type', filters.type)
    }

    if (filters.weddingId) {
      query = query.eq('wedding_id', filters.weddingId)
    }

    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(filters.limit || 100)

    if (error) throw error
    return data
  }

  /**
   * Configuration
   */

  async getTenantConfig (tenantId) {
    const { data, error } = await this.supabase
      .from('taskmaster_config')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    // Si pas de config, retourner la config par défaut
    if (!data) {
      return {
        enabled: true,
        ai_enabled: true,
        max_concurrent_tasks: 10,
        retry_attempts: 3,
        features: {
          auto_scheduling: true,
          smart_notifications: true,
          workflow_templates: true,
          predictive_analytics: true
        }
      }
    }

    return data.config
  }

  async updateTenantConfig (tenantId, configUpdates) {
    const { data, error } = await this.supabase
      .from('taskmaster_config')
      .upsert({
        tenant_id: tenantId,
        config: configUpdates,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data.config
  }

  /**
   * Audit
   */

  async logAuditEvent (event) {
    const { error } = await this.supabase
      .from('taskmaster_audit')
      .insert({
        tenant_id: event.tenantId,
        event_type: event.type,
        entity_type: event.entityType,
        entity_id: event.entityId,
        user_id: event.userId,
        changes: event.changes || null,
        metadata: event.metadata || {}
      })

    if (error) throw error
  }

  /**
   * Requêtes complexes
   */

  async getTasksByWedding (weddingId, filters = {}) {
    let query = this.supabase
      .from('tasks')
      .select('*')
      .eq('wedding_id', weddingId)

    if (filters.status) {
      query = query.in('status', Array.isArray(filters.status) ? filters.status : [filters.status])
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.automated) {
      query = query.neq('automation_config', '{}')
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: true })

    if (error) throw error
    return data
  }

  async getNextTasks (weddingId, limit = 10) {
    const { data, error } = await this.supabase
      .rpc('get_next_tasks', {
        p_wedding_id: weddingId,
        p_limit: limit
      })

    if (error) throw error
    return data
  }

  async getTasksWithDependencies (weddingId) {
    const tasks = await this.getTasksByWedding(weddingId)

    // Construire le graphe de dépendances
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const dependencyGraph = new Map()

    tasks.forEach(task => {
      const deps = task.dependencies || []
      dependencyGraph.set(task.id, deps)
    })

    return {
      tasks: taskMap,
      dependencies: dependencyGraph
    }
  }

  /**
   * Temps réel
   */

  subscribeToTaskUpdates (weddingId, callback) {
    const subscription = this.supabase
      .channel(`tasks:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `wedding_id=eq.${weddingId}`
        },
        (payload) => {
          callback({
            type: payload.eventType,
            task: payload.new || payload.old,
            oldTask: payload.old
          })
        }
      )
      .subscribe()

    this.subscriptions.set(`tasks:${weddingId}`, subscription)
    return subscription
  }

  subscribeToMetrics (weddingId, callback) {
    const subscription = this.supabase
      .channel(`metrics:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'taskmaster_metrics',
          filter: `wedding_id=eq.${weddingId}`
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    this.subscriptions.set(`metrics:${weddingId}`, subscription)
    return subscription
  }

  unsubscribe (key) {
    const subscription = this.subscriptions.get(key)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  /**
   * Nettoyage
   */

  async cleanup () {
    // Désabonner toutes les souscriptions
    for (const [key, subscription] of this.subscriptions) {
      subscription.unsubscribe()
    }
    this.subscriptions.clear()

    // Vider le cache
    this.cache.clear()
  }
}

module.exports = TaskmasterPersistence
