#!/usr/bin/env node

/**
 * Script pour exécuter tous les tests d'intégration
 * Avec rapport détaillé et métriques de performance
 */

const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_SUITES = [
  {
    name: 'Hooks Temps Réel',
    pattern: 'tests/hooks/*.test.js',
    description: 'Tests des hooks React avec intégration Supabase et WebSocket'
  },
  {
    name: 'Services WebSocket',
    pattern: 'tests/websocket/*.test.js', 
    description: 'Tests du serveur WebSocket optimisé et heartbeat'
  },
  {
    name: 'Intégrations Externes',
    pattern: 'tests/integrations/*.test.js',
    description: 'Tests Stripe, Redis, Email/SMS'
  },
  {
    name: 'Performance',
    pattern: 'tests/performance/*.test.js',
    description: 'Tests de charge et optimisation'
  }
];

class IntegrationTestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log(chalk.bold.blue('\n🧪 AttitudesFramework - Tests d\'Intégration\n'));
    
    // Vérifier l'environnement
    await this.checkEnvironment();
    
    // Exécuter chaque suite de tests
    for (const suite of TEST_SUITES) {
      await this.runTestSuite(suite);
    }
    
    // Afficher le résumé
    this.displaySummary();
  }

  async checkEnvironment() {
    const spinner = ora('Vérification de l\'environnement...').start();
    
    try {
      // Vérifier Node.js
      const nodeVersion = process.version;
      if (!nodeVersion.match(/^v1[468]\./)) {
        throw new Error(`Node.js 14+ requis (actuel: ${nodeVersion})`);
      }
      
      // Vérifier les dépendances
      const packageJson = require('../package.json');
      const requiredDeps = ['jest', '@testing-library/react', '@testing-library/jest-dom'];
      
      for (const dep of requiredDeps) {
        if (!packageJson.devDependencies[dep] && !packageJson.dependencies[dep]) {
          throw new Error(`Dépendance manquante: ${dep}`);
        }
      }
      
      // Vérifier les services
      await this.checkServices();
      
      spinner.succeed('Environnement prêt');
    } catch (error) {
      spinner.fail(`Erreur environnement: ${error.message}`);
      process.exit(1);
    }
  }

  async checkServices() {
    // Vérifier si les services sont accessibles
    const services = [
      { name: 'Supabase', url: process.env.SUPABASE_URL || 'http://localhost:54321' },
      { name: 'Redis', host: process.env.REDIS_HOST || 'localhost', port: 6379 }
    ];
    
    // Note: Dans un vrai environnement, on vérifierait la connexion réelle
    return true;
  }

  async runTestSuite(suite) {
    console.log(chalk.bold.yellow(`\n📦 ${suite.name}`));
    console.log(chalk.gray(`   ${suite.description}\n`));
    
    const spinner = ora('Exécution des tests...').start();
    const suiteStart = Date.now();
    
    try {
      const result = await this.executeJest(suite.pattern);
      const duration = Date.now() - suiteStart;
      
      this.results.push({
        suite: suite.name,
        ...result,
        duration
      });
      
      if (result.success) {
        spinner.succeed(chalk.green(`✅ ${result.passed} tests passés (${duration}ms)`));
      } else {
        spinner.fail(chalk.red(`❌ ${result.failed} tests échoués sur ${result.total}`));
      }
      
      // Afficher les tests échoués
      if (result.failures.length > 0) {
        console.log(chalk.red('\n   Tests échoués:'));
        result.failures.forEach(failure => {
          console.log(chalk.red(`     • ${failure}`));
        });
      }
      
    } catch (error) {
      spinner.fail(`Erreur: ${error.message}`);
      this.results.push({
        suite: suite.name,
        success: false,
        error: error.message,
        duration: Date.now() - suiteStart
      });
    }
  }

  executeJest(pattern) {
    return new Promise((resolve) => {
      const args = [
        '--json',
        '--passWithNoTests',
        '--testPathPattern', pattern,
        '--coverage'
      ];
      
      const jest = spawn('npx', ['jest', ...args], {
        stdio: 'pipe',
        env: { ...process.env, CI: 'true' }
      });
      
      let output = '';
      jest.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      jest.stderr.on('data', (data) => {
        // Jest écrit le JSON sur stderr en mode --json
        output += data.toString();
      });
      
      jest.on('close', (code) => {
        try {
          // Extraire le JSON de la sortie
          const jsonMatch = output.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const results = JSON.parse(jsonMatch[0]);
            
            resolve({
              success: results.success,
              total: results.numTotalTests,
              passed: results.numPassedTests,
              failed: results.numFailedTests,
              pending: results.numPendingTests,
              coverage: results.coverageMap ? this.extractCoverage(results.coverageMap) : null,
              failures: results.testResults
                .filter(t => t.status === 'failed')
                .map(t => path.basename(t.name))
            });
          } else {
            // Fallback si pas de JSON
            resolve({
              success: code === 0,
              total: 0,
              passed: 0,
              failed: 0,
              pending: 0,
              failures: []
            });
          }
        } catch (error) {
          resolve({
            success: false,
            error: error.message,
            total: 0,
            passed: 0,
            failed: 0,
            failures: []
          });
        }
      });
    });
  }

  extractCoverage(coverageMap) {
    // Simplifier les données de couverture
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageMap).forEach(file => {
      if (file.statementMap) {
        const statements = Object.keys(file.statementMap).length;
        const covered = Object.values(file.s || {}).filter(count => count > 0).length;
        totalStatements += statements;
        coveredStatements += covered;
      }
    });
    
    return {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements * 100).toFixed(2) : 0
    };
  }

  displaySummary() {
    console.log(chalk.bold.blue('\n📊 Résumé des Tests\n'));
    
    const totalDuration = Date.now() - this.startTime;
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let allSuccess = true;
    
    // Tableau récapitulatif
    console.log(chalk.gray('┌─────────────────────────┬────────┬────────┬────────┬──────────┐'));
    console.log(chalk.gray('│ Suite                   │ Total  │ ✅ Pass │ ❌ Fail │ Durée    │'));
    console.log(chalk.gray('├─────────────────────────┼────────┼────────┼────────┼──────────┤'));
    
    this.results.forEach(result => {
      const status = result.success ? chalk.green('✓') : chalk.red('✗');
      const name = result.suite.padEnd(23);
      const total = (result.total || 0).toString().padStart(6);
      const passed = (result.passed || 0).toString().padStart(7);
      const failed = (result.failed || 0).toString().padStart(7);
      const duration = `${result.duration}ms`.padStart(9);
      
      console.log(`│ ${status} ${name} │ ${total} │ ${passed} │ ${failed} │ ${duration} │`);
      
      totalTests += result.total || 0;
      totalPassed += result.passed || 0;
      totalFailed += result.failed || 0;
      if (!result.success) allSuccess = false;
    });
    
    console.log(chalk.gray('└─────────────────────────┴────────┴────────┴────────┴──────────┘'));
    
    // Résumé global
    console.log('\n' + chalk.bold('Total:'));
    console.log(`  Tests exécutés: ${chalk.cyan(totalTests)}`);
    console.log(`  Tests réussis:  ${chalk.green(totalPassed)}`);
    console.log(`  Tests échoués:  ${totalFailed > 0 ? chalk.red(totalFailed) : chalk.green(0)}`);
    console.log(`  Durée totale:   ${chalk.yellow(Math.round(totalDuration / 1000))}s`);
    
    // Couverture de code moyenne
    const coverageResults = this.results.filter(r => r.coverage);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + parseFloat(r.coverage.statements), 0) / coverageResults.length;
      console.log(`  Couverture moy: ${chalk.blue(avgCoverage.toFixed(2))}%`);
    }
    
    // Status final
    console.log('\n' + (allSuccess ? 
      chalk.bold.green('✅ Tous les tests sont passés !') : 
      chalk.bold.red('❌ Des tests ont échoué.')
    ));
    
    // Générer le rapport HTML si demandé
    if (process.argv.includes('--html-report')) {
      this.generateHTMLReport();
    }
    
    // Code de sortie
    process.exit(allSuccess ? 0 : 1);
  }

  generateHTMLReport() {
    const reportPath = path.join(__dirname, '..', 'test-report.html');
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AttitudesFramework - Rapport de Tests</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .metric { flex: 1; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; }
    .metric.success { background: #d4edda; color: #155724; }
    .metric.failure { background: #f8d7da; color: #721c24; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #667eea; color: white; }
    tr:hover { background: #f5f5f5; }
    .status-pass { color: #28a745; font-weight: bold; }
    .status-fail { color: #dc3545; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Rapport de Tests d'Intégration</h1>
    <p>Généré le ${new Date().toLocaleString('fr-FR')}</p>
    
    <div class="summary">
      <div class="metric ${this.results.every(r => r.success) ? 'success' : 'failure'}">
        <h3>Status Global</h3>
        <p>${this.results.every(r => r.success) ? '✅ SUCCÈS' : '❌ ÉCHEC'}</p>
      </div>
      <div class="metric">
        <h3>Tests Totaux</h3>
        <p>${this.results.reduce((sum, r) => sum + (r.total || 0), 0)}</p>
      </div>
      <div class="metric">
        <h3>Durée Totale</h3>
        <p>${Math.round((Date.now() - this.startTime) / 1000)}s</p>
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Suite de Tests</th>
          <th>Status</th>
          <th>Tests</th>
          <th>Réussis</th>
          <th>Échoués</th>
          <th>Durée</th>
          <th>Couverture</th>
        </tr>
      </thead>
      <tbody>
        ${this.results.map(r => `
          <tr>
            <td>${r.suite}</td>
            <td class="${r.success ? 'status-pass' : 'status-fail'}">${r.success ? 'PASS' : 'FAIL'}</td>
            <td>${r.total || 0}</td>
            <td>${r.passed || 0}</td>
            <td>${r.failed || 0}</td>
            <td>${r.duration}ms</td>
            <td>${r.coverage ? r.coverage.statements + '%' : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(reportPath, html);
    console.log(chalk.gray(`\n📄 Rapport HTML généré: ${reportPath}`));
  }
}

// Exécuter les tests
const runner = new IntegrationTestRunner();
runner.run().catch(error => {
  console.error(chalk.red('\n❌ Erreur fatale:'), error);
  process.exit(1);
});