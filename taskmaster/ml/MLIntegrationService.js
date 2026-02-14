const { EventEmitter } = require('events');
const TaskDurationPredictor = require('./TaskDurationPredictor');
const PriorityClassifier = require('./PriorityClassifier');
const AnomalyDetector = require('./AnomalyDetector');
const WorkflowOptimizer = require('./WorkflowOptimizer');

/**
 * Service d'Intégration ML pour TaskMaster
 * Centralise tous les modèles ML et leur utilisation
 */
class MLIntegrationService extends EventEmitter {
  constructor(taskMasterService, memoryManager) {
    super();
    this.taskMaster = taskMasterService;
    this.memoryManager = memoryManager;
    
    // Modèles ML
    this.models = {
      durationPredictor: null,
      priorityClassifier: null,
      anomalyDetector: null,
      workflowOptimizer: null
    };
    
    // Configuration
    this.config = {
      autoLearnEnabled: true,
      predictionCacheTime: 3600000, // 1 heure
      confidenceThreshold: 0.7,
      anomalyThreshold: 0.8
    };
    
    // Métriques
    this.metrics = {
      predictions: 0,
      successfulPredictions: 0,
      anomaliesDetected: 0,
      optimizationsSuggested: 0
    };
    
    this.initialized = false;
  }

  /**
   * Initialise tous les modèles ML
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing ML Integration Service...');
      
      // Initialiser chaque modèle
      this.models.durationPredictor = new TaskDurationPredictor();
      await this.models.durationPredictor.initialize();
      
      // Les autres modèles peuvent être initialisés de la même manière
      // this.models.priorityClassifier = new PriorityClassifier();
      // await this.models.priorityClassifier.initialize();
      
      // Configurer les listeners
      this.setupEventListeners();
      
      // Charger les données historiques pour l'apprentissage initial
      await this.loadHistoricalData();
      
      this.initialized = true;
      this.emit('ml:initialized');
      
    } catch (error) {
      console.error('Failed to initialize ML Integration:', error);
      throw error;
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Écouter les nouvelles tâches pour faire des prédictions
    this.taskMaster.on('task:created', async (task) => {
      await this.processNewTask(task);
    });
    
    // Écouter les tâches complétées pour l'apprentissage
    this.taskMaster.on('task:completed', async (task) => {
      await this.learnFromCompletedTask(task);
    });
    
    // Écouter les changements de workflow
    this.taskMaster.on('workflow:updated', async (workflow) => {
      await this.analyzeWorkflowOptimization(workflow);
    });
    
    // Écouter les événements du memory manager
    this.memoryManager.on('memory:recalled', async (data) => {
      await this.enrichWithPredictions(data);
    });
  }

  /**
   * Traite une nouvelle tâche avec ML
   */
  async processNewTask(task) {
    try {
      // Prédire la durée
      if (!task.estimatedDuration && this.models.durationPredictor) {
        const prediction = await this.predictTaskDuration(task);
        if (prediction.confidence >= this.config.confidenceThreshold) {
          await this.applyDurationPrediction(task, prediction);
        }
      }
      
      // Classifier la priorité si non définie
      if (!task.priority && this.models.priorityClassifier) {
        const priority = await this.classifyPriority(task);
        if (priority.confidence >= this.config.confidenceThreshold) {
          await this.applyPriorityClassification(task, priority);
        }
      }
      
      // Détecter les anomalies potentielles
      if (this.models.anomalyDetector) {
        const anomalies = await this.detectAnomalies(task);
        if (anomalies.length > 0) {
          await this.handleAnomalies(task, anomalies);
        }
      }
      
      this.metrics.predictions++;
      
    } catch (error) {
      console.error('Error processing task with ML:', error);
    }
  }

  /**
   * Prédit la durée d'une tâche
   */
  async predictTaskDuration(task) {
    // Vérifier le cache d'abord
    const cacheKey = `duration:${task.type}:${task.category}`;
    const cached = await this.memoryManager.recall(
      'ml:predictions', 
      cacheKey,
      { maxAge: this.config.predictionCacheTime }
    );
    
    if (cached) {
      return cached.value;
    }
    
    // Enrichir la tâche avec des données contextuelles
    const enrichedTask = await this.enrichTaskData(task);
    
    // Faire la prédiction
    const prediction = await this.models.durationPredictor.predictDuration(enrichedTask);
    
    // Mettre en cache si confiance élevée
    if (prediction.confidence >= this.config.confidenceThreshold) {
      await this.memoryManager.remember(
        'ml:predictions',
        cacheKey,
        prediction,
        { importance: prediction.confidence }
      );
    }
    
    // Enregistrer la prédiction pour suivi
    await this.recordPrediction(task, 'duration', prediction);
    
    return prediction;
  }

  /**
   * Enrichit les données de la tâche avec le contexte
   */
  async enrichTaskData(task) {
    // Récupérer les données du mariage
    const weddingContext = await this.memoryManager.recall(
      `wedding:${task.weddingId}`,
      'context'
    );
    
    // Récupérer l'historique de l'utilisateur
    const userHistory = await this.memoryManager.recall(
      `user:${task.assignedTo}`,
      'task_history'
    );
    
    return {
      ...task,
      weddingData: weddingContext?.value || {},
      userHistory: userHistory?.value || {},
      concurrentTasks: await this.countConcurrentTasks(task),
      eventDate: weddingContext?.value?.date,
      guestCount: weddingContext?.value?.guestCount
    };
  }

  /**
   * Applique la prédiction de durée à la tâche
   */
  async applyDurationPrediction(task, prediction) {
    await this.taskMaster.updateTask(task.id, {
      estimatedDuration: prediction.estimatedDuration,
      durationPrediction: {
        value: prediction.estimatedDuration,
        confidence: prediction.confidence,
        factors: prediction.factors,
        range: prediction.range,
        predictedAt: new Date().toISOString()
      }
    });
    
    // Notifier
    this.emit('prediction:applied', {
      taskId: task.id,
      type: 'duration',
      prediction
    });
  }

  /**
   * Apprend d'une tâche complétée
   */
  async learnFromCompletedTask(task) {
    if (!this.config.autoLearnEnabled) return;
    
    try {
      // Si on avait fait une prédiction de durée
      if (task.durationPrediction && task.actualDuration) {
        await this.models.durationPredictor.updateWithObservation(
          task.id,
          task.durationPrediction.value,
          task.actualDuration
        );
        
        // Calculer la précision
        const accuracy = 1 - Math.abs(
          task.durationPrediction.value - task.actualDuration
        ) / task.actualDuration;
        
        if (accuracy > 0.8) {
          this.metrics.successfulPredictions++;
        }
        
        // Sauvegarder l'apprentissage
        await this.memoryManager.learn(
          'ml:patterns',
          {
            taskType: task.type,
            features: await this.models.durationPredictor.extractFeatures(task)
          },
          {
            actualDuration: task.actualDuration,
            accuracy: accuracy
          },
          { confidence: accuracy }
        );
      }
      
      // Apprendre des patterns de workflow
      await this.learnWorkflowPatterns(task);
      
    } catch (error) {
      console.error('Error learning from completed task:', error);
    }
  }

  /**
   * Apprend des patterns de workflow
   */
  async learnWorkflowPatterns(task) {
    // Analyser le contexte du workflow
    const workflow = await this.taskMaster.getWorkflow(task.workflowId);
    if (!workflow) return;
    
    const pattern = {
      workflowType: workflow.type,
      taskPosition: this.getTaskPosition(task, workflow),
      completionTime: task.actualDuration,
      delayFromSchedule: this.calculateDelay(task),
      dependencies: task.dependencies?.length || 0,
      parallelTasks: this.countParallelTasks(task, workflow)
    };
    
    const outcome = {
      success: task.status === 'completed',
      onTime: task.actualDuration <= task.estimatedDuration,
      qualityScore: task.qualityScore || 1.0
    };
    
    await this.memoryManager.learn(
      `workflow:${workflow.type}`,
      pattern,
      outcome,
      { confidence: 0.8 }
    );
  }

  /**
   * Analyse l'optimisation d'un workflow
   */
  async analyzeWorkflowOptimization(workflow) {
    if (!this.models.workflowOptimizer) return;
    
    try {
      // Récupérer les patterns appris
      const patterns = await this.memoryManager.recall(
        `workflow:${workflow.type}`,
        'learned_patterns',
        { searchRelated: true }
      );
      
      // Analyser les opportunités d'optimisation
      const optimizations = await this.identifyOptimizations(workflow, patterns);
      
      if (optimizations.length > 0) {
        this.metrics.optimizationsSuggested += optimizations.length;
        
        // Suggérer les optimisations
        this.emit('optimization:suggested', {
          workflowId: workflow.id,
          optimizations: optimizations
        });
      }
      
    } catch (error) {
      console.error('Error analyzing workflow optimization:', error);
    }
  }

  /**
   * Identifie les optimisations possibles
   */
  async identifyOptimizations(workflow, patterns) {
    const optimizations = [];
    
    // Analyser les goulots d'étranglement
    const bottlenecks = this.findBottlenecks(workflow);
    bottlenecks.forEach(bottleneck => {
      optimizations.push({
        type: 'bottleneck',
        taskId: bottleneck.taskId,
        suggestion: `Considérer de paralléliser ${bottleneck.taskName}`,
        impact: 'high',
        estimatedTimeSaving: bottleneck.potentialSaving
      });
    });
    
    // Identifier les tâches qui peuvent être automatisées
    const automatable = this.findAutomatableTasks(workflow);
    automatable.forEach(task => {
      optimizations.push({
        type: 'automation',
        taskId: task.id,
        suggestion: `Automatiser ${task.name}`,
        impact: 'medium',
        estimatedTimeSaving: task.estimatedDuration * 0.8
      });
    });
    
    // Suggérer des réorganisations basées sur les patterns
    if (patterns?.value) {
      const reorganizations = this.suggestReorganizations(workflow, patterns.value);
      optimizations.push(...reorganizations);
    }
    
    return optimizations;
  }

  /**
   * Trouve les goulots d'étranglement
   */
  findBottlenecks(workflow) {
    const bottlenecks = [];
    const criticalPath = this.calculateCriticalPath(workflow);
    
    criticalPath.forEach(task => {
      if (task.dependencies?.length > 3 || task.dependents?.length > 3) {
        bottlenecks.push({
          taskId: task.id,
          taskName: task.name,
          dependencies: task.dependencies.length,
          dependents: task.dependents.length,
          potentialSaving: task.estimatedDuration * 0.3
        });
      }
    });
    
    return bottlenecks;
  }

  /**
   * Trouve les tâches automatisables
   */
  findAutomatableTasks(workflow) {
    const automatableTypes = [
      'communication',
      'reporting',
      'payment',
      'reminder',
      'notification'
    ];
    
    return workflow.tasks.filter(task => 
      automatableTypes.includes(task.type) &&
      !task.automation?.enabled
    );
  }

  /**
   * Détecte les anomalies dans une tâche
   */
  async detectAnomalies(task) {
    const anomalies = [];
    
    // Vérifier la durée anormale
    if (task.estimatedDuration) {
      const normalRange = await this.getNormalDurationRange(task.type);
      if (task.estimatedDuration < normalRange.min || 
          task.estimatedDuration > normalRange.max) {
        anomalies.push({
          type: 'abnormal_duration',
          severity: 'medium',
          message: `Durée inhabituelle: ${task.estimatedDuration}min (normal: ${normalRange.min}-${normalRange.max}min)`,
          suggestion: 'Vérifier l\'estimation'
        });
      }
    }
    
    // Vérifier les dépendances circulaires
    if (this.hasCircularDependencies(task)) {
      anomalies.push({
        type: 'circular_dependency',
        severity: 'high',
        message: 'Dépendances circulaires détectées',
        suggestion: 'Revoir la structure des dépendances'
      });
    }
    
    // Vérifier la charge de travail
    const userLoad = await this.getUserWorkload(task.assignedTo);
    if (userLoad > 0.9) {
      anomalies.push({
        type: 'overload',
        severity: 'medium',
        message: `Utilisateur surchargé (${Math.round(userLoad * 100)}%)`,
        suggestion: 'Considérer une réassignation'
      });
    }
    
    return anomalies;
  }

  /**
   * Gère les anomalies détectées
   */
  async handleAnomalies(task, anomalies) {
    // Enregistrer les anomalies
    await this.memoryManager.remember(
      'ml:anomalies',
      `task:${task.id}`,
      anomalies,
      { importance: 0.8 }
    );
    
    // Notifier selon la sévérité
    const highSeverity = anomalies.filter(a => a.severity === 'high');
    if (highSeverity.length > 0) {
      this.emit('anomaly:critical', {
        taskId: task.id,
        anomalies: highSeverity
      });
    }
    
    this.metrics.anomaliesDetected += anomalies.length;
  }

  /**
   * Obtient les statistiques ML
   */
  async getStatistics() {
    const stats = {
      service: {
        predictions: this.metrics.predictions,
        successRate: this.metrics.predictions > 0 
          ? this.metrics.successfulPredictions / this.metrics.predictions 
          : 0,
        anomaliesDetected: this.metrics.anomaliesDetected,
        optimizationsSuggested: this.metrics.optimizationsSuggested
      }
    };
    
    // Ajouter les stats de chaque modèle
    if (this.models.durationPredictor) {
      stats.durationPredictor = await this.models.durationPredictor.getStatistics();
    }
    
    return stats;
  }

  /**
   * Exporte les insights ML
   */
  async exportInsights() {
    const insights = {
      timestamp: new Date().toISOString(),
      statistics: await this.getStatistics(),
      trends: await this.analyzeTrends(),
      recommendations: await this.generateRecommendations()
    };
    
    return insights;
  }

  /**
   * Analyse les tendances
   */
  async analyzeTrends() {
    const trends = {
      taskDuration: {},
      workflowEfficiency: {},
      userPerformance: {}
    };
    
    if (this.models.durationPredictor) {
      trends.taskDuration = await this.models.durationPredictor.analyzeTrends();
    }
    
    // Analyser l'efficacité des workflows
    const workflowData = await this.memoryManager.recall(
      'ml:patterns',
      'workflow_efficiency',
      { searchRelated: true }
    );
    
    if (workflowData) {
      trends.workflowEfficiency = this.calculateEfficiencyTrends(workflowData.value);
    }
    
    return trends;
  }

  /**
   * Génère des recommandations
   */
  async generateRecommendations() {
    const recommendations = [];
    
    // Basé sur les statistiques
    const stats = await this.getStatistics();
    
    if (stats.service.successRate < 0.7) {
      recommendations.push({
        type: 'model_improvement',
        priority: 'high',
        message: 'Le taux de succès des prédictions est faible. Considérer plus de données d\'entraînement.',
        action: 'Collecter plus de données historiques'
      });
    }
    
    if (stats.service.anomaliesDetected > 50) {
      recommendations.push({
        type: 'process_review',
        priority: 'medium',
        message: 'Nombreuses anomalies détectées. Les processus peuvent nécessiter une révision.',
        action: 'Analyser les patterns d\'anomalies'
      });
    }
    
    // Basé sur les trends
    const trends = await this.analyzeTrends();
    if (trends.taskDuration?.peakPeriods) {
      recommendations.push({
        type: 'capacity_planning',
        priority: 'medium',
        message: 'Périodes de pointe identifiées. Ajuster la capacité en conséquence.',
        action: 'Planifier des ressources supplémentaires pour les périodes de pointe'
      });
    }
    
    return recommendations;
  }

  // Méthodes utilitaires

  async countConcurrentTasks(task) {
    // Simuler le comptage
    return Math.floor(Math.random() * 10) + 1;
  }

  getTaskPosition(task, workflow) {
    const index = workflow.tasks.findIndex(t => t.id === task.id);
    return index / workflow.tasks.length;
  }

  calculateDelay(task) {
    if (!task.scheduledDate || !task.completedAt) return 0;
    const scheduled = new Date(task.scheduledDate);
    const completed = new Date(task.completedAt);
    return (completed - scheduled) / (1000 * 60); // En minutes
  }

  countParallelTasks(task, workflow) {
    return workflow.tasks.filter(t => 
      t.id !== task.id &&
      t.scheduledDate === task.scheduledDate
    ).length;
  }

  calculateCriticalPath(workflow) {
    // Algorithme simplifié
    // En production, utiliser un vrai algorithme de chemin critique
    return workflow.tasks.filter(t => t.priority === 'critical');
  }

  hasCircularDependencies(task) {
    // Vérification simplifiée
    // En production, implémenter une détection complète
    return false;
  }

  async getUserWorkload(userId) {
    // Simuler la charge
    return Math.random();
  }

  async getNormalDurationRange(taskType) {
    // Ranges par défaut
    const ranges = {
      planning: { min: 30, max: 180 },
      vendor: { min: 45, max: 120 },
      communication: { min: 15, max: 60 },
      coordination: { min: 60, max: 180 },
      payment: { min: 10, max: 30 }
    };
    
    return ranges[taskType] || { min: 30, max: 120 };
  }

  calculateEfficiencyTrends(data) {
    // Calcul simplifié
    return {
      overall: 'improving',
      byType: {
        planning: '+15%',
        vendor: '+8%',
        communication: '+22%'
      }
    };
  }

  suggestReorganizations(workflow, patterns) {
    // Suggestions basiques
    return [{
      type: 'reorder',
      suggestion: 'Réorganiser les tâches de communication',
      impact: 'low',
      estimatedTimeSaving: 30
    }];
  }

  async recordPrediction(task, type, prediction) {
    await this.memoryManager.remember(
      'ml:predictions:history',
      `${task.id}:${type}`,
      {
        taskId: task.id,
        type: type,
        prediction: prediction,
        timestamp: new Date().toISOString()
      },
      { importance: 0.5 }
    );
  }

  async enrichWithPredictions(data) {
    // Enrichir les données rappelées avec des prédictions ML
    if (data.contextId?.startsWith('task:')) {
      const taskId = data.contextId.split(':')[1];
      // Ajouter des prédictions si pertinent
    }
  }
}

module.exports = MLIntegrationService;