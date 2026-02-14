/**
 * MCP Self-Check Middleware for Autonomous Tool Selection
 * Implémente le pattern ReAct (Reasoning + Action) avec awareness MCP
 *
 * Ce module permet à l'IA de vérifier automatiquement avant chaque action
 * si un service MCP pourrait être utile pour accomplir la tâche.
 */

class MCPSelfCheck {
  constructor () {
    // Inventaire des services MCP disponibles avec leurs capacités
    this.mcpInventory = {
      // Gestion de fichiers
      filesystem: {
        service: 'mcp-filesystem',
        capabilities: ['read_files', 'write_files', 'list_directories', 'file_operations'],
        triggers: ['fichier', 'file', 'répertoire', 'directory', 'créer', 'lire', 'écrire', 'modifier'],
        command: 'docker exec attitudesframework-mcp-filesystem-1'
      },

      // Base de données
      postgres: {
        service: 'mcp-postgres',
        capabilities: ['database_queries', 'schema_management', 'data_migration'],
        triggers: ['database', 'postgres', 'sql', 'query', 'table', 'migration', 'données'],
        command: 'docker exec attitudesframework-mcp-postgres-tools-1'
      },

      // Cache et sessions
      redis: {
        service: 'mcp-redis',
        capabilities: ['cache_management', 'session_storage', 'pub_sub'],
        triggers: ['cache', 'redis', 'session', 'performance', 'temps réel'],
        command: 'docker exec attitudesframework-mcp-redis-tools-1'
      },

      // Version control
      git: {
        service: 'mcp-git',
        capabilities: ['version_control', 'commits', 'branches', 'history'],
        triggers: ['git', 'commit', 'branch', 'version', 'historique', 'merge'],
        command: 'docker exec attitudesframework-mcp-git-1'
      },

      // Services externes (à configurer)
      stripe: {
        service: 'mcp-stripe',
        capabilities: ['payment_processing', 'subscription_management', 'invoicing'],
        triggers: ['paiement', 'payment', 'stripe', 'transaction', 'abonnement'],
        available: false // À activer après configuration
      },

      twilio: {
        service: 'mcp-twilio',
        capabilities: ['sms_sending', 'voice_calls', 'notifications'],
        triggers: ['sms', 'notification', 'twilio', 'message', 'appel'],
        available: false // À activer après configuration
      },

      memory: {
        service: 'mcp-memory',
        capabilities: ['persistent_memory', 'context_retention', 'learning'],
        triggers: ['mémoire', 'memory', 'rappeler', 'remember', 'contexte', 'historique'],
        available: false // À activer après installation
      }
    }

    // Pattern ReAct pour la prise de décision
    this.reactPattern = {
      thought: null, // Réflexion sur la tâche
      action: null, // Action à entreprendre
      observation: null // Observation du résultat
    }

    // Historique des vérifications pour apprentissage
    this.checkHistory = []
  }

  /**
   * Analyse une intention/requête pour déterminer les MCP pertinents
   * Implémente le pattern "Thought" du framework ReAct
   */
  analyzeIntent (userRequest, context = {}) {
    console.log('🤔 MCP Self-Check - Analyzing intent...')

    const analysis = {
      timestamp: new Date().toISOString(),
      request: userRequest,
      context,
      detectedCapabilities: [],
      recommendedMCP: [],
      reasoning: []
    }

    // Normaliser la requête pour l'analyse
    const normalizedRequest = userRequest.toLowerCase()

    // Analyser chaque service MCP disponible
    for (const [mcpName, mcpConfig] of Object.entries(this.mcpInventory)) {
      // Vérifier si le service est disponible
      if (mcpConfig.available === false) continue

      // Rechercher des triggers dans la requête
      const matchedTriggers = mcpConfig.triggers.filter(trigger =>
        normalizedRequest.includes(trigger)
      )

      if (matchedTriggers.length > 0) {
        analysis.detectedCapabilities.push(...mcpConfig.capabilities)
        analysis.recommendedMCP.push({
          service: mcpName,
          confidence: matchedTriggers.length / mcpConfig.triggers.length,
          matchedTriggers,
          command: mcpConfig.command
        })
        analysis.reasoning.push(
          `Détecté ${matchedTriggers.join(', ')} → Recommande ${mcpName}`
        )
      }
    }

    // Analyse contextuelle avancée
    this.performContextualAnalysis(analysis, userRequest, context)

    // Trier par confiance
    analysis.recommendedMCP.sort((a, b) => b.confidence - a.confidence)

    // Stocker dans l'historique pour apprentissage
    this.checkHistory.push(analysis)

    return analysis
  }

  /**
   * Analyse contextuelle pour détecter des besoins implicites
   */
  performContextualAnalysis (analysis, request, context) {
    // Détecter les opérations CRUD implicites
    const crudPatterns = {
      create: ['créer', 'ajouter', 'nouveau', 'create', 'add', 'new'],
      read: ['lire', 'afficher', 'voir', 'read', 'show', 'display', 'get'],
      update: ['modifier', 'changer', 'update', 'edit', 'change'],
      delete: ['supprimer', 'effacer', 'delete', 'remove']
    }

    for (const [operation, patterns] of Object.entries(crudPatterns)) {
      if (patterns.some(p => request.toLowerCase().includes(p))) {
        // Si CRUD détecté, recommander filesystem et/ou database
        if (!analysis.recommendedMCP.find(m => m.service === 'filesystem')) {
          analysis.recommendedMCP.push({
            service: 'filesystem',
            confidence: 0.5,
            matchedTriggers: [operation],
            command: this.mcpInventory.filesystem.command
          })
          analysis.reasoning.push(`Opération ${operation} détectée → filesystem peut être utile`)
        }
      }
    }

    // Détecter les besoins de persistance
    if (request.includes('sauvegarder') || request.includes('save') ||
        request.includes('garder') || request.includes('keep')) {
      if (!analysis.recommendedMCP.find(m => m.service === 'redis')) {
        analysis.recommendedMCP.push({
          service: 'redis',
          confidence: 0.6,
          matchedTriggers: ['persistance'],
          command: this.mcpInventory.redis.command
        })
        analysis.reasoning.push('Besoin de persistance détecté → Redis recommandé')
      }
    }
  }

  /**
   * Génère un plan d'action basé sur l'analyse
   * Implémente le pattern "Action" du framework ReAct
   */
  generateActionPlan (analysis) {
    console.log('📋 MCP Self-Check - Generating action plan...')

    const actionPlan = {
      primaryActions: [],
      fallbackActions: [],
      validationSteps: []
    }

    // Générer les actions principales
    for (const recommendation of analysis.recommendedMCP) {
      if (recommendation.confidence > 0.7) {
        actionPlan.primaryActions.push({
          step: `Utiliser ${recommendation.service}`,
          command: recommendation.command,
          reason: recommendation.matchedTriggers.join(', ')
        })
      } else if (recommendation.confidence > 0.4) {
        actionPlan.fallbackActions.push({
          step: `Considérer ${recommendation.service}`,
          command: recommendation.command,
          reason: recommendation.matchedTriggers.join(', ')
        })
      }
    }

    // Ajouter des étapes de validation
    actionPlan.validationSteps = [
      'Vérifier la disponibilité des services MCP',
      'Tester la connexion avant utilisation',
      'Préparer un plan de fallback sans MCP'
    ]

    return actionPlan
  }

  /**
   * Exécute une vérification complète avant action
   * Point d'entrée principal pour l'auto-vérification
   */
  async checkBeforeAction (userRequest, context = {}) {
    console.log('🔍 === MCP Self-Check Starting ===')

    // 1. Thought: Analyser l'intention
    this.reactPattern.thought = this.analyzeIntent(userRequest, context)

    // 2. Action: Générer le plan
    this.reactPattern.action = this.generateActionPlan(this.reactPattern.thought)

    // 3. Préparer les recommandations
    const recommendations = {
      shouldUseMCP: this.reactPattern.thought.recommendedMCP.length > 0,
      services: this.reactPattern.thought.recommendedMCP,
      actionPlan: this.reactPattern.action,
      reasoning: this.reactPattern.thought.reasoning,

      // Fonction helper pour exécuter facilement
      execute: async (serviceName) => {
        const service = this.reactPattern.thought.recommendedMCP.find(
          s => s.service === serviceName
        )
        if (service) {
          console.log(`🚀 Executing MCP service: ${serviceName}`)
          console.log(`Command: ${service.command}`)
          return service.command
        }
        return null
      }
    }

    // 4. Observation: Logger les résultats
    this.reactPattern.observation = {
      timestamp: new Date().toISOString(),
      mcpRecommended: recommendations.shouldUseMCP,
      servicesCount: recommendations.services.length
    }

    console.log('✅ === MCP Self-Check Complete ===')
    console.log(`Recommended services: ${recommendations.services.map(s => s.service).join(', ') || 'None'}`)

    return recommendations
  }

  /**
   * Apprend des interactions précédentes
   * Améliore les recommandations futures
   */
  learnFromHistory () {
    if (this.checkHistory.length < 10) return

    // Analyser les patterns d'utilisation
    const usagePatterns = {}

    for (const check of this.checkHistory) {
      for (const mcp of check.recommendedMCP) {
        if (!usagePatterns[mcp.service]) {
          usagePatterns[mcp.service] = {
            count: 0,
            avgConfidence: 0,
            triggers: new Set()
          }
        }

        usagePatterns[mcp.service].count++
        usagePatterns[mcp.service].avgConfidence += mcp.confidence
        mcp.matchedTriggers.forEach(t => usagePatterns[mcp.service].triggers.add(t))
      }
    }

    // Calculer les moyennes et ajuster les poids
    for (const [service, stats] of Object.entries(usagePatterns)) {
      stats.avgConfidence /= stats.count

      // Si un service est souvent recommandé avec haute confiance,
      // ajouter ses triggers fréquents
      if (stats.avgConfidence > 0.7 && stats.count > 5) {
        const newTriggers = Array.from(stats.triggers)
        this.mcpInventory[service].triggers = [
          ...new Set([...this.mcpInventory[service].triggers, ...newTriggers])
        ]
      }
    }
  }

  /**
   * Obtenir le statut des services MCP
   */
  async getServicesStatus () {
    const status = {}

    for (const [name, config] of Object.entries(this.mcpInventory)) {
      status[name] = {
        available: config.available !== false,
        capabilities: config.capabilities,
        command: config.command || 'Not configured'
      }
    }

    return status
  }
}

// Exporter une instance singleton
const mcpSelfCheck = new MCPSelfCheck()

// Fonction helper globale pour utilisation facile
global.checkMCP = async (request, context = {}) => {
  return await mcpSelfCheck.checkBeforeAction(request, context)
}

module.exports = {
  MCPSelfCheck,
  mcpSelfCheck,
  checkMCP: global.checkMCP
}
