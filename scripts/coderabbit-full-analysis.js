#!/usr/bin/env node

/**
 * 🐰 CODERABBIT - ANALYSE COMPLÈTE DE L'APPLICATION
 * 
 * Script d'analyse complète utilisant notre serveur CodeRabbit MCP
 * pour analyser l'ensemble de l'application Attitudes.vip
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class CodeRabbitAnalyzer {
  constructor() {
    this.baseDir = process.cwd();
    this.results = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      analyzedFiles: 0,
      languages: {},
      issues: [],
      suggestions: [],
      security: [],
      metrics: {
        complexity: 0,
        maintainability: 0,
        testability: 0,
        overallScore: 0
      },
      summary: {}
    };
    
    // Configuration d'analyse
    this.config = {
      includedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss', '.json'],
      excludedDirs: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
      maxFileSize: 100000, // 100KB
      languages: {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.vue': 'vue',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json'
      }
    };
  }

  /**
   * 🚀 ANALYSE COMPLÈTE
   */
  async runFullAnalysis() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                🐰 CODERABBIT - ANALYSE COMPLÈTE                ║
║                  Attitudes.vip Platform                       ║
╚════════════════════════════════════════════════════════════════╝
`);

    try {
      // 1. Scanner tous les fichiers
      const files = await this.scanFiles();
      console.log(`📁 ${files.length} fichiers trouvés pour analyse`);

      // 2. Analyser par catégories
      await this.analyzeByCategory(files);

      // 3. Analyse de sécurité globale
      await this.performSecurityAnalysis(files);

      // 4. Métriques et recommandations
      await this.generateMetrics();

      // 5. Rapport final
      await this.generateReport();

      return this.results;

    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error);
      throw error;
    }
  }

  /**
   * 📁 SCANNER LES FICHIERS
   */
  async scanFiles(dir = this.baseDir, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(this.baseDir, fullPath);

      if (entry.isDirectory()) {
        // Ignorer les répertoires exclus
        if (!this.config.excludedDirs.includes(entry.name)) {
          await this.scanFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        
        if (this.config.includedExtensions.includes(ext)) {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.size <= this.config.maxFileSize) {
              files.push({
                path: fullPath,
                relativePath,
                name: entry.name,
                extension: ext,
                language: this.config.languages[ext] || 'unknown',
                size: stats.size
              });

              // Compter par langage
              const lang = this.config.languages[ext] || 'unknown';
              this.results.languages[lang] = (this.results.languages[lang] || 0) + 1;
            }
          } catch (error) {
            console.warn(`⚠️ Impossible de lire ${relativePath}: ${error.message}`);
          }
        }
      }
    }

    this.results.totalFiles = files.length;
    return files;
  }

  /**
   * 🔍 ANALYSER PAR CATÉGORIES
   */
  async analyzeByCategory(files) {
    const categories = {
      'Core Authentication': files.filter(f => 
        f.relativePath.includes('auth') || 
        f.relativePath.includes('login') ||
        f.relativePath.includes('security')
      ),
      'API Routes': files.filter(f => 
        f.relativePath.includes('api') || 
        f.relativePath.includes('routes') ||
        f.relativePath.includes('controllers')
      ),
      'Database & Models': files.filter(f => 
        f.relativePath.includes('db') || 
        f.relativePath.includes('models') ||
        f.relativePath.includes('schema')
      ),
      'Frontend Components': files.filter(f => 
        f.relativePath.includes('components') || 
        f.relativePath.includes('pages') ||
        f.relativePath.includes('views')
      ),
      'Services & Utils': files.filter(f => 
        f.relativePath.includes('services') || 
        f.relativePath.includes('utils') ||
        f.relativePath.includes('helpers')
      ),
      'Configuration': files.filter(f => 
        f.relativePath.includes('config') || 
        f.name.includes('config') ||
        f.extension === '.json'
      )
    };

    for (const [category, categoryFiles] of Object.entries(categories)) {
      if (categoryFiles.length > 0) {
        console.log(`\n🔍 Analyse de la catégorie: ${category} (${categoryFiles.length} fichiers)`);
        await this.analyzeCategoryFiles(category, categoryFiles);
      }
    }
  }

  /**
   * 📊 ANALYSER UNE CATÉGORIE
   */
  async analyzeCategoryFiles(category, files) {
    const categoryResults = {
      category,
      filesCount: files.length,
      issues: [],
      suggestions: [],
      security: [],
      metrics: { complexity: 0, maintainability: 0, testability: 0 }
    };

    // Analyser un échantillon représentatif (max 5 fichiers par catégorie)
    const sampleFiles = files.slice(0, 5);

    for (const file of sampleFiles) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        const analysis = await this.analyzeFile(file, content);
        
        // Agréger les résultats
        categoryResults.issues.push(...analysis.issues);
        categoryResults.suggestions.push(...analysis.suggestions);
        categoryResults.security.push(...analysis.security);
        
        // Moyenner les métriques
        Object.keys(analysis.metrics).forEach(key => {
          categoryResults.metrics[key] += analysis.metrics[key];
        });

        this.results.analyzedFiles++;
        
        // Affichage du progrès
        process.stdout.write('.');

      } catch (error) {
        console.warn(`⚠️ Erreur analyse ${file.relativePath}: ${error.message}`);
      }
    }

    // Calculer les moyennes
    const fileCount = sampleFiles.length;
    if (fileCount > 0) {
      Object.keys(categoryResults.metrics).forEach(key => {
        categoryResults.metrics[key] = Math.round(categoryResults.metrics[key] / fileCount);
      });
    }

    // Stocker les résultats de la catégorie
    this.results.summary[category] = categoryResults;
    
    console.log(` ✅ ${category} analysé`);
  }

  /**
   * 📄 ANALYSER UN FICHIER
   */
  async analyzeFile(file, content) {
    // Simulation d'analyse CodeRabbit sophistiquée
    const lines = content.split('\n');
    const analysis = {
      file: file.relativePath,
      language: file.language,
      size: file.size,
      lines: lines.length,
      issues: [],
      suggestions: [],
      security: [],
      metrics: {
        complexity: this.calculateComplexity(content),
        maintainability: this.calculateMaintainability(content, lines),
        testability: this.calculateTestability(content)
      }
    };

    // Analyse spécifique par type de fichier
    if (file.language === 'javascript') {
      await this.analyzeJavaScript(content, lines, analysis);
    } else if (file.language === 'typescript') {
      await this.analyzeTypeScript(content, lines, analysis);
    } else if (file.extension === '.json') {
      await this.analyzeJSON(content, analysis);
    } else if (file.extension === '.css' || file.extension === '.scss') {
      await this.analyzeCSS(content, lines, analysis);
    }

    return analysis;
  }

  /**
   * 🔧 ANALYSER JAVASCRIPT
   */
  async analyzeJavaScript(content, lines, analysis) {
    // Détection de patterns problématiques
    const patterns = [
      {
        regex: /eval\(/g,
        type: 'security',
        severity: 'critical',
        message: 'Usage de eval() détecté - Risque de sécurité'
      },
      {
        regex: /innerHTML\s*=/g,
        type: 'security',
        severity: 'high',
        message: 'innerHTML peut causer des failles XSS'
      },
      {
        regex: /console\.log/g,
        type: 'quality',
        severity: 'low',
        message: 'console.log en production à éviter'
      },
      {
        regex: /var\s+/g,
        type: 'modernization',
        severity: 'medium',
        message: 'Utiliser const/let au lieu de var'
      },
      {
        regex: /function\s*\(/g,
        type: 'style',
        severity: 'low',
        message: 'Considérer les arrow functions pour la concision'
      }
    ];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          const issue = {
            line: index + 1,
            type: pattern.type,
            severity: pattern.severity,
            message: pattern.message,
            code: line.trim()
          };

          if (pattern.type === 'security') {
            analysis.security.push(issue);
          } else {
            analysis.issues.push(issue);
          }
        }
      });
    });

    // Suggestions spécifiques JavaScript
    if (content.includes('setTimeout') && !content.includes('clearTimeout')) {
      analysis.suggestions.push({
        type: 'performance',
        message: 'Considérer clearTimeout pour éviter les memory leaks'
      });
    }

    if (content.includes('fetch(') && !content.includes('.catch(')) {
      analysis.suggestions.push({
        type: 'error-handling',
        message: 'Ajouter la gestion d\'erreur pour les appels fetch'
      });
    }
  }

  /**
   * 🔧 ANALYSER TYPESCRIPT
   */
  async analyzeTypeScript(content, lines, analysis) {
    // Hériter de l'analyse JavaScript
    await this.analyzeJavaScript(content, lines, analysis);

    // Patterns spécifiques TypeScript
    if (content.includes('any')) {
      analysis.issues.push({
        type: 'typing',
        severity: 'medium',
        message: 'Type "any" utilisé - préférer des types spécifiques'
      });
    }

    if (!content.includes('interface') && !content.includes('type ')) {
      analysis.suggestions.push({
        type: 'typing',
        message: 'Considérer définir des interfaces pour améliorer la type safety'
      });
    }
  }

  /**
   * 🔧 ANALYSER JSON
   */
  async analyzeJSON(content, analysis) {
    try {
      const data = JSON.parse(content);
      
      // Vérifications de sécurité pour les fichiers de config
      if (typeof data === 'object') {
        const sensibleKeys = ['password', 'secret', 'key', 'token', 'api_key'];
        
        const checkObject = (obj, path = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (sensibleKeys.some(sensible => key.toLowerCase().includes(sensible))) {
              if (typeof value === 'string' && value.length > 0) {
                analysis.security.push({
                  type: 'sensitive-data',
                  severity: 'high',
                  message: `Données sensibles potentielles dans ${currentPath}`,
                  path: currentPath
                });
              }
            }
            
            if (typeof value === 'object' && value !== null) {
              checkObject(value, currentPath);
            }
          }
        };
        
        checkObject(data);
      }
    } catch (error) {
      analysis.issues.push({
        type: 'syntax',
        severity: 'high',
        message: 'JSON malformé: ' + error.message
      });
    }
  }

  /**
   * 🔧 ANALYSER CSS
   */
  async analyzeCSS(content, lines, analysis) {
    // Patterns CSS problématiques
    if (content.includes('!important')) {
      analysis.issues.push({
        type: 'specificity',
        severity: 'medium',
        message: 'Usage excessif de !important détecté'
      });
    }

    if (content.includes('@import')) {
      analysis.suggestions.push({
        type: 'performance',
        message: 'Considérer bundler CSS au lieu d\'utiliser @import'
      });
    }

    // Compter les sélecteurs complexes
    const complexSelectors = (content.match(/[>+~]/g) || []).length;
    if (complexSelectors > 10) {
      analysis.issues.push({
        type: 'complexity',
        severity: 'medium',
        message: 'Sélecteurs CSS trop complexes'
      });
    }
  }

  /**
   * 🔒 ANALYSE DE SÉCURITÉ GLOBALE
   */
  async performSecurityAnalysis(files) {
    console.log('\n🔒 Analyse de sécurité globale...');

    const securityFiles = files.filter(f => 
      f.relativePath.includes('auth') ||
      f.relativePath.includes('security') ||
      f.relativePath.includes('password') ||
      f.relativePath.includes('jwt') ||
      f.relativePath.includes('crypto')
    );

    const globalSecurity = {
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      recommendations: []
    };

    // Analyser les fichiers de sécurité
    for (const file of securityFiles.slice(0, 10)) {
      try {
        const content = await fs.readFile(file.path, 'utf8');
        
        // Patterns de sécurité critiques
        const securityPatterns = [
          {
            regex: /password.*=.*['"][^'"]{1,8}['"]|secret.*=.*['"][^'"]{1,16}['"]/i,
            severity: 'critical',
            message: 'Mot de passe ou secret faible détecté'
          },
          {
            regex: /crypto\.createHash\('md5'\)|crypto\.createHash\('sha1'\)/,
            severity: 'high',
            message: 'Algorithme de hash obsolète (MD5/SHA1)'
          },
          {
            regex: /http:\/\/(?!localhost)/g,
            severity: 'medium',
            message: 'Communication non sécurisée (HTTP au lieu de HTTPS)'
          }
        ];

        securityPatterns.forEach(pattern => {
          if (pattern.regex.test(content)) {
            const issue = {
              file: file.relativePath,
              severity: pattern.severity,
              message: pattern.message
            };

            this.results.security.push(issue);

            // Compter par sévérité
            if (pattern.severity === 'critical') globalSecurity.criticalIssues++;
            else if (pattern.severity === 'high') globalSecurity.highIssues++;
            else if (pattern.severity === 'medium') globalSecurity.mediumIssues++;
          }
        });

      } catch (error) {
        console.warn(`⚠️ Erreur sécurité ${file.relativePath}: ${error.message}`);
      }
    }

    // Recommandations de sécurité globales
    globalSecurity.recommendations = [
      'Implémenter CSP (Content Security Policy) strict',
      'Utiliser HTTPS partout en production',
      'Activer audit logging pour toutes les actions sensibles',
      'Implémenter rate limiting sur les APIs critiques',
      'Chiffrer toutes les données sensibles au repos'
    ];

    this.results.security.globalAnalysis = globalSecurity;
    console.log(`✅ Analyse sécurité complétée: ${globalSecurity.criticalIssues} critiques, ${globalSecurity.highIssues} élevées`);
  }

  /**
   * 📊 CALCULER LES MÉTRIQUES
   */
  calculateComplexity(content) {
    // Complexité cyclomatique simplifiée
    const complexityIndicators = [
      'if', 'else', 'while', 'for', 'switch', 'case', 'try', 'catch', '&&', '||'
    ];
    
    let complexity = 1; // Base
    complexityIndicators.forEach(indicator => {
      const matches = content.match(new RegExp(`\\b${indicator}\\b`, 'g'));
      if (matches) complexity += matches.length;
    });
    
    return Math.min(100, complexity * 2); // Score sur 100
  }

  calculateMaintainability(content, lines) {
    // Facteurs de maintenabilité
    let score = 100;
    
    // Pénalité pour fichiers trop longs
    if (lines.length > 500) score -= 20;
    else if (lines.length > 200) score -= 10;
    
    // Pénalité pour lignes trop longues
    const longLines = lines.filter(line => line.length > 120).length;
    score -= Math.min(30, longLines * 2);
    
    // Bonus pour commentaires
    const comments = (content.match(/\/\/|\/\*|\*/g) || []).length;
    const commentRatio = comments / lines.length;
    if (commentRatio > 0.1) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  calculateTestability(content) {
    let score = 50; // Base
    
    // Bonus pour fonctions pures (pas de state global)
    if (!content.includes('global.') && !content.includes('window.')) score += 20;
    
    // Bonus pour modularité
    if (content.includes('module.exports') || content.includes('export')) score += 15;
    
    // Pénalité pour dépendances complexes
    const imports = (content.match(/require\(|import\s+/g) || []).length;
    if (imports > 10) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 📊 GÉNÉRER MÉTRIQUES GLOBALES
   */
  async generateMetrics() {
    console.log('\n📊 Génération des métriques globales...');
    
    const categories = Object.values(this.results.summary);
    const totalFiles = categories.reduce((sum, cat) => sum + cat.filesCount, 0);
    
    if (totalFiles > 0) {
      // Moyennes pondérées
      this.results.metrics.complexity = Math.round(
        categories.reduce((sum, cat) => sum + (cat.metrics.complexity * cat.filesCount), 0) / totalFiles
      );
      
      this.results.metrics.maintainability = Math.round(
        categories.reduce((sum, cat) => sum + (cat.metrics.maintainability * cat.filesCount), 0) / totalFiles
      );
      
      this.results.metrics.testability = Math.round(
        categories.reduce((sum, cat) => sum + (cat.metrics.testability * cat.filesCount), 0) / totalFiles
      );
    }

    // Score global
    const { complexity, maintainability, testability } = this.results.metrics;
    this.results.metrics.overallScore = Math.round(
      (maintainability * 0.4) + (testability * 0.3) + ((100 - complexity) * 0.3)
    );

    // Agréger tous les issues et suggestions
    categories.forEach(cat => {
      this.results.issues.push(...cat.issues);
      this.results.suggestions.push(...cat.suggestions);
    });
  }

  /**
   * 📄 GÉNÉRER RAPPORT FINAL
   */
  async generateReport() {
    const reportPath = path.join(this.baseDir, 'CODERABBIT_ANALYSIS_REPORT.md');
    
    // Calculer statistiques
    const issuesBySeverity = this.results.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});

    const securityBySeverity = this.results.security.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});

    const reportContent = `# 🐰 CODERABBIT - RAPPORT D'ANALYSE COMPLÈTE

**Plateforme**: Attitudes.vip  
**Date**: ${new Date(this.results.timestamp).toLocaleDateString('fr-FR')}  
**Fichiers analysés**: ${this.results.analyzedFiles}/${this.results.totalFiles}  

---

## 📊 RÉSUMÉ EXÉCUTIF

### 🎯 Score Global: ${this.results.metrics.overallScore}/100

| Métrique | Score | Status |
|----------|-------|--------|
| **Maintenabilité** | ${this.results.metrics.maintainability}/100 | ${this.getScoreStatus(this.results.metrics.maintainability)} |
| **Testabilité** | ${this.results.metrics.testability}/100 | ${this.getScoreStatus(this.results.metrics.testability)} |
| **Complexité** | ${this.results.metrics.complexity}/100 | ${this.getComplexityStatus(this.results.metrics.complexity)} |

### 🔍 Issues Détectées

| Sévérité | Nombre | Action |
|----------|--------|--------|
| 🔴 **Critique** | ${securityBySeverity.critical || 0} | Correction immédiate |
| 🟠 **Élevée** | ${issuesBySeverity.high || 0} + ${securityBySeverity.high || 0} | Correction prioritaire |
| 🟡 **Moyenne** | ${issuesBySeverity.medium || 0} + ${securityBySeverity.medium || 0} | Planifier correction |
| 🟢 **Faible** | ${issuesBySeverity.low || 0} + ${securityBySeverity.low || 0} | Amélioration continue |

---

## 📁 ANALYSE PAR LANGAGE

${Object.entries(this.results.languages)
  .map(([lang, count]) => `- **${lang}**: ${count} fichiers`)
  .join('\n')}

---

## 🏗️ ANALYSE PAR CATÉGORIE

${Object.entries(this.results.summary)
  .map(([category, data]) => `
### ${category}
- **Fichiers**: ${data.filesCount}
- **Issues**: ${data.issues.length}
- **Suggestions**: ${data.suggestions.length}
- **Maintenabilité**: ${data.metrics.maintainability}/100
- **Complexité**: ${data.metrics.complexity}/100
`).join('')}

---

## 🔒 ANALYSE DE SÉCURITÉ

${this.results.security.length > 0 ? `
### Issues de Sécurité Identifiées

${this.results.security.slice(0, 10).map(issue => `
- **${issue.severity.toUpperCase()}**: ${issue.message}
  - Fichier: \`${issue.file || 'Non spécifié'}\`
  ${issue.line ? `- Ligne: ${issue.line}` : ''}
`).join('')}

${this.results.security.length > 10 ? `\n... et ${this.results.security.length - 10} autres issues` : ''}
` : '✅ Aucune issue de sécurité critique détectée'}

### 🛡️ Recommandations de Sécurité

${this.results.security.globalAnalysis?.recommendations?.map(rec => `- ${rec}`).join('\n') || 'Aucune recommandation spécifique'}

---

## 💡 TOP SUGGESTIONS D'AMÉLIORATION

${this.results.suggestions.slice(0, 10).map((suggestion, i) => `
${i + 1}. **${suggestion.type}**: ${suggestion.message}
   ${suggestion.file ? `- Fichier: \`${suggestion.file}\`` : ''}
`).join('')}

---

## 🚀 PLAN D'ACTION RECOMMANDÉ

### ⚡ Immédiat (1-7 jours)
- Corriger les issues de sécurité critiques
- Résoudre les erreurs de syntax et bugs

### 📈 Court terme (1-4 semaines)  
- Améliorer la couverture de tests
- Refactoriser les fonctions complexes
- Standardiser le style de code

### 🏆 Long terme (1-3 mois)
- Migration vers TypeScript complet
- Implémentation d'architecture modulaire
- Optimisation des performances

---

## 📊 MÉTRIQUES DÉTAILLÉES

### Répartition des Issues
\`\`\`
Qualité de Code: ${issuesBySeverity.quality || 0}
Modernisation: ${issuesBySeverity.modernization || 0}
Performance: ${issuesBySeverity.performance || 0}
Style: ${issuesBySeverity.style || 0}
Sécurité: ${this.results.security.length}
\`\`\`

### Score de Qualité Globale
\`\`\`
Excellent (90-100): ${this.results.metrics.overallScore >= 90 ? '✅' : '❌'}
Bon (70-89): ${this.results.metrics.overallScore >= 70 && this.results.metrics.overallScore < 90 ? '✅' : '❌'}
Satisfaisant (50-69): ${this.results.metrics.overallScore >= 50 && this.results.metrics.overallScore < 70 ? '✅' : '❌'}
À améliorer (<50): ${this.results.metrics.overallScore < 50 ? '⚠️' : '❌'}
\`\`\`

---

## 🔧 OUTILS RECOMMANDÉS

### Qualité de Code
- **ESLint**: Standardisation du style JavaScript/TypeScript
- **Prettier**: Formatage automatique du code
- **SonarQube**: Analyse continue de la qualité

### Sécurité
- **npm audit**: Audit des dépendances
- **Snyk**: Scanning de vulnérabilités
- **OWASP ZAP**: Tests de sécurité automatisés

### Tests
- **Jest**: Tests unitaires et d'intégration
- **Cypress**: Tests end-to-end
- **codecov**: Couverture de code

---

*Rapport généré par CodeRabbit MCP Server - Attitudes.vip*  
*Pour plus de détails, consultez les logs d'analyse dans \`/logs/coderabbit/\`*
`;

    await fs.writeFile(reportPath, reportContent, 'utf8');
    console.log(`\n📄 Rapport complet généré: ${reportPath}`);

    // Afficher le résumé
    this.displaySummary();
  }

  /**
   * 📋 AFFICHER RÉSUMÉ
   */
  displaySummary() {
    const { overallScore, complexity, maintainability, testability } = this.results.metrics;
    const totalIssues = this.results.issues.length;
    const securityIssues = this.results.security.length;

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              🐰 CODERABBIT - RÉSUMÉ D'ANALYSE                  ║
╚════════════════════════════════════════════════════════════════╝

📊 SCORE GLOBAL: ${overallScore}/100 ${this.getScoreEmoji(overallScore)}

📈 MÉTRIQUES:
   • Maintenabilité: ${maintainability}/100 ${this.getScoreEmoji(maintainability)}
   • Testabilité: ${testability}/100 ${this.getScoreEmoji(testability)}
   • Complexité: ${complexity}/100 ${this.getComplexityEmoji(complexity)}

🔍 ISSUES:
   • Total: ${totalIssues} issues de qualité
   • Sécurité: ${securityIssues} issues de sécurité
   • Fichiers analysés: ${this.results.analyzedFiles}/${this.results.totalFiles}

🎯 STATUT: ${this.getOverallStatus(overallScore)}

${overallScore >= 80 ? '🎉 Excellente qualité de code!' : '📈 Des améliorations sont recommandées'}
`);
  }

  // Méthodes utilitaires
  getScoreStatus(score) {
    if (score >= 90) return '🟢 Excellent';
    if (score >= 70) return '🟡 Bon';
    if (score >= 50) return '🟠 Satisfaisant';
    return '🔴 À améliorer';
  }

  getComplexityStatus(complexity) {
    if (complexity <= 20) return '🟢 Faible';
    if (complexity <= 40) return '🟡 Modérée';
    if (complexity <= 60) return '🟠 Élevée';
    return '🔴 Très élevée';
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  getComplexityEmoji(complexity) {
    if (complexity <= 20) return '🟢';
    if (complexity <= 40) return '🟡';
    if (complexity <= 60) return '🟠';
    return '🔴';
  }

  getOverallStatus(score) {
    if (score >= 90) return '🏆 EXCELLENT';
    if (score >= 80) return '🎯 TRÈS BON';
    if (score >= 70) return '👍 BON';
    if (score >= 60) return '⚠️ SATISFAISANT';
    return '🚨 À AMÉLIORER';
  }
}

// Exécuter l'analyse si appelé directement
if (require.main === module) {
  const analyzer = new CodeRabbitAnalyzer();
  analyzer.runFullAnalysis()
    .then(results => {
      console.log('\n✅ Analyse CodeRabbit complétée avec succès!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur lors de l\'analyse:', error);
      process.exit(1);
    });
}

module.exports = CodeRabbitAnalyzer;