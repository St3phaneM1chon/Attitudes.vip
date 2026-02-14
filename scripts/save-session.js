#!/usr/bin/env node

/**
 * Script de sauvegarde de session de développement
 * 
 * Capture et organise tout le travail effectué pendant une session :
 * - Discussion complète
 * - Code généré
 * - Fichiers modifiés
 * - Méta-données de la session
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class SessionSaver {
  constructor() {
    this.config = {
      // Répertoire de sauvegarde
      baseDir: path.join(__dirname, '../Derniere-Session'),
      
      // Format du nom de fichier
      fileFormat: 'session-{number}-{date}.md',
      
      // Fichiers à inclure
      includePatterns: [
        'src/**/*.js',
        'scripts/**/*.sh',
        'scripts/**/*.js',
        'docs/**/*.md',
        '*.json',
        '*.yml',
        '*.yaml',
        '.env.example'
      ],
      
      // Fichiers à exclure
      excludePatterns: [
        'node_modules',
        '.git',
        'dist',
        'build',
        'logs',
        'data',
        '*.log'
      ],
      
      // Métadonnées à capturer
      metadata: {
        projectName: 'AttitudesFramework',
        version: '1.0.0',
        author: 'Session Claude + User'
      }
    };
    
    this.sessionData = {
      number: 0,
      date: new Date(),
      startTime: null,
      endTime: null,
      filesCreated: [],
      filesModified: [],
      topics: [],
      achievements: [],
      nextSteps: []
    };
  }
  
  /**
   * Sauvegarder la session actuelle
   */
  async saveSession(conversationData = null) {
    console.log('💾 Sauvegarde de la session en cours...');
    
    try {
      // 1. Préparer le répertoire
      await this.ensureDirectory();
      
      // 2. Déterminer le numéro de session
      this.sessionData.number = await this.getNextSessionNumber();
      
      // 3. Collecter les informations de la session
      await this.collectSessionInfo();
      
      // 4. Générer le contenu du fichier
      const content = await this.generateSessionContent(conversationData);
      
      // 5. Sauvegarder le fichier
      const filename = await this.saveToFile(content);
      
      // 6. Créer des fichiers supplémentaires
      await this.createSupplementaryFiles();
      
      // 7. Générer un résumé
      await this.generateSummary();
      
      console.log(`✅ Session sauvegardée : ${filename}`);
      
      return filename;
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde :', error);
      throw error;
    }
  }
  
  /**
   * Créer le répertoire si nécessaire
   */
  async ensureDirectory() {
    await fs.mkdir(this.config.baseDir, { recursive: true });
    
    // Créer les sous-répertoires
    await fs.mkdir(path.join(this.config.baseDir, 'code'), { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'diagrams'), { recursive: true });
    await fs.mkdir(path.join(this.config.baseDir, 'backups'), { recursive: true });
  }
  
  /**
   * Obtenir le prochain numéro de session
   */
  async getNextSessionNumber() {
    try {
      const files = await fs.readdir(this.config.baseDir);
      const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.md'));
      
      if (sessionFiles.length === 0) return 1;
      
      // Extraire les numéros
      const numbers = sessionFiles.map(f => {
        const match = f.match(/session-(\d+)-/);
        return match ? parseInt(match[1]) : 0;
      });
      
      return Math.max(...numbers) + 1;
      
    } catch {
      return 1;
    }
  }
  
  /**
   * Collecter les informations de la session
   */
  async collectSessionInfo() {
    // Obtenir les fichiers modifiés via Git
    try {
      const { stdout: gitStatus } = await exec('git status --porcelain');
      const lines = gitStatus.trim().split('\n').filter(Boolean);
      
      for (const line of lines) {
        const status = line.substring(0, 2).trim();
        const file = line.substring(3);
        
        if (status === 'A' || status === '??') {
          this.sessionData.filesCreated.push(file);
        } else if (status === 'M') {
          this.sessionData.filesModified.push(file);
        }
      }
      
      // Obtenir le dernier commit
      const { stdout: lastCommit } = await exec('git log -1 --oneline');
      this.sessionData.lastCommit = lastCommit.trim();
      
    } catch (error) {
      console.warn('⚠️  Git non disponible, analyse limitée');
    }
    
    // Analyser les topics de la session
    this.sessionData.topics = this.extractTopics();
    
    // Définir les achievements
    this.sessionData.achievements = this.defineAchievements();
  }
  
  /**
   * Générer le contenu de la session
   */
  async generateSessionContent(conversationData) {
    const date = this.sessionData.date.toISOString().split('T')[0];
    const time = this.sessionData.date.toLocaleTimeString();
    
    let content = `# Session de Développement #${this.sessionData.number} - ${date}

## 📋 Métadonnées

- **Date** : ${date}
- **Heure** : ${time}
- **Projet** : ${this.config.metadata.projectName}
- **Version** : ${this.config.metadata.version}
- **Durée estimée** : ${this.estimateDuration()}

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

${conversationData || '*[La conversation sera ajoutée ici]*'}

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
    
    // Ajouter les modifications importantes
    if (this.sessionData.filesModified.length > 0) {
      content += `## 📝 Modifications Importantes\n\n`;
      
      // Pour les fichiers modifiés, on pourrait montrer les diffs
      content += `*[Les modifications détaillées peuvent être consultées via \`git diff\`]*\n\n`;
    }
    
    // Ajouter les prochaines étapes
    content += `## 🚀 Prochaines Étapes

${this.sessionData.nextSteps.length > 0 ?
  this.sessionData.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n') :
  '*[À définir]*'}

---

## 📊 Statistiques de la Session

- **Lignes de code ajoutées** : ${await this.countLinesAdded()}
- **Nouveaux fichiers** : ${this.sessionData.filesCreated.length}
- **Fichiers modifiés** : ${this.sessionData.filesModified.length}
- **Commits** : ${this.sessionData.lastCommit || 'Aucun'}

---

*Session sauvegardée automatiquement le ${new Date().toLocaleString()}*
`;

    return content;
  }
  
  /**
   * Sauvegarder dans un fichier
   */
  async saveToFile(content) {
    const date = this.sessionData.date.toISOString().split('T')[0];
    const filename = `session-${String(this.sessionData.number).padStart(3, '0')}-${date}.md`;
    const filepath = path.join(this.config.baseDir, filename);
    
    await fs.writeFile(filepath, content);
    
    // Créer aussi une copie de sauvegarde
    const backupPath = path.join(this.config.baseDir, 'backups', filename);
    await fs.writeFile(backupPath, content);
    
    return filename;
  }
  
  /**
   * Créer des fichiers supplémentaires
   */
  async createSupplementaryFiles() {
    // 1. Fichier de métadonnées JSON
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
        cwd: process.cwd()
      }
    }, null, 2));
    
    // 2. Archive du code
    if (this.sessionData.filesCreated.length > 0) {
      const codeArchive = path.join(
        this.config.baseDir,
        'code',
        `session-${String(this.sessionData.number).padStart(3, '0')}-code.tar.gz`
      );
      
      try {
        const files = this.sessionData.filesCreated.join(' ');
        await exec(`tar czf "${codeArchive}" ${files}`);
      } catch (error) {
        console.warn('⚠️  Impossible de créer l\'archive du code');
      }
    }
  }
  
  /**
   * Générer un résumé global
   */
  async generateSummary() {
    const summaryPath = path.join(this.config.baseDir, 'README.md');
    
    let summary = `# Historique des Sessions de Développement

## 📚 Sessions Récentes

`;

    // Lister toutes les sessions
    const files = await fs.readdir(this.config.baseDir);
    const sessionFiles = files
      .filter(f => f.startsWith('session-') && f.endsWith('.md'))
      .sort()
      .reverse();
    
    for (const file of sessionFiles.slice(0, 10)) {
      const filePath = path.join(this.config.baseDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Extraire le résumé
      const match = content.match(/## 🎯 Résumé de la Session\n\n### Topics abordés\n([\s\S]*?)\n\n### Réalisations principales/);
      const topics = match ? match[1].split('\n').filter(l => l.startsWith('-')).slice(0, 3) : [];
      
      summary += `### [${file}](${file})\n`;
      summary += topics.join('\n') + '\n\n';
    }
    
    summary += `\n## 📊 Statistiques Globales

- **Total de sessions** : ${sessionFiles.length}
- **Dernière session** : ${sessionFiles[0] || 'Aucune'}
- **Première session** : ${sessionFiles[sessionFiles.length - 1] || 'Aucune'}

---

*Mis à jour le ${new Date().toLocaleString()}*
`;

    await fs.writeFile(summaryPath, summary);
  }
  
  /**
   * Méthodes utilitaires
   */
  
  extractTopics() {
    // Analyser les fichiers créés pour déduire les topics
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
    }
    
    return Array.from(topics);
  }
  
  defineAchievements() {
    const achievements = [];
    
    // Basé sur les fichiers créés
    if (this.sessionData.filesCreated.some(f => f.includes('mcp-self-check-v2'))) {
      achievements.push('Système MCP Self-Check V2 avec apprentissage');
    }
    if (this.sessionData.filesCreated.some(f => f.includes('discovery-agent'))) {
      achievements.push('Agent de découverte MCP hebdomadaire');
    }
    if (this.sessionData.filesCreated.some(f => f.includes('restart'))) {
      achievements.push('Système de redémarrage complet');
    }
    if (this.sessionData.filesCreated.some(f => f.includes('integration-bridge'))) {
      achievements.push('Intégration automatique Discovery ↔ Self-Check');
    }
    
    // Basé sur la documentation
    const docFiles = this.sessionData.filesCreated.filter(f => f.endsWith('.md'));
    if (docFiles.length > 0) {
      achievements.push(`${docFiles.length} documents de documentation créés`);
    }
    
    return achievements;
  }
  
  estimateDuration() {
    // Estimer basé sur le nombre de fichiers
    const totalFiles = this.sessionData.filesCreated.length + this.sessionData.filesModified.length;
    const estimatedMinutes = totalFiles * 15; // 15 minutes par fichier en moyenne
    
    if (estimatedMinutes < 60) {
      return `~${estimatedMinutes} minutes`;
    } else {
      return `~${Math.round(estimatedMinutes / 60)} heures`;
    }
  }
  
  async countLinesAdded() {
    let totalLines = 0;
    
    for (const file of this.sessionData.filesCreated) {
      try {
        const filePath = path.join(__dirname, '..', file);
        const content = await fs.readFile(filePath, 'utf8');
        totalLines += content.split('\n').length;
      } catch {
        // Ignorer les erreurs
      }
    }
    
    return totalLines;
  }
}

// Fonction principale pour utilisation CLI
async function main() {
  const saver = new SessionSaver();
  
  // Définir les prochaines étapes (peut être personnalisé)
  saver.sessionData.nextSteps = [
    'Tester l\'intégration MCP complète',
    'Configurer les services externes (Stripe, Twilio)',
    'Déployer en environnement de staging',
    'Former l\'équipe sur les nouveaux outils',
    'Optimiser les performances'
  ];
  
  // Note: Dans une vraie implémentation, on pourrait capturer la conversation
  // depuis l'API Claude ou depuis un fichier de log
  const conversationPlaceholder = `
### Début de la session

**User**: [Demande initiale sur l'analyse du projet et création de documentation]

**Assistant**: J'ai analysé le projet et créé une documentation complète...

[... reste de la conversation ...]

### Fin de la session

*Note: Pour une capture complète de la conversation, intégrer avec l'API Claude ou utiliser un système de logging.*
`;
  
  try {
    const filename = await saver.saveSession(conversationPlaceholder);
    console.log(`\n✨ Session sauvegardée avec succès !`);
    console.log(`📄 Fichier : ${filename}`);
    console.log(`📁 Emplacement : ${saver.config.baseDir}`);
    
    // Afficher un résumé
    console.log(`\n📊 Résumé :`);
    console.log(`- Fichiers créés : ${saver.sessionData.filesCreated.length}`);
    console.log(`- Fichiers modifiés : ${saver.sessionData.filesModified.length}`);
    console.log(`- Topics : ${saver.sessionData.topics.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = { SessionSaver };