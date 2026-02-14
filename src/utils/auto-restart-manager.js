/**
 * Auto Restart Manager pour Attitudes.vip
 *
 * Gère le redémarrage automatique de l'application en cas de problème
 * ou selon un planning défini
 */

const { exec } = require('child_process').promises
const fs = require('fs').promises
const path = require('path')
const axios = require('axios')

class AutoRestartManager {
  constructor () {
    this.config = {
      // Configuration de surveillance
      monitoring: {
        enabled: process.env.AUTO_RESTART_ENABLED === 'true',
        interval: 5 * 60 * 1000, // Vérifier toutes les 5 minutes
        maxFailures: 3, // Nombre d'échecs avant redémarrage
        cooldownPeriod: 30 * 60 * 1000 // 30 minutes entre redémarrages
      },

      // Services à surveiller
      services: [
        {
          name: 'ui',
          url: 'http://localhost:8080/health',
          critical: true,
          timeout: 5000
        },
        {
          name: 'auth-service',
          url: 'http://localhost:3000/health',
          critical: true,
          timeout: 5000
        },
        {
          name: 'database',
          command: 'docker-compose exec -T database pg_isready',
          critical: true
        },
        {
          name: 'redis',
          command: 'docker-compose exec -T redis redis-cli ping',
          critical: true
        }
      ],

      // Planning de redémarrage
      schedule: {
        enabled: process.env.SCHEDULED_RESTART_ENABLED === 'true',
        cronExpression: '0 4 * * 0', // Dimanche à 4h00
        gracePeriod: 5 * 60 * 1000 // 5 minutes d'avertissement
      },

      // Configuration des logs
      logs: {
        dir: path.join(__dirname, '../../logs/auto-restart'),
        maxSize: 10 * 1024 * 1024, // 10MB
        retention: 30 // jours
      },

      // Actions de redémarrage
      restartScript: path.join(__dirname, '../../scripts/restart-app.sh'),
      restartMode: 'safe' // safe, quick, emergency
    }

    this.state = {
      isMonitoring: false,
      failures: {},
      lastRestart: null,
      scheduledRestartTimer: null,
      monitoringInterval: null
    }

    // Initialiser les compteurs d'échecs
    this.config.services.forEach(service => {
      this.state.failures[service.name] = 0
    })
  }

  /**
   * Démarrer le gestionnaire de redémarrage automatique
   */
  async start () {
    console.log('🤖 Démarrage du gestionnaire de redémarrage automatique')

    // Créer les répertoires nécessaires
    await this.ensureDirectories()

    // Charger l'état précédent
    await this.loadState()

    // Démarrer la surveillance
    if (this.config.monitoring.enabled) {
      this.startMonitoring()
    }

    // Planifier les redémarrages
    if (this.config.schedule.enabled) {
      this.scheduleRestarts()
    }

    // Gérer l'arrêt propre
    this.setupGracefulShutdown()

    await this.log('info', 'Gestionnaire de redémarrage démarré')
  }

  /**
   * Arrêter le gestionnaire
   */
  async stop () {
    console.log('🛑 Arrêt du gestionnaire de redémarrage')

    this.state.isMonitoring = false

    if (this.state.monitoringInterval) {
      clearInterval(this.state.monitoringInterval)
    }

    if (this.state.scheduledRestartTimer) {
      clearTimeout(this.state.scheduledRestartTimer)
    }

    await this.saveState()
    await this.log('info', 'Gestionnaire de redémarrage arrêté')
  }

  /**
   * Démarrer la surveillance des services
   */
  startMonitoring () {
    console.log('👁️  Surveillance des services activée')
    this.state.isMonitoring = true

    // Vérification immédiate
    this.checkServices()

    // Vérifications périodiques
    this.state.monitoringInterval = setInterval(() => {
      this.checkServices()
    }, this.config.monitoring.interval)
  }

  /**
   * Vérifier l'état des services
   */
  async checkServices () {
    if (!this.state.isMonitoring) return

    const results = {
      healthy: [],
      unhealthy: [],
      timestamp: new Date().toISOString()
    }

    // Vérifier chaque service
    for (const service of this.config.services) {
      try {
        const isHealthy = await this.checkServiceHealth(service)

        if (isHealthy) {
          results.healthy.push(service.name)
          // Réinitialiser le compteur d'échecs
          this.state.failures[service.name] = 0
        } else {
          results.unhealthy.push(service.name)
          this.state.failures[service.name]++

          await this.log('warning', `Service ${service.name} non disponible (échec ${this.state.failures[service.name]}/${this.config.monitoring.maxFailures})`)
        }
      } catch (error) {
        results.unhealthy.push(service.name)
        this.state.failures[service.name]++

        await this.log('error', `Erreur vérification ${service.name}: ${error.message}`)
      }
    }

    // Analyser les résultats
    await this.analyzeHealthResults(results)
  }

  /**
   * Vérifier la santé d'un service spécifique
   */
  async checkServiceHealth (service) {
    if (service.url) {
      // Vérification HTTP
      try {
        const response = await axios.get(service.url, {
          timeout: service.timeout || 5000,
          validateStatus: status => status === 200
        })
        return true
      } catch {
        return false
      }
    } else if (service.command) {
      // Vérification par commande
      try {
        await exec(service.command)
        return true
      } catch {
        return false
      }
    }

    return false
  }

  /**
   * Analyser les résultats de santé et décider si redémarrage nécessaire
   */
  async analyzeHealthResults (results) {
    const criticalFailures = this.config.services
      .filter(s => s.critical && this.state.failures[s.name] >= this.config.monitoring.maxFailures)
      .map(s => s.name)

    if (criticalFailures.length > 0) {
      await this.log('critical', `Services critiques en échec: ${criticalFailures.join(', ')}`)

      // Vérifier le cooldown
      if (this.canRestart()) {
        await this.triggerAutoRestart('critical_failure', criticalFailures)
      } else {
        const nextRestartTime = new Date(this.state.lastRestart.getTime() + this.config.monitoring.cooldownPeriod)
        await this.log('warning', `Redémarrage en cooldown jusqu'à ${nextRestartTime.toLocaleString()}`)
      }
    }

    // Logger le statut général
    if (results.unhealthy.length === 0) {
      // Tous les services sont sains, logger seulement occasionnellement
      if (Math.random() < 0.1) { // 10% du temps
        await this.log('info', `Tous les services sont sains (${results.healthy.length} services)`)
      }
    }
  }

  /**
   * Vérifier si on peut redémarrer (cooldown)
   */
  canRestart () {
    if (!this.state.lastRestart) return true

    const timeSinceLastRestart = Date.now() - this.state.lastRestart.getTime()
    return timeSinceLastRestart >= this.config.monitoring.cooldownPeriod
  }

  /**
   * Déclencher un redémarrage automatique
   */
  async triggerAutoRestart (reason, details) {
    await this.log('critical', `🚨 Déclenchement du redémarrage automatique - Raison: ${reason}`)

    try {
      // Notifier les administrateurs
      await this.notifyAdmins(reason, details)

      // Exécuter le script de redémarrage
      const mode = this.determineRestartMode(reason)
      const { stdout, stderr } = await exec(`${this.config.restartScript} ${mode}`)

      // Logger le résultat
      await this.log('info', `Redémarrage terminé avec le mode: ${mode}`)
      if (stdout) await this.log('info', `Output: ${stdout}`)
      if (stderr) await this.log('error', `Erreurs: ${stderr}`)

      // Mettre à jour l'état
      this.state.lastRestart = new Date()

      // Réinitialiser les compteurs d'échecs
      Object.keys(this.state.failures).forEach(service => {
        this.state.failures[service] = 0
      })

      await this.saveState()
    } catch (error) {
      await this.log('error', `Échec du redémarrage automatique: ${error.message}`)

      // En cas d'échec critique, essayer un redémarrage d'urgence
      if (reason === 'critical_failure') {
        await this.emergencyRestart()
      }
    }
  }

  /**
   * Déterminer le mode de redémarrage approprié
   */
  determineRestartMode (reason) {
    switch (reason) {
      case 'critical_failure':
        return 'quick' // Redémarrage rapide pour les échecs critiques
      case 'scheduled':
        return 'safe' // Redémarrage sécurisé pour les maintenances planifiées
      case 'emergency':
        return 'emergency' // Redémarrage d'urgence
      default:
        return this.config.restartMode
    }
  }

  /**
   * Redémarrage d'urgence en dernier recours
   */
  async emergencyRestart () {
    await this.log('critical', '🚨🚨🚨 REDÉMARRAGE D\'URGENCE')

    try {
      await exec(`${this.config.restartScript} emergency`)
      await this.log('info', 'Redémarrage d\'urgence effectué')
    } catch (error) {
      await this.log('error', `ÉCHEC CRITIQUE: ${error.message}`)
      // À ce stade, une intervention manuelle est nécessaire
      await this.notifyAdmins('EMERGENCY_RESTART_FAILED', error)
    }
  }

  /**
   * Planifier les redémarrages réguliers
   */
  scheduleRestarts () {
    console.log('📅 Planification des redémarrages activée')

    // Utiliser node-cron pour la planification
    const cron = require('node-cron')

    cron.schedule(this.config.schedule.cronExpression, async () => {
      await this.log('info', 'Redémarrage planifié déclenché')

      // Avertir à l'avance
      await this.notifyAdmins('scheduled_restart', {
        scheduledTime: new Date(Date.now() + this.config.schedule.gracePeriod)
      })

      // Attendre la période de grâce
      setTimeout(async () => {
        await this.triggerAutoRestart('scheduled', {})
      }, this.config.schedule.gracePeriod)
    })
  }

  /**
   * Notifier les administrateurs
   */
  async notifyAdmins (event, details) {
    const notification = {
      timestamp: new Date().toISOString(),
      event,
      details,
      hostname: require('os').hostname()
    }

    await this.log('info', `Notification admin: ${event}`)

    // Ici, implémenter les notifications réelles :
    // - Email via Nodemailer
    // - SMS via Twilio
    // - Slack/Discord webhook
    // - Push notification

    // Pour l'instant, on écrit dans un fichier
    const notifPath = path.join(this.config.logs.dir, 'notifications.json')
    try {
      const existing = await fs.readFile(notifPath, 'utf8').catch(() => '[]')
      const notifications = JSON.parse(existing)
      notifications.push(notification)

      // Garder seulement les 100 dernières notifications
      if (notifications.length > 100) {
        notifications.splice(0, notifications.length - 100)
      }

      await fs.writeFile(notifPath, JSON.stringify(notifications, null, 2))
    } catch (error) {
      console.error('Erreur sauvegarde notification:', error)
    }
  }

  /**
   * Méthodes utilitaires
   */

  async ensureDirectories () {
    await fs.mkdir(this.config.logs.dir, { recursive: true })
  }

  async log (level, message) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message
    }

    // Console
    const colors = {
      info: '\x1b[36m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      critical: '\x1b[35m'
    }
    console.log(`${colors[level] || ''}[${timestamp}] [${level.toUpperCase()}] ${message}\x1b[0m`)

    // Fichier
    const logFile = path.join(this.config.logs.dir, `auto-restart-${new Date().toISOString().split('T')[0]}.log`)
    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n')

    // Rotation des logs
    await this.rotateLogs()
  }

  async rotateLogs () {
    try {
      const files = await fs.readdir(this.config.logs.dir)
      const logFiles = files.filter(f => f.startsWith('auto-restart-') && f.endsWith('.log'))

      // Supprimer les vieux logs
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - this.config.logs.retention)

      for (const file of logFiles) {
        const filePath = path.join(this.config.logs.dir, file)
        const stats = await fs.stat(filePath)

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath)
        }
      }
    } catch (error) {
      console.error('Erreur rotation logs:', error)
    }
  }

  async loadState () {
    try {
      const statePath = path.join(this.config.logs.dir, 'state.json')
      const data = await fs.readFile(statePath, 'utf8')
      const savedState = JSON.parse(data)

      // Restaurer l'état
      if (savedState.lastRestart) {
        this.state.lastRestart = new Date(savedState.lastRestart)
      }

      await this.log('info', 'État précédent chargé')
    } catch {
      // Pas d'état sauvegardé
    }
  }

  async saveState () {
    try {
      const statePath = path.join(this.config.logs.dir, 'state.json')
      const stateToSave = {
        lastRestart: this.state.lastRestart,
        savedAt: new Date().toISOString()
      }

      await fs.writeFile(statePath, JSON.stringify(stateToSave, null, 2))
    } catch (error) {
      console.error('Erreur sauvegarde état:', error)
    }
  }

  setupGracefulShutdown () {
    const shutdown = async () => {
      console.log('\n📋 Arrêt propre du gestionnaire...')
      await this.stop()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  /**
   * API publique
   */

  async getStatus () {
    return {
      monitoring: {
        enabled: this.config.monitoring.enabled,
        isActive: this.state.isMonitoring,
        services: Object.entries(this.state.failures).map(([name, failures]) => ({
          name,
          failures,
          status: failures >= this.config.monitoring.maxFailures ? 'critical' : 'ok'
        }))
      },
      lastRestart: this.state.lastRestart,
      scheduledRestart: {
        enabled: this.config.schedule.enabled,
        cronExpression: this.config.schedule.cronExpression
      }
    }
  }

  async forceRestart (mode = 'safe') {
    await this.log('info', `Redémarrage manuel demandé (mode: ${mode})`)
    await this.triggerAutoRestart('manual', { mode })
  }
}

// Créer l'instance
const restartManager = new AutoRestartManager()

// Si exécuté directement
if (require.main === module) {
  const command = process.argv[2]

  switch (command) {
    case 'start':
      restartManager.start()
      break

    case 'stop':
      restartManager.stop()
      break

    case 'status':
      restartManager.getStatus().then(status => {
        console.log('📊 Statut du gestionnaire de redémarrage:')
        console.log(JSON.stringify(status, null, 2))
        process.exit(0)
      })
      break

    case 'restart':
      const mode = process.argv[3] || 'safe'
      restartManager.forceRestart(mode).then(() => {
        process.exit(0)
      })
      break

    default:
      console.log(`
Usage: node auto-restart-manager.js [command]

Commands:
  start    - Démarrer le gestionnaire
  stop     - Arrêter le gestionnaire
  status   - Afficher le statut
  restart  - Forcer un redémarrage (optionnel: mode)
      `)
      process.exit(1)
  }
}

module.exports = {
  AutoRestartManager,
  restartManager
}
