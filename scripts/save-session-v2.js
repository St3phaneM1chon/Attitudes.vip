#!/usr/bin/env node

/**
 * Enhanced Session Saver v2
 * 
 * Améliorations principales:
 * - Capture réelle des conversations
 * - Intégration Git complète avec diffs
 * - Système de recherche et indexation
 * - Génération automatique de résumés
 * - Support multi-formats d'export
 * - Hooks d'automatisation
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const crypto = require('crypto');

class EnhancedSessionSaver {
  constructor() {
    this.config = {
      baseDir: path.join(__dirname, '../Derniere-Session'),
      fileFormat: 'session-{number}-{date}.md',
      
      // Nouvelles configurations
      conversationDir: path.join(__dirname, '../.claude-conversations'),
      indexFile: path.join(__dirname, '../Derniere-Session/search-index.json'),
      
      // Options d'export
      exportFormats: ['md', 'json', 'html', 'pdf'],
      
      // Catégories de session
      categories: [
        'feature', 'bugfix', 'refactor', 'documentation', 
        'security', 'performance', 'infrastructure'
      ],
      
      metadata: {
        projectName: 'AttitudesFramework',
        version: '2.0.0',
        author: 'Session Claude + User'
      }
    };
    
    this.sessionData = {
      number: 0,
      date: new Date(),
      category: null,
      tags: [],
      filesCreated: [],
      filesModified: [],
      filesDeleted: [],
      topics: [],
      achievements: [],
      nextSteps: [],
      gitInfo: {},
      conversation: null,
      tests: {},
      metrics: {},
      errors: [],
      dependencies: {}
    };
  }
  
  /**
   * Méthode principale améliorée
   */
  async saveSession(options = {}) {
    console.log('💾 Sauvegarde de session v2 en cours...');
    
    const {
      conversationFile,
      category = 'general',
      tags = [],
      autoCommit = false,
      runTests = true,
      includeDiffs = true,
      generateAISummary = false,
      exportFormats = ['md', 'json']
    } = options;
    
    try {
      // 1. Préparation
      await this.ensureDirectories();
      this.sessionData.category = category;
      this.sessionData.tags = tags;
      
      // 2. Collecter toutes les informations
      this.sessionData.number = await this.getNextSessionNumber();
      await this.collectGitInfo(includeDiffs);
      await this.captureConversation(conversationFile);
      
      if (runTests) {
        await this.runAndCaptureTests();
      }
      
      await this.collectMetrics();
      await this.analyzeDependencies();
      
      // 3. Générer le contenu
      const content = await this.generateEnhancedContent();
      
      // 4. Sauvegarder dans plusieurs formats
      const savedFiles = [];
      for (const format of exportFormats) {
        const file = await this.saveInFormat(content, format);
        savedFiles.push(file);
      }
      
      // 5. Créer l'index de recherche
      await this.updateSearchIndex();
      
      // 6. Générer les fichiers supplémentaires
      await this.createSupplementaryFiles();
      
      // 7. Résumé AI optionnel
      if (generateAISummary) {
        await this.generateAndSaveAISummary(content);
      }
      
      // 8. Auto-commit si demandé
      if (autoCommit) {
        await this.commitSession();
      }
      
      // 9. Créer les hooks
      await this.setupAutomationHooks();
      
      // 10. Créer un point d'ancrage si session longue
      if (options.createAnchor || this.isLongSession()) {
        const { ContextAnchorSystem } = require('./context-anchor');
        const anchor = new ContextAnchorSystem();
        await anchor.createAnchor({
          reason: 'session-save',
          summary: `Session save: ${this.sessionData.topics.slice(0, 3).join(', ')}`
        });
        console.log('⚓ Point d\'ancrage créé pour cette session');
      }
      
      console.log(`✅ Session v2 sauvegardée avec succès!`);
      console.log(`📁 Fichiers créés: ${savedFiles.join(', ')}`);
      
      return savedFiles[0];
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      throw error;
    }
  }
  
  /**
   * Collecter les informations Git complètes
   */
  async collectGitInfo(includeDiffs = true) {
    console.log('🔍 Collection des informations Git...');
    
    try {
      // Informations de base
      const { stdout: branch } = await exec('git branch --show-current');
      const { stdout: remoteUrl } = await exec('git remote get-url origin').catch(() => ({ stdout: 'N/A' }));
      const { stdout: lastCommit } = await exec('git log -1 --oneline');
      const { stdout: status } = await exec('git status --porcelain');
      
      this.sessionData.gitInfo = {
        branch: branch.trim(),
        remoteUrl: remoteUrl.trim(),
        lastCommit: lastCommit.trim(),
        uncommittedFiles: []
      };
      
      // Parser le statut Git
      const lines = status.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const statusCode = line.substring(0, 2).trim();
        const file = line.substring(3);
        
        if (statusCode === 'A' || statusCode === '??') {
          this.sessionData.filesCreated.push(file);
        } else if (statusCode === 'M') {
          this.sessionData.filesModified.push(file);
        } else if (statusCode === 'D') {
          this.sessionData.filesDeleted.push(file);
        }
        
        this.sessionData.gitInfo.uncommittedFiles.push({ status: statusCode, file });
      }
      
      // Collecter les diffs si demandé
      if (includeDiffs && this.sessionData.filesModified.length > 0) {
        this.sessionData.gitInfo.diffs = {};
        
        for (const file of this.sessionData.filesModified) {
          try {
            const { stdout: diff } = await exec(`git diff -- "${file}"`);
            this.sessionData.gitInfo.diffs[file] = diff;
          } catch (error) {
            console.warn(`⚠️  Impossible de récupérer le diff pour ${file}`);
          }
        }
      }
      
      // Historique des commits récents
      const { stdout: recentCommits } = await exec('git log --oneline -10');
      this.sessionData.gitInfo.recentCommits = recentCommits.trim().split('\n');
      
    } catch (error) {
      console.warn('⚠️  Git non disponible, informations limitées');
      this.sessionData.gitInfo.error = error.message;
    }
  }
  
  /**
   * Capturer la conversation réelle
   */
  async captureConversation(conversationFile) {
    console.log('💬 Capture de la conversation...');
    
    // Option 1: Fichier de conversation fourni
    if (conversationFile) {
      try {
        this.sessionData.conversation = await fs.readFile(conversationFile, 'utf8');
        return;
      } catch (error) {
        console.warn(`⚠️  Impossible de lire ${conversationFile}`);
      }
    }
    
    // Option 2: Chercher dans le répertoire de conversations
    try {
      const files = await fs.readdir(this.config.conversationDir);
      const conversationFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.md'));
      
      if (conversationFiles.length > 0) {
        // Prendre la conversation la plus récente
        const latestFile = conversationFiles.sort().reverse()[0];
        const content = await fs.readFile(
          path.join(this.config.conversationDir, latestFile), 
          'utf8'
        );
        
        if (latestFile.endsWith('.json')) {
          // Parser et formater le JSON
          const data = JSON.parse(content);
          this.sessionData.conversation = this.formatConversationFromJSON(data);
        } else {
          this.sessionData.conversation = content;
        }
        
        console.log(`✅ Conversation capturée depuis ${latestFile}`);
        return;
      }
    } catch (error) {
      console.warn('⚠️  Répertoire de conversations non trouvé');
    }
    
    // Option 3: Utiliser un placeholder amélioré
    this.sessionData.conversation = this.generateConversationSummary();
  }
  
  /**
   * Formater une conversation depuis JSON
   */
  formatConversationFromJSON(data) {
    let formatted = '## Conversation\n\n';
    
    if (Array.isArray(data.messages)) {
      for (const msg of data.messages) {
        formatted += `**${msg.role}**: ${msg.content}\n\n`;
      }
    } else if (data.conversation) {
      formatted += data.conversation;
    } else {
      formatted += JSON.stringify(data, null, 2);
    }
    
    return formatted;
  }
  
  /**
   * Générer un résumé de conversation basé sur les fichiers
   */
  generateConversationSummary() {
    return `## Résumé de la session

### Fichiers créés (${this.sessionData.filesCreated.length})
${this.sessionData.filesCreated.map(f => `- ${f}`).join('\n')}

### Fichiers modifiés (${this.sessionData.filesModified.length})
${this.sessionData.filesModified.map(f => `- ${f}`).join('\n')}

### Topics identifiés
${this.extractTopics().map(t => `- ${t}`).join('\n')}

*Note: Pour capturer la conversation complète, utilisez l'option --conversation-file*`;
  }
  
  /**
   * Exécuter et capturer les tests
   */
  async runAndCaptureTests() {
    console.log('🧪 Exécution des tests...');
    
    this.sessionData.tests = {
      executed: false,
      passed: 0,
      failed: 0,
      output: ''
    };
    
    try {
      // Détecter le framework de test
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      if (scripts.test) {
        const { stdout, stderr } = await exec('npm test', { 
          timeout: 60000 
        }).catch(e => e);
        
        this.sessionData.tests.executed = true;
        this.sessionData.tests.output = stdout + stderr;
        
        // Parser les résultats (pattern basique)
        const passMatch = stdout.match(/(\d+) pass/);
        const failMatch = stdout.match(/(\d+) fail/);
        
        if (passMatch) this.sessionData.tests.passed = parseInt(passMatch[1]);
        if (failMatch) this.sessionData.tests.failed = parseInt(failMatch[1]);
      }
    } catch (error) {
      console.warn('⚠️  Impossible d\'exécuter les tests');
      this.sessionData.tests.error = error.message;
    }
  }
  
  /**
   * Collecter les métriques
   */
  async collectMetrics() {
    console.log('📊 Collection des métriques...');
    
    this.sessionData.metrics = {
      linesAdded: 0,
      linesRemoved: 0,
      filesCount: this.sessionData.filesCreated.length + this.sessionData.filesModified.length,
      duration: this.estimateDuration(),
      codeComplexity: {}
    };
    
    // Compter les lignes
    for (const file of this.sessionData.filesCreated) {
      try {
        const content = await fs.readFile(path.join(__dirname, '..', file), 'utf8');
        this.sessionData.metrics.linesAdded += content.split('\n').length;
      } catch (error) {
        // Ignorer
      }
    }
    
    // Analyser la complexité (basique)
    if (this.sessionData.gitInfo.diffs) {
      for (const [file, diff] of Object.entries(this.sessionData.gitInfo.diffs)) {
        const added = (diff.match(/^\+/gm) || []).length;
        const removed = (diff.match(/^-/gm) || []).length;
        
        this.sessionData.metrics.linesAdded += added;
        this.sessionData.metrics.linesRemoved += removed;
      }
    }
  }
  
  /**
   * Analyser les changements de dépendances
   */
  async analyzeDependencies() {
    console.log('📦 Analyse des dépendances...');
    
    this.sessionData.dependencies = {
      added: [],
      removed: [],
      updated: []
    };
    
    try {
      // Vérifier si package.json a été modifié
      if (this.sessionData.filesModified.includes('package.json')) {
        const { stdout: diff } = await exec('git diff package.json');
        
        // Parser le diff pour extraire les changements
        const lines = diff.split('\n');
        for (const line of lines) {
          if (line.startsWith('+') && line.includes('"') && line.includes(':')) {
            const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
            if (match) {
              this.sessionData.dependencies.added.push({
                name: match[1],
                version: match[2]
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Impossible d\'analyser les dépendances');
    }
  }
  
  /**
   * Générer le contenu amélioré
   */
  async generateEnhancedContent() {
    const date = this.sessionData.date.toISOString().split('T')[0];
    const time = this.sessionData.date.toLocaleTimeString();
    
    let content = `# Session de Développement #${this.sessionData.number} - ${date}

## 📋 Métadonnées

- **Date** : ${date}
- **Heure** : ${time}
- **Projet** : ${this.config.metadata.projectName}
- **Version** : ${this.config.metadata.version}
- **Catégorie** : ${this.sessionData.category}
- **Tags** : ${this.sessionData.tags.join(', ') || 'Aucun'}
- **Branche Git** : ${this.sessionData.gitInfo.branch || 'N/A'}
- **Durée estimée** : ${this.sessionData.metrics.duration}

## 📊 Statistiques

- **Lignes ajoutées** : ${this.sessionData.metrics.linesAdded}
- **Lignes supprimées** : ${this.sessionData.metrics.linesRemoved}
- **Fichiers créés** : ${this.sessionData.filesCreated.length}
- **Fichiers modifiés** : ${this.sessionData.filesModified.length}
- **Fichiers supprimés** : ${this.sessionData.filesDeleted.length}

## 🧪 Tests
${this.sessionData.tests.executed ? `
- **Tests exécutés** : ✅
- **Réussis** : ${this.sessionData.tests.passed}
- **Échoués** : ${this.sessionData.tests.failed}
` : '- **Tests exécutés** : ❌ (Aucun test exécuté)'}

## 🎯 Résumé de la Session

### Topics abordés
${this.sessionData.topics.map(t => `- ${t}`).join('\n')}

### Réalisations principales
${this.sessionData.achievements.map(a => `- ✅ ${a}`).join('\n')}

### Fichiers créés (${this.sessionData.filesCreated.length})
${this.sessionData.filesCreated.length > 0 ? 
  this.sessionData.filesCreated.map(f => `- \`${f}\``).join('\n') : 
  '- Aucun fichier créé'}

### Fichiers modifiés (${this.sessionData.filesModified.length})
${this.sessionData.filesModified.length > 0 ? 
  this.sessionData.filesModified.map(f => `- \`${f}\``).join('\n') : 
  '- Aucun fichier modifié'}

---

## 💬 Discussion Complète

${this.sessionData.conversation || '*[Aucune conversation capturée]*'}

---

## 🔨 Code Généré

`;

    // Ajouter le code des fichiers créés
    for (const file of this.sessionData.filesCreated) {
      try {
        const filePath = path.join(__dirname, '..', file);
        const fileContent = await fs.readFile(filePath, 'utf8');
        const ext = path.extname(file).substring(1) || 'text';
        
        content += `### ${file}\n\n\`\`\`${ext}\n${fileContent}\n\`\`\`\n\n`;
      } catch (error) {
        content += `### ${file}\n\n*[Erreur lors de la lecture du fichier]*\n\n`;
      }
    }
    
    // Ajouter les diffs pour les fichiers modifiés
    if (this.sessionData.gitInfo.diffs && Object.keys(this.sessionData.gitInfo.diffs).length > 0) {
      content += `## 📝 Modifications (Diffs)\n\n`;
      
      for (const [file, diff] of Object.entries(this.sessionData.gitInfo.diffs)) {
        content += `### ${file}\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n`;
      }
    }
    
    // Ajouter les dépendances
    if (this.sessionData.dependencies.added.length > 0) {
      content += `## 📦 Dépendances ajoutées\n\n`;
      for (const dep of this.sessionData.dependencies.added) {
        content += `- ${dep.name}@${dep.version}\n`;
      }
      content += '\n';
    }
    
    // Ajouter les prochaines étapes
    content += `## 🚀 Prochaines Étapes

${this.sessionData.nextSteps.length > 0 ?
  this.sessionData.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') :
  '*[À définir]*'}

---

## 🔗 Références

- **Dernier commit** : ${this.sessionData.gitInfo.lastCommit || 'Aucun'}
- **Remote URL** : ${this.sessionData.gitInfo.remoteUrl || 'N/A'}
- **Session ID** : ${this.generateSessionId()}

---

*Session sauvegardée automatiquement le ${new Date().toLocaleString()}*
`;

    return content;
  }
  
  /**
   * Sauvegarder dans différents formats
   */
  async saveInFormat(content, format) {
    const date = this.sessionData.date.toISOString().split('T')[0];
    const baseFilename = `session-${String(this.sessionData.number).padStart(3, '0')}-${date}`;
    
    switch (format) {
      case 'md':
        const mdFile = path.join(this.config.baseDir, `${baseFilename}.md`);
        await fs.writeFile(mdFile, content);
        return mdFile;
        
      case 'json':
        const jsonFile = path.join(this.config.baseDir, `${baseFilename}.json`);
        await fs.writeFile(jsonFile, JSON.stringify(this.sessionData, null, 2));
        return jsonFile;
        
      case 'html':
        const htmlFile = path.join(this.config.baseDir, `${baseFilename}.html`);
        const htmlContent = await this.convertToHTML(content);
        await fs.writeFile(htmlFile, htmlContent);
        return htmlFile;
        
      default:
        throw new Error(`Format non supporté: ${format}`);
    }
  }
  
  /**
   * Convertir en HTML
   */
  async convertToHTML(markdown) {
    // Implémentation basique - pourrait utiliser marked.js
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Session #${this.sessionData.number}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
        pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 2px 4px; }
        h1, h2, h3 { color: #333; }
        .metadata { background: #e9f5ff; padding: 15px; border-radius: 5px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-box { background: #f8f9fa; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <pre>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;
    
    return html;
  }
  
  /**
   * Mettre à jour l'index de recherche
   */
  async updateSearchIndex() {
    console.log('🔍 Mise à jour de l\'index de recherche...');
    
    let index = { sessions: [], keywords: {}, files: {} };
    
    try {
      // Charger l'index existant
      const existingIndex = await fs.readFile(this.config.indexFile, 'utf8');
      index = JSON.parse(existingIndex);
    } catch (error) {
      // Pas d'index existant
    }
    
    // Ajouter cette session
    const sessionEntry = {
      id: this.generateSessionId(),
      number: this.sessionData.number,
      date: this.sessionData.date.toISOString(),
      category: this.sessionData.category,
      tags: this.sessionData.tags,
      topics: this.sessionData.topics,
      filesCreated: this.sessionData.filesCreated,
      filesModified: this.sessionData.filesModified,
      searchableText: this.generateSearchableText()
    };
    
    index.sessions.push(sessionEntry);
    
    // Indexer les mots-clés
    const keywords = this.extractKeywords();
    for (const keyword of keywords) {
      if (!index.keywords[keyword]) {
        index.keywords[keyword] = [];
      }
      index.keywords[keyword].push(sessionEntry.id);
    }
    
    // Indexer les fichiers
    for (const file of [...this.sessionData.filesCreated, ...this.sessionData.filesModified]) {
      if (!index.files[file]) {
        index.files[file] = [];
      }
      index.files[file].push(sessionEntry.id);
    }
    
    // Sauvegarder l'index
    await fs.writeFile(this.config.indexFile, JSON.stringify(index, null, 2));
  }
  
  /**
   * Générer un texte searchable
   */
  generateSearchableText() {
    return [
      ...this.sessionData.topics,
      ...this.sessionData.tags,
      ...this.sessionData.achievements,
      ...this.sessionData.filesCreated,
      ...this.sessionData.filesModified,
      this.sessionData.category
    ].join(' ').toLowerCase();
  }
  
  /**
   * Extraire les mots-clés
   */
  extractKeywords() {
    const keywords = new Set();
    
    // Depuis les topics
    this.sessionData.topics.forEach(topic => {
      topic.split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word.toLowerCase());
      });
    });
    
    // Depuis les tags
    this.sessionData.tags.forEach(tag => keywords.add(tag.toLowerCase()));
    
    // Depuis les noms de fichiers
    [...this.sessionData.filesCreated, ...this.sessionData.filesModified].forEach(file => {
      const parts = path.basename(file).split(/[-._]/);
      parts.forEach(part => {
        if (part.length > 3) keywords.add(part.toLowerCase());
      });
    });
    
    return Array.from(keywords);
  }
  
  /**
   * Configurer les hooks d'automatisation
   */
  async setupAutomationHooks() {
    console.log('🔧 Configuration des hooks d\'automatisation...');
    
    // Créer un hook Git post-commit
    const hookPath = path.join(__dirname, '../.git/hooks/post-commit');
    const hookContent = `#!/bin/bash
# Auto-save session after commit
if [ -z "$SKIP_SESSION_SAVE" ]; then
  node ${__filename} --auto-commit --category=commit
fi
`;
    
    try {
      await fs.writeFile(hookPath, hookContent);
      await fs.chmod(hookPath, '755');
      console.log('✅ Hook Git post-commit configuré');
    } catch (error) {
      console.warn('⚠️  Impossible de configurer le hook Git');
    }
    
    // Créer un script de watch
    const watchScriptPath = path.join(__dirname, 'watch-session.js');
    const watchScript = `#!/usr/bin/env node
const chokidar = require('chokidar');
const { EnhancedSessionSaver } = require('./save-session-v2');

const watcher = chokidar.watch(['src/**/*.js', 'docs/**/*.md'], {
  ignored: /node_modules/,
  persistent: true
});

let saveTimeout;
const saver = new EnhancedSessionSaver();

watcher.on('change', (path) => {
  console.log(\`File changed: \${path}\`);
  
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await saver.saveSession({ 
      category: 'auto-save',
      tags: ['watch'],
      runTests: false 
    });
  }, 5000);
});

console.log('👁️  Watching for changes...');
`;
    
    try {
      await fs.writeFile(watchScriptPath, watchScript);
      await fs.chmod(watchScriptPath, '755');
      console.log('✅ Script de watch créé');
    } catch (error) {
      console.warn('⚠️  Impossible de créer le script de watch');
    }
  }
  
  /**
   * Générer un ID unique de session
   */
  generateSessionId() {
    const date = this.sessionData.date.toISOString().split('T')[0];
    const hash = crypto.createHash('sha256')
      .update(`${this.sessionData.number}-${date}-${Date.now()}`)
      .digest('hex')
      .substring(0, 8);
    
    return `session-${this.sessionData.number}-${hash}`;
  }
  
  /**
   * Commit automatique de la session
   */
  async commitSession() {
    console.log('📤 Commit automatique de la session...');
    
    try {
      const message = `Session #${this.sessionData.number}: ${this.sessionData.topics.slice(0, 3).join(', ')}`;
      await exec(`git add Derniere-Session/`);
      await exec(`git commit -m "${message}" -m "Auto-saved session"`);
      console.log('✅ Session committée');
    } catch (error) {
      console.warn('⚠️  Impossible de committer la session');
    }
  }
  
  // Hériter des méthodes existantes
  async ensureDirectories() {
    await fs.mkdir(this.config.baseDir, { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'code'), { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'diagrams'), { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'backups'), { recursive: true });
    await fs.mkdir(this.config.conversationDir, { recursive: true });
  }
  
  async getNextSessionNumber() {
    try {
      const files = await fs.readdir(this.config.baseDir);
      const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.md'));
      
      if (sessionFiles.length === 0) return 1;
      
      const numbers = sessionFiles.map(f => {
        const match = f.match(/session-(\d+)-/);
        return match ? parseInt(match[1]) : 0;
      });
      
      return Math.max(...numbers) + 1;
    } catch {
      return 1;
    }
  }
  
  extractTopics() {
    const topics = new Set();
    
    for (const file of [...this.sessionData.filesCreated, ...this.sessionData.filesModified]) {
      if (file.includes('mcp')) topics.add('MCP (Model Context Protocol)');
      if (file.includes('auth')) topics.add('Authentification');
      if (file.includes('docker')) topics.add('Docker & Conteneurisation');
      if (file.includes('restart')) topics.add('Système de redémarrage');
      if (file.includes('discovery')) topics.add('Découverte automatique');
      if (file.includes('integration')) topics.add('Intégration de services');
      if (file.includes('security')) topics.add('Sécurité');
      if (file.includes('docs')) topics.add('Documentation');
      if (file.includes('test')) topics.add('Tests');
      if (file.includes('session')) topics.add('Gestion de sessions');
    }
    
    this.sessionData.topics = Array.from(topics);
    return this.sessionData.topics;
  }
  
  defineAchievements() {
    const achievements = [];
    
    if (this.sessionData.filesCreated.some(f => f.includes('save-session-v2'))) {
      achievements.push('Système de sauvegarde de session v2 avec fonctionnalités avancées');
    }
    
    const docFiles = this.sessionData.filesCreated.filter(f => f.endsWith('.md'));
    if (docFiles.length > 0) {
      achievements.push(`${docFiles.length} documents de documentation créés`);
    }
    
    if (this.sessionData.tests.executed && this.sessionData.tests.failed === 0) {
      achievements.push('Tous les tests passent avec succès');
    }
    
    if (this.sessionData.dependencies.added.length > 0) {
      achievements.push(`${this.sessionData.dependencies.added.length} nouvelles dépendances ajoutées`);
    }
    
    this.sessionData.achievements = achievements;
    return achievements;
  }
  
  estimateDuration() {
    const totalFiles = this.sessionData.filesCreated.length + this.sessionData.filesModified.length;
    const estimatedMinutes = totalFiles * 15;
    
    if (estimatedMinutes < 60) {
      return `~${estimatedMinutes} minutes`;
    } else {
      return `~${Math.round(estimatedMinutes / 60)} heures`;
    }
  }
  
  isLongSession() {
    // Considérer comme longue session si plus de 20 fichiers ou plus de 2h
    const fileCount = this.sessionData.filesCreated.length + this.sessionData.filesModified.length;
    return fileCount > 20;
  }
  
  async createSupplementaryFiles() {
    // Métadonnées JSON complètes
    const metadataPath = path.join(
      this.config.baseDir, 
      `session-${String(this.sessionData.number).padStart(3, '0')}-metadata.json`
    );
    
    await fs.writeFile(metadataPath, JSON.stringify({
      ...this.sessionData,
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        cwd: process.cwd(),
        user: process.env.USER
      }
    }, null, 2));
    
    // Générer un README mis à jour
    await this.generateSummary();
  }
  
  async generateSummary() {
    const summaryPath = path.join(this.config.baseDir, 'README.md');
    
    let summary = `# Historique des Sessions de Développement

## 📚 Sessions Récentes

`;

    const files = await fs.readdir(this.config.baseDir);
    const sessionFiles = files
      .filter(f => f.startsWith('session-') && f.endsWith('.md'))
      .sort()
      .reverse();
    
    for (const file of sessionFiles.slice(0, 10)) {
      const metaFile = file.replace('.md', '-metadata.json');
      try {
        const metadata = JSON.parse(
          await fs.readFile(path.join(this.config.baseDir, metaFile), 'utf8')
        );
        
        summary += `### [${file}](${file})\n`;
        summary += `- **Date**: ${new Date(metadata.date).toLocaleDateString()}\n`;
        summary += `- **Catégorie**: ${metadata.category}\n`;
        summary += `- **Tags**: ${metadata.tags.join(', ') || 'Aucun'}\n`;
        summary += `- **Topics**: ${metadata.topics.slice(0, 3).join(', ')}\n`;
        summary += `- **Fichiers**: ${metadata.filesCreated.length} créés, ${metadata.filesModified.length} modifiés\n\n`;
      } catch {
        // Fallback pour les anciennes sessions
        summary += `### [${file}](${file})\n\n`;
      }
    }
    
    summary += `
## 📊 Statistiques Globales

- **Total de sessions** : ${sessionFiles.length}
- **Dernière session** : ${sessionFiles[0] || 'Aucune'}
- **Première session** : ${sessionFiles[sessionFiles.length - 1] || 'Aucune'}

## 🔍 Recherche

Pour rechercher dans les sessions:
\`\`\`bash
# Rechercher par mot-clé
node scripts/search-sessions.js "mot-clé"

# Rechercher par fichier
node scripts/search-sessions.js --file "nom-fichier.js"

# Rechercher par tag
node scripts/search-sessions.js --tag "feature"
\`\`\`

---

*Mis à jour le ${new Date().toLocaleString()}*
`;

    await fs.writeFile(summaryPath, summary);
  }
}

// Fonction principale pour CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {
    conversationFile: null,
    category: 'general',
    tags: [],
    autoCommit: false,
    runTests: true,
    includeDiffs: true,
    generateAISummary: false,
    exportFormats: ['md', 'json']
  };
  
  // Parser les arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--conversation-file':
      case '-c':
        options.conversationFile = args[++i];
        break;
      case '--category':
        options.category = args[++i];
        break;
      case '--tags':
        options.tags = args[++i].split(',');
        break;
      case '--auto-commit':
        options.autoCommit = true;
        break;
      case '--no-tests':
        options.runTests = false;
        break;
      case '--no-diffs':
        options.includeDiffs = false;
        break;
      case '--ai-summary':
        options.generateAISummary = true;
        break;
      case '--format':
        options.exportFormats = args[++i].split(',');
        break;
      case '--help':
        console.log(`
Usage: node save-session-v2.js [options]

Options:
  -c, --conversation-file <file>  Fichier de conversation à inclure
  --category <category>           Catégorie de session (feature, bugfix, etc.)
  --tags <tag1,tag2>             Tags séparés par des virgules
  --auto-commit                   Committer automatiquement la session
  --no-tests                      Ne pas exécuter les tests
  --no-diffs                      Ne pas inclure les diffs Git
  --ai-summary                    Générer un résumé AI
  --format <md,json,html>        Formats d'export (défaut: md,json)
  --help                          Afficher cette aide

Exemples:
  node save-session-v2.js --category feature --tags "mcp,auth"
  node save-session-v2.js -c conversation.json --auto-commit
  node save-session-v2.js --format md,json,html --ai-summary
        `);
        process.exit(0);
    }
  }
  
  // Définir les prochaines étapes par défaut
  const saver = new EnhancedSessionSaver();
  saver.sessionData.nextSteps = [
    'Implémenter la capture automatique des conversations Claude',
    'Ajouter l\'intégration avec les outils de gestion de projet',
    'Créer une interface web pour parcourir les sessions',
    'Implémenter la génération de rapports PDF',
    'Ajouter des webhooks pour les notifications'
  ];
  
  try {
    const filename = await saver.saveSession(options);
    
    console.log(`
📄 Session sauvegardée!
📁 Emplacement: ${saver.config.baseDir}

Pour rechercher dans les sessions:
  node scripts/search-sessions.js "terme"

Pour démarrer le watch automatique:
  node scripts/watch-session.js
    `);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { EnhancedSessionSaver };