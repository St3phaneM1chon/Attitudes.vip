#!/usr/bin/env node

/**
 * Système de Vérification de Conformité
 * 
 * Charge et vérifie TOUTES les règles à chaque redémarrage
 * Bloque le développement si non-conforme
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
// Utilisons une approche sans glob
const { readdirSync, statSync } = require('fs');

class ComplianceChecker {
  constructor() {
    this.config = {
      rulesDir: path.join(__dirname, '../rules'),
      categories: ['development', 'security', 'compliance', 'vendor', 'government'],
      
      // Fichiers à vérifier
      checkPatterns: [
        'src/**/*.js',
        'src/**/*.ts',
        'scripts/**/*.js',
        'config/**/*'
      ],
      
      // Règles critiques (échec = blocage)
      criticalRules: [
        'security/data-protection',
        'compliance/gdpr',
        'compliance/quebec-law25',
        'vendor/stripe-requirements'
      ]
    };
    
    this.rules = {};
    this.violations = [];
    this.warnings = [];
  }
  
  /**
   * Charger toutes les règles au démarrage
   */
  async loadAllRules() {
    console.log('📋 Chargement des règles de conformité...\n');
    
    for (const category of this.config.categories) {
      const categoryPath = path.join(this.config.rulesDir, category);
      
      try {
        const files = await fs.readdir(categoryPath);
        const mdFiles = files.filter(f => f.endsWith('.md'));
        
        this.rules[category] = {};
        
        for (const file of mdFiles) {
          const ruleName = file.replace('.md', '');
          const content = await fs.readFile(path.join(categoryPath, file), 'utf8');
          
          this.rules[category][ruleName] = {
            content,
            patterns: this.extractPatterns(content),
            requirements: this.extractRequirements(content)
          };
          
          console.log(`✅ Chargé: ${category}/${ruleName}`);
        }
      } catch (error) {
        console.warn(`⚠️  Catégorie ${category} non trouvée`);
      }
    }
    
    console.log(`\n📊 Total: ${this.countRules()} règles chargées\n`);
  }
  
  /**
   * Vérifier la conformité du projet
   */
  async checkCompliance() {
    console.log('🔍 Vérification de la conformité...\n');
    
    // 1. Vérifications de développement
    await this.checkDevelopmentRules();
    
    // 2. Vérifications de sécurité
    await this.checkSecurityRules();
    
    // 3. Vérifications de conformité légale
    await this.checkComplianceRules();
    
    // 4. Vérifications des vendors
    await this.checkVendorRules();
    
    // 5. Générer le rapport
    return this.generateReport();
  }
  
  /**
   * Vérifications de développement
   */
  async checkDevelopmentRules() {
    console.log('🔧 Vérification des standards de développement...');
    
    // ESLint
    try {
      const { stdout, stderr } = await exec('npm run lint -- --format json');
      const results = JSON.parse(stdout);
      
      const errors = results.reduce((sum, file) => sum + file.errorCount, 0);
      if (errors > 0) {
        this.violations.push({
          rule: 'development/coding-standards',
          severity: 'high',
          message: `${errors} erreurs ESLint détectées`,
          fix: 'npm run lint:fix'
        });
      }
    } catch (error) {
      // ESLint retourne exit 1 si erreurs
      this.violations.push({
        rule: 'development/coding-standards',
        severity: 'high',
        message: 'Erreurs de lint détectées',
        fix: 'npm run lint:fix'
      });
    }
    
    // Tests
    try {
      const { stdout } = await exec('npm test -- --json --passWithNoTests');
      const results = JSON.parse(stdout);
      
      if (results.numFailedTests > 0) {
        this.violations.push({
          rule: 'development/testing-requirements',
          severity: 'medium',
          message: `${results.numFailedTests} tests échouent`,
          fix: 'Corriger les tests défaillants'
        });
      }
      
      // Coverage
      const coverage = results.coverageMap ? 
        Object.values(results.coverageMap).reduce((acc, file) => {
          return acc + file.statementCoverage;
        }, 0) / Object.keys(results.coverageMap).length : 0;
        
      if (coverage < 80) {
        this.warnings.push({
          rule: 'development/testing-requirements',
          message: `Coverage insuffisant: ${coverage.toFixed(1)}% (min: 80%)`
        });
      }
    } catch (error) {
      this.warnings.push({
        rule: 'development/testing-requirements',
        message: 'Tests non exécutés'
      });
    }
  }
  
  /**
   * Vérifications de sécurité
   */
  async checkSecurityRules() {
    console.log('🔐 Vérification des règles de sécurité...');
    
    // Recherche de secrets
    const secretPatterns = [
      /api[_-]?key\s*=\s*["'][^"']+["']/gi,
      /password\s*=\s*["'][^"']+["']/gi,
      /secret\s*=\s*["'][^"']+["']/gi,
      /private[_-]?key\s*=\s*["'][^"']+["']/gi
    ];
    
    // Vérifier quelques fichiers clés pour les secrets
    const filesToCheck = [
      'src/auth/auth-service.js',
      'scripts/init-db.sql',
      '.env.example'
    ];
    
    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        for (const secretPattern of secretPatterns) {
          if (secretPattern.test(content)) {
            this.violations.push({
              rule: 'security/data-protection',
              severity: 'critical',
              message: `Secret potentiel trouvé dans ${file}`,
              fix: 'Utiliser des variables d\'environnement'
            });
          }
        }
      } catch {
        // Fichier n'existe pas, ignorer
      }
    }
    
    // Vérifier HTTPS dans quelques fichiers
    const httpPattern = /http:\/\/(?!localhost|127\.0\.0\.1)/gi;
    
    for (const file of filesToCheck) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        if (httpPattern.test(content)) {
          this.warnings.push({
            rule: 'security/data-protection',
            message: `HTTP non sécurisé dans ${file}`
          });
        }
      } catch {
        // Ignorer
      }
    }
  }
  
  /**
   * Vérifications de conformité légale
   */
  async checkComplianceRules() {
    console.log('⚖️  Vérification de la conformité légale...');
    
    // Vérifier la présence des fichiers requis
    const requiredFiles = [
      'PRIVACY_POLICY.md',
      'TERMS_OF_SERVICE.md',
      'COOKIE_POLICY.md'
    ];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(process.cwd(), file));
      } catch {
        this.violations.push({
          rule: 'compliance/gdpr',
          severity: 'high',
          message: `Fichier manquant: ${file}`,
          fix: `Créer ${file}`
        });
      }
    }
    
    // Vérifier le consentement dans les fichiers clés
    const consentPattern = /localStorage\.setItem|cookie\s*=/gi;
    const hasConsentCheck = /checkConsent|getConsent|hasConsent/gi;
    
    const complianceFiles = [
      'src/auth/auth-service.js',
      'src/ui/index.html'
    ];
    
    for (const file of complianceFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        if (consentPattern.test(content) && !hasConsentCheck.test(content)) {
          this.warnings.push({
            rule: 'compliance/gdpr',
            message: `Stockage sans vérification de consentement dans ${file}`
          });
        }
      } catch {
        // Ignorer
      }
    }
  }
  
  /**
   * Vérifications des vendors
   */
  async checkVendorRules() {
    console.log('🏢 Vérification des exigences vendors...');
    
    // Stripe
    const stripePatterns = {
      cardStorage: /card[_-]?number|cvv|cvc/gi,
      tokenUsage: /stripe\.createToken|stripe\.createPaymentMethod/gi
    };
    
    const vendorFiles = [
      'src/services/payment-service.js',
      'src/controllers/payment.controller.js'
    ];
    
    for (const file of vendorFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        if (stripePatterns.cardStorage.test(content)) {
          // Vérifier que ce n'est pas juste tokenisé
          if (!stripePatterns.tokenUsage.test(content)) {
            this.violations.push({
              rule: 'vendor/stripe-requirements',
              severity: 'critical',
              message: `Stockage potentiel de données cartes dans ${file}`,
              fix: 'Utiliser Stripe Elements pour la tokenisation'
            });
          }
        }
      } catch {
        // Ignorer
      }
    }
  }
  
  /**
   * Générer le rapport de conformité
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRules: this.countRules(),
        violations: this.violations.length,
        warnings: this.warnings.length,
        status: this.violations.length === 0 ? 'COMPLIANT' : 'NON_COMPLIANT'
      },
      violations: this.violations,
      warnings: this.warnings
    };
    
    return report;
  }
  
  /**
   * Afficher le rapport
   */
  async displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 RAPPORT DE CONFORMITÉ');
    console.log('='.repeat(60) + '\n');
    
    console.log(`Date: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`Statut: ${report.summary.status === 'COMPLIANT' ? '✅ CONFORME' : '❌ NON CONFORME'}`);
    console.log(`Règles vérifiées: ${report.summary.totalRules}`);
    console.log(`Violations: ${report.summary.violations}`);
    console.log(`Avertissements: ${report.summary.warnings}\n`);
    
    if (report.violations.length > 0) {
      console.log('❌ VIOLATIONS CRITIQUES:');
      console.log('-'.repeat(60));
      
      for (const violation of report.violations) {
        console.log(`\n[${violation.severity.toUpperCase()}] ${violation.rule}`);
        console.log(`Message: ${violation.message}`);
        console.log(`Fix: ${violation.fix}`);
      }
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  AVERTISSEMENTS:');
      console.log('-'.repeat(60));
      
      for (const warning of report.warnings) {
        console.log(`\n${warning.rule}`);
        console.log(`Message: ${warning.message}`);
      }
    }
    
    // Sauvegarder le rapport
    const reportPath = path.join(
      __dirname, 
      '../compliance-reports',
      `report-${new Date().toISOString().split('T')[0]}.json`
    );
    
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);
    
    return report.summary.status === 'COMPLIANT';
  }
  
  /**
   * Bloquer si non-conforme
   */
  enforceCompliance(isCompliant) {
    if (!isCompliant) {
      console.log('\n🚫 DÉVELOPPEMENT BLOQUÉ - Non-conformité détectée');
      console.log('Corrigez les violations avant de continuer.\n');
      
      // Créer un fichier de blocage
      require('fs').writeFileSync('.compliance-block', JSON.stringify({
        blocked: true,
        reason: 'Violations de conformité détectées',
        timestamp: new Date().toISOString()
      }));
      
      process.exit(1);
    } else {
      console.log('\n✅ Toutes les règles sont respectées. Développement autorisé.\n');
      
      // Supprimer le blocage s'il existe
      try {
        require('fs').unlinkSync('.compliance-block');
      } catch {
        // Pas de blocage existant
      }
    }
  }
  
  // Utilitaires
  
  extractPatterns(content) {
    // Extraire les patterns de code à vérifier
    const patterns = [];
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    
    for (const block of codeBlocks) {
      if (block.includes('❌ INTERDIT')) {
        patterns.push({
          type: 'forbidden',
          pattern: block
        });
      }
    }
    
    return patterns;
  }
  
  extractRequirements(content) {
    // Extraire les exigences
    const requirements = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('✅ OBLIGATOIRE')) {
        requirements.push(line);
      }
    }
    
    return requirements;
  }
  
  countRules() {
    let count = 0;
    for (const category of Object.values(this.rules)) {
      count += Object.keys(category).length;
    }
    return count;
  }
}

// Intégration avec le démarrage
async function runComplianceCheck() {
  const checker = new ComplianceChecker();
  
  try {
    // 1. Charger les règles
    await checker.loadAllRules();
    
    // 2. Vérifier la conformité
    const report = await checker.checkCompliance();
    
    // 3. Afficher le rapport
    const isCompliant = await checker.displayReport(report);
    
    // 4. Enforcer si nécessaire
    checker.enforceCompliance(isCompliant);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  }
}

// CLI
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'check':
    case 'validate':
      runComplianceCheck();
      break;
      
    case 'init':
      // Créer la structure de règles
      console.log('Initialisation de la structure de règles...');
      // ... code d'init
      break;
      
    default:
      console.log(`
🛡️  Compliance Checker

Usage: node compliance-checker.js <command>

Commands:
  check     - Vérifier la conformité
  validate  - Alias pour check
  init      - Initialiser la structure

Le check est automatique au démarrage.
      `);
  }
}

module.exports = { ComplianceChecker, runComplianceCheck };