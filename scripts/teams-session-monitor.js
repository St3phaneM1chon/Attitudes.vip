#!/usr/bin/env node

/**
 * Monitor de Sessions Claude Teams Premium
 * 
 * Optimisé pour les plans à 200$ CAD avec capacités étendues
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class TeamsSessionMonitor {
  constructor() {
    this.config = {
      maxSessionDuration: 12 * 60 * 60 * 1000, // 12 heures
      checkpointInterval: 30 * 60 * 1000, // 30 minutes
      statsFile: path.join(__dirname, '../.claude-teams-stats.json'),
      alertsEnabled: true
    };
    
    this.currentSession = {
      startTime: Date.now(),
      checkpoints: [],
      filesGenerated: 0,
      linesWritten: 0,
      featuresCompleted: [],
      activeProjects: new Set(),
      valueGenerated: 0
    };
  }
  
  async start() {
    console.log('🚀 Claude Teams Session Monitor - Premium Edition');
    console.log('💎 Plan: 200$ CAD/month - Unlimited Power!');
    console.log('⏱️  Session started:', new Date().toLocaleString());
    
    await this.loadStats();
    this.startCheckpointing();
    this.startMetricsCollection();
    this.displayDashboard();
  }
  
  startCheckpointing() {
    setInterval(async () => {
      await this.checkpoint();
    }, this.config.checkpointInterval);
  }
  
  async checkpoint() {
    const checkpoint = {
      time: Date.now(),
      duration: Date.now() - this.currentSession.startTime,
      memory: process.memoryUsage(),
      git: await this.getGitStats(),
      productivity: this.calculateProductivity()
    };
    
    this.currentSession.checkpoints.push(checkpoint);
    
    // Auto-save session
    await this.autoSaveSession();
    
    // Alert si session très longue
    if (checkpoint.duration > 6 * 60 * 60 * 1000) { // 6 heures
      console.log('⚡ Session Marathon Active! Productivité maximale atteinte!');
    }
  }
  
  async autoSaveSession() {
    const { stdout } = await exec(`node ${path.join(__dirname, 'save-session-v2.js')} --category teams-marathon --tags "auto-checkpoint,premium" --no-tests`);
    
    // Parser les stats de la session
    const filesMatch = stdout.match(/Fichiers créés: (\d+)/);
    if (filesMatch) {
      this.currentSession.filesGenerated += parseInt(filesMatch[1]);
    }
  }
  
  async getGitStats() {
    try {
      const { stdout: diffStat } = await exec('git diff --stat');
      const { stdout: status } = await exec('git status --porcelain | wc -l');
      
      return {
        filesChanged: parseInt(status.trim()),
        diffStat: diffStat.trim()
      };
    } catch {
      return { filesChanged: 0, diffStat: '' };
    }
  }
  
  calculateProductivity() {
    const duration = (Date.now() - this.currentSession.startTime) / 1000 / 60; // minutes
    const filesPerHour = (this.currentSession.filesGenerated / duration) * 60;
    const linesPerHour = (this.currentSession.linesWritten / duration) * 60;
    
    // Calculer la valeur en CAD
    const hourlyRate = 150; // CAD
    const hoursEquivalent = this.currentSession.linesWritten / 50; // 50 lignes/heure sans AI
    const valueSaved = hoursEquivalent * hourlyRate;
    
    this.currentSession.valueGenerated = valueSaved;
    
    return {
      filesPerHour: filesPerHour.toFixed(1),
      linesPerHour: linesPerHour.toFixed(0),
      valueGenerated: valueSaved.toFixed(2),
      efficiency: ((valueSaved / (duration / 60 * hourlyRate)) * 100).toFixed(1) + '%'
    };
  }
  
  displayDashboard() {
    setInterval(() => {
      console.clear();
      const duration = (Date.now() - this.currentSession.startTime) / 1000 / 60;
      const prod = this.calculateProductivity();
      
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║              🚀 CLAUDE TEAMS PREMIUM - LIVE DASHBOARD          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  ⏱️  Session Duration: ${Math.floor(duration / 60)}h ${Math.floor(duration % 60)}m              ║
║  📁 Files Generated: ${this.currentSession.filesGenerated}                                    ║
║  💻 Lines Written: ${this.currentSession.linesWritten}                                  ║
║  🏗️  Active Projects: ${this.currentSession.activeProjects.size}                              ║
║                                                                ║
║  📊 PRODUCTIVITY METRICS                                       ║
║  ├─ Files/Hour: ${prod.filesPerHour}                                        ║
║  ├─ Lines/Hour: ${prod.linesPerHour}                                       ║
║  ├─ Efficiency: ${prod.efficiency}                                      ║
║  └─ Value Generated: $${prod.valueGenerated} CAD                        ║
║                                                                ║
║  💰 SESSION VALUE                                              ║
║  ├─ Time Saved: ${(this.currentSession.linesWritten / 50).toFixed(1)} hours                   ║
║  ├─ Cost: $${(200 / 30 / 24 * duration / 60).toFixed(2)} CAD                     ║
║  └─ ROI: ${((prod.valueGenerated / (200 / 30 / 24 * duration / 60) - 1) * 100).toFixed(0)}%                                           ║
║                                                                ║
║  🎯 ACHIEVEMENTS                                               ║
${this.getAchievements().map(a => `║  ✅ ${a.padEnd(58)} ║`).join('\n')}
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

💡 Pro Tip: ${this.getProTip()}
      `);
    }, 60000); // Update every minute
  }
  
  getAchievements() {
    const achievements = [];
    
    if (this.currentSession.filesGenerated > 10) {
      achievements.push('Code Generator Master - 10+ files created');
    }
    if (this.currentSession.linesWritten > 1000) {
      achievements.push('Prolific Coder - 1000+ lines written');
    }
    if (this.currentSession.checkpoints.length > 6) {
      achievements.push('Marathon Runner - 3+ hours continuous');
    }
    if (this.currentSession.valueGenerated > 1000) {
      achievements.push('Value Creator - $1000+ CAD generated');
    }
    
    return achievements.slice(0, 4);
  }
  
  getProTip() {
    const tips = [
      'Use multiple Claude windows for parallel tasks',
      'Save checkpoints before major refactoring',
      'Leverage code generation for boilerplate',
      'Ask for multiple implementation options',
      'Request performance comparisons',
      'Generate tests alongside code',
      'Document decisions in real-time'
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
  }
  
  async loadStats() {
    try {
      const stats = JSON.parse(await fs.readFile(this.config.statsFile, 'utf8'));
      console.log(`📊 Lifetime stats: ${stats.totalSessions} sessions, $${stats.totalValue.toFixed(0)} CAD value created`);
    } catch {
      // First run
      await this.saveStats({
        totalSessions: 0,
        totalValue: 0,
        totalHours: 0,
        startDate: new Date().toISOString()
      });
    }
  }
  
  async saveStats(stats) {
    await fs.writeFile(this.config.statsFile, JSON.stringify(stats, null, 2));
  }
  
  async trackFileChange(file, linesAdded) {
    this.currentSession.filesGenerated++;
    this.currentSession.linesWritten += linesAdded;
    
    // Détecter le projet
    const project = file.split('/')[0];
    this.currentSession.activeProjects.add(project);
  }
  
  startMetricsCollection() {
    // Surveiller les changements de fichiers
    const chokidar = require('chokidar');
    const watcher = chokidar.watch('.', {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });
    
    watcher.on('add', async (path) => {
      try {
        const content = await fs.readFile(path, 'utf8');
        const lines = content.split('\n').length;
        await this.trackFileChange(path, lines);
      } catch {
        // Ignore errors
      }
    });
  }
}

// Commandes CLI
async function main() {
  const command = process.argv[2];
  
  if (command === 'stats') {
    try {
      const stats = JSON.parse(
        await fs.readFile(path.join(__dirname, '../.claude-teams-stats.json'), 'utf8')
      );
      
      console.log(`
📊 Claude Teams Lifetime Statistics
===================================
Total Sessions: ${stats.totalSessions}
Total Value Created: $${stats.totalValue.toFixed(2)} CAD
Total Hours Saved: ${stats.totalHours.toFixed(1)}
Average Value/Session: $${(stats.totalValue / stats.totalSessions).toFixed(2)} CAD
Member Since: ${new Date(stats.startDate).toLocaleDateString()}

Monthly ROI: ${((stats.totalValue / stats.totalSessions * 20 / 200 - 1) * 100).toFixed(0)}%
      `);
    } catch (error) {
      console.error('No stats available yet. Start a session first!');
    }
    return;
  }
  
  const monitor = new TeamsSessionMonitor();
  await monitor.start();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TeamsSessionMonitor };