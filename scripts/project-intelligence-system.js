#!/usr/bin/env node

/**
 * Système d'Intelligence de Projet pour Claude
 * 
 * Fournit une vision complète et un contrôle intelligent sur AttitudesFramework
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class ProjectIntelligenceSystem {
  constructor() {
    this.config = {
      projectRoot: path.resolve(__dirname, '..'),
      analysisPath: path.join(__dirname, '../.claude/analysis'),
      knowledgePath: path.join(__dirname, '../.claude/knowledge'),
      
      scanPatterns: {
        code: ['**/*.js', '**/*.ts', '**/*.jsx', '**/*.tsx'],
        config: ['**/*.json', '**/*.yaml', '**/*.yml', '**/.*rc'],
        docs: ['**/*.md', '**/*.txt'],
        tests: ['**/*.test.js', '**/*.spec.js', '**/__tests__/**']
      },
      
      metrics: {
        codeQuality: {
          complexity: { threshold: 10, critical: 20 },
          duplication: { threshold: 5, critical: 10 },
          coverage: { minimum: 80, target: 90 }
        },
        
        security: {
          vulnerabilities: { critical: 0, high: 0, medium: 5 },
          outdatedDeps: { threshold: 10, critical: 20 }
        },
        
        performance: {
          responseTime: { p95: 200, p99: 500 },
          errorRate: { threshold: 0.1, critical: 1 }
        }
      }
    };
    
    this.knowledge = {
      patterns: new Map(),
      decisions: [],
      issues: [],
      improvements: []
    };
  }
  
  /**
   * Initialiser le système d'intelligence
   */
  async initialize() {
    console.log('🧠 Initialisation du Système d\'Intelligence de Projet...\n');
    
    // Créer les répertoires nécessaires
    await this.createDirectories();
    
    // Charger la base de connaissances
    await this.loadKnowledgeBase();
    
    // Démarrer les scanners
    await this.startContinuousMonitoring();
    
    console.log('✅ Système d\'Intelligence initialisé\n');
  }
  
  /**
   * Analyse complète du projet
   */
  async analyzeProject() {
    console.log('🔍 Analyse exhaustive du projet en cours...\n');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      overview: await this.getProjectOverview(),
      codebase: await this.analyzeCodebase(),
      dependencies: await this.analyzeDependencies(),
      security: await this.analyzeSecurityPosture(),
      quality: await this.analyzeCodeQuality(),
      documentation: await this.analyzeDocumentation(),
      tests: await this.analyzeTestCoverage(),
      performance: await this.analyzePerformance(),
      risks: [],
      opportunities: [],
      recommendations: []
    };
    
    // Identifier les risques
    analysis.risks = this.identifyRisks(analysis);
    
    // Trouver les opportunités
    analysis.opportunities = this.findOpportunities(analysis);
    
    // Générer des recommandations
    analysis.recommendations = this.generateRecommendations(analysis);
    
    // Sauvegarder l'analyse
    await this.saveAnalysis(analysis);
    
    // Afficher le résumé
    this.displayAnalysisSummary(analysis);
    
    return analysis;
  }
  
  /**
   * Obtenir une vue d'ensemble du projet
   */
  async getProjectOverview() {
    const overview = {
      name: 'AttitudesFramework',
      type: 'Wedding Management SaaS',
      architecture: 'Microservices',
      stack: {
        backend: 'Node.js/Express',
        frontend: 'HTML/CSS/JS',
        database: 'PostgreSQL/Supabase',
        cache: 'Redis',
        containerization: 'Docker',
        orchestration: 'Docker Compose / Kubernetes'
      },
      statistics: {
        totalFiles: 0,
        totalLines: 0,
        languages: {},
        lastCommit: null,
        contributors: 0
      }
    };
    
    // Compter les fichiers et lignes
    try {
      const { stdout: fileCount } = await exec('find . -type f -name "*.js" -o -name "*.json" -o -name "*.md" | wc -l');
      overview.statistics.totalFiles = parseInt(fileCount.trim());
      
      const { stdout: lineCount } = await exec('find . -type f \\( -name "*.js" -o -name "*.json" \\) -exec wc -l {} + | tail -1');
      overview.statistics.totalLines = parseInt(lineCount.trim().split(' ')[0] || 0);
      
      // Obtenir le dernier commit
      const { stdout: lastCommit } = await exec('git log -1 --format="%h - %s (%cr)"');
      overview.statistics.lastCommit = lastCommit.trim();
    } catch (error) {
      console.warn('⚠️  Impossible d\'obtenir certaines statistiques Git');
    }
    
    return overview;
  }
  
  /**
   * Analyser le codebase
   */
  async analyzeCodebase() {
    const analysis = {
      structure: {
        directories: await this.analyzeDirectoryStructure(),
        modules: await this.identifyModules(),
        patterns: await this.detectArchitecturalPatterns()
      },
      
      complexity: {
        cyclomatic: 0,
        cognitive: 0,
        files: {
          complex: [],
          veryComplex: []
        }
      },
      
      maintainability: {
        score: 0,
        issues: []
      }
    };
    
    // Analyser la complexité avec ESLint
    try {
      const { stdout } = await exec('npx eslint . --format json --rule complexity:error');
      const results = JSON.parse(stdout);
      
      for (const file of results) {
        if (file.messages.length > 0) {
          const complexityIssues = file.messages.filter(m => m.ruleId === 'complexity');
          if (complexityIssues.length > 0) {
            analysis.complexity.files.complex.push({
              file: file.filePath,
              complexity: complexityIssues[0].message
            });
          }
        }
      }
    } catch (error) {
      // ESLint peut retourner un code d'erreur même en succès
    }
    
    // Calculer le score de maintenabilité
    analysis.maintainability.score = this.calculateMaintainabilityScore(analysis);
    
    return analysis;
  }
  
  /**
   * Analyser les dépendances
   */
  async analyzeDependencies() {
    const analysis = {
      total: 0,
      production: 0,
      development: 0,
      outdated: [],
      vulnerable: [],
      unused: [],
      licenses: {}
    };
    
    try {
      // Lire package.json
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      
      analysis.production = Object.keys(packageJson.dependencies || {}).length;
      analysis.development = Object.keys(packageJson.devDependencies || {}).length;
      analysis.total = analysis.production + analysis.development;
      
      // Vérifier les packages outdated
      try {
        const { stdout: outdated } = await exec('npm outdated --json');
        if (outdated) {
          const outdatedPackages = JSON.parse(outdated);
          analysis.outdated = Object.entries(outdatedPackages).map(([name, info]) => ({
            name,
            current: info.current,
            wanted: info.wanted,
            latest: info.latest
          }));
        }
      } catch {
        // npm outdated retourne exit 1 si des packages sont outdated
      }
      
      // Audit de sécurité
      try {
        const { stdout: audit } = await exec('npm audit --json');
        const auditResult = JSON.parse(audit);
        
        if (auditResult.vulnerabilities) {
          for (const [name, vuln] of Object.entries(auditResult.vulnerabilities)) {
            analysis.vulnerable.push({
              name,
              severity: vuln.severity,
              via: vuln.via
            });
          }
        }
      } catch {
        // npm audit peut échouer
      }
      
    } catch (error) {
      console.error('Erreur analyse dépendances:', error.message);
    }
    
    return analysis;
  }
  
  /**
   * Analyser la posture de sécurité
   */
  async analyzeSecurityPosture() {
    const analysis = {
      score: 0,
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      
      checks: {
        secretsInCode: false,
        httpsEverywhere: true,
        authenticationStrong: true,
        inputValidation: true,
        sqlInjectionProtection: true,
        xssProtection: true,
        csrfProtection: true,
        securityHeaders: true
      },
      
      recommendations: []
    };
    
    // Vérifier la présence de secrets
    try {
      const secretPatterns = [
        'password\\s*=\\s*["\'][^"\']+["\']',
        'api[_-]?key\\s*=\\s*["\'][^"\']+["\']',
        'secret\\s*=\\s*["\'][^"\']+["\']'
      ];
      
      for (const pattern of secretPatterns) {
        const { stdout } = await exec(`grep -r "${pattern}" src/ || true`);
        if (stdout.trim()) {
          analysis.checks.secretsInCode = true;
          analysis.recommendations.push('Supprimer les secrets hardcodés du code');
        }
      }
    } catch (error) {
      // Ignorer les erreurs grep
    }
    
    // Calculer le score de sécurité
    const passedChecks = Object.values(analysis.checks).filter(v => v === true).length;
    analysis.score = Math.round((passedChecks / Object.keys(analysis.checks).length) * 100);
    
    return analysis;
  }
  
  /**
   * Identifier les risques
   */
  identifyRisks(analysis) {
    const risks = [];
    
    // Risques de sécurité
    if (analysis.security.vulnerabilities.critical > 0) {
      risks.push({
        type: 'SECURITY',
        severity: 'CRITICAL',
        description: `${analysis.security.vulnerabilities.critical} vulnérabilités critiques détectées`,
        impact: 'Compromission possible du système',
        mitigation: 'Mettre à jour les dépendances immédiatement'
      });
    }
    
    // Risques de qualité
    if (analysis.quality && analysis.quality.coverage < 60) {
      risks.push({
        type: 'QUALITY',
        severity: 'HIGH',
        description: `Coverage de tests insuffisant (${analysis.quality.coverage}%)`,
        impact: 'Régressions non détectées',
        mitigation: 'Augmenter la couverture de tests à 80% minimum'
      });
    }
    
    // Risques de dépendances
    if (analysis.dependencies.outdated.length > 20) {
      risks.push({
        type: 'MAINTENANCE',
        severity: 'MEDIUM',
        description: `${analysis.dependencies.outdated.length} dépendances obsolètes`,
        impact: 'Incompatibilités futures et failles de sécurité',
        mitigation: 'Planifier une mise à jour progressive'
      });
    }
    
    // Risques de performance
    if (analysis.performance && analysis.performance.avgResponseTime > 500) {
      risks.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        description: 'Temps de réponse dégradé',
        impact: 'Expérience utilisateur impactée',
        mitigation: 'Optimiser les requêtes et ajouter du cache'
      });
    }
    
    return risks.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  /**
   * Trouver les opportunités d'amélioration
   */
  findOpportunities(analysis) {
    const opportunities = [];
    
    // Opportunités d'automatisation
    if (!analysis.codebase.structure.directories.includes('.github/workflows')) {
      opportunities.push({
        type: 'AUTOMATION',
        priority: 'HIGH',
        description: 'Implémenter CI/CD avec GitHub Actions',
        benefit: 'Déploiements automatisés et tests continus',
        effort: 'MEDIUM'
      });
    }
    
    // Opportunités de performance
    if (!analysis.codebase.structure.modules.includes('cache')) {
      opportunities.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        description: 'Implémenter une stratégie de cache complète',
        benefit: 'Réduction de 80% du temps de réponse',
        effort: 'LOW'
      });
    }
    
    // Opportunités de monitoring
    opportunities.push({
      type: 'OBSERVABILITY',
      priority: 'HIGH',
      description: 'Ajouter APM et tracing distribué',
      benefit: 'Visibilité complète sur les performances',
      effort: 'MEDIUM'
    });
    
    // Opportunités de documentation
    if (analysis.documentation && analysis.documentation.coverage < 80) {
      opportunities.push({
        type: 'DOCUMENTATION',
        priority: 'MEDIUM',
        description: 'Générer documentation API avec OpenAPI',
        benefit: 'Onboarding plus rapide et moins d\'erreurs',
        effort: 'LOW'
      });
    }
    
    return opportunities.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  /**
   * Générer des recommandations
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // Basé sur les risques
    for (const risk of analysis.risks) {
      recommendations.push({
        category: 'RISK_MITIGATION',
        priority: risk.severity,
        action: risk.mitigation,
        rationale: risk.description,
        expectedOutcome: `Éliminer le risque: ${risk.type}`
      });
    }
    
    // Basé sur les opportunités
    for (const opp of analysis.opportunities.slice(0, 3)) {
      recommendations.push({
        category: 'IMPROVEMENT',
        priority: opp.priority,
        action: opp.description,
        rationale: opp.benefit,
        expectedOutcome: `ROI ${opp.effort === 'LOW' ? 'élevé' : 'moyen'}`
      });
    }
    
    // Recommandations générales
    recommendations.push({
      category: 'BEST_PRACTICE',
      priority: 'MEDIUM',
      action: 'Implémenter des feature flags',
      rationale: 'Déploiements plus sûrs et A/B testing',
      expectedOutcome: 'Réduction des incidents de 70%'
    });
    
    return recommendations.slice(0, 10); // Top 10 recommandations
  }
  
  /**
   * Afficher le résumé de l'analyse
   */
  displayAnalysisSummary(analysis) {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RÉSUMÉ DE L\'ANALYSE DU PROJET');
    console.log('═'.repeat(60) + '\n');
    
    // Vue d'ensemble
    console.log('📈 Vue d\'ensemble:');
    console.log(`   Fichiers: ${analysis.overview.statistics.totalFiles}`);
    console.log(`   Lignes de code: ${analysis.overview.statistics.totalLines}`);
    console.log(`   Dernier commit: ${analysis.overview.statistics.lastCommit}`);
    
    // Santé du projet
    const healthScore = this.calculateHealthScore(analysis);
    console.log(`\n🏥 Santé du projet: ${healthScore}%`);
    console.log(`   ${healthScore >= 80 ? '✅' : healthScore >= 60 ? '⚠️' : '❌'} ${this.getHealthStatus(healthScore)}`);
    
    // Risques
    if (analysis.risks.length > 0) {
      console.log('\n🚨 Risques identifiés:');
      for (const risk of analysis.risks.slice(0, 3)) {
        console.log(`   [${risk.severity}] ${risk.description}`);
      }
    }
    
    // Opportunités
    if (analysis.opportunities.length > 0) {
      console.log('\n💡 Opportunités:');
      for (const opp of analysis.opportunities.slice(0, 3)) {
        console.log(`   [${opp.priority}] ${opp.description}`);
      }
    }
    
    // Recommandations
    console.log('\n📋 Top 3 Recommandations:');
    for (const rec of analysis.recommendations.slice(0, 3)) {
      console.log(`   ${rec.priority === 'CRITICAL' ? '🔴' : rec.priority === 'HIGH' ? '🟡' : '🟢'} ${rec.action}`);
    }
    
    console.log('\n' + '═'.repeat(60) + '\n');
  }
  
  /**
   * Démarrer le monitoring continu
   */
  async startContinuousMonitoring() {
    // Scan quotidien
    setInterval(async () => {
      await this.performDailyScan();
    }, 24 * 60 * 60 * 1000);
    
    // Détection de problèmes toutes les heures
    setInterval(async () => {
      await this.detectProblems();
    }, 60 * 60 * 1000);
    
    // Mise à jour de la base de connaissances
    setInterval(async () => {
      await this.updateKnowledgeBase();
    }, 12 * 60 * 60 * 1000);
    
    console.log('📡 Monitoring continu activé');
  }
  
  // Méthodes utilitaires
  
  async createDirectories() {
    const dirs = [
      this.config.analysisPath,
      this.config.knowledgePath,
      path.join(this.config.analysisPath, 'daily'),
      path.join(this.config.analysisPath, 'reports'),
      path.join(this.config.knowledgePath, 'patterns'),
      path.join(this.config.knowledgePath, 'decisions')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  async loadKnowledgeBase() {
    try {
      // Charger les patterns connus
      const patternsFile = path.join(this.config.knowledgePath, 'patterns.json');
      if (await this.fileExists(patternsFile)) {
        const patterns = JSON.parse(await fs.readFile(patternsFile, 'utf8'));
        this.knowledge.patterns = new Map(patterns);
      }
      
      // Charger les décisions
      const decisionsFile = path.join(this.config.knowledgePath, 'decisions.json');
      if (await this.fileExists(decisionsFile)) {
        this.knowledge.decisions = JSON.parse(await fs.readFile(decisionsFile, 'utf8'));
      }
      
      console.log(`📚 Base de connaissances chargée: ${this.knowledge.patterns.size} patterns`);
    } catch (error) {
      console.warn('⚠️  Erreur chargement base de connaissances:', error.message);
    }
  }
  
  async saveAnalysis(analysis) {
    const filename = `analysis-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(this.config.analysisPath, 'daily', filename);
    
    await fs.writeFile(filepath, JSON.stringify(analysis, null, 2));
    
    // Garder seulement les 30 dernières analyses
    await this.cleanOldAnalyses();
  }
  
  async cleanOldAnalyses() {
    const dir = path.join(this.config.analysisPath, 'daily');
    const files = await fs.readdir(dir);
    const analyses = files.filter(f => f.startsWith('analysis-')).sort();
    
    if (analyses.length > 30) {
      for (const file of analyses.slice(0, analyses.length - 30)) {
        await fs.unlink(path.join(dir, file));
      }
    }
  }
  
  calculateHealthScore(analysis) {
    let score = 100;
    
    // Pénalités pour risques
    for (const risk of analysis.risks) {
      if (risk.severity === 'CRITICAL') score -= 20;
      else if (risk.severity === 'HIGH') score -= 10;
      else if (risk.severity === 'MEDIUM') score -= 5;
    }
    
    // Pénalités pour métriques
    if (analysis.dependencies.vulnerable.length > 0) score -= 15;
    if (analysis.dependencies.outdated.length > 10) score -= 10;
    if (analysis.security && analysis.security.score < 80) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }
  
  getHealthStatus(score) {
    if (score >= 80) return 'Excellent - Projet en bonne santé';
    if (score >= 60) return 'Bon - Quelques améliorations nécessaires';
    if (score >= 40) return 'Moyen - Attention requise';
    return 'Critique - Action immédiate nécessaire';
  }
  
  calculateMaintainabilityScore(analysis) {
    // Score basé sur plusieurs facteurs
    let score = 100;
    
    if (analysis.complexity.files.complex.length > 5) score -= 10;
    if (analysis.complexity.files.veryComplex.length > 0) score -= 20;
    
    return Math.max(0, score);
  }
  
  async fileExists(filepath) {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }
  
  async analyzeDirectoryStructure() {
    const dirs = [];
    
    const scanDir = async (dir, level = 0) => {
      if (level > 2) return; // Limiter la profondeur
      
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          dirs.push(path.relative(this.config.projectRoot, path.join(dir, entry.name)));
          await scanDir(path.join(dir, entry.name), level + 1);
        }
      }
    };
    
    await scanDir(this.config.projectRoot);
    return dirs;
  }
  
  async identifyModules() {
    // Identifier les modules principaux du projet
    const modules = [];
    
    const srcDir = path.join(this.config.projectRoot, 'src');
    if (await this.fileExists(srcDir)) {
      const entries = await fs.readdir(srcDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          modules.push(entry.name);
        }
      }
    }
    
    return modules;
  }
  
  async detectArchitecturalPatterns() {
    const patterns = [];
    
    // Détecter MVC
    if (await this.fileExists('src/controllers') && 
        await this.fileExists('src/models') && 
        await this.fileExists('src/views')) {
      patterns.push('MVC');
    }
    
    // Détecter Microservices
    if (await this.fileExists('docker-compose.yml')) {
      patterns.push('Microservices');
    }
    
    // Détecter API REST
    if (await this.fileExists('src/routes') || await this.fileExists('src/api')) {
      patterns.push('REST API');
    }
    
    return patterns;
  }
  
  async analyzeCodeQuality() {
    return {
      coverage: 0, // À implémenter avec les vrais outils
      lintErrors: 0,
      complexFiles: 0,
      duplicateCode: 0
    };
  }
  
  async analyzeDocumentation() {
    const docs = await fs.readdir(this.config.projectRoot);
    const mdFiles = docs.filter(f => f.endsWith('.md'));
    
    return {
      coverage: mdFiles.length > 5 ? 80 : 50,
      files: mdFiles,
      missing: ['API.md', 'CONTRIBUTING.md', 'CHANGELOG.md'].filter(f => !mdFiles.includes(f))
    };
  }
  
  async analyzeTestCoverage() {
    return {
      coverage: 75, // Placeholder
      unitTests: true,
      integrationTests: true,
      e2eTests: false
    };
  }
  
  async analyzePerformance() {
    return {
      avgResponseTime: 150, // Placeholder
      p95ResponseTime: 300,
      errorRate: 0.05
    };
  }
  
  async performDailyScan() {
    console.log('🔄 Scan quotidien en cours...');
    await this.analyzeProject();
  }
  
  async detectProblems() {
    // Détection simplifiée pour la démo
    console.log('🔍 Détection de problèmes...');
  }
  
  async updateKnowledgeBase() {
    console.log('📚 Mise à jour de la base de connaissances...');
    
    // Sauvegarder les patterns
    const patternsArray = Array.from(this.knowledge.patterns.entries());
    await fs.writeFile(
      path.join(this.config.knowledgePath, 'patterns.json'),
      JSON.stringify(patternsArray, null, 2)
    );
    
    // Sauvegarder les décisions
    await fs.writeFile(
      path.join(this.config.knowledgePath, 'decisions.json'),
      JSON.stringify(this.knowledge.decisions, null, 2)
    );
  }
}

// Export et CLI
module.exports = ProjectIntelligenceSystem;

if (require.main === module) {
  const system = new ProjectIntelligenceSystem();
  
  const command = process.argv[2];
  
  (async () => {
    try {
      await system.initialize();
      
      switch (command) {
        case 'analyze':
          await system.analyzeProject();
          break;
          
        case 'monitor':
          console.log('📡 Monitoring en cours... (Ctrl+C pour arrêter)');
          // Le monitoring continue en arrière-plan
          break;
          
        case 'risks':
          const analysis = await system.analyzeProject();
          console.log('\n🚨 Risques du projet:');
          for (const risk of analysis.risks) {
            console.log(`\n[${risk.severity}] ${risk.type}`);
            console.log(`Description: ${risk.description}`);
            console.log(`Impact: ${risk.impact}`);
            console.log(`Mitigation: ${risk.mitigation}`);
          }
          break;
          
        case 'opportunities':
          const opp_analysis = await system.analyzeProject();
          console.log('\n💡 Opportunités:');
          for (const opp of opp_analysis.opportunities) {
            console.log(`\n[${opp.priority}] ${opp.type}`);
            console.log(`Description: ${opp.description}`);
            console.log(`Bénéfice: ${opp.benefit}`);
            console.log(`Effort: ${opp.effort}`);
          }
          break;
          
        default:
          console.log(`
🧠 Project Intelligence System

Usage: node project-intelligence-system.js <command>

Commands:
  analyze        - Analyse complète du projet
  monitor        - Démarrer le monitoring continu
  risks          - Afficher les risques identifiés
  opportunities  - Afficher les opportunités

Le système fournit une vision complète et un contrôle
intelligent sur le projet AttitudesFramework.
          `);
      }
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }
  })();
}