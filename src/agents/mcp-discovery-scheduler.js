/**
 * MCP Discovery Scheduler - Planificateur pour l'agent de découverte
 *
 * Gère l'exécution hebdomadaire et fournit des commandes de contrôle
 */

const cron = require('node-cron')
const { discoveryAgent } = require('./mcp-discovery-agent')
const fs = require('fs').promises
const path = require('path')

class MCPDiscoveryScheduler {
  constructor () {
    this.config = {
      // Exécution tous les lundis à 3h00 du matin
      cronExpression: '0 3 * * 1',

      // Alternative: toutes les 168 heures (1 semaine)
      intervalHours: 168,

      // Fichiers de contrôle
      pidFile: path.join(__dirname, '../../data/mcp-discovery-agent.pid'),
      logFile: path.join(__dirname, '../../logs/mcp-discovery-scheduler.log'),

      // Options
      autoStart: process.env.MCP_DISCOVERY_AUTO_START === 'true',
      useInterval: process.env.MCP_DISCOVERY_USE_INTERVAL === 'true'
    }

    this.isRunning = false
    this.scheduledTask = null
    this.intervalId = null
  }

  /**
   * Démarrer le planificateur
   */
  async start () {
    if (this.isRunning) {
      console.log('⚠️  Le planificateur est déjà en cours d\'exécution')
      return
    }

    console.log('🚀 Démarrage du planificateur MCP Discovery...')

    try {
      // Créer les répertoires nécessaires
      await this.ensureDirectories()

      // Enregistrer le PID
      await this.writePID()

      // Logger le démarrage
      await this.log('Planificateur démarré')

      if (this.config.useInterval) {
        // Utiliser setInterval pour plus de flexibilité
        this.startIntervalSchedule()
      } else {
        // Utiliser node-cron pour une planification précise
        this.startCronSchedule()
      }

      this.isRunning = true

      // Exécution immédiate si configuré
      if (this.config.autoStart) {
        console.log('📋 Exécution immédiate de la découverte...')
        this.runDiscovery()
      }

      console.log('✅ Planificateur démarré avec succès')

      // Gérer l'arrêt propre
      this.setupGracefulShutdown()
    } catch (error) {
      console.error('❌ Erreur démarrage planificateur:', error)
      await this.log(`Erreur démarrage: ${error.message}`)
    }
  }

  /**
   * Arrêter le planificateur
   */
  async stop () {
    console.log('🛑 Arrêt du planificateur...')

    if (this.scheduledTask) {
      this.scheduledTask.stop()
      this.scheduledTask = null
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false

    // Supprimer le fichier PID
    await this.removePID()

    await this.log('Planificateur arrêté')
    console.log('✅ Planificateur arrêté')
  }

  /**
   * Planification avec cron
   */
  startCronSchedule () {
    console.log(`⏰ Planification cron: ${this.config.cronExpression}`)

    this.scheduledTask = cron.schedule(this.config.cronExpression, async () => {
      await this.runDiscovery()
    }, {
      scheduled: true,
      timezone: 'Europe/Paris' // Ajuster selon votre timezone
    })

    // Calculer la prochaine exécution
    const nextRun = this.getNextCronRun()
    console.log(`📅 Prochaine exécution: ${nextRun}`)
  }

  /**
   * Planification avec interval
   */
  startIntervalSchedule () {
    const intervalMs = this.config.intervalHours * 60 * 60 * 1000
    console.log(`⏰ Planification par intervalle: toutes les ${this.config.intervalHours} heures`)

    this.intervalId = setInterval(async () => {
      await this.runDiscovery()
    }, intervalMs)

    const nextRun = new Date(Date.now() + intervalMs)
    console.log(`📅 Prochaine exécution: ${nextRun.toLocaleString()}`)
  }

  /**
   * Exécuter la découverte
   */
  async runDiscovery () {
    const startTime = Date.now()
    const runId = `run-${Date.now()}`

    await this.log(`Début découverte ${runId}`)

    try {
      console.log('\n' + '='.repeat(60))
      console.log(`🔍 Exécution de la découverte MCP - ${new Date().toLocaleString()}`)
      console.log('='.repeat(60) + '\n')

      // Exécuter l'agent de découverte
      const report = await discoveryAgent.runDiscovery()

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)

      await this.log(`Découverte ${runId} terminée en ${duration}s`)

      // Notifier si de nouvelles découvertes importantes
      if (report && report.summary.highPriority > 0) {
        await this.notifyImportantDiscoveries(report)
      }
    } catch (error) {
      console.error('❌ Erreur pendant la découverte:', error)
      await this.log(`Erreur découverte ${runId}: ${error.message}`)
    }
  }

  /**
   * Notifier les découvertes importantes
   */
  async notifyImportantDiscoveries (report) {
    console.log('\n🔔 DÉCOUVERTES IMPORTANTES:')
    console.log(`${report.summary.highPriority} nouveaux outils haute priorité découverts!`)

    // Créer un fichier de notification
    const notifPath = path.join(
      __dirname,
      '../../data/notifications',
      `discovery-${new Date().toISOString().split('T')[0]}.json`
    )

    await fs.mkdir(path.dirname(notifPath), { recursive: true })
    await fs.writeFile(notifPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      highPriority: report.summary.highPriority,
      topRecommendations: report.topRecommendations.slice(0, 3)
    }, null, 2))

    // Ici on pourrait envoyer un email, Slack, etc.
  }

  /**
   * Obtenir le statut
   */
  async getStatus () {
    const status = {
      isRunning: this.isRunning,
      schedulerType: this.config.useInterval ? 'interval' : 'cron',
      nextRun: null,
      lastRun: null,
      config: {
        cronExpression: this.config.cronExpression,
        intervalHours: this.config.intervalHours,
        autoStart: this.config.autoStart
      }
    }

    // Obtenir la dernière exécution depuis les logs
    try {
      const logs = await fs.readFile(this.config.logFile, 'utf8')
      const lines = logs.trim().split('\n')
      const lastDiscovery = lines.reverse().find(line => line.includes('Découverte') && line.includes('terminée'))
      if (lastDiscovery) {
        const match = lastDiscovery.match(/\[(.*?)\]/)
        if (match) {
          status.lastRun = match[1]
        }
      }
    } catch {
      // Pas de logs
    }

    // Calculer la prochaine exécution
    if (this.isRunning) {
      if (this.config.useInterval) {
        // Pour interval, calculer basé sur lastRun
        if (status.lastRun) {
          const lastRunTime = new Date(status.lastRun).getTime()
          const intervalMs = this.config.intervalHours * 60 * 60 * 1000
          status.nextRun = new Date(lastRunTime + intervalMs).toLocaleString()
        }
      } else {
        status.nextRun = this.getNextCronRun()
      }
    }

    return status
  }

  /**
   * Calculer la prochaine exécution cron
   */
  getNextCronRun () {
    // Simplification - en production utiliser une lib comme cron-parser
    const now = new Date()
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7)
    nextMonday.setHours(3, 0, 0, 0)

    if (nextMonday <= now) {
      nextMonday.setDate(nextMonday.getDate() + 7)
    }

    return nextMonday.toLocaleString()
  }

  /**
   * Méthodes utilitaires
   */

  async ensureDirectories () {
    await fs.mkdir(path.dirname(this.config.pidFile), { recursive: true })
    await fs.mkdir(path.dirname(this.config.logFile), { recursive: true })
  }

  async writePID () {
    await fs.writeFile(this.config.pidFile, process.pid.toString())
  }

  async removePID () {
    try {
      await fs.unlink(this.config.pidFile)
    } catch {
      // Fichier déjà supprimé
    }
  }

  async log (message) {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`

    await fs.appendFile(this.config.logFile, logEntry)
  }

  setupGracefulShutdown () {
    const shutdown = async () => {
      console.log('\n📋 Arrêt propre en cours...')
      await this.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }
}

// Créer l'instance
const scheduler = new MCPDiscoveryScheduler()

// Commandes CLI
if (require.main === module) {
  const command = process.argv[2]

  switch (command) {
    case 'start':
      scheduler.start()
      break

    case 'stop':
      scheduler.stop().then(() => process.exit(0))
      break

    case 'status':
      scheduler.getStatus().then(status => {
        console.log('📊 Statut du planificateur:')
        console.log(JSON.stringify(status, null, 2))
        process.exit(0)
      })
      break

    case 'run':
      console.log('🚀 Exécution manuelle de la découverte...')
      scheduler.runDiscovery().then(() => process.exit(0))
      break

    default:
      console.log(`
Usage: node mcp-discovery-scheduler.js [command]

Commands:
  start   - Démarrer le planificateur
  stop    - Arrêter le planificateur
  status  - Afficher le statut
  run     - Exécuter manuellement la découverte
      `)
      process.exit(1)
  }
}

module.exports = {
  MCPDiscoveryScheduler,
  scheduler
}
