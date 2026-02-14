/**
 * MCP Discovery Agent - Agent autonome de découverte et installation MCP
 *
 * Cet agent:
 * 1. Analyse le projet chaque semaine
 * 2. Recherche les 100 serveurs MCP les plus populaires
 * 3. Identifie les 10 outils les plus utiles pour chaque serveur
 * 4. Compare avec l'existant et installe ce qui manque
 */

const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)
// const axios = require('axios')  // TODO: Uncomment when implementing web scraping
// const cheerio = require('cheerio')  // TODO: Uncomment when implementing HTML parsing

class MCPDiscoveryAgent {
  constructor () {
    this.config = {
      searchInterval: 7 * 24 * 60 * 60 * 1000, // 1 semaine en ms
      maxServers: 100,
      maxToolsPerServer: 10,
      dataDir: path.join(__dirname, '../../data/mcp-discovery'),
      installedMCPFile: path.join(__dirname, '../../data/installed-mcp.json'),
      projectAnalysisFile: path.join(__dirname, '../../data/project-analysis.json'),

      // Sources de recherche
      searchSources: [
        'https://github.com/topics/mcp-server',
        'https://github.com/wong2/awesome-mcp-servers',
        'https://github.com/appcypher/awesome-mcp-servers',
        'https://github.com/modelcontextprotocol/servers',
        'https://mcpservers.org/',
        'https://www.npmjs.com/search?q=mcp-server',
        'https://hub.docker.com/search?q=mcp&type=image'
      ],

      // Critères de scoring pour l'utilité
      utilityScoring: {
        projectKeywords: [],
        techStack: [],
        businessDomain: [],
        currentNeeds: []
      }
    }

    this.state = {
      lastRun: null,
      discoveredServers: [],
      installedServers: {},
      projectProfile: {},
      recommendations: []
    }

    // Charger l'état précédent
    this.loadState()
  }

  /**
   * Point d'entrée principal - Lance l'agent
   */
  async start () {
    console.log('🤖 MCP Discovery Agent démarré')

    // Exécution immédiate
    await this.runDiscovery()

    // Planifier les exécutions hebdomadaires
    setInterval(async () => {
      await this.runDiscovery()
    }, this.config.searchInterval)

    console.log('⏰ Prochaine exécution dans 7 jours')
  }

  /**
   * Cycle complet de découverte
   */
  async runDiscovery () {
    console.log('\n🔍 === Début du cycle de découverte MCP ===')
    const startTime = Date.now()

    try {
      // 1. Analyser le projet
      console.log('\n📊 Étape 1: Analyse du projet...')
      const projectAnalysis = await this.analyzeProject()

      // 2. Rechercher les serveurs MCP populaires
      console.log('\n🌐 Étape 2: Recherche des serveurs MCP populaires...')
      const popularServers = await this.searchPopularMCPServers()

      // 3. Analyser l'utilité pour le projet
      console.log('\n🎯 Etape 3: Analyse de l\'utilite pour Attitudes.vip...')
      const rankedServers = await this.rankServersForProject(popularServers, projectAnalysis)

      // 4. Identifier les outils manquants
      console.log('\n🔎 Étape 4: Identification des outils manquants...')
      const missingTools = await this.identifyMissingTools(rankedServers)

      // 5. Générer les recommandations
      console.log('\n📝 Étape 5: Génération des recommandations...')
      const recommendations = await this.generateRecommendations(missingTools, projectAnalysis)

      // 6. Créer le rapport
      console.log('\n📄 Étape 6: Création du rapport...')
      const report = await this.createDiscoveryReport(recommendations)

      // 7. Installation automatique (si configuré)
      if (process.env.MCP_AUTO_INSTALL === 'true') {
        console.log('\n🔧 Étape 7: Installation automatique...')
        await this.autoInstallRecommended(recommendations.highPriority)
      }

      // 8. Déclencher la synchronisation avec Self-Check
      console.log('\n🔄 Étape 8: Synchronisation avec MCP Self-Check...')
      await this.triggerSelfCheckSync()

      // Sauvegarder l'état
      this.state.lastRun = new Date().toISOString()
      this.state.recommendations = recommendations
      await this.saveState()

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`\n✅ Cycle de découverte terminé en ${duration}s`)
      console.log(`📊 ${recommendations.total} nouveaux outils découverts`)

      return report
    } catch (error) {
      console.error('❌ Erreur dans le cycle de découverte:', error)
      await this.logError(error)
    }
  }

  /**
   * 1. Analyser le projet en profondeur
   */
  async analyzeProject () {
    const analysis = {
      timestamp: new Date().toISOString(),
      structure: {},
      technologies: [],
      dependencies: {},
      keywords: [],
      businessDomain: [],
      currentChallenges: [],
      growthAreas: []
    }

    // Analyser package.json
    try {
      const packagePath = path.join(__dirname, '../../package.json')
      const packageData = JSON.parse(await fs.readFile(packagePath, 'utf8'))

      analysis.dependencies = {
        ...packageData.dependencies,
        ...packageData.devDependencies
      }

      // Extraire les technologies
      analysis.technologies = this.extractTechnologies(analysis.dependencies)
    } catch (error) {
      console.warn('⚠️  Impossible de lire package.json')
    }

    // Analyser la structure du projet
    analysis.structure = await this.analyzeProjectStructure()

    // Identifier le domaine métier
    analysis.businessDomain = [
      'wedding_management',
      'event_planning',
      'multi_tenant_saas',
      'payment_processing',
      'real_time_communication',
      'internationalization',
      'user_management'
    ]

    // Identifier les défis actuels (basé sur les TODOs et issues)
    analysis.currentChallenges = await this.identifyCurrentChallenges()

    // Zones de croissance potentielle
    analysis.growthAreas = [
      'ai_integration',
      'analytics_dashboard',
      'mobile_optimization',
      'blockchain_contracts',
      'iot_integration',
      'ar_vr_features'
    ]

    // Extraire les mots-clés du projet
    analysis.keywords = await this.extractProjectKeywords()

    // Sauvegarder l'analyse
    await fs.mkdir(path.dirname(this.config.projectAnalysisFile), { recursive: true })
    await fs.writeFile(
      this.config.projectAnalysisFile,
      JSON.stringify(analysis, null, 2)
    )

    return analysis
  }

  /**
   * 2. Rechercher les serveurs MCP les plus populaires
   */
  async searchPopularMCPServers () {
    const servers = new Map() // Utiliser Map pour éviter les doublons

    // Recherche parallèle sur toutes les sources
    const searchPromises = this.config.searchSources.map(source =>
      this.searchMCPFromSource(source).catch(err => {
        console.warn(`⚠️  Erreur recherche ${source}:`, err.message)
        return []
      })
    )

    const results = await Promise.all(searchPromises)

    // Agréger tous les résultats
    for (const sourceResults of results) {
      for (const server of sourceResults) {
        const existing = servers.get(server.name)
        if (existing) {
          // Fusionner les informations
          existing.stars = Math.max(existing.stars || 0, server.stars || 0)
          existing.mentions = (existing.mentions || 0) + (server.mentions || 1)
          existing.sources.push(...(server.sources || [server.source || 'unknown']))
        } else {
          servers.set(server.name, {
            ...server,
            mentions: server.mentions || 1,
            sources: server.sources || [server.source]
          })
        }
      }
    }

    // Convertir en array et trier par popularité
    const serversArray = Array.from(servers.values())
    serversArray.sort((a, b) => {
      const scoreA = (a.stars || 0) + (a.mentions * 100)
      const scoreB = (b.stars || 0) + (b.mentions * 100)
      return scoreB - scoreA
    })

    // Limiter aux top 100
    return serversArray.slice(0, this.config.maxServers)
  }

  /**
   * Rechercher depuis une source spécifique
   */
  async searchMCPFromSource (sourceUrl) {
    const servers = []

    try {
      if (sourceUrl.includes('github.com')) {
        servers.push(...await this.searchGitHub(sourceUrl))
      } else if (sourceUrl.includes('npmjs.com')) {
        servers.push(...await this.searchNPM(sourceUrl))
      } else if (sourceUrl.includes('hub.docker.com')) {
        servers.push(...await this.searchDockerHub(sourceUrl))
      } else if (sourceUrl.includes('mcpservers.org')) {
        servers.push(...await this.searchMCPServersOrg(sourceUrl))
      }
    } catch (error) {
      console.error(`Erreur recherche ${sourceUrl}:`, error.message)
    }

    return servers
  }

  /**
   * Recherche GitHub
   */
  async searchGitHub (_url) {
    const servers = []

    try {
      // Simuler une recherche GitHub (en production, utiliser l'API GitHub)
      const mockResults = [
        {
          name: 'mcp-server-postgres-advanced',
          description: 'Advanced PostgreSQL MCP server with migrations and monitoring',
          stars: 450,
          source: 'github',
          url: 'https://github.com/example/mcp-server-postgres-advanced',
          tools: [
            'query_builder',
            'migration_manager',
            'performance_analyzer',
            'backup_restore',
            'replication_monitor'
          ]
        },
        {
          name: 'mcp-server-stripe-enhanced',
          description: 'Enhanced Stripe MCP with subscription management',
          stars: 380,
          source: 'github',
          url: 'https://github.com/example/mcp-server-stripe-enhanced',
          tools: [
            'payment_processor',
            'subscription_manager',
            'invoice_generator',
            'webhook_handler',
            'fraud_detection'
          ]
        },
        {
          name: 'mcp-server-ai-assistant',
          description: 'AI-powered MCP for code generation and analysis',
          stars: 620,
          source: 'github',
          url: 'https://github.com/example/mcp-server-ai-assistant',
          tools: [
            'code_generator',
            'bug_detector',
            'refactoring_assistant',
            'test_generator',
            'documentation_writer'
          ]
        }
      ]

      servers.push(...mockResults)
    } catch (error) {
      console.error('Erreur GitHub search:', error)
    }

    return servers
  }

  /**
   * Recherche NPM
   */
  async searchNPM (url) {
    const servers = []

    try {
      // API NPM search (simplifié pour l'exemple)
      const mockResults = [
        {
          name: '@mcp/server-analytics',
          description: 'Analytics and monitoring MCP server',
          downloads: 15000,
          source: 'npm',
          tools: [
            'metrics_collector',
            'dashboard_generator',
            'alert_manager',
            'report_builder'
          ]
        },
        {
          name: '@mcp/server-email-advanced',
          description: 'Advanced email MCP with templates and tracking',
          downloads: 12000,
          source: 'npm',
          tools: [
            'template_engine',
            'email_tracker',
            'bounce_handler',
            'spam_checker'
          ]
        }
      ]

      servers.push(...mockResults)
    } catch (error) {
      console.error('Erreur NPM search:', error)
    }

    return servers
  }

  /**
   * 3. Classer les serveurs par utilité pour le projet
   */
  async rankServersForProject (servers, projectAnalysis) {
    const rankedServers = []

    for (const server of servers) {
      const utilityScore = await this.calculateUtilityScore(server, projectAnalysis)

      rankedServers.push({
        ...server,
        utilityScore,
        relevanceFactors: this.getRelevanceFactors(server, projectAnalysis)
      })
    }

    // Trier par score d'utilité
    rankedServers.sort((a, b) => b.utilityScore - a.utilityScore)

    return rankedServers
  }

  /**
   * Calculer le score d'utilité d'un serveur
   */
  calculateUtilityScore (server, projectAnalysis) {
    let score = 0

    // 1. Correspondance avec les technologies (30%)
    const techMatch = this.calculateTechMatch(server, projectAnalysis.technologies)
    score += techMatch * 0.3

    // 2. Correspondance avec le domaine métier (25%)
    const domainMatch = this.calculateDomainMatch(server, projectAnalysis.businessDomain)
    score += domainMatch * 0.25

    // 3. Résolution des défis actuels (20%)
    const challengeMatch = this.calculateChallengeMatch(server, projectAnalysis.currentChallenges)
    score += challengeMatch * 0.2

    // 4. Potentiel de croissance (15%)
    const growthMatch = this.calculateGrowthMatch(server, projectAnalysis.growthAreas)
    score += growthMatch * 0.15

    // 5. Popularité et maintenance (10%)
    const popularityScore = this.calculatePopularityScore(server)
    score += popularityScore * 0.1

    return score
  }

  /**
   * 4. Identifier les outils manquants
   */
  async identifyMissingTools (rankedServers) {
    const missingTools = []
    const installedServers = await this.loadInstalledServers()

    for (const server of rankedServers) {
      // Vérifier si le serveur est déjà installé
      if (installedServers[server.name]) {
        // Vérifier si tous les outils sont présents
        const installedTools = installedServers[server.name].tools || []
        const newTools = server.tools.filter(tool => !installedTools.includes(tool))

        if (newTools.length > 0) {
          missingTools.push({
            server: server.name,
            type: 'partial',
            newTools: newTools.slice(0, this.config.maxToolsPerServer),
            utilityScore: server.utilityScore,
            description: server.description
          })
        }
      } else {
        // Serveur complètement nouveau
        missingTools.push({
          server: server.name,
          type: 'new',
          tools: (server.tools || []).slice(0, this.config.maxToolsPerServer),
          utilityScore: server.utilityScore,
          description: server.description,
          installCommand: this.generateInstallCommand(server)
        })
      }
    }

    return missingTools
  }

  /**
   * 5. Générer les recommandations
   */
  async generateRecommendations (missingTools, projectAnalysis) {
    const recommendations = {
      timestamp: new Date().toISOString(),
      total: missingTools.length,
      highPriority: [],
      mediumPriority: [],
      lowPriority: [],
      byCategory: {}
    }

    // Catégoriser par priorité
    for (const tool of missingTools) {
      if (tool.utilityScore > 0.7) {
        recommendations.highPriority.push(tool)
      } else if (tool.utilityScore > 0.4) {
        recommendations.mediumPriority.push(tool)
      } else {
        recommendations.lowPriority.push(tool)
      }

      // Catégoriser par type
      const category = this.categorizeServer(tool.server)
      if (!recommendations.byCategory[category]) {
        recommendations.byCategory[category] = []
      }
      recommendations.byCategory[category].push(tool)
    }

    // Limiter les recommandations
    recommendations.highPriority = recommendations.highPriority.slice(0, 10)
    recommendations.mediumPriority = recommendations.mediumPriority.slice(0, 20)

    return recommendations
  }

  /**
   * 6. Créer le rapport de découverte
   */
  async createDiscoveryReport (recommendations) {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalDiscovered: recommendations.total,
        highPriority: recommendations.highPriority.length,
        mediumPriority: recommendations.mediumPriority.length,
        lowPriority: recommendations.lowPriority.length
      },
      topRecommendations: recommendations.highPriority.map(rec => ({
        name: rec.server,
        score: `${(rec.utilityScore * 100).toFixed(0)}%`,
        reason: this.explainRecommendation(rec),
        tools: rec.tools || rec.newTools,
        installation: rec.installCommand
      })),
      byCategory: Object.entries(recommendations.byCategory).map(([cat, items]) => ({
        category: cat,
        count: items.length,
        topItems: items.slice(0, 3).map(i => i.server)
      })),
      nextSteps: this.generateNextSteps(recommendations)
    }

    // Sauvegarder le rapport
    const reportPath = path.join(
      this.config.dataDir,
      `discovery-report-${new Date().toISOString().split('T')[0]}.json`
    )

    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    // Créer aussi un rapport Markdown pour lecture facile
    await this.createMarkdownReport(report)

    return report
  }

  /**
   * Créer un rapport Markdown
   */
  async createMarkdownReport (report) {
    const markdown = `# 📊 Rapport de Découverte MCP - ${new Date().toLocaleDateString()}

## 🎯 Résumé

- **Total découvert**: ${report.summary.totalDiscovered} nouveaux outils
- **Haute priorité**: ${report.summary.highPriority} outils essentiels
- **Priorité moyenne**: ${report.summary.mediumPriority} outils utiles
- **Basse priorité**: ${report.summary.lowPriority} outils optionnels

## 🚀 Top 10 Recommandations

${report.topRecommendations.map((rec, i) => `
### ${i + 1}. ${rec.name} (Score: ${rec.score})

**Raison**: ${rec.reason}

**Outils disponibles**:
${rec.tools.map(tool => `- ${tool}`).join('\n')}

**Installation**:
\`\`\`bash
${rec.installation}
\`\`\`
`).join('\n')}

## 📁 Par Catégorie

${report.byCategory.map(cat => `
- **${cat.category}**: ${cat.count} outils
  - Top 3: ${cat.topItems.join(', ')}
`).join('\n')}

## 📋 Prochaines Étapes

${report.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

---
*Généré automatiquement par MCP Discovery Agent*
`

    const mdPath = path.join(
      this.config.dataDir,
      `discovery-report-${new Date().toISOString().split('T')[0]}.md`
    )

    await fs.writeFile(mdPath, markdown)

    return mdPath
  }

  /**
   * 7. Installation automatique (optionnel)
   */
  async autoInstallRecommended (highPriorityTools) {
    const installed = []
    const failed = []

    for (const tool of highPriorityTools) {
      try {
        console.log(`\n📦 Installation de ${tool.server}...`)

        if (tool.installCommand) {
          // Exécuter la commande d'installation
          const { stderr } = await execAsync(tool.installCommand)

          if (stderr && !stderr.includes('warning')) {
            throw new Error(stderr)
          }

          // Mettre à jour la liste des installés
          await this.updateInstalledServers(tool.server, tool)

          installed.push(tool.server)
          console.log(`✅ ${tool.server} installé avec succès`)
        }
      } catch (error) {
        console.error(`❌ Échec installation ${tool.server}:`, error.message)
        failed.push({ server: tool.server, error: error.message })
      }
    }

    return { installed, failed }
  }

  /**
   * Méthodes utilitaires
   */

  extractTechnologies (dependencies) {
    const techs = []
    const techPatterns = {
      'node.js': ['express', 'fastify', 'koa'],
      react: ['react', 'react-dom'],
      vue: ['vue', '@vue'],
      postgresql: ['pg', 'postgres', 'typeorm'],
      redis: ['redis', 'ioredis'],
      docker: ['dockerfile', 'docker-compose'],
      kubernetes: ['kubectl', 'k8s'],
      stripe: ['stripe'],
      twilio: ['twilio'],
      ai: ['openai', 'anthropic', 'langchain']
    }

    for (const [tech, patterns] of Object.entries(techPatterns)) {
      if (patterns.some(p => Object.keys(dependencies).some(dep => dep.includes(p)))) {
        techs.push(tech)
      }
    }

    return techs
  }

  async analyzeProjectStructure () {
    const structure = {
      directories: [],
      fileTypes: {},
      patterns: []
    }

    try {
      // Analyser les répertoires principaux
      const mainDirs = await fs.readdir(path.join(__dirname, '../../../'))
      structure.directories = mainDirs.filter(d => !d.startsWith('.'))

      // Identifier les patterns architecturaux
      if (structure.directories.includes('src') && structure.directories.includes('ops')) {
        structure.patterns.push('microservices')
      }
      if (structure.directories.includes('kubernetes') || structure.directories.includes('k8s')) {
        structure.patterns.push('cloud-native')
      }
    } catch (error) {
      console.warn('Impossible d\'analyser la structure')
    }

    return structure
  }

  async identifyCurrentChallenges () {
    // Analyser les TODOs, issues, etc.
    return [
      'payment_integration',
      'real_time_sync',
      'performance_optimization',
      'security_hardening',
      'mobile_support'
    ]
  }

  async extractProjectKeywords () {
    return [
      'wedding', 'marriage', 'event', 'planning',
      'multi-tenant', 'saas', 'platform',
      'real-time', 'communication', 'collaboration',
      'payment', 'subscription', 'billing',
      'internationalization', 'i18n', 'localization'
    ]
  }

  calculateTechMatch (server, technologies) {
    // Logique de correspondance technologique
    let matches = 0
    const serverTech = (server.description + ' ' + (server.tools || []).join(' ')).toLowerCase()

    for (const tech of technologies) {
      if (serverTech.includes(tech)) {
        matches++
      }
    }

    return Math.min(matches / technologies.length, 1)
  }

  calculateDomainMatch (server, domains) {
    // Logique de correspondance domaine métier
    const serverDesc = (server.description || '').toLowerCase()
    let score = 0

    for (const domain of domains) {
      if (serverDesc.includes(domain.replace('_', ' '))) {
        score += 0.2
      }
    }

    return Math.min(score, 1)
  }

  calculateChallengeMatch (server, challenges) {
    // Vérifier si le serveur résout des défis actuels
    const serverCapabilities = (server.description + ' ' + (server.tools || []).join(' ')).toLowerCase()
    let matches = 0

    for (const challenge of challenges) {
      if (serverCapabilities.includes(challenge.replace('_', ' '))) {
        matches++
      }
    }

    return matches > 0 ? Math.min(matches / challenges.length + 0.5, 1) : 0
  }

  calculateGrowthMatch (server, growthAreas) {
    // Potentiel pour les zones de croissance
    const serverDesc = (server.description || '').toLowerCase()

    for (const area of growthAreas) {
      if (serverDesc.includes(area.replace('_', ' '))) {
        return 0.8 // Fort potentiel
      }
    }

    return 0.2 // Potentiel standard
  }

  calculatePopularityScore (server) {
    const stars = server.stars || 0
    const downloads = server.downloads || 0
    const mentions = server.mentions || 1

    // Normaliser les scores
    const starScore = Math.min(stars / 1000, 1)
    const downloadScore = Math.min(downloads / 50000, 1)
    const mentionScore = Math.min(mentions / 10, 1)

    return (starScore + downloadScore + mentionScore) / 3
  }

  getRelevanceFactors (server, projectAnalysis) {
    const factors = []

    // Identifier pourquoi ce serveur est pertinent
    if (server.description.toLowerCase().includes('payment')) {
      factors.push('Payment processing needed')
    }
    if (server.description.toLowerCase().includes('real-time') ||
        server.description.toLowerCase().includes('realtime')) {
      factors.push('Real-time features alignment')
    }
    if (server.tools && server.tools.some(t => t.includes('multi'))) {
      factors.push('Multi-tenant capability')
    }

    return factors
  }

  generateInstallCommand (server) {
    if (server.source === 'npm') {
      return `npm install -g ${server.name}`
    } else if (server.source === 'docker') {
      return `docker pull ${server.name}`
    } else if (server.source === 'github') {
      return `git clone ${server.url} && cd ${server.name} && npm install`
    }

    return `# Installation manuelle requise pour ${server.name}`
  }

  categorizeServer (serverName) {
    const categories = {
      database: ['postgres', 'mysql', 'mongo', 'redis'],
      payment: ['stripe', 'paypal', 'square'],
      communication: ['email', 'sms', 'twilio', 'chat'],
      ai: ['openai', 'anthropic', 'llm', 'ml'],
      devops: ['docker', 'kubernetes', 'ci', 'cd'],
      analytics: ['metrics', 'analytics', 'monitoring'],
      security: ['auth', 'security', 'encryption'],
      integration: ['api', 'webhook', 'integration']
    }

    const lowerName = serverName.toLowerCase()

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => lowerName.includes(kw))) {
        return category
      }
    }

    return 'other'
  }

  explainRecommendation (rec) {
    const reasons = []

    if (rec.utilityScore > 0.8) {
      reasons.push('Haute correspondance avec les besoins du projet')
    }
    if (rec.type === 'new') {
      reasons.push('Nouvelles capacités non disponibles actuellement')
    }
    if (rec.newTools && rec.newTools.length > 3) {
      reasons.push(`${rec.newTools.length} nouveaux outils utiles`)
    }

    return reasons.join('. ') || 'Amélioration des capacités existantes'
  }

  generateNextSteps (recommendations) {
    const steps = []

    if (recommendations.highPriority.length > 0) {
      steps.push(`Installer les ${recommendations.highPriority.length} outils haute priorité`)
    }

    steps.push('Configurer les nouveaux services MCP installés')
    steps.push('Mettre à jour la documentation avec les nouvelles capacités')
    steps.push('Former l\'équipe sur les nouveaux outils')

    if (recommendations.total > 30) {
      steps.push('Planifier l\'adoption progressive des outils priorité moyenne')
    }

    return steps
  }

  async loadInstalledServers () {
    try {
      const data = await fs.readFile(this.config.installedMCPFile, 'utf8')
      return JSON.parse(data)
    } catch {
      return {}
    }
  }

  async updateInstalledServers (serverName, serverInfo) {
    const installed = await this.loadInstalledServers()

    installed[serverName] = {
      ...serverInfo,
      installedAt: new Date().toISOString(),
      version: serverInfo.version || 'latest'
    }

    await fs.writeFile(
      this.config.installedMCPFile,
      JSON.stringify(installed, null, 2)
    )
  }

  async searchDockerHub (url) {
    // Implémentation recherche Docker Hub
    return []
  }

  async searchMCPServersOrg (url) {
    // Implémentation recherche mcpservers.org
    return []
  }

  async loadState () {
    try {
      const statePath = path.join(this.config.dataDir, 'agent-state.json')
      const data = await fs.readFile(statePath, 'utf8')
      this.state = JSON.parse(data)
    } catch {
      // État initial
    }
  }

  async saveState () {
    const statePath = path.join(this.config.dataDir, 'agent-state.json')
    await fs.mkdir(path.dirname(statePath), { recursive: true })
    await fs.writeFile(statePath, JSON.stringify(this.state, null, 2))
  }

  async logError (error) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    }

    const logPath = path.join(this.config.dataDir, 'errors.log')
    await fs.appendFile(logPath, JSON.stringify(errorLog) + '\n')
  }

  /**
   * Déclencher la synchronisation avec MCP Self-Check
   */
  async triggerSelfCheckSync () {
    try {
      // Utiliser le bridge d'intégration
      const { syncNow } = require('../utils/mcp-integration-bridge')

      const syncReport = await syncNow()

      if (syncReport && syncReport.summary) {
        console.log(`✅ Synchronisation réussie: ${syncReport.summary.added} MCP ajoutés au système Self-Check`)
      }
    } catch (error) {
      console.warn('⚠️  Impossible de synchroniser avec Self-Check:', error.message)
      // Ce n'est pas critique, on continue
    }
  }
}

// Créer et exporter l'agent
const discoveryAgent = new MCPDiscoveryAgent()

module.exports = {
  MCPDiscoveryAgent,
  discoveryAgent,

  // Fonction pour lancer l'agent
  startDiscoveryAgent: () => discoveryAgent.start(),

  // Fonction pour déclencher manuellement
  runDiscoveryNow: () => discoveryAgent.runDiscovery()
}
