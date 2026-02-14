#!/usr/bin/env node

/**
 * Système de Points d'Ancrage pour Claude Premium
 * 
 * Maintient le contexte lors de longues sessions en créant des points
 * de sauvegarde intelligents que Claude peut relire pour restaurer
 * le contexte complet.
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const crypto = require('crypto');

class ContextAnchorSystem {
  constructor() {
    this.config = {
      anchorDir: path.join(__dirname, '../.claude-anchors'),
      maxAnchorsPerSession: 10,
      autoAnchorInterval: 50, // Créer un ancrage tous les 50 messages
      
      // Format des ancres
      anchorFormat: 'anchor-{session}-{number}-{date}.md',
      
      // Ce qu'on capture dans chaque ancre
      captureElements: {
        projectStructure: true,
        currentObjectives: true,
        completedTasks: true,
        activeFiles: true,
        keyDecisions: true,
        codeSnapshots: true,
        conversationSummary: true
      }
    };
    
    this.currentSession = {
      id: this.generateSessionId(),
      startTime: new Date(),
      messageCount: 0,
      anchors: [],
      objectives: [],
      decisions: [],
      context: {}
    };
  }
  
  /**
   * Créer un point d'ancrage
   */
  async createAnchor(options = {}) {
    console.log('⚓ Création d\'un point d\'ancrage...');
    
    const {
      reason = 'manual',
      summary = null,
      includeFullConversation = false
    } = options;
    
    try {
      // Préparer le répertoire
      await fs.mkdir(this.config.anchorDir, { recursive: true });
      
      // Collecter toutes les informations
      const anchorData = await this.collectAnchorData();
      
      // Générer le contenu de l'ancre
      const anchorContent = await this.generateAnchorContent(anchorData, summary);
      
      // Sauvegarder l'ancre
      const anchorFile = await this.saveAnchor(anchorContent, reason);
      
      // Mettre à jour l'index
      await this.updateAnchorIndex(anchorFile);
      
      // Créer aussi une version pour Claude
      await this.createClaudeReadableVersion(anchorFile);
      
      console.log(`✅ Point d'ancrage créé: ${anchorFile}`);
      
      return anchorFile;
      
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'ancre:', error);
      throw error;
    }
  }
  
  /**
   * Collecter les données pour l'ancrage
   */
  async collectAnchorData() {
    const data = {
      timestamp: new Date().toISOString(),
      session: this.currentSession,
      project: {},
      git: {},
      files: {},
      state: {}
    };
    
    // 1. Structure du projet
    if (this.config.captureElements.projectStructure) {
      data.project = await this.captureProjectStructure();
    }
    
    // 2. État Git
    data.git = await this.captureGitState();
    
    // 3. Fichiers actifs/modifiés
    if (this.config.captureElements.activeFiles) {
      data.files = await this.captureActiveFiles();
    }
    
    // 4. État de l'application
    data.state = await this.captureApplicationState();
    
    return data;
  }
  
  /**
   * Capturer la structure du projet
   */
  async captureProjectStructure() {
    const structure = {
      tree: '',
      summary: {},
      stats: {}
    };
    
    try {
      // Arbre simplifié du projet
      const { stdout: tree } = await exec('find . -type f -name "*.js" -o -name "*.json" -o -name "*.md" | grep -v node_modules | sort | head -50');
      structure.tree = tree;
      
      // Statistiques
      const { stdout: jsFiles } = await exec('find . -name "*.js" -not -path "*/node_modules/*" | wc -l');
      const { stdout: totalLines } = await exec('find . -name "*.js" -not -path "*/node_modules/*" | xargs wc -l | tail -1');
      
      structure.stats = {
        jsFiles: parseInt(jsFiles.trim()),
        totalLines: parseInt(totalLines.trim().split(' ')[0] || 0)
      };
      
      // Résumé des dossiers principaux
      const mainDirs = ['src', 'scripts', 'docs', 'config'];
      for (const dir of mainDirs) {
        try {
          const { stdout: count } = await exec(`find ${dir} -type f 2>/dev/null | wc -l`);
          structure.summary[dir] = parseInt(count.trim());
        } catch {
          structure.summary[dir] = 0;
        }
      }
      
    } catch (error) {
      console.warn('⚠️  Impossible de capturer la structure complète');
    }
    
    return structure;
  }
  
  /**
   * Capturer l'état Git
   */
  async captureGitState() {
    const gitState = {
      branch: 'unknown',
      lastCommit: '',
      uncommittedChanges: [],
      recentCommits: []
    };
    
    try {
      const { stdout: branch } = await exec('git branch --show-current');
      const { stdout: lastCommit } = await exec('git log -1 --oneline');
      const { stdout: status } = await exec('git status --porcelain');
      const { stdout: recentCommits } = await exec('git log --oneline -5');
      
      gitState.branch = branch.trim();
      gitState.lastCommit = lastCommit.trim();
      gitState.uncommittedChanges = status.trim().split('\n').filter(Boolean);
      gitState.recentCommits = recentCommits.trim().split('\n');
      
    } catch (error) {
      console.warn('⚠️  Git non disponible');
    }
    
    return gitState;
  }
  
  /**
   * Capturer les fichiers actifs
   */
  async captureActiveFiles() {
    const files = {
      recentlyModified: [],
      currentFocus: [],
      keyFiles: {}
    };
    
    try {
      // Fichiers modifiés récemment (dernière heure)
      const { stdout: recent } = await exec('find . -type f -mmin -60 -name "*.js" -o -name "*.json" | grep -v node_modules | head -10');
      files.recentlyModified = recent.trim().split('\n').filter(Boolean);
      
      // Capturer le contenu des fichiers clés
      const keyFilesList = [
        'package.json',
        'CLAUDE.md',
        '.claude-projects.json',
        'scripts/save-session-v2.js',
        'scripts/context-anchor.js'
      ];
      
      for (const file of keyFilesList) {
        try {
          if (await fs.access(file).then(() => true).catch(() => false)) {
            const content = await fs.readFile(file, 'utf8');
            // Limiter à 100 lignes pour chaque fichier
            files.keyFiles[file] = content.split('\n').slice(0, 100).join('\n');
          }
        } catch {
          // Ignorer si le fichier n'existe pas
        }
      }
      
    } catch (error) {
      console.warn('⚠️  Erreur lors de la capture des fichiers');
    }
    
    return files;
  }
  
  /**
   * Capturer l'état de l'application
   */
  async captureApplicationState() {
    const state = {
      dockerServices: [],
      runningProcesses: [],
      environment: {},
      memory: {}
    };
    
    try {
      // Services Docker
      const { stdout: dockerPs } = await exec('docker ps --format "table {{.Names}}\t{{.Status}}" | tail -n +2');
      state.dockerServices = dockerPs.trim().split('\n').filter(Boolean);
      
      // Mémoire et ressources
      state.memory = process.memoryUsage();
      
      // Variables d'environnement importantes
      state.environment = {
        NODE_ENV: process.env.NODE_ENV,
        PWD: process.cwd(),
        USER: process.env.USER
      };
      
    } catch (error) {
      console.warn('⚠️  Impossible de capturer l\'état complet');
    }
    
    return state;
  }
  
  /**
   * Générer le contenu de l'ancre
   */
  async generateAnchorContent(data, customSummary) {
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();
    const anchorNumber = this.currentSession.anchors.length + 1;
    
    let content = `# 🔵 Point d'Ancrage #${anchorNumber} - Session ${this.currentSession.id}

## 📅 Métadonnées
- **Date**: ${date}
- **Heure**: ${time}
- **Messages depuis le début**: ${this.currentSession.messageCount}
- **Ancres créées**: ${this.currentSession.anchors.length}

## 🎯 Contexte de Session

### Résumé Actuel
${customSummary || this.generateAutoSummary()}

### Objectifs de la Session
${this.currentSession.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n') || '- Aucun objectif défini'}

### Décisions Clés Prises
${this.currentSession.decisions.map((dec, i) => `${i + 1}. ${dec}`).join('\n') || '- Aucune décision majeure enregistrée'}

## 📁 État du Projet

### Structure Actuelle
\`\`\`
Total fichiers JS: ${data.project.stats?.jsFiles || 0}
Total lignes de code: ${data.project.stats?.totalLines || 0}

Répartition:
${Object.entries(data.project.summary || {}).map(([dir, count]) => `- ${dir}/: ${count} fichiers`).join('\n')}
\`\`\`

### Git Status
\`\`\`
Branche: ${data.git.branch}
Dernier commit: ${data.git.lastCommit}
Fichiers modifiés: ${data.git.uncommittedChanges.length}
\`\`\`

### Fichiers Récemment Modifiés
${data.files.recentlyModified.map(f => `- ${f}`).join('\n') || 'Aucun fichier modifié récemment'}

## 💻 Code Context Snapshots

`;

    // Ajouter les snapshots de code importants
    if (data.files.keyFiles && Object.keys(data.files.keyFiles).length > 0) {
      for (const [filename, fileContent] of Object.entries(data.files.keyFiles)) {
        const ext = path.extname(filename).substring(1) || 'text';
        content += `### ${filename}
\`\`\`${ext}
${fileContent}
\`\`\`

`;
      }
    }

    // Ajouter l'état du système
    content += `## 🖥️ État du Système

### Services Docker
\`\`\`
${data.state.dockerServices.join('\n') || 'Aucun service Docker actif'}
\`\`\`

### Utilisation Mémoire
\`\`\`
RSS: ${Math.round(data.state.memory.rss / 1024 / 1024)} MB
Heap Used: ${Math.round(data.state.memory.heapUsed / 1024 / 1024)} MB
\`\`\`

## 🔄 Instructions de Restauration

Pour restaurer ce contexte dans une nouvelle session Claude:

1. **Commencer par**: "J'ai un point d'ancrage de session à restaurer"
2. **Fournir ce fichier** en entier
3. **Claude comprendra**:
   - L'état exact du projet
   - Les objectifs en cours
   - Les décisions prises
   - Le code sur lequel vous travailliez

## 🎯 Prochaines Actions Suggérées

Basé sur l'état actuel, voici les actions recommandées:
${this.generateNextActions()}

---
*Point d'ancrage généré automatiquement par le Context Anchor System*
`;

    return content;
  }
  
  /**
   * Générer un résumé automatique
   */
  generateAutoSummary() {
    const recentWork = [
      `Session active depuis ${this.getSessionDuration()}`,
      `${this.currentSession.messageCount} interactions avec Claude`,
      `${this.currentSession.anchors.length} points d'ancrage créés`,
      'Travail en cours sur le système de sauvegarde de sessions'
    ];
    
    return recentWork.join('\n');
  }
  
  /**
   * Générer les prochaines actions
   */
  generateNextActions() {
    const actions = [];
    
    // Basé sur les fichiers modifiés
    if (this.currentSession.messageCount > 100) {
      actions.push('1. Considérer de démarrer une nouvelle session pour un contexte frais');
    }
    
    actions.push('2. Continuer l\'implémentation en cours');
    actions.push('3. Exécuter les tests pour valider les changements');
    actions.push('4. Mettre à jour la documentation');
    
    return actions.join('\n');
  }
  
  /**
   * Sauvegarder l'ancre
   */
  async saveAnchor(content, reason) {
    const date = new Date().toISOString().split('T')[0];
    const anchorNumber = String(this.currentSession.anchors.length + 1).padStart(3, '0');
    const filename = `anchor-${this.currentSession.id}-${anchorNumber}-${date}.md`;
    const filepath = path.join(this.config.anchorDir, filename);
    
    await fs.writeFile(filepath, content);
    
    // Ajouter à la liste des ancres
    this.currentSession.anchors.push({
      file: filename,
      timestamp: new Date().toISOString(),
      reason: reason,
      messageCount: this.currentSession.messageCount
    });
    
    return filename;
  }
  
  /**
   * Créer une version optimisée pour Claude
   */
  async createClaudeReadableVersion(anchorFile) {
    const filepath = path.join(this.config.anchorDir, anchorFile);
    const content = await fs.readFile(filepath, 'utf8');
    
    // Version condensée pour Claude
    const claudeVersion = `# CONTEXT RESTORE POINT

## Quick Summary
${this.generateQuickSummary()}

## Key Files to Remember
${await this.getKeyFilesToRemember()}

## Current Focus
${this.getCurrentFocus()}

---
Full anchor available at: ${anchorFile}
`;

    const claudeFile = anchorFile.replace('.md', '-claude.md');
    await fs.writeFile(
      path.join(this.config.anchorDir, claudeFile),
      claudeVersion
    );
  }
  
  /**
   * Mettre à jour l'index des ancres
   */
  async updateAnchorIndex(anchorFile) {
    const indexPath = path.join(this.config.anchorDir, 'index.json');
    let index = { anchors: [], sessions: {} };
    
    try {
      const existing = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(existing);
    } catch {
      // Nouvel index
    }
    
    // Ajouter cette ancre
    index.anchors.push({
      file: anchorFile,
      session: this.currentSession.id,
      timestamp: new Date().toISOString(),
      messageCount: this.currentSession.messageCount
    });
    
    // Mettre à jour les stats de session
    if (!index.sessions[this.currentSession.id]) {
      index.sessions[this.currentSession.id] = {
        startTime: this.currentSession.startTime,
        anchors: []
      };
    }
    index.sessions[this.currentSession.id].anchors.push(anchorFile);
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
  
  /**
   * Restaurer depuis une ancre
   */
  async restoreFromAnchor(anchorFile) {
    console.log(`🔄 Restauration depuis l'ancre: ${anchorFile}`);
    
    try {
      const content = await fs.readFile(
        path.join(this.config.anchorDir, anchorFile),
        'utf8'
      );
      
      console.log('✅ Ancre chargée. Contenu:');
      console.log('=====================================');
      console.log(content);
      console.log('=====================================');
      
      return content;
      
    } catch (error) {
      console.error('❌ Impossible de charger l\'ancre:', error);
      throw error;
    }
  }
  
  /**
   * Lister les ancres disponibles
   */
  async listAnchors(sessionId = null) {
    try {
      const indexPath = path.join(this.config.anchorDir, 'index.json');
      const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      
      let anchors = index.anchors;
      
      if (sessionId) {
        anchors = anchors.filter(a => a.session === sessionId);
      }
      
      console.log(`\n⚓ Points d'ancrage disponibles:\n`);
      
      for (const anchor of anchors.slice(-10)) { // Derniers 10
        const date = new Date(anchor.timestamp);
        console.log(`📍 ${anchor.file}`);
        console.log(`   Session: ${anchor.session}`);
        console.log(`   Date: ${date.toLocaleString()}`);
        console.log(`   Messages: ${anchor.messageCount}`);
        console.log('');
      }
      
      return anchors;
      
    } catch (error) {
      console.log('Aucun point d\'ancrage trouvé.');
      return [];
    }
  }
  
  // Méthodes utilitaires
  
  generateSessionId() {
    return crypto.randomBytes(4).toString('hex');
  }
  
  getSessionDuration() {
    const duration = Date.now() - new Date(this.currentSession.startTime).getTime();
    const hours = Math.floor(duration / 1000 / 60 / 60);
    const minutes = Math.floor((duration / 1000 / 60) % 60);
    return `${hours}h ${minutes}m`;
  }
  
  generateQuickSummary() {
    return `Working on: AttitudesFramework
Focus: Session management and context preservation
Progress: ${this.currentSession.anchors.length} checkpoints created`;
  }
  
  async getKeyFilesToRemember() {
    const keyFiles = [
      'scripts/save-session-v2.js - Enhanced session saver',
      'scripts/context-anchor.js - This anchor system',
      'scripts/search-sessions.js - Session search tool'
    ];
    return keyFiles.join('\n');
  }
  
  getCurrentFocus() {
    return 'Implementing context anchor system for long Claude sessions';
  }
  
  /**
   * Intégration avec save-session-v2
   */
  async integrateWithSessionSaver() {
    // Créer un hook pour auto-anchor
    const hookContent = `
// Auto-anchor lors de la sauvegarde de session
const { ContextAnchorSystem } = require('./context-anchor');
const anchor = new ContextAnchorSystem();

// Créer une ancre à chaque sauvegarde
async function createSessionAnchor() {
  await anchor.createAnchor({
    reason: 'session-save',
    summary: 'Automatic anchor on session save'
  });
}

module.exports = { createSessionAnchor };
`;
    
    await fs.writeFile(
      path.join(__dirname, 'session-anchor-hook.js'),
      hookContent
    );
  }
}

// CLI Interface
async function main() {
  const anchor = new ContextAnchorSystem();
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      const reason = process.argv[3] || 'manual';
      const summary = process.argv.slice(4).join(' ') || null;
      await anchor.createAnchor({ reason, summary });
      break;
      
    case 'list':
      await anchor.listAnchors();
      break;
      
    case 'restore':
      const file = process.argv[3];
      if (!file) {
        console.error('Usage: context-anchor restore <anchor-file>');
        process.exit(1);
      }
      await anchor.restoreFromAnchor(file);
      break;
      
    case 'auto':
      // Mode automatique - créer une ancre tous les X messages
      console.log('🤖 Mode auto-ancrage activé');
      console.log('Une ancre sera créée toutes les 50 interactions');
      // Ici on pourrait implémenter un watcher
      break;
      
    case 'integrate':
      await anchor.integrateWithSessionSaver();
      console.log('✅ Intégration avec save-session-v2 configurée');
      break;
      
    default:
      console.log(`
⚓ Système de Points d'Ancrage Claude

Usage: node context-anchor.js <command> [options]

Commandes:
  create [reason] [summary]  - Créer un point d'ancrage
  list                      - Lister les ancres disponibles
  restore <file>            - Restaurer depuis une ancre
  auto                      - Mode auto-ancrage
  integrate                 - Intégrer avec save-session-v2

Exemples:
  node context-anchor.js create "milestone" "Completed authentication system"
  node context-anchor.js restore anchor-abc123-001-2025-06-27.md
  node context-anchor.js list

Raccourcis:
  npm run anchor:create     - Création rapide
  npm run anchor:list       - Liste rapide
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ContextAnchorSystem };