#!/usr/bin/env node

/**
 * Planificateur de mises à jour hebdomadaires
 * 
 * Exécute automatiquement les mises à jour tous les lundis à 3h00 AM
 */

const cron = require('node-cron');
const { exec } = require('child_process').promises;
const fs = require('fs').promises;
const path = require('path');

class WeeklyUpdateScheduler {
  constructor() {
    this.config = {
      // Lundi à 3h00 AM
      cronExpression: '0 3 * * 1',
      
      // Tâches à exécuter
      updateTasks: [
        'mcp-discovery',      // Découverte de nouveaux MCP
        'dependencies',       // Mise à jour des dépendances
        'docker-images',      // Mise à jour des images Docker
        'system-updates'      // Mises à jour système
      ],
      
      logDir: path.join(__dirname, '../logs/weekly-updates')
    };
  }
  
  async start() {
    console.log('📅 Démarrage du planificateur de mises à jour hebdomadaires');
    console.log(`⏰ Programmé pour: tous les lundis à 3h00 AM`);
    
    await this.ensureDirectories();
    
    // Planifier les mises à jour
    cron.schedule(this.config.cronExpression, async () => {
      await this.runWeeklyUpdate();
    });
    
    // Vérifier la prochaine exécution
    this.showNextRun();
  }
  
  async runWeeklyUpdate() {
    const startTime = new Date();
    console.log(`\n🚀 Début de la mise à jour hebdomadaire - ${startTime.toLocaleString()}`);
    
    const logFile = path.join(
      this.config.logDir, 
      `update-${startTime.toISOString().split('T')[0]}.log`
    );
    
    const results = {
      startTime: startTime.toISOString(),
      tasks: {},
      success: true
    };
    
    // 1. Découverte MCP
    if (this.config.updateTasks.includes('mcp-discovery')) {
      results.tasks.mcpDiscovery = await this.runMCPDiscovery();
    }
    
    // 2. Mise à jour des dépendances
    if (this.config.updateTasks.includes('dependencies')) {
      results.tasks.dependencies = await this.updateDependencies();
    }
    
    // 3. Mise à jour Docker
    if (this.config.updateTasks.includes('docker-images')) {
      results.tasks.docker = await this.updateDockerImages();
    }
    
    // 4. Mises à jour système
    if (this.config.updateTasks.includes('system-updates')) {
      results.tasks.system = await this.runSystemUpdates();
    }
    
    // 5. Redémarrage si nécessaire
    if (this.shouldRestart(results)) {
      results.restart = await this.scheduleRestart();
    }
    
    results.endTime = new Date().toISOString();
    results.duration = Date.now() - startTime.getTime();
    
    // Sauvegarder les résultats
    await fs.writeFile(logFile, JSON.stringify(results, null, 2));
    
    // Notifier
    await this.notifyResults(results);
    
    console.log(`✅ Mise à jour hebdomadaire terminée en ${Math.round(results.duration / 1000)}s`);
  }
  
  async runMCPDiscovery() {
    console.log('🔍 Recherche de nouveaux serveurs MCP...');
    
    try {
      const { stdout, stderr } = await exec('node scripts/mcp-discovery-agent.js discover');
      
      // Parser les résultats
      const newServers = this.parseDiscoveryResults(stdout);
      
      if (newServers.length > 0) {
        console.log(`✅ ${newServers.length} nouveaux serveurs MCP trouvés`);
        
        // Installer automatiquement
        for (const server of newServers) {
          await this.installMCPServer(server);
        }
      }
      
      return {
        success: true,
        newServers: newServers.length,
        details: newServers
      };
      
    } catch (error) {
      console.error('❌ Erreur découverte MCP:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  async updateDependencies() {
    console.log('📦 Mise à jour des dépendances npm...');
    
    try {
      // Vérifier les mises à jour disponibles
      const { stdout: outdated } = await exec('npm outdated --json');
      const updates = JSON.parse(outdated || '{}');
      
      if (Object.keys(updates).length > 0) {
        console.log(`📋 ${Object.keys(updates).length} mises à jour disponibles`);
        
        // Mettre à jour les dépendances (prudent)
        await exec('npm update');
        
        // Audit de sécurité
        const { stdout: audit } = await exec('npm audit --json');
        const auditResult = JSON.parse(audit);
        
        return {
          success: true,
          updated: Object.keys(updates).length,
          securityIssues: auditResult.metadata.vulnerabilities
        };
      }
      
      return { success: true, updated: 0 };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async updateDockerImages() {
    console.log('🐳 Mise à jour des images Docker...');
    
    try {
      // Lister les images utilisées
      const { stdout: composeConfig } = await exec('docker-compose config --images');
      const images = composeConfig.trim().split('\n');
      
      const updated = [];
      
      for (const image of images) {
        console.log(`Pulling ${image}...`);
        try {
          await exec(`docker pull ${image}`);
          updated.push(image);
        } catch (error) {
          console.warn(`⚠️  Impossible de mettre à jour ${image}`);
        }
      }
      
      return {
        success: true,
        updated: updated.length,
        images: updated
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async runSystemUpdates() {
    console.log('🖥️  Vérification des mises à jour système...');
    
    // Ici on pourrait ajouter des mises à jour système
    // Pour l'instant, on fait juste un health check
    
    try {
      const health = {
        diskSpace: await this.checkDiskSpace(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
      
      return {
        success: true,
        health
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async checkDiskSpace() {
    try {
      const { stdout } = await exec('df -h . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      return {
        used: parts[2],
        available: parts[3],
        percentage: parts[4]
      };
    } catch {
      return null;
    }
  }
  
  shouldRestart(results) {
    // Redémarrer si :
    // - Des images Docker ont été mises à jour
    // - Des dépendances critiques ont été mises à jour
    // - Des nouveaux MCP ont été installés
    
    return (
      results.tasks.docker?.updated > 0 ||
      results.tasks.dependencies?.updated > 0 ||
      results.tasks.mcpDiscovery?.newServers > 0
    );
  }
  
  async scheduleRestart() {
    console.log('🔄 Planification du redémarrage...');
    
    // Attendre 5 minutes puis redémarrer
    setTimeout(async () => {
      await exec('scripts/restart-app.sh safe');
    }, 5 * 60 * 1000);
    
    return {
      scheduled: true,
      delay: '5 minutes'
    };
  }
  
  parseDiscoveryResults(output) {
    // Parser la sortie de discovery agent
    const servers = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('New MCP server:')) {
        const match = line.match(/New MCP server: (.+)/);
        if (match) {
          servers.push(match[1]);
        }
      }
    }
    
    return servers;
  }
  
  async installMCPServer(server) {
    console.log(`📥 Installation de ${server}...`);
    
    try {
      if (server.includes('docker')) {
        await exec(`docker pull ${server}`);
      } else if (server.includes('npm')) {
        await exec(`npm install -g ${server}`);
      }
      
      console.log(`✅ ${server} installé`);
    } catch (error) {
      console.error(`❌ Erreur installation ${server}:`, error.message);
    }
  }
  
  async notifyResults(results) {
    // Créer un rapport
    const report = `
# Rapport de Mise à Jour Hebdomadaire

Date: ${new Date(results.startTime).toLocaleString()}
Durée: ${Math.round(results.duration / 1000)}s

## Résultats

### MCP Discovery
${results.tasks.mcpDiscovery?.success ? '✅' : '❌'} ${results.tasks.mcpDiscovery?.newServers || 0} nouveaux serveurs

### Dépendances NPM
${results.tasks.dependencies?.success ? '✅' : '❌'} ${results.tasks.dependencies?.updated || 0} mises à jour

### Images Docker
${results.tasks.docker?.success ? '✅' : '❌'} ${results.tasks.docker?.updated || 0} images mises à jour

### Système
${results.tasks.system?.success ? '✅' : '❌'} Health check complété

${results.restart ? '🔄 Redémarrage planifié dans ' + results.restart.delay : ''}
`;
    
    // Sauvegarder le rapport
    const reportPath = path.join(this.config.logDir, 'latest-report.md');
    await fs.writeFile(reportPath, report);
    
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
  }
  
  showNextRun() {
    const now = new Date();
    const nextMonday = new Date(now);
    
    // Trouver le prochain lundi
    nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
    nextMonday.setHours(3, 0, 0, 0);
    
    // Si c'est déjà passé cette semaine, aller à la semaine prochaine
    if (nextMonday <= now) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }
    
    console.log(`\n⏰ Prochaine mise à jour: ${nextMonday.toLocaleString()}`);
    console.log(`⏳ Dans ${this.getTimeUntil(nextMonday)}\n`);
  }
  
  getTimeUntil(date) {
    const diff = date - new Date();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days} jours et ${hours} heures`;
  }
  
  async ensureDirectories() {
    await fs.mkdir(this.config.logDir, { recursive: true });
  }
}

// Mode CLI
async function main() {
  const scheduler = new WeeklyUpdateScheduler();
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      await scheduler.start();
      // Garder le processus actif
      process.stdin.resume();
      break;
      
    case 'run-now':
      console.log('🚀 Exécution manuelle de la mise à jour...');
      await scheduler.runWeeklyUpdate();
      break;
      
    case 'status':
      scheduler.showNextRun();
      break;
      
    default:
      console.log(`
📅 Planificateur de Mises à Jour Hebdomadaires

Usage: node weekly-update-scheduler.js <command>

Commandes:
  start     - Démarrer le planificateur (lundi 3h00)
  run-now   - Exécuter la mise à jour maintenant
  status    - Voir la prochaine exécution

Configuration:
  - Tous les lundis à 3h00 AM
  - Découverte MCP automatique
  - Mise à jour des dépendances
  - Mise à jour des images Docker
  - Redémarrage si nécessaire
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { WeeklyUpdateScheduler };