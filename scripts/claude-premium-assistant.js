#!/usr/bin/env node

/**
 * Assistant Claude Premium
 * 
 * Gestion intelligente du contexte pour les sessions longues
 * avec le plan Teams à 200$ CAD
 */

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const { ContextAnchorSystem } = require('./context-anchor');
const { EnhancedSessionSaver } = require('./save-session-v2');

class ClaudePremiumAssistant {
  constructor() {
    this.config = {
      autoAnchorThreshold: 50,     // Messages avant ancrage auto
      sessionSaveInterval: 30,     // Minutes entre saves auto
      maxMessagesBeforeWarn: 100,  // Avertir après X messages
      contextDecayThreshold: 150   // Suggérer nouvelle session
    };
    
    this.session = {
      startTime: Date.now(),
      messageCount: 0,
      lastAnchor: null,
      lastSave: null,
      anchors: [],
      objectives: []
    };
    
    this.anchor = new ContextAnchorSystem();
    this.saver = new EnhancedSessionSaver();
  }
  
  async start() {
    console.clear();
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🚀 CLAUDE PREMIUM ASSISTANT - TEAMS 200$ CAD         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Bienvenue dans votre assistant de gestion de contexte!        ║
║                                                                ║
║  Fonctionnalités:                                              ║
║  • Points d'ancrage automatiques tous les 50 messages          ║
║  • Sauvegarde de session toutes les 30 minutes                ║
║  • Rappels de contexte intelligents                           ║
║  • Gestion multi-projets                                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);
    
    // Vérifier s'il y a des ancres existantes
    await this.checkExistingAnchors();
    
    // Démarrer l'interface interactive
    this.startInteractiveMode();
    
    // Démarrer les sauvegardes automatiques
    this.startAutoSave();
  }
  
  async checkExistingAnchors() {
    const anchors = await this.anchor.listAnchors();
    
    if (anchors.length > 0) {
      console.log('\n📌 Points d\'ancrage récents détectés:');
      
      const recent = anchors.slice(-3);
      for (const anchor of recent) {
        console.log(`  • ${anchor.file} (${new Date(anchor.timestamp).toLocaleString()})`);
      }
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('\nVoulez-vous restaurer depuis une ancre? (y/n) ', resolve);
      });
      
      if (answer.toLowerCase() === 'y') {
        const anchorFile = await new Promise(resolve => {
          rl.question('Nom du fichier d\'ancre: ', resolve);
        });
        
        try {
          await this.anchor.restoreFromAnchor(anchorFile);
          console.log('✅ Contexte restauré!');
        } catch (error) {
          console.error('❌ Erreur lors de la restauration');
        }
      }
      
      rl.close();
    }
  }
  
  startInteractiveMode() {
    console.log('\n💡 Commandes disponibles:');
    console.log('  /anchor [description]  - Créer un point d\'ancrage');
    console.log('  /save                 - Sauvegarder la session');
    console.log('  /status              - Voir le statut');
    console.log('  /objectives          - Gérer les objectifs');
    console.log('  /switch <project>    - Changer de projet');
    console.log('  /help               - Afficher l\'aide');
    console.log('  /quit               - Quitter\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'claude> '
    });
    
    rl.prompt();
    
    rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input.startsWith('/')) {
        await this.handleCommand(input);
      } else {
        // Compter comme un message
        this.session.messageCount++;
        
        // Vérifier si on doit créer une ancre
        if (this.shouldCreateAnchor()) {
          console.log('\n⚓ Création automatique d\'un point d\'ancrage...');
          await this.createAutoAnchor();
        }
        
        // Avertissements
        if (this.session.messageCount === this.config.maxMessagesBeforeWarn) {
          console.log('\n⚠️  Attention: 100 messages atteints. Considérez créer une ancre.');
        }
        
        if (this.session.messageCount === this.config.contextDecayThreshold) {
          console.log('\n🔴 ALERTE: 150 messages! Le contexte Claude peut se dégrader.');
          console.log('   Recommandation: Créez une ancre et démarrez une nouvelle session.\n');
        }
      }
      
      // Afficher le statut dans le prompt
      const status = this.getStatusLine();
      rl.setPrompt(`claude [${status}]> `);
      rl.prompt();
    });
    
    rl.on('close', async () => {
      console.log('\n👋 Sauvegarde finale...');
      await this.finalSave();
      console.log('Au revoir!');
      process.exit(0);
    });
    
    this.rl = rl;
  }
  
  async handleCommand(input) {
    const [cmd, ...args] = input.split(' ');
    const param = args.join(' ');
    
    switch (cmd) {
      case '/anchor':
        await this.createManualAnchor(param);
        break;
        
      case '/save':
        await this.saveSession();
        break;
        
      case '/status':
        this.showStatus();
        break;
        
      case '/objectives':
        await this.manageObjectives(param);
        break;
        
      case '/switch':
        await this.switchProject(param);
        break;
        
      case '/help':
        this.showHelp();
        break;
        
      case '/quit':
      case '/exit':
        this.rl.close();
        break;
        
      default:
        console.log(`Commande inconnue: ${cmd}`);
    }
  }
  
  shouldCreateAnchor() {
    const messagesSinceLastAnchor = this.session.lastAnchor 
      ? this.session.messageCount - this.session.lastAnchor.messageCount
      : this.session.messageCount;
      
    return messagesSinceLastAnchor >= this.config.autoAnchorThreshold;
  }
  
  async createAutoAnchor() {
    const anchorFile = await this.anchor.createAnchor({
      reason: 'auto',
      summary: `Auto-anchor après ${this.session.messageCount} messages`
    });
    
    this.session.lastAnchor = {
      file: anchorFile,
      messageCount: this.session.messageCount,
      time: Date.now()
    };
    
    this.session.anchors.push(anchorFile);
  }
  
  async createManualAnchor(description) {
    console.log('⚓ Création d\'un point d\'ancrage manuel...');
    
    const anchorFile = await this.anchor.createAnchor({
      reason: 'manual',
      summary: description || 'Point d\'ancrage manuel'
    });
    
    this.session.lastAnchor = {
      file: anchorFile,
      messageCount: this.session.messageCount,
      time: Date.now()
    };
    
    this.session.anchors.push(anchorFile);
    
    console.log(`✅ Ancre créée: ${anchorFile}`);
  }
  
  async saveSession() {
    console.log('💾 Sauvegarde de la session...');
    
    const files = await this.saver.saveSession({
      category: 'premium-session',
      tags: ['claude-teams', 'long-session'],
      createAnchor: true,
      runTests: false
    });
    
    this.session.lastSave = Date.now();
    
    console.log('✅ Session sauvegardée!');
  }
  
  showStatus() {
    const duration = this.getSessionDuration();
    const lastAnchorTime = this.session.lastAnchor 
      ? this.formatTimeSince(this.session.lastAnchor.time)
      : 'Jamais';
    const lastSaveTime = this.session.lastSave
      ? this.formatTimeSince(this.session.lastSave)
      : 'Jamais';
    
    console.log(`
📊 Statut de Session
═══════════════════
Durée: ${duration}
Messages: ${this.session.messageCount}
Ancres créées: ${this.session.anchors.length}
Dernière ancre: ${lastAnchorTime}
Dernière sauvegarde: ${lastSaveTime}

${this.getContextHealthBar()}
    `);
  }
  
  getContextHealthBar() {
    const percentage = Math.min(100, (this.session.messageCount / this.config.contextDecayThreshold) * 100);
    const filled = Math.floor(percentage / 5);
    const empty = 20 - filled;
    
    let color = '\x1b[32m'; // Vert
    if (percentage > 66) color = '\x1b[33m'; // Jaune
    if (percentage > 90) color = '\x1b[31m'; // Rouge
    
    return `Santé du contexte: ${color}${'█'.repeat(filled)}${'░'.repeat(empty)}\x1b[0m ${percentage.toFixed(0)}%`;
  }
  
  getStatusLine() {
    return `${this.session.messageCount}msg | ${this.session.anchors.length}⚓`;
  }
  
  async manageObjectives(param) {
    if (!param) {
      // Afficher les objectifs
      console.log('\n🎯 Objectifs de session:');
      if (this.session.objectives.length === 0) {
        console.log('  Aucun objectif défini');
      } else {
        this.session.objectives.forEach((obj, i) => {
          console.log(`  ${i + 1}. ${obj.text} [${obj.status}]`);
        });
      }
      console.log('\nUtilisez: /objectives add <description> ou /objectives done <numéro>');
    } else {
      const [action, ...rest] = param.split(' ');
      const value = rest.join(' ');
      
      if (action === 'add') {
        this.session.objectives.push({
          text: value,
          status: 'pending',
          created: Date.now()
        });
        console.log('✅ Objectif ajouté');
      } else if (action === 'done') {
        const index = parseInt(value) - 1;
        if (this.session.objectives[index]) {
          this.session.objectives[index].status = 'done';
          console.log('✅ Objectif marqué comme terminé');
        }
      }
    }
  }
  
  startAutoSave() {
    setInterval(async () => {
      await this.saveSession();
    }, this.config.sessionSaveInterval * 60 * 1000);
  }
  
  async finalSave() {
    await this.saveSession();
    await this.createManualAnchor('Session terminée');
  }
  
  getSessionDuration() {
    const duration = Date.now() - this.session.startTime;
    const hours = Math.floor(duration / 1000 / 60 / 60);
    const minutes = Math.floor((duration / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
  }
  
  formatTimeSince(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60);
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}m`;
    return `Il y a ${Math.floor(minutes / 60)}h`;
  }
  
  showHelp() {
    console.log(`
🆘 Aide Claude Premium Assistant

Commandes:
  /anchor [desc]    - Créer un point d'ancrage avec description
  /save            - Sauvegarder la session maintenant
  /status          - Voir le statut détaillé
  /objectives      - Gérer les objectifs de session
  /switch <proj>   - Changer de projet
  /help            - Afficher cette aide
  /quit            - Quitter (sauvegarde automatique)

Tips:
  • Les ancres sont créées automatiquement tous les 50 messages
  • La session est sauvegardée toutes les 30 minutes
  • Après 150 messages, considérez démarrer une nouvelle session
  • Utilisez les ancres pour restaurer le contexte rapidement
    `);
  }
  
  async switchProject(projectName) {
    if (!projectName) {
      console.log('Usage: /switch <project-name>');
      return;
    }
    
    // Sauvegarder l'état actuel
    await this.createManualAnchor(`Switch to project: ${projectName}`);
    
    console.log(`✅ Switched to project: ${projectName}`);
    console.log('💡 Une ancre a été créée pour sauvegarder l\'état actuel');
  }
}

// Lancer l'assistant
async function main() {
  const assistant = new ClaudePremiumAssistant();
  await assistant.start();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ClaudePremiumAssistant };