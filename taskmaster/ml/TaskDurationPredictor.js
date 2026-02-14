const tf = require('@tensorflow/tfjs-node');
const { EventEmitter } = require('events');
const crypto = require('crypto');

/**
 * Prédicteur de Durée des Tâches avec Machine Learning
 * Utilise un réseau de neurones pour prédire la durée des tâches
 * basé sur l'historique et les caractéristiques contextuelles
 */
class TaskDurationPredictor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      modelPath: config.modelPath || './models/duration-predictor',
      features: config.features || [
        'task_type',
        'complexity_score',
        'dependencies_count',
        'assigned_user_experience',
        'time_of_year',
        'concurrent_tasks',
        'vendor_type',
        'guest_count',
        'budget_allocated',
        'days_until_event'
      ],
      updateThreshold: config.updateThreshold || 100, // Nouvelles données avant re-entraînement
      confidenceThreshold: config.confidenceThreshold || 0.7
    };
    
    this.model = null;
    this.scaler = null;
    this.encoder = null;
    this.trainingData = [];
    this.initialized = false;
  }

  /**
   * Initialise le prédicteur
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Charger le modèle existant ou en créer un nouveau
      this.model = await this.loadOrCreateModel();
      
      // Charger les transformateurs de données
      await this.loadDataTransformers();
      
      this.initialized = true;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize TaskDurationPredictor:', error);
      throw error;
    }
  }

  /**
   * Charge ou crée le modèle de ML
   */
  async loadOrCreateModel() {
    try {
      // Essayer de charger un modèle existant
      const model = await tf.loadLayersModel(`file://${this.config.modelPath}/model.json`);
      console.log('Loaded existing duration prediction model');
      return model;
    } catch (error) {
      // Créer un nouveau modèle si aucun n'existe
      console.log('Creating new duration prediction model');
      return this.createModel();
    }
  }

  /**
   * Crée l'architecture du réseau de neurones
   */
  createModel() {
    const model = tf.sequential({
      layers: [
        // Couche d'entrée
        tf.layers.dense({
          inputShape: [this.config.features.length],
          units: 64,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Dropout pour éviter le surapprentissage
        tf.layers.dropout({ rate: 0.3 }),
        
        // Couches cachées
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        tf.layers.dropout({ rate: 0.2 }),
        
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        
        // Couche de sortie (durée en minutes)
        tf.layers.dense({
          units: 1,
          activation: 'linear'
        })
      ]
    });

    // Compiler le modèle
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    });

    return model;
  }

  /**
   * Prédit la durée d'une tâche
   */
  async predictDuration(task) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Extraire les features de la tâche
      const features = await this.extractFeatures(task);
      
      // Normaliser les features
      const normalizedFeatures = this.normalizeFeatures(features);
      
      // Créer le tenseur d'entrée
      const input = tf.tensor2d([normalizedFeatures]);
      
      // Faire la prédiction
      const prediction = await this.model.predict(input).data();
      const predictedDuration = Math.round(prediction[0]);
      
      // Calculer la confiance basée sur des données similaires
      const confidence = await this.calculateConfidence(task, features);
      
      // Nettoyer les tenseurs
      input.dispose();
      
      // Analyser les facteurs influents
      const factors = await this.analyzeInfluentialFactors(features, prediction[0]);
      
      this.emit('prediction:made', {
        taskId: task.id,
        prediction: predictedDuration,
        confidence
      });
      
      return {
        estimatedDuration: predictedDuration,
        confidence: confidence,
        unit: 'minutes',
        factors: factors,
        range: {
          min: Math.round(predictedDuration * 0.8),
          max: Math.round(predictedDuration * 1.2)
        },
        metadata: {
          modelVersion: this.model.version || '1.0',
          featuresUsed: this.config.features,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Prediction failed:', error);
      // Fallback sur une estimation basique
      return this.fallbackEstimation(task);
    }
  }

  /**
   * Extrait les features d'une tâche
   */
  async extractFeatures(task) {
    const features = {};
    
    // Type de tâche (encodé)
    features.task_type = this.encodeTaskType(task.type || 'default');
    
    // Score de complexité
    features.complexity_score = this.calculateComplexityScore(task);
    
    // Nombre de dépendances
    features.dependencies_count = task.dependencies?.length || 0;
    
    // Expérience de l'utilisateur assigné
    features.assigned_user_experience = await this.getUserExperience(task.assignedTo);
    
    // Période de l'année (saisonnalité)
    features.time_of_year = this.getTimeOfYearFeature(task.scheduledDate);
    
    // Tâches concurrentes
    features.concurrent_tasks = task.concurrentTasks || 0;
    
    // Type de vendor si applicable
    features.vendor_type = this.encodeVendorType(task.vendorType);
    
    // Nombre d'invités (impact sur certaines tâches)
    features.guest_count = task.weddingData?.guestCount || 150;
    
    // Budget alloué
    features.budget_allocated = task.budget || 0;
    
    // Jours jusqu'à l'événement
    features.days_until_event = this.getDaysUntilEvent(task);
    
    return Object.values(features);
  }

  /**
   * Calcule le score de complexité d'une tâche
   */
  calculateComplexityScore(task) {
    let score = 0.3; // Score de base
    
    // Facteurs augmentant la complexité
    if (task.priority === 'critical') score += 0.3;
    if (task.priority === 'high') score += 0.2;
    if (task.requiresApproval) score += 0.1;
    if (task.dependencies?.length > 3) score += 0.2;
    if (task.subtasks?.length > 5) score += 0.2;
    if (task.requiresCoordination) score += 0.15;
    if (task.isExternal) score += 0.1; // Dépend de parties externes
    
    return Math.min(1.0, score);
  }

  /**
   * Encode le type de tâche en valeur numérique
   */
  encodeTaskType(type) {
    const typeMap = {
      'planning': 0.1,
      'vendor': 0.2,
      'communication': 0.3,
      'coordination': 0.4,
      'payment': 0.5,
      'checklist': 0.6,
      'emergency': 0.7,
      'reporting': 0.8,
      'guest_management': 0.9,
      'ceremony': 1.0
    };
    
    return typeMap[type] || 0.5;
  }

  /**
   * Encode le type de vendor
   */
  encodeVendorType(type) {
    if (!type) return 0;
    
    const vendorMap = {
      'venue': 0.1,
      'catering': 0.2,
      'photography': 0.3,
      'music': 0.4,
      'flowers': 0.5,
      'decoration': 0.6,
      'transport': 0.7,
      'other': 0.8
    };
    
    return vendorMap[type] || 0.5;
  }

  /**
   * Obtient l'expérience de l'utilisateur
   */
  async getUserExperience(userId) {
    if (!userId) return 0.5;
    
    // Simuler la récupération depuis la DB
    // En production, faire une vraie requête
    const mockExperience = {
      tasksCompleted: 45,
      averageCompletionTime: 0.9, // 90% du temps estimé
      specializationScore: 0.8
    };
    
    // Calculer un score d'expérience normalisé
    const experienceScore = Math.min(1.0, 
      (mockExperience.tasksCompleted / 100) * 0.5 +
      mockExperience.averageCompletionTime * 0.3 +
      mockExperience.specializationScore * 0.2
    );
    
    return experienceScore;
  }

  /**
   * Feature temporelle (saisonnalité)
   */
  getTimeOfYearFeature(date) {
    if (!date) date = new Date();
    
    const month = new Date(date).getMonth();
    // Haute saison mariage (mai-septembre)
    const highSeason = [4, 5, 6, 7, 8];
    
    if (highSeason.includes(month)) {
      return 0.8; // Période chargée, durées potentiellement plus longues
    }
    return 0.4; // Basse saison
  }

  /**
   * Jours jusqu'à l'événement
   */
  getDaysUntilEvent(task) {
    if (!task.eventDate) return 180; // Défaut 6 mois
    
    const now = new Date();
    const event = new Date(task.eventDate);
    const diffTime = Math.abs(event - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.min(365, diffDays);
  }

  /**
   * Normalise les features
   */
  normalizeFeatures(features) {
    // Simple normalisation min-max
    // En production, utiliser des statistiques sauvegardées
    const normalizedFeatures = features.map((value, index) => {
      const featureName = this.config.features[index];
      
      // Définir les ranges pour chaque feature
      const ranges = {
        task_type: [0, 1],
        complexity_score: [0, 1],
        dependencies_count: [0, 10],
        assigned_user_experience: [0, 1],
        time_of_year: [0, 1],
        concurrent_tasks: [0, 20],
        vendor_type: [0, 1],
        guest_count: [0, 500],
        budget_allocated: [0, 100000],
        days_until_event: [0, 365]
      };
      
      const [min, max] = ranges[featureName] || [0, 1];
      return (value - min) / (max - min);
    });
    
    return normalizedFeatures;
  }

  /**
   * Calcule la confiance de la prédiction
   */
  async calculateConfidence(task, features) {
    // Facteurs affectant la confiance
    let confidence = 0.5; // Base
    
    // Plus de données historiques = plus de confiance
    const similarTasksCount = await this.countSimilarTasks(task);
    confidence += Math.min(0.3, similarTasksCount / 100 * 0.3);
    
    // Features complètes = plus de confiance
    const completenessScore = features.filter(f => f !== null).length / features.length;
    confidence += completenessScore * 0.2;
    
    return Math.min(0.95, confidence);
  }

  /**
   * Compte les tâches similaires dans l'historique
   */
  async countSimilarTasks(task) {
    // Simuler le comptage
    // En production, requête DB avec critères de similarité
    return Math.floor(Math.random() * 50) + 10;
  }

  /**
   * Analyse les facteurs influents
   */
  async analyzeInfluentialFactors(features, prediction) {
    const factors = [];
    
    // Analyser l'impact de chaque feature
    const featureImportance = {
      complexity_score: 0.25,
      dependencies_count: 0.20,
      assigned_user_experience: 0.15,
      time_of_year: 0.10,
      concurrent_tasks: 0.10,
      days_until_event: 0.08,
      task_type: 0.07,
      guest_count: 0.05
    };
    
    // Calculer l'impact de chaque facteur
    this.config.features.forEach((featureName, index) => {
      const value = features[index];
      const importance = featureImportance[featureName] || 0.05;
      const impact = value * importance;
      
      if (impact > 0.1) {
        factors.push({
          name: this.humanizeFeatureName(featureName),
          impact: impact,
          value: value,
          effect: this.calculateEffect(featureName, value, prediction)
        });
      }
    });
    
    // Trier par impact décroissant
    factors.sort((a, b) => b.impact - a.impact);
    
    return factors.slice(0, 5); // Top 5 facteurs
  }

  /**
   * Humanise le nom des features
   */
  humanizeFeatureName(featureName) {
    const nameMap = {
      complexity_score: 'Complexité de la tâche',
      dependencies_count: 'Nombre de dépendances',
      assigned_user_experience: 'Expérience de l\'assigné',
      time_of_year: 'Période de l\'année',
      concurrent_tasks: 'Tâches simultanées',
      days_until_event: 'Proximité de l\'événement',
      task_type: 'Type de tâche',
      guest_count: 'Nombre d\'invités',
      vendor_type: 'Type de fournisseur',
      budget_allocated: 'Budget alloué'
    };
    
    return nameMap[featureName] || featureName;
  }

  /**
   * Calcule l'effet d'un facteur
   */
  calculateEffect(featureName, value, prediction) {
    // Logique simplifiée pour décrire l'effet
    const effects = {
      complexity_score: value > 0.7 ? '+30% durée' : 'Impact modéré',
      dependencies_count: value > 5 ? '+20% durée' : 'Peu d\'impact',
      assigned_user_experience: value < 0.3 ? '+15% durée' : '-10% durée',
      time_of_year: value > 0.6 ? '+25% durée (haute saison)' : 'Durée normale',
      concurrent_tasks: value > 10 ? '+40% durée' : 'Impact limité'
    };
    
    return effects[featureName] || 'Impact standard';
  }

  /**
   * Estimation de fallback si ML échoue
   */
  fallbackEstimation(task) {
    // Estimations basiques par type
    const baseEstimates = {
      planning: 120,
      vendor: 60,
      communication: 30,
      coordination: 90,
      payment: 15,
      checklist: 45,
      emergency: 180,
      reporting: 30
    };
    
    let estimate = baseEstimates[task.type] || 60;
    
    // Ajustements
    if (task.priority === 'critical') estimate *= 1.5;
    if (task.dependencies?.length > 3) estimate *= 1.3;
    
    return {
      estimatedDuration: Math.round(estimate),
      confidence: 0.3,
      unit: 'minutes',
      factors: [{
        name: 'Estimation basique',
        impact: 1.0,
        effect: 'Basé sur le type de tâche'
      }],
      metadata: {
        method: 'fallback',
        reason: 'ML prediction failed'
      }
    };
  }

  /**
   * Entraîne le modèle avec de nouvelles données
   */
  async train(trainingData) {
    console.log(`Training model with ${trainingData.length} samples...`);
    
    // Préparer les données
    const features = [];
    const labels = [];
    
    for (const sample of trainingData) {
      const taskFeatures = await this.extractFeatures(sample.task);
      features.push(this.normalizeFeatures(taskFeatures));
      labels.push(sample.actualDuration);
    }
    
    // Convertir en tenseurs
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);
    
    // Entraîner le modèle
    const history = await this.model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      }
    });
    
    // Nettoyer les tenseurs
    xs.dispose();
    ys.dispose();
    
    // Sauvegarder le modèle
    await this.saveModel();
    
    this.emit('model:trained', {
      samples: trainingData.length,
      finalLoss: history.history.loss[history.history.loss.length - 1]
    });
    
    return history;
  }

  /**
   * Mise à jour incrémentale avec une nouvelle observation
   */
  async updateWithObservation(taskId, predictedDuration, actualDuration) {
    const observation = {
      taskId,
      predictedDuration,
      actualDuration,
      error: Math.abs(predictedDuration - actualDuration),
      timestamp: new Date().toISOString()
    };
    
    this.trainingData.push(observation);
    
    // Re-entraîner périodiquement
    if (this.trainingData.length >= this.config.updateThreshold) {
      await this.incrementalUpdate();
    }
    
    this.emit('observation:recorded', observation);
  }

  /**
   * Mise à jour incrémentale du modèle
   */
  async incrementalUpdate() {
    console.log('Performing incremental model update...');
    
    // Utiliser seulement les données récentes pour l'update
    const recentData = this.trainingData.slice(-this.config.updateThreshold);
    
    // Entraînement léger
    await this.train(recentData);
    
    // Réinitialiser le buffer
    this.trainingData = [];
  }

  /**
   * Sauvegarde le modèle
   */
  async saveModel() {
    try {
      await this.model.save(`file://${this.config.modelPath}`);
      console.log('Model saved successfully');
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  }

  /**
   * Charge les transformateurs de données
   */
  async loadDataTransformers() {
    // En production, charger depuis le stockage
    // Pour l'instant, utiliser les valeurs par défaut
    this.scaler = {
      mean: {},
      std: {}
    };
    
    this.encoder = {
      categories: {}
    };
  }

  /**
   * Obtient des statistiques sur les prédictions
   */
  async getStatistics() {
    // Simuler les stats
    // En production, calculer depuis la DB
    return {
      totalPredictions: 1247,
      averageAccuracy: 0.82,
      averageConfidence: 0.74,
      mostAccurateTaskTypes: ['payment', 'checklist', 'communication'],
      leastAccurateTaskTypes: ['emergency', 'coordination'],
      modelVersion: '1.0',
      lastTraining: new Date().toISOString(),
      performance: {
        mae: 12.5, // Minutes
        rmse: 18.3,
        r2: 0.78
      }
    };
  }

  /**
   * Analyse les tendances temporelles
   */
  async analyzeTrends() {
    return {
      peakPeriods: [
        { month: 'Mai', factor: 1.3 },
        { month: 'Juin', factor: 1.4 },
        { month: 'Septembre', factor: 1.2 }
      ],
      taskTypesTrends: {
        vendor: { trend: 'increasing', reason: 'Plus de coordination nécessaire' },
        communication: { trend: 'stable', reason: 'Processus optimisés' },
        planning: { trend: 'decreasing', reason: 'Meilleure expérience' }
      }
    };
  }
}

module.exports = TaskDurationPredictor;