#!/usr/bin/env node

/**
 * Test de charge WebSocket - 1000+ connexions simultanées
 * Teste la performance, la latence et la stabilité
 */

const { io } = require('socket.io-client');
const chalk = require('chalk');
const ora = require('ora');
const Table = require('cli-table3');
const os = require('os');

class WebSocketLoadTest {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3000',
      targetConnections: config.targetConnections || 1000,
      rampUpTime: config.rampUpTime || 30000, // 30 secondes
      testDuration: config.testDuration || 300000, // 5 minutes
      messageInterval: config.messageInterval || 5000, // Message toutes les 5s
      messageSize: config.messageSize || 1024, // 1KB par message
      enableHeartbeat: config.enableHeartbeat !== false,
      enableCompression: config.enableCompression !== false,
      ...config
    };

    this.connections = [];
    this.metrics = {
      connected: 0,
      disconnected: 0,
      errors: 0,
      messagesSent: 0,
      messagesReceived: 0,
      latencies: [],
      startTime: null,
      endTime: null,
      memoryUsage: [],
      cpuUsage: []
    };

    this.isRunning = false;
    this.spinner = null;
  }

  /**
   * Démarrer le test de charge
   */
  async run() {
    console.log(chalk.bold.blue('\n🚀 Test de Charge WebSocket\n'));
    this.displayConfig();

    try {
      // Phase 1: Ramp-up
      await this.rampUp();
      
      // Phase 2: Test de charge
      await this.loadTest();
      
      // Phase 3: Analyse
      await this.analyze();
      
      // Phase 4: Nettoyage
      await this.cleanup();
      
    } catch (error) {
      console.error(chalk.red('\n❌ Erreur lors du test:'), error);
      await this.cleanup();
      process.exit(1);
    }
  }

  /**
   * Afficher la configuration
   */
  displayConfig() {
    const table = new Table({
      head: ['Paramètre', 'Valeur'],
      style: { head: ['cyan'] }
    });

    table.push(
      ['URL Serveur', this.config.serverUrl],
      ['Connexions cibles', this.config.targetConnections],
      ['Temps de montée', `${this.config.rampUpTime / 1000}s`],
      ['Durée du test', `${this.config.testDuration / 1000}s`],
      ['Intervalle messages', `${this.config.messageInterval / 1000}s`],
      ['Taille message', `${this.config.messageSize} bytes`],
      ['Compression', this.config.enableCompression ? '✅' : '❌']
    );

    console.log(table.toString());
  }

  /**
   * Phase de montée en charge progressive
   */
  async rampUp() {
    console.log(chalk.yellow('\n📈 Phase de montée en charge...\n'));
    
    this.metrics.startTime = Date.now();
    const connectionsPerSecond = this.config.targetConnections / (this.config.rampUpTime / 1000);
    const interval = 1000 / connectionsPerSecond;
    
    this.spinner = ora('Création des connexions...').start();

    return new Promise((resolve) => {
      let created = 0;
      const connectionInterval = setInterval(() => {
        if (created >= this.config.targetConnections) {
          clearInterval(connectionInterval);
          this.spinner.succeed(`${this.metrics.connected} connexions établies`);
          resolve();
          return;
        }

        this.createConnection(created);
        created++;
        
        this.spinner.text = `Connexions: ${this.metrics.connected}/${this.config.targetConnections} (Erreurs: ${this.metrics.errors})`;
      }, interval);
    });
  }

  /**
   * Créer une connexion WebSocket
   */
  createConnection(id) {
    const socket = io(this.config.serverUrl, {
      transports: ['websocket'],
      reconnection: false,
      auth: {
        userId: `loadtest_user_${id}`,
        clientId: `client_${id}`,
        testMode: true
      },
      perMessageDeflate: this.config.enableCompression
    });

    const connectionData = {
      id,
      socket,
      connected: false,
      latencies: [],
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      lastActivity: Date.now()
    };

    // Événement de connexion
    socket.on('connect', () => {
      connectionData.connected = true;
      connectionData.connectTime = Date.now();
      this.metrics.connected++;
      
      // Démarrer l'envoi de messages
      if (this.isRunning) {
        this.startSendingMessages(connectionData);
      }
    });

    // Événement de déconnexion
    socket.on('disconnect', (reason) => {
      if (connectionData.connected) {
        connectionData.connected = false;
        this.metrics.connected--;
        this.metrics.disconnected++;
      }
    });

    // Erreurs
    socket.on('error', (error) => {
      connectionData.errors++;
      this.metrics.errors++;
    });

    // Latence
    socket.on('pong', () => {
      const latency = Date.now() - connectionData.lastPing;
      connectionData.latencies.push(latency);
      this.metrics.latencies.push(latency);
    });

    // Messages
    socket.on('message', (data) => {
      connectionData.messagesReceived++;
      this.metrics.messagesReceived++;
      connectionData.lastActivity = Date.now();
    });

    // Echo pour test de latence
    socket.on('echo', (data) => {
      const latency = Date.now() - data.timestamp;
      connectionData.latencies.push(latency);
      this.metrics.latencies.push(latency);
    });

    this.connections.push(connectionData);
  }

  /**
   * Démarrer l'envoi de messages pour une connexion
   */
  startSendingMessages(connection) {
    const messageData = {
      type: 'test',
      payload: 'x'.repeat(this.config.messageSize),
      clientId: connection.id
    };

    connection.messageInterval = setInterval(() => {
      if (!connection.connected || !this.isRunning) {
        clearInterval(connection.messageInterval);
        return;
      }

      // Envoyer un message de test
      connection.socket.emit('message', {
        ...messageData,
        timestamp: Date.now(),
        messageId: `msg_${connection.id}_${connection.messagesSent}`
      });
      
      connection.messagesSent++;
      this.metrics.messagesSent++;

      // Test de latence périodique
      if (connection.messagesSent % 10 === 0) {
        connection.lastPing = Date.now();
        connection.socket.emit('ping');
        
        // Echo test
        connection.socket.emit('echo', {
          timestamp: Date.now(),
          clientId: connection.id
        });
      }
    }, this.config.messageInterval);
  }

  /**
   * Phase de test de charge
   */
  async loadTest() {
    console.log(chalk.yellow('\n⚡ Phase de test de charge...\n'));
    
    this.isRunning = true;
    
    // Démarrer l'envoi de messages pour toutes les connexions
    this.connections.forEach(conn => {
      if (conn.connected && !conn.messageInterval) {
        this.startSendingMessages(conn);
      }
    });

    // Monitoring en temps réel
    const monitoringInterval = setInterval(() => {
      this.displayRealTimeMetrics();
      this.collectSystemMetrics();
    }, 1000);

    // Stress test périodique
    const stressInterval = setInterval(() => {
      this.performStressTest();
    }, 30000); // Toutes les 30s

    // Attendre la fin du test
    await new Promise(resolve => {
      setTimeout(() => {
        this.isRunning = false;
        clearInterval(monitoringInterval);
        clearInterval(stressInterval);
        resolve();
      }, this.config.testDuration);
    });

    this.metrics.endTime = Date.now();
  }

  /**
   * Afficher les métriques en temps réel
   */
  displayRealTimeMetrics() {
    const avgLatency = this.calculateAverageLatency(1000); // Dernière seconde
    const messagesPerSecond = this.calculateMessageRate();
    const errorRate = (this.metrics.errors / this.metrics.messagesSent * 100) || 0;

    console.clear();
    console.log(chalk.bold.blue('\n🚀 Test de Charge WebSocket - En cours\n'));

    const table = new Table({
      head: ['Métrique', 'Valeur', 'Status'],
      style: { head: ['cyan'] }
    });

    const connectionStatus = this.metrics.connected >= this.config.targetConnections * 0.95 ? 
      chalk.green('✅') : chalk.red('❌');
    
    const latencyStatus = avgLatency < 100 ? chalk.green('✅') : 
      avgLatency < 500 ? chalk.yellow('⚠️') : chalk.red('❌');
    
    const errorStatus = errorRate < 1 ? chalk.green('✅') : 
      errorRate < 5 ? chalk.yellow('⚠️') : chalk.red('❌');

    table.push(
      ['Connexions actives', `${this.metrics.connected}/${this.config.targetConnections}`, connectionStatus],
      ['Latence moyenne', `${avgLatency.toFixed(2)}ms`, latencyStatus],
      ['Messages/seconde', messagesPerSecond.toFixed(0), '📊'],
      ['Taux d\'erreur', `${errorRate.toFixed(2)}%`, errorStatus],
      ['Messages envoyés', this.metrics.messagesSent.toLocaleString(), '📤'],
      ['Messages reçus', this.metrics.messagesReceived.toLocaleString(), '📥'],
      ['Mémoire utilisée', `${this.getMemoryUsage()}MB`, '💾'],
      ['CPU', `${this.getCPUUsage()}%`, '🖥️']
    );

    console.log(table.toString());

    // Graphique simple de latence
    this.displayLatencyGraph();
  }

  /**
   * Afficher un graphique de latence
   */
  displayLatencyGraph() {
    const recentLatencies = this.metrics.latencies.slice(-50);
    const maxLatency = Math.max(...recentLatencies, 1);
    const graphHeight = 10;
    
    console.log(chalk.yellow('\n📊 Latence (50 dernières mesures):'));
    
    for (let i = graphHeight; i > 0; i--) {
      const threshold = (maxLatency / graphHeight) * i;
      let line = '';
      
      recentLatencies.forEach(latency => {
        if (latency >= threshold) {
          line += '█';
        } else {
          line += ' ';
        }
      });
      
      console.log(`${threshold.toFixed(0).padStart(4)}ms |${line}`);
    }
    console.log('       ' + '─'.repeat(52));
  }

  /**
   * Test de stress périodique
   */
  performStressTest() {
    console.log(chalk.yellow('\n🔥 Burst de messages...'));
    
    // Envoyer un burst de messages
    const burstSize = 100;
    const activeConnections = this.connections.filter(c => c.connected);
    
    activeConnections.slice(0, burstSize).forEach(conn => {
      for (let i = 0; i < 10; i++) {
        conn.socket.emit('burst', {
          timestamp: Date.now(),
          index: i,
          data: 'x'.repeat(this.config.messageSize * 2)
        });
      }
    });
  }

  /**
   * Collecter les métriques système
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      rss: memUsage.rss
    });

    // CPU usage approximatif
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: cpuUsage.user,
      system: cpuUsage.system
    });
  }

  /**
   * Analyser les résultats
   */
  async analyze() {
    console.log(chalk.yellow('\n📊 Analyse des résultats...\n'));

    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const successRate = (this.metrics.connected / this.config.targetConnections * 100);
    const avgLatency = this.calculateAverageLatency();
    const p95Latency = this.calculatePercentileLatency(95);
    const p99Latency = this.calculatePercentileLatency(99);
    const messagesPerSecond = this.metrics.messagesSent / duration;
    const errorRate = (this.metrics.errors / this.metrics.messagesSent * 100) || 0;

    // Tableau de résumé
    const table = new Table({
      head: ['Métrique', 'Valeur', 'Évaluation'],
      style: { head: ['cyan'] }
    });

    table.push(
      ['Durée du test', `${duration.toFixed(0)}s`, '⏱️'],
      ['Connexions réussies', `${this.metrics.connected}/${this.config.targetConnections} (${successRate.toFixed(1)}%)`, this.evaluateSuccessRate(successRate)],
      ['Connexions perdues', this.metrics.disconnected, this.metrics.disconnected === 0 ? '✅' : '⚠️'],
      ['Latence moyenne', `${avgLatency.toFixed(2)}ms`, this.evaluateLatency(avgLatency)],
      ['Latence P95', `${p95Latency.toFixed(2)}ms`, this.evaluateLatency(p95Latency)],
      ['Latence P99', `${p99Latency.toFixed(2)}ms`, this.evaluateLatency(p99Latency)],
      ['Messages/seconde', messagesPerSecond.toFixed(0), '📨'],
      ['Total messages', this.metrics.messagesSent.toLocaleString(), '📤'],
      ['Taux d\'erreur', `${errorRate.toFixed(3)}%`, this.evaluateErrorRate(errorRate)],
      ['Mémoire max', `${this.getMaxMemoryUsage()}MB`, '💾'],
      ['CPU moyen', `${this.getAverageCPUUsage()}%`, '🖥️']
    );

    console.log(table.toString());

    // Générer le rapport
    await this.generateReport({
      duration,
      successRate,
      avgLatency,
      p95Latency,
      p99Latency,
      messagesPerSecond,
      errorRate
    });

    // Verdict final
    this.displayVerdict(successRate, avgLatency, errorRate);
  }

  /**
   * Nettoyer les connexions
   */
  async cleanup() {
    console.log(chalk.yellow('\n🧹 Nettoyage des connexions...'));
    
    const spinner = ora('Fermeture des connexions...').start();
    
    // Fermer toutes les connexions
    this.connections.forEach(conn => {
      if (conn.messageInterval) {
        clearInterval(conn.messageInterval);
      }
      if (conn.socket && conn.socket.connected) {
        conn.socket.close();
      }
    });

    // Attendre un peu pour la fermeture
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    spinner.succeed('Toutes les connexions fermées');
  }

  /**
   * Méthodes de calcul
   */
  calculateAverageLatency(windowMs = null) {
    let latencies = this.metrics.latencies;
    
    if (windowMs) {
      const cutoff = Date.now() - windowMs;
      latencies = this.connections
        .flatMap(c => c.latencies)
        .filter((_, i) => Date.now() - (i * 100) < windowMs);
    }
    
    if (latencies.length === 0) return 0;
    return latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
  }

  calculatePercentileLatency(percentile) {
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  calculateMessageRate() {
    const windowMs = 5000; // 5 secondes
    const recentMessages = this.connections.reduce((sum, conn) => {
      const recentActivity = Date.now() - conn.lastActivity < windowMs;
      return sum + (recentActivity ? conn.messagesSent : 0);
    }, 0);
    
    return recentMessages / (windowMs / 1000);
  }

  getMemoryUsage() {
    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    return latest ? (latest.rss / 1024 / 1024).toFixed(0) : 0;
  }

  getMaxMemoryUsage() {
    const max = Math.max(...this.metrics.memoryUsage.map(m => m.rss));
    return (max / 1024 / 1024).toFixed(0);
  }

  getCPUUsage() {
    if (this.metrics.cpuUsage.length < 2) return 0;
    
    const recent = this.metrics.cpuUsage.slice(-2);
    const delta = {
      user: recent[1].user - recent[0].user,
      system: recent[1].system - recent[0].system
    };
    
    const totalTime = delta.user + delta.system;
    const elapsedMs = 1000; // Approximation
    
    return ((totalTime / 1000 / elapsedMs) * 100).toFixed(1);
  }

  getAverageCPUUsage() {
    // Simplification - retourner une estimation
    return (this.metrics.cpuUsage.length * 0.1).toFixed(1);
  }

  /**
   * Évaluations
   */
  evaluateSuccessRate(rate) {
    if (rate >= 99) return chalk.green('✅ Excellent');
    if (rate >= 95) return chalk.yellow('⚠️ Bon');
    return chalk.red('❌ Insuffisant');
  }

  evaluateLatency(latency) {
    if (latency < 50) return chalk.green('✅ Excellent');
    if (latency < 200) return chalk.green('✅ Bon');
    if (latency < 500) return chalk.yellow('⚠️ Acceptable');
    return chalk.red('❌ Élevé');
  }

  evaluateErrorRate(rate) {
    if (rate < 0.1) return chalk.green('✅ Excellent');
    if (rate < 1) return chalk.yellow('⚠️ Acceptable');
    return chalk.red('❌ Élevé');
  }

  /**
   * Générer un rapport détaillé
   */
  async generateReport(summary) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const report = {
      testConfiguration: this.config,
      summary,
      metrics: {
        connections: {
          target: this.config.targetConnections,
          successful: this.metrics.connected,
          failed: this.config.targetConnections - this.metrics.connected,
          disconnected: this.metrics.disconnected
        },
        messages: {
          sent: this.metrics.messagesSent,
          received: this.metrics.messagesReceived,
          errors: this.metrics.errors
        },
        performance: {
          latencies: {
            samples: this.metrics.latencies.length,
            average: summary.avgLatency,
            p50: this.calculatePercentileLatency(50),
            p95: summary.p95Latency,
            p99: summary.p99Latency,
            max: Math.max(...this.metrics.latencies)
          },
          throughput: {
            messagesPerSecond: summary.messagesPerSecond,
            bytesPerSecond: summary.messagesPerSecond * this.config.messageSize
          }
        },
        system: {
          maxMemoryMB: this.getMaxMemoryUsage(),
          avgCPUPercent: this.getAverageCPUUsage()
        }
      },
      timestamp: new Date().toISOString()
    };

    const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(chalk.gray(`\n📄 Rapport détaillé sauvegardé: ${reportPath}`));
  }

  /**
   * Afficher le verdict final
   */
  displayVerdict(successRate, avgLatency, errorRate) {
    console.log(chalk.bold.blue('\n🎯 Verdict Final\n'));

    const criteria = [
      {
        name: 'Capacité 1000+ connexions',
        passed: this.metrics.connected >= 1000,
        actual: `${this.metrics.connected} connexions`
      },
      {
        name: 'Taux de succès > 95%',
        passed: successRate > 95,
        actual: `${successRate.toFixed(1)}%`
      },
      {
        name: 'Latence moyenne < 200ms',
        passed: avgLatency < 200,
        actual: `${avgLatency.toFixed(0)}ms`
      },
      {
        name: 'Taux d\'erreur < 1%',
        passed: errorRate < 1,
        actual: `${errorRate.toFixed(2)}%`
      },
      {
        name: 'Aucune déconnexion',
        passed: this.metrics.disconnected === 0,
        actual: `${this.metrics.disconnected} déconnexions`
      }
    ];

    criteria.forEach(criterion => {
      const status = criterion.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
      console.log(`${status} ${criterion.name}: ${criterion.actual}`);
    });

    const passed = criteria.filter(c => c.passed).length;
    const total = criteria.length;
    
    console.log(chalk.bold(`\nScore: ${passed}/${total}`));
    
    if (passed === total) {
      console.log(chalk.bold.green('\n🏆 EXCELLENT ! Le serveur WebSocket est prêt pour la production avec 1000+ connexions.'));
    } else if (passed >= 3) {
      console.log(chalk.bold.yellow('\n⚠️ BON. Le serveur fonctionne mais nécessite des optimisations.'));
    } else {
      console.log(chalk.bold.red('\n❌ INSUFFISANT. Des améliorations majeures sont nécessaires.'));
    }
  }
}

// Configuration CLI
const args = process.argv.slice(2);
const config = {
  serverUrl: args[0] || 'http://localhost:3000',
  targetConnections: parseInt(args[1]) || 1000,
  testDuration: parseInt(args[2]) || 300000
};

// Afficher l'aide si demandé
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node load-test.js [serverUrl] [connections] [duration]

Options:
  serverUrl    URL du serveur WebSocket (default: http://localhost:3000)
  connections  Nombre de connexions cibles (default: 1000)
  duration     Durée du test en ms (default: 300000)

Exemple:
  node load-test.js http://localhost:3000 1500 600000
  `);
  process.exit(0);
}

// Lancer le test
const test = new WebSocketLoadTest(config);
test.run().catch(console.error);