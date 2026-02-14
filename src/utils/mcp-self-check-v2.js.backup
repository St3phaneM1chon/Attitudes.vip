/**
 * MCP Self-Check V2 - Version Améliorée avec IA Avancée
 * Implémente apprentissage par renforcement, analyse sémantique et optimisations
 */

const fs = require('fs').promises
const path = require('path')

class MCPSelfCheckV2 {
  constructor () {
    // Configuration avancée des services MCP
    this.mcpInventory = {
      filesystem: {
        service: 'mcp-filesystem',
        capabilities: ['read_files', 'write_files', 'list_directories', 'file_operations'],
        triggers: ['fichier', 'file', 'répertoire', 'directory', 'créer', 'lire', 'écrire', 'modifier'],
        patterns: [
          { regex: /\b(create|créer|make|new)\s+\w+\s*(file|fichier|document)/i, weight: 0.9 },
          { regex: /\b(read|lire|open|ouvrir|load|charger)\s+\w+\s*(file|fichier)/i, weight: 0.85 },
          { regex: /\b(write|écrire|save|sauvegarder|export)\s+\w+\s*(file|fichier)/i, weight: 0.85 },
          { regex: /\b(delete|supprimer|remove|effacer)\s+\w+\s*(file|fichier)/i, weight: 0.8 }
        ],
        semanticConcepts: ['file_management', 'directory_operations', 'io_operations'],
        command: 'docker exec attitudesframework-mcp-filesystem-1',
        healthCheck: async () => {
          try {
            const { exec } = require('child_process').promises
            await exec('docker ps | grep mcp-filesystem')
            return true
          } catch {
            return false
          }
        }
      },

      postgres: {
        service: 'mcp-postgres',
        capabilities: ['database_queries', 'schema_management', 'data_migration'],
        triggers: ['database', 'postgres', 'sql', 'query', 'table', 'migration', 'données'],
        patterns: [
          { regex: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER|DROP)\b/i, weight: 0.95 },
          { regex: /\b(base de données|database|BDD|DB)\b/i, weight: 0.7 },
          { regex: /\b(query|requête|requete)\b/i, weight: 0.8 }
        ],
        semanticConcepts: ['database_operations', 'data_persistence', 'sql_queries'],
        command: 'docker exec attitudesframework-mcp-postgres-tools-1',
        healthCheck: async () => {
          try {
            const { exec } = require('child_process').promises
            await exec('docker exec attitudesframework-mcp-postgres-tools-1 pg_isready')
            return true
          } catch {
            return false
          }
        }
      },

      redis: {
        service: 'mcp-redis',
        capabilities: ['cache_management', 'session_storage', 'pub_sub', 'real_time'],
        triggers: ['cache', 'redis', 'session', 'performance', 'temps réel'],
        patterns: [
          { regex: /\b(cache|caching|mise en cache)\b/i, weight: 0.9 },
          { regex: /\b(session|connexion utilisateur)\b/i, weight: 0.8 },
          { regex: /\b(real[\s-]?time|temps[\s-]?réel)\b/i, weight: 0.85 },
          { regex: /\b(pub[\s-]?sub|publish|subscribe)\b/i, weight: 0.9 }
        ],
        semanticConcepts: ['caching', 'session_management', 'real_time_data'],
        command: 'docker exec attitudesframework-mcp-redis-tools-1',
        healthCheck: async () => {
          try {
            const { exec } = require('child_process').promises
            await exec('docker exec attitudesframework-mcp-redis-tools-1 redis-cli ping')
            return true
          } catch {
            return false
          }
        }
      },

      git: {
        service: 'mcp-git',
        capabilities: ['version_control', 'commits', 'branches', 'history', 'diff'],
        triggers: ['git', 'commit', 'branch', 'version', 'historique', 'merge', 'push', 'pull'],
        patterns: [
          { regex: /\bgit\s+(add|commit|push|pull|merge|checkout|branch)/i, weight: 0.95 },
          { regex: /\b(faire un commit|commiter|committer)\b/i, weight: 0.9 },
          { regex: /\b(version control|contrôle de version|versioning)\b/i, weight: 0.85 }
        ],
        semanticConcepts: ['version_control', 'code_collaboration', 'change_tracking'],
        command: 'docker exec attitudesframework-mcp-git-1',
        healthCheck: async () => {
          try {
            const { exec } = require('child_process').promises
            await exec('docker exec attitudesframework-mcp-git-1 git --version')
            return true
          } catch {
            return false
          }
        }
      }
    }

    // Cache LRU pour optimisation
    this.cache = new Map()
    this.cacheMaxSize = 1000
    this.cacheTTL = 5 * 60 * 1000 // 5 minutes

    // Apprentissage par renforcement
    this.learningModel = {
      weights: {},
      history: [],
      feedbackData: {}
    }

    // État ReAct enrichi
    this.reactState = {
      thought: null,
      action: null,
      observation: null,
      reflection: null,
      memory: [] // Contexte conversationnel
    }

    // Métriques
    this.metrics = {
      totalChecks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      successRate: 0,
      servicesUsage: {}
    }

    // Charger le modèle d'apprentissage
    this.loadLearningModel()

    // Charger les MCP auto-découverts
    this.loadDiscoveredMCPs()
  }

  /**
   * Analyse sémantique avancée avec tolérance aux fautes
   */
  async analyzeIntent (userRequest, context = {}) {
    const startTime = Date.now()
    this.metrics.totalChecks++

    // Vérifier le cache
    const cacheKey = this.generateCacheKey(userRequest, context)
    const cached = this.getCached(cacheKey)
    if (cached) {
      this.metrics.cacheHits++
      return cached
    }

    this.metrics.cacheMisses++

    console.log('🧠 MCP Self-Check V2 - Advanced Analysis...')

    const analysis = {
      timestamp: new Date().toISOString(),
      request: userRequest,
      context,
      detectedCapabilities: [],
      recommendedMCP: [],
      reasoning: [],
      confidence: 0,
      semanticAnalysis: {}
    }

    // Normalisation avancée
    const normalizedRequest = this.normalizeText(userRequest)

    // Analyse parallèle des services
    const serviceAnalyses = await Promise.all(
      Object.entries(this.mcpInventory).map(async ([mcpName, mcpConfig]) => {
        return this.analyzeService(mcpName, mcpConfig, normalizedRequest, userRequest)
      })
    )

    // Agréger les résultats
    for (const serviceAnalysis of serviceAnalyses) {
      if (serviceAnalysis && serviceAnalysis.score > 0.3) {
        analysis.recommendedMCP.push(serviceAnalysis)
        analysis.detectedCapabilities.push(...serviceAnalysis.capabilities)
        analysis.reasoning.push(...serviceAnalysis.reasoning)
      }
    }

    // Analyse contextuelle avancée
    await this.performAdvancedContextualAnalysis(analysis, userRequest, context)

    // Trier par score composite
    analysis.recommendedMCP.sort((a, b) => b.score - a.score)

    // Calculer la confiance globale
    analysis.confidence = this.calculateGlobalConfidence(analysis)

    // Mettre en cache
    this.setCache(cacheKey, analysis)

    // Mettre à jour les métriques
    const responseTime = Date.now() - startTime
    this.updateMetrics(responseTime)

    // Ajouter à l'historique d'apprentissage
    this.addToLearningHistory(analysis)

    return analysis
  }

  /**
   * Analyse individuelle d'un service avec scoring avancé
   */
  async analyzeService (mcpName, mcpConfig, normalizedRequest, originalRequest) {
    // Vérifier la santé du service
    const isHealthy = mcpConfig.healthCheck ? await mcpConfig.healthCheck() : true
    if (!isHealthy) return null

    let score = 0
    const reasoning = []
    const matchDetails = {
      triggers: [],
      patterns: [],
      concepts: []
    }

    // 1. Analyse des triggers avec tolérance aux fautes
    for (const trigger of mcpConfig.triggers) {
      const distance = this.levenshteinDistance(trigger, normalizedRequest)
      if (normalizedRequest.includes(trigger) || distance <= 2) {
        score += 0.3
        matchDetails.triggers.push(trigger)
      }
    }

    // 2. Analyse des patterns regex pondérés
    if (mcpConfig.patterns) {
      for (const pattern of mcpConfig.patterns) {
        if (pattern.regex.test(originalRequest)) {
          score += pattern.weight * 0.5
          matchDetails.patterns.push(pattern.regex.source)
        }
      }
    }

    // 3. Analyse des concepts sémantiques
    if (mcpConfig.semanticConcepts) {
      const conceptScore = this.analyzeSemanticConcepts(
        normalizedRequest,
        mcpConfig.semanticConcepts
      )
      score += conceptScore * 0.3
      if (conceptScore > 0) {
        matchDetails.concepts = mcpConfig.semanticConcepts
      }
    }

    // 4. Ajustement basé sur l'apprentissage
    const learningAdjustment = this.getLearningAdjustment(mcpName, originalRequest)
    score *= learningAdjustment

    // Générer le raisonnement
    if (matchDetails.triggers.length > 0) {
      reasoning.push(`Triggers détectés: ${matchDetails.triggers.join(', ')}`)
    }
    if (matchDetails.patterns.length > 0) {
      reasoning.push(`Patterns matchés: ${matchDetails.patterns.length}`)
    }
    if (matchDetails.concepts.length > 0) {
      reasoning.push(`Concepts sémantiques: ${matchDetails.concepts.join(', ')}`)
    }

    return {
      service: mcpName,
      score: Math.min(score, 1.0),
      confidence: score,
      matchDetails,
      reasoning,
      capabilities: mcpConfig.capabilities,
      command: mcpConfig.command,
      isHealthy
    }
  }

  /**
   * Analyse contextuelle avancée avec détection d'intention
   */
  async performAdvancedContextualAnalysis (analysis, request, context) {
    // Détection d'intentions multiples
    const intentions = this.detectIntentions(request)

    // Analyse des dépendances entre services
    this.analyzeDependencies(analysis)

    // Détection de workflows complexes
    if (intentions.length > 1) {
      analysis.reasoning.push(`Workflow complexe détecté: ${intentions.join(' → ')}`)
      this.suggestWorkflow(analysis, intentions)
    }

    // Ajustement basé sur le contexte
    if (context.previousServices) {
      this.adjustBasedOnContext(analysis, context)
    }
  }

  /**
   * Analyse les dépendances entre services MCP
   */
  analyzeDependencies (analysis) {
    if (!analysis.matches || analysis.matches.length === 0) return

    // Identifier les services qui dépendent d'autres services
    const dependencies = new Map()

    analysis.matches.forEach(match => {
      if (match.service && this.mcpConfigs[match.service]) {
        const config = this.mcpConfigs[match.service]

        // Analyser les dépendances potentielles
        if (config.capabilities) {
          config.capabilities.forEach(capability => {
            // Certaines capacités nécessitent d'autres services
            const requiredServices = this.getRequiredServices(capability)
            if (requiredServices.length > 0) {
              dependencies.set(match.service, requiredServices)
            }
          })
        }
      }
    })

    // Ajouter l'analyse des dépendances
    if (dependencies.size > 0) {
      analysis.reasoning.push('Dépendances détectées entre services')
      analysis.dependencies = Object.fromEntries(dependencies)
    }
  }

  /**
   * Obtient les services requis pour une capacité
   */
  getRequiredServices (capability) {
    const dependencies = {
      payment_processor: ['database', 'security'],
      email_sender: ['authentication'],
      file_storage: ['encryption'],
      api_gateway: ['rate_limiter', 'auth'],
      database_operations: ['connection_pool'],
      notification_system: ['queue_manager']
    }

    return dependencies[capability] || []
  }

  /**
   * Calcule la confiance globale de l'analyse
   */
  calculateGlobalConfidence (analysis) {
    if (!analysis.matches || analysis.matches.length === 0) {
      return 0.1 // Confiance très faible si aucun match
    }

    // Moyenne pondérée des scores de confiance
    let totalScore = 0
    let totalWeight = 0

    analysis.matches.forEach(match => {
      const weight = match.score || 0.5
      totalScore += weight * weight // Pondération quadratique
      totalWeight += weight
    })

    const baseConfidence = totalWeight > 0 ? totalScore / totalWeight : 0.1

    // Bonus pour nombre de matches
    const matchBonus = Math.min(0.2, analysis.matches.length * 0.05)

    // Malus si beaucoup de matches (ambiguïté)
    const ambiguityPenalty = analysis.matches.length > 5 ? 0.1 : 0

    // Bonus pour analyse contextuelle
    const contextBonus = analysis.reasoning && analysis.reasoning.length > 0 ? 0.1 : 0

    const finalConfidence = Math.min(0.95, Math.max(0.1,
      baseConfidence + matchBonus - ambiguityPenalty + contextBonus
    ))

    return Math.round(finalConfidence * 100) / 100 // Arrondir à 2 décimales
  }

  /**
   * Ajoute l'analyse à l'historique d'apprentissage
   */
  addToLearningHistory (analysis) {
    try {
      const historyEntry = {
        timestamp: new Date().toISOString(),
        request: analysis.originalRequest || '',
        confidence: analysis.confidence,
        matchesCount: analysis.matches?.length || 0,
        topService: analysis.recommendedMCP?.[0]?.service || null,
        context: analysis.context || {}
      }

      // Ajouter à l'historique en mémoire
      if (!this.learningHistory) {
        this.learningHistory = []
      }

      this.learningHistory.push(historyEntry)

      // Limiter l'historique à 1000 entrées
      if (this.learningHistory.length > 1000) {
        this.learningHistory = this.learningHistory.slice(-1000)
      }

      // Sauvegarder l'historique (de façon asynchrone)
      this.saveLearningHistory().catch(err => {
        console.warn('Failed to save learning history:', err.message)
      })
    } catch (error) {
      console.warn('Failed to add to learning history:', error.message)
    }
  }

  /**
   * Sauvegarde l'historique d'apprentissage
   */
  async saveLearningHistory () {
    if (!this.learningHistory || this.learningHistory.length === 0) return

    try {
      const fs = require('fs').promises
      const path = require('path')

      const historyPath = path.join(__dirname, '../../data/mcp-learning-history.json')
      await fs.writeFile(historyPath, JSON.stringify({
        lastUpdated: new Date().toISOString(),
        entries: this.learningHistory
      }, null, 2))
    } catch (error) {
      // Ignorer les erreurs de sauvegarde pour ne pas bloquer
    }
  }

  /**
   * Calcul de distance de Levenshtein pour tolérance aux fautes
   */
  levenshteinDistance (str1, str2) {
    const matrix = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Analyse des concepts sémantiques
   */
  analyzeSemanticConcepts (text, concepts) {
    const conceptMap = {
      file_management: ['manage', 'organize', 'handle', 'gérer', 'organiser'],
      database_operations: ['store', 'retrieve', 'persist', 'stocker', 'récupérer'],
      version_control: ['track', 'history', 'changes', 'suivre', 'historique'],
      caching: ['speed', 'performance', 'optimize', 'vitesse', 'optimiser'],
      real_time_data: ['live', 'instant', 'immediate', 'direct', 'immédiat']
    }

    let score = 0
    for (const concept of concepts) {
      const keywords = conceptMap[concept] || []
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          score += 0.2
        }
      }
    }

    return Math.min(score, 1.0)
  }

  /**
   * Apprentissage par renforcement
   */
  recordExecution (serviceName, request, context, executionTime) {
    if (!this.learningModel.feedbackData[serviceName]) {
      this.learningModel.feedbackData[serviceName] = []
    }

    this.learningModel.feedbackData[serviceName].push({
      request,
      context,
      executionTime,
      timestamp: Date.now()
    })
  }

  recordFeedback (serviceName, request, success, details = {}) {
    const feedbackEntry = {
      service: serviceName,
      request,
      success,
      details,
      timestamp: Date.now()
    }

    // Ajuster les poids basé sur le feedback
    const adjustment = success ? 1.1 : 0.9
    this.adjustServiceWeight(serviceName, request, adjustment)

    // Sauvegarder
    this.saveLearningModel()
  }

  adjustServiceWeight (serviceName, request, factor) {
    const key = `${serviceName}:${this.normalizeText(request).substring(0, 50)}`

    if (!this.learningModel.weights[key]) {
      this.learningModel.weights[key] = 1.0
    }

    this.learningModel.weights[key] *= factor
    this.learningModel.weights[key] = Math.max(0.1, Math.min(2.0, this.learningModel.weights[key]))
  }

  getLearningAdjustment (serviceName, request) {
    const key = `${serviceName}:${this.normalizeText(request).substring(0, 50)}`
    return this.learningModel.weights[key] || 1.0
  }

  /**
   * Gestion du cache LRU
   */
  generateCacheKey (request, context) {
    return `${this.normalizeText(request)}:${JSON.stringify(context)}`
  }

  getCached (key) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  setCache (key, data) {
    // Implémenter LRU
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Normalisation de texte avancée
   */
  normalizeText (text) {
    return text
      .toLowerCase()
      .replace(/[éèê]/g, 'e')
      .replace(/[àâ]/g, 'a')
      .replace(/[ùû]/g, 'u')
      .replace(/[îï]/g, 'i')
      .replace(/[ôö]/g, 'o')
      .replace(/[ç]/g, 'c')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Détection d'intentions multiples
   */
  detectIntentions (request) {
    const intentions = []

    const intentionPatterns = {
      create: /\b(create|créer|make|new|ajouter)\b/i,
      read: /\b(read|lire|show|afficher|voir|get)\b/i,
      update: /\b(update|modifier|change|edit|changer)\b/i,
      delete: /\b(delete|supprimer|remove|effacer)\b/i,
      analyze: /\b(analyze|analyser|examine|inspecter)\b/i,
      optimize: /\b(optimize|optimiser|improve|améliorer)\b/i
    }

    for (const [intention, pattern] of Object.entries(intentionPatterns)) {
      if (pattern.test(request)) {
        intentions.push(intention)
      }
    }

    return intentions
  }

  /**
   * Métriques et rapports
   */
  updateMetrics (responseTime) {
    this.metrics.avgResponseTime =
      (this.metrics.avgResponseTime * (this.metrics.totalChecks - 1) + responseTime) /
      this.metrics.totalChecks
  }

  async getMetrics () {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      avgResponseTimeMs: this.metrics.avgResponseTime.toFixed(2)
    }
  }

  /**
   * Persistance du modèle d'apprentissage
   */
  async loadLearningModel () {
    try {
      const modelPath = path.join(__dirname, '../../data/mcp-learning-model.json')
      const data = await fs.readFile(modelPath, 'utf8')
      this.learningModel = JSON.parse(data)
    } catch (error) {
      console.log('📚 Nouveau modèle d\'apprentissage créé')
    }
  }

  /**
   * Charger les MCP auto-découverts
   */
  async loadDiscoveredMCPs () {
    try {
      const configPath = path.join(__dirname, '../../data/mcp-selfcheck-config.json')
      const configData = await fs.readFile(configPath, 'utf8')
      const config = JSON.parse(configData)

      if (config.mcpInventory) {
        // Fusionner avec l'inventaire existant
        for (const [name, mcpConfig] of Object.entries(config.mcpInventory)) {
          if (!this.mcpInventory[name]) {
            this.mcpInventory[name] = {
              ...mcpConfig,
              // Ajouter la fonction healthCheck si elle n'existe pas
              healthCheck: mcpConfig.healthCheck || (async () => {
                try {
                  const { exec } = require('child_process').promises
                  await exec(`which ${name} || command -v ${name}`)
                  return true
                } catch {
                  return false
                }
              })
            }
            console.log(`🆕 MCP auto-découvert chargé: ${name}`)
          }
        }
      }

      console.log(`📦 ${Object.keys(config.mcpInventory || {}).length} MCP découverts chargés`)
    } catch (error) {
      // Pas de configuration découverte, c'est normal au début
      console.log('📋 Aucun MCP auto-découvert pour le moment')
    }
  }

  async saveLearningModel () {
    try {
      const modelPath = path.join(__dirname, '../../data/mcp-learning-model.json')
      await fs.mkdir(path.dirname(modelPath), { recursive: true })
      await fs.writeFile(modelPath, JSON.stringify(this.learningModel, null, 2))
    } catch (error) {
      console.error('❌ Erreur sauvegarde modèle:', error)
    }
  }

  /**
   * Point d'entrée principal amélioré
   */
  async checkBeforeAction (userRequest, context = {}) {
    console.log('🔍 === MCP Self-Check V2 Starting ===')

    // 1. Thought: Analyse avancée
    this.reactState.thought = await this.analyzeIntent(userRequest, context)

    // 2. Action: Plan intelligent
    this.reactState.action = this.generateSmartActionPlan(this.reactState.thought)

    // 3. Recommandations enrichies
    const recommendations = {
      shouldUseMCP: this.reactState.thought.recommendedMCP.length > 0 &&
                    this.reactState.thought.confidence > 0.5,
      services: this.reactState.thought.recommendedMCP,
      actionPlan: this.reactState.action,
      reasoning: this.reactState.thought.reasoning,
      confidence: this.reactState.thought.confidence,

      execute: async (serviceName) => {
        const service = this.reactState.thought.recommendedMCP.find(
          s => s.service === serviceName
        )
        if (service && service.isHealthy) {
          console.log(`🚀 Executing MCP service: ${serviceName}`)
          const startTime = Date.now()

          // Enregistrer l'exécution
          this.recordExecution(serviceName, userRequest, context, Date.now() - startTime)

          return service.command
        }
        return null
      },

      // Nouvelle méthode pour feedback
      feedback: (serviceName, success, details) => {
        this.recordFeedback(serviceName, userRequest, success, details)
      }
    }

    // 4. Observation
    this.reactState.observation = {
      timestamp: new Date().toISOString(),
      mcpRecommended: recommendations.shouldUseMCP,
      servicesCount: recommendations.services.length,
      confidence: recommendations.confidence
    }

    // 5. Réflexion pour apprentissage
    this.reactState.reflection = {
      potentialImprovements: this.identifyImprovements(this.reactState.thought),
      learningOpportunity: recommendations.confidence < 0.7
    }

    console.log('✅ === MCP Self-Check V2 Complete ===')
    console.log(`Confidence: ${(recommendations.confidence * 100).toFixed(1)}%`)
    console.log(`Services: ${recommendations.services.map(s => `${s.service}(${(s.score * 100).toFixed(0)}%)`).join(', ') || 'None'}`)

    return recommendations
  }

  /**
   * Génération de plan d'action intelligent
   */
  generateSmartActionPlan (analysis) {
    const plan = {
      primaryActions: [],
      fallbackActions: [],
      validationSteps: [],
      estimatedTime: 0,
      complexity: 'simple'
    }

    // Actions principales avec seuils adaptatifs
    for (const recommendation of analysis.recommendedMCP) {
      if (recommendation.score > 0.7) {
        plan.primaryActions.push({
          step: `Utiliser ${recommendation.service}`,
          command: recommendation.command,
          confidence: `${(recommendation.score * 100).toFixed(0)}%`,
          reason: recommendation.reasoning.join('; ')
        })
      } else if (recommendation.score > 0.4) {
        plan.fallbackActions.push({
          step: `Considérer ${recommendation.service}`,
          command: recommendation.command,
          confidence: `${(recommendation.score * 100).toFixed(0)}%`,
          reason: recommendation.reasoning.join('; ')
        })
      }
    }

    // Déterminer la complexité
    if (plan.primaryActions.length > 2) {
      plan.complexity = 'complex'
      plan.validationSteps.push('Vérifier l\'ordre d\'exécution des services')
    }

    // Temps estimé
    plan.estimatedTime = plan.primaryActions.length * 100 + plan.fallbackActions.length * 50

    return plan
  }

  /**
   * Identifier les opportunités d'amélioration
   */
  identifyImprovements (analysis) {
    const improvements = []

    if (analysis.confidence < 0.5) {
      improvements.push('Enrichir les patterns de détection pour ce type de requête')
    }

    if (analysis.recommendedMCP.length === 0) {
      improvements.push('Aucun service détecté - vérifier si de nouveaux MCP sont nécessaires')
    }

    if (analysis.recommendedMCP.length > 3) {
      improvements.push('Trop de services recommandés - affiner la détection')
    }

    return improvements
  }
}

// Instance singleton
const mcpSelfCheckV2 = new MCPSelfCheckV2()

// Helper global
global.checkMCPv2 = async (request, context = {}) => {
  return await mcpSelfCheckV2.checkBeforeAction(request, context)
}

// Fonctions utilitaires exportées
const mcpStats = async () => {
  return await mcpSelfCheckV2.getMetrics()
}

const mcpReport = async () => {
  const metrics = await mcpStats()
  const report = {
    performance: {
      avgResponseTime: `${metrics.avgResponseTimeMs}ms`,
      cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      totalChecks: metrics.totalChecks
    },
    recommendations: [],
    health: {}
  }

  // Vérifier la santé des services
  for (const [name, config] of Object.entries(mcpSelfCheckV2.mcpInventory)) {
    if (config.healthCheck) {
      report.health[name] = await config.healthCheck() ? '✅ Healthy' : '❌ Down'
    }
  }

  // Recommandations basées sur les métriques
  if (metrics.avgResponseTimeMs > 100) {
    report.recommendations.push('Consider increasing cache TTL')
  }

  if (metrics.cacheHitRate < 0.5) {
    report.recommendations.push('Cache hit rate low - analyze request patterns')
  }

  return report
}

module.exports = {
  MCPSelfCheckV2,
  mcpSelfCheckV2,
  checkMCPv2: global.checkMCPv2,
  mcpStats,
  mcpReport
}
