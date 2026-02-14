/**
 * MCP Integration Bridge
 *
 * Pont entre l'Agent de Découverte et le système Self-Check
 * Synchronise automatiquement les nouveaux MCP découverts
 */

const fs = require('fs').promises
const path = require('path')
const { MCPSelfCheckV2 } = require('./mcp-self-check-v2')

class MCPIntegrationBridge {
  constructor () {
    this.config = {
      // Fichiers de données
      discoveryReportsDir: path.join(__dirname, '../../data/mcp-discovery'),
      installedMCPFile: path.join(__dirname, '../../data/installed-mcp.json'),
      selfCheckConfigFile: path.join(__dirname, '../../data/mcp-selfcheck-config.json'),
      syncLogFile: path.join(__dirname, '../../logs/mcp-sync.log'),

      // Options de synchronisation
      autoSync: true,
      syncInterval: 24 * 60 * 60 * 1000, // 24 heures
      minUtilityScore: 0.5, // Score minimum pour auto-ajout
      requireHealthCheck: true
    }

    this.lastSync = null
    this.syncStats = {
      totalSynced: 0,
      totalAdded: 0,
      totalUpdated: 0,
      lastSyncDate: null
    }
  }

  /**
   * Démarrer la synchronisation automatique
   */
  async startAutoSync () {
    console.log('🔄 Démarrage de la synchronisation MCP automatique')

    // Synchronisation initiale
    await this.syncDiscoveriesToSelfCheck()

    // Planifier les synchronisations
    if (this.config.autoSync) {
      setInterval(async () => {
        await this.syncDiscoveriesToSelfCheck()
      }, this.config.syncInterval)
    }

    // Écouter les nouveaux rapports de découverte
    this.watchForNewDiscoveries()
  }

  /**
   * Synchroniser les découvertes avec Self-Check
   */
  async syncDiscoveriesToSelfCheck () {
    const startTime = Date.now()
    console.log('\n🔄 === Synchronisation MCP Discovery → Self-Check ===')

    try {
      // 1. Charger les dernières découvertes
      const discoveries = await this.loadLatestDiscoveries()

      // 2. Charger la configuration actuelle de Self-Check
      const selfCheckInstance = new MCPSelfCheckV2()
      const currentInventory = selfCheckInstance.mcpInventory

      // 3. Identifier les nouveaux MCP à ajouter
      const newMCPs = await this.identifyNewMCPs(discoveries, currentInventory)

      // 4. Générer les configurations pour Self-Check
      const newConfigs = await this.generateSelfCheckConfigs(newMCPs)

      // 5. Mettre à jour le système Self-Check
      const updateResult = await this.updateSelfCheckSystem(newConfigs, selfCheckInstance)

      // 6. Créer le rapport de synchronisation
      const syncReport = await this.createSyncReport(updateResult)

      // 7. Mettre à jour les statistiques
      this.updateSyncStats(updateResult)

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`✅ Synchronisation terminée en ${duration}s`)
      console.log(`📊 ${updateResult.added} nouveaux MCP ajoutés, ${updateResult.updated} mis à jour`)

      return syncReport
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error)
      await this.logError(error)
    }
  }

  /**
   * Charger les dernières découvertes
   */
  async loadLatestDiscoveries () {
    const discoveries = []

    try {
      // Lire tous les rapports de découverte
      const files = await fs.readdir(this.config.discoveryReportsDir)
      const reportFiles = files
        .filter(f => f.startsWith('discovery-report-') && f.endsWith('.json'))
        .sort()
        .reverse() // Plus récent en premier

      // Charger les 3 derniers rapports
      for (const file of reportFiles.slice(0, 3)) {
        const filePath = path.join(this.config.discoveryReportsDir, file)
        const report = JSON.parse(await fs.readFile(filePath, 'utf8'))

        // Extraire les MCP haute et moyenne priorité
        if (report.topRecommendations) {
          discoveries.push(...report.topRecommendations)
        }
      }

      // Charger aussi le fichier des MCP installés
      const installedMCPs = await this.loadInstalledMCPs()

      // Fusionner avec les découvertes
      for (const [name, info] of Object.entries(installedMCPs)) {
        if (!discoveries.find(d => d.name === name)) {
          discoveries.push({
            name,
            score: 1.0, // MCP déjà installés ont un score max
            tools: info.tools || [],
            installation: info.command || ''
          })
        }
      }
    } catch (error) {
      console.warn('⚠️  Impossible de charger les découvertes:', error.message)
    }

    return discoveries
  }

  /**
   * Identifier les nouveaux MCP non présents dans Self-Check
   */
  async identifyNewMCPs (discoveries, currentInventory) {
    const newMCPs = []

    for (const discovery of discoveries) {
      const mcpName = this.normalizeMCPName(discovery.name)

      // Vérifier si le MCP existe déjà dans l'inventaire
      const exists = Object.keys(currentInventory).some(key =>
        key.toLowerCase() === mcpName.toLowerCase()
      )

      if (!exists && discovery.score >= this.config.minUtilityScore) {
        newMCPs.push({
          ...discovery,
          normalizedName: mcpName
        })
      }
    }

    return newMCPs
  }

  /**
   * Générer les configurations pour Self-Check
   */
  async generateSelfCheckConfigs (newMCPs) {
    const configs = {}

    for (const mcp of newMCPs) {
      const config = {
        service: mcp.normalizedName,
        capabilities: this.extractCapabilities(mcp),
        triggers: this.generateTriggers(mcp),
        patterns: this.generatePatterns(mcp),
        semanticConcepts: this.extractConcepts(mcp),
        command: this.generateCommand(mcp),
        available: await this.checkAvailability(mcp),
        autoDiscovered: true,
        discoveredAt: new Date().toISOString(),
        utilityScore: mcp.score
      }

      // Ajouter health check si possible
      if (this.config.requireHealthCheck) {
        config.healthCheck = this.generateHealthCheck(mcp)
      }

      configs[mcp.normalizedName] = config
    }

    return configs
  }

  /**
   * Mettre à jour le système Self-Check
   */
  async updateSelfCheckSystem (newConfigs, selfCheckInstance) {
    const result = {
      added: 0,
      updated: 0,
      failed: 0,
      details: []
    }

    // Charger la configuration persistante
    let persistentConfig = {}
    try {
      const configData = await fs.readFile(this.config.selfCheckConfigFile, 'utf8')
      persistentConfig = JSON.parse(configData)
    } catch {
      persistentConfig = { mcpInventory: {} }
    }

    // Ajouter les nouvelles configurations
    for (const [name, config] of Object.entries(newConfigs)) {
      try {
        // Ajouter à l'instance en cours
        selfCheckInstance.mcpInventory[name] = config

        // Ajouter à la configuration persistante
        persistentConfig.mcpInventory[name] = config

        result.added++
        result.details.push({
          name,
          status: 'added',
          capabilities: config.capabilities.length,
          score: config.utilityScore
        })

        console.log(`✅ Ajouté: ${name} (${config.capabilities.length} capacités)`)
      } catch (error) {
        result.failed++
        result.details.push({
          name,
          status: 'failed',
          error: error.message
        })
        console.error(`❌ Échec ajout ${name}:`, error.message)
      }
    }

    // Sauvegarder la configuration mise à jour
    await fs.mkdir(path.dirname(this.config.selfCheckConfigFile), { recursive: true })
    await fs.writeFile(
      this.config.selfCheckConfigFile,
      JSON.stringify(persistentConfig, null, 2)
    )

    // Mettre à jour mcp-self-check-v2.js pour charger cette config au démarrage
    await this.updateSelfCheckSourceCode(persistentConfig.mcpInventory)

    return result
  }

  /**
   * Mettre à jour le code source de mcp-self-check-v2.js
   */
  async updateSelfCheckSourceCode (newInventory) {
    const selfCheckPath = path.join(__dirname, 'mcp-self-check-v2.js')

    try {
      // Lire le fichier actuel
      let sourceCode = await fs.readFile(selfCheckPath, 'utf8')

      // Créer un commentaire avec les nouveaux MCP
      const newMCPSection = `
    // === MCP Auto-découverts ===
    // Dernière mise à jour: ${new Date().toISOString()}
${Object.entries(newInventory)
  .filter(([_, config]) => config.autoDiscovered)
  .map(([name, config]) => `    // - ${name}: ${config.capabilities.join(', ')}`)
  .join('\n')}
    // ===========================
`

      // Insérer le commentaire dans le constructeur
      const constructorRegex = /constructor\(\) {[\s\S]*?this\.mcpInventory = {/
      sourceCode = sourceCode.replace(constructorRegex, (match) => {
        return match + newMCPSection
      })

      // Sauvegarder une copie de sauvegarde
      await fs.writeFile(selfCheckPath + '.backup', sourceCode)

      // Note: En production, on ne modifie pas directement le code source
      // On utilise plutôt le fichier de configuration JSON
      console.log('💾 Configuration sauvegardée dans', this.config.selfCheckConfigFile)
    } catch (error) {
      console.warn('⚠️  Mise à jour du code source ignorée:', error.message)
    }
  }

  /**
   * Créer un rapport de synchronisation
   */
  async createSyncReport (updateResult) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        added: updateResult.added,
        updated: updateResult.updated,
        failed: updateResult.failed,
        total: updateResult.added + updateResult.updated
      },
      details: updateResult.details,
      nextSync: new Date(Date.now() + this.config.syncInterval).toISOString()
    }

    // Sauvegarder le rapport
    const reportPath = path.join(
      this.config.discoveryReportsDir,
      `sync-report-${new Date().toISOString().split('T')[0]}.json`
    )

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    // Logger
    await this.log(`Synchronisation: ${report.summary.added} ajoutés, ${report.summary.updated} mis à jour`)

    return report
  }

  /**
   * Surveiller les nouveaux rapports de découverte
   */
  watchForNewDiscoveries () {
    // En production, utiliser fs.watch ou chokidar
    // Pour l'instant, on vérifie périodiquement
    setInterval(async () => {
      const files = await fs.readdir(this.config.discoveryReportsDir)
      const latestReport = files
        .filter(f => f.startsWith('discovery-report-') && f.endsWith('.json'))
        .sort()
        .pop()

      if (latestReport && this.lastSync !== latestReport) {
        console.log('🆕 Nouveau rapport de découverte détecté')
        await this.syncDiscoveriesToSelfCheck()
        this.lastSync = latestReport
      }
    }, 60 * 60 * 1000) // Vérifier toutes les heures
  }

  /**
   * Méthodes utilitaires
   */

  normalizeMCPName (name) {
    return name
      .replace(/^@/, '')
      .replace(/\//g, '-')
      .replace(/mcp-server-/, '')
      .replace(/-mcp$/, '')
      .toLowerCase()
  }

  extractCapabilities (mcp) {
    const capabilities = []

    if (mcp.tools && Array.isArray(mcp.tools)) {
      capabilities.push(...mcp.tools)
    }

    // Extraire des capacités depuis le nom/description
    const name = mcp.name.toLowerCase()
    if (name.includes('database') || name.includes('postgres') || name.includes('mysql')) {
      capabilities.push('database_operations')
    }
    if (name.includes('payment') || name.includes('stripe')) {
      capabilities.push('payment_processing')
    }
    if (name.includes('email') || name.includes('mail')) {
      capabilities.push('email_sending')
    }
    if (name.includes('auth')) {
      capabilities.push('authentication')
    }

    return [...new Set(capabilities)] // Éliminer les doublons
  }

  generateTriggers (mcp) {
    const triggers = []
    const name = mcp.normalizedName

    // Ajouter le nom comme trigger
    triggers.push(name)

    // Ajouter des variations
    if (name.includes('-')) {
      triggers.push(...name.split('-'))
    }

    // Ajouter des triggers basés sur les outils
    if (mcp.tools) {
      for (const tool of mcp.tools) {
        triggers.push(tool.replace(/_/g, ' '))
      }
    }

    return triggers
  }

  generatePatterns (mcp) {
    const patterns = []

    // Patterns basés sur le type de MCP
    if (mcp.name.includes('stripe')) {
      patterns.push({
        regex: /\b(payment|paiement|transaction|checkout)\b/i,
        weight: 0.9
      })
    }

    if (mcp.name.includes('email')) {
      patterns.push({
        regex: /\b(send|envoyer|email|mail|notification)\b/i,
        weight: 0.85
      })
    }

    if (mcp.name.includes('database') || mcp.name.includes('postgres')) {
      patterns.push({
        regex: /\b(SELECT|INSERT|UPDATE|DELETE|query|requête)\b/i,
        weight: 0.9
      })
    }

    return patterns
  }

  extractConcepts (mcp) {
    const concepts = []
    const name = mcp.name.toLowerCase()

    // Mapping de concepts
    const conceptMap = {
      payment: ['payment_processing', 'financial_transactions'],
      email: ['communication', 'notifications'],
      database: ['data_persistence', 'data_management'],
      auth: ['authentication', 'security'],
      analytics: ['data_analysis', 'metrics'],
      ai: ['artificial_intelligence', 'machine_learning']
    }

    for (const [keyword, mappedConcepts] of Object.entries(conceptMap)) {
      if (name.includes(keyword)) {
        concepts.push(...mappedConcepts)
      }
    }

    return [...new Set(concepts)]
  }

  generateCommand (mcp) {
    if (mcp.installation) {
      return mcp.installation
    }

    // Générer une commande basée sur le type
    if (mcp.name.startsWith('@')) {
      return `npx ${mcp.name}`
    } else if (mcp.name.includes('docker')) {
      return `docker run ${mcp.name}`
    } else {
      return `mcp-run ${mcp.normalizedName}`
    }
  }

  async checkAvailability (mcp) {
    // Vérifier si le MCP est installé et disponible
    try {
      const installedMCPs = await this.loadInstalledMCPs()
      return installedMCPs.hasOwnProperty(mcp.name)
    } catch {
      return false
    }
  }

  generateHealthCheck (mcp) {
    // Générer une fonction de health check basique
    return async () => {
      try {
        // Health check générique
        const { exec } = require('child_process').promises

        if (mcp.name.includes('docker')) {
          await exec(`docker ps | grep ${mcp.normalizedName}`)
        } else {
          // Vérifier si la commande existe
          await exec(`which ${mcp.normalizedName} || command -v ${mcp.normalizedName}`)
        }

        return true
      } catch {
        return false
      }
    }
  }

  async loadInstalledMCPs () {
    try {
      const data = await fs.readFile(this.config.installedMCPFile, 'utf8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  updateSyncStats (result) {
    this.syncStats.totalSynced++
    this.syncStats.totalAdded += result.added
    this.syncStats.totalUpdated += result.updated
    this.syncStats.lastSyncDate = new Date().toISOString()
  }

  async log (message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`

    await fs.mkdir(path.dirname(this.config.syncLogFile), { recursive: true })
    await fs.appendFile(this.config.syncLogFile, logEntry)
  }

  async logError (error) {
    await this.log(`ERROR: ${error.message}\n${error.stack}`)
  }

  /**
   * API publique
   */

  async getSyncStatus () {
    return {
      isRunning: this.config.autoSync,
      lastSync: this.lastSync,
      stats: this.syncStats,
      nextSync: new Date(Date.now() + this.config.syncInterval).toISOString()
    }
  }

  async forceSyncNow () {
    console.log('🔄 Synchronisation forcée demandée')
    return await this.syncDiscoveriesToSelfCheck()
  }
}

// Instance singleton
const integrationBridge = new MCPIntegrationBridge()

// Auto-démarrer si configuré
if (process.env.MCP_BRIDGE_AUTO_START === 'true') {
  integrationBridge.startAutoSync()
}

module.exports = {
  MCPIntegrationBridge,
  integrationBridge,

  // Fonctions publiques
  startMCPSync: () => integrationBridge.startAutoSync(),
  syncNow: () => integrationBridge.forceSyncNow(),
  getSyncStatus: () => integrationBridge.getSyncStatus()
}
