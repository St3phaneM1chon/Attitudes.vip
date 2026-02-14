#!/usr/bin/env node

/**
 * Runner pour les tests End-to-End
 * Gère la configuration et l'exécution des tests
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class E2ETestRunner {
  constructor() {
    this.config = require('./e2e.config');
    this.env = process.env.E2E_ENV || 'local';
    this.headless = process.env.E2E_HEADLESS !== 'false';
    this.testPattern = process.env.E2E_TEST || '*.e2e.js';
  }

  async run() {
    console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════╗
║     Tests E2E - AttitudesFramework        ║
╚═══════════════════════════════════════════╝${colors.reset}
`);

    console.log(`${colors.blue}Configuration:${colors.reset}`);
    console.log(`  Environnement: ${colors.yellow}${this.env}${colors.reset}`);
    console.log(`  Mode: ${colors.yellow}${this.headless ? 'Headless' : 'Navigateur visible'}${colors.reset}`);
    console.log(`  URL: ${colors.yellow}${this.config.environments[this.env].baseUrl}${colors.reset}`);
    console.log(`  Pattern: ${colors.yellow}${this.testPattern}${colors.reset}\n`);

    // Vérifier les prérequis
    if (!await this.checkPrerequisites()) {
      return;
    }

    // Créer le dossier screenshots si nécessaire
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // Préparer les variables d'environnement
    const testEnv = {
      ...process.env,
      E2E_BASE_URL: this.config.environments[this.env].baseUrl,
      E2E_API_URL: this.config.environments[this.env].apiUrl,
      E2E_HEADLESS: this.headless.toString(),
      NODE_ENV: 'test'
    };

    // Commandes à exécuter
    const commands = [
      {
        name: 'Tests Critiques',
        cmd: 'mocha',
        args: [
          '--require', '@babel/register',
          '--timeout', '60000',
          '--reporter', 'spec',
          '--colors',
          path.join(__dirname, 'critical-workflows.e2e.js')
        ]
      }
    ];

    // Exécuter les tests
    for (const command of commands) {
      console.log(`\n${colors.cyan}▶ ${command.name}${colors.reset}\n`);
      
      const success = await this.runCommand(command.cmd, command.args, testEnv);
      
      if (!success && process.env.E2E_FAIL_FAST === 'true') {
        console.log(`\n${colors.red}✗ Tests échoués, arrêt.${colors.reset}`);
        process.exit(1);
      }
    }

    // Générer le rapport
    await this.generateReport();
  }

  async checkPrerequisites() {
    console.log(`${colors.blue}Vérification des prérequis...${colors.reset}`);

    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.split('.')[0].substring(1));
          return major >= 14;
        },
        error: 'Node.js 14+ requis'
      },
      {
        name: 'Puppeteer',
        check: () => {
          try {
            require('puppeteer');
            return true;
          } catch {
            return false;
          }
        },
        error: 'Puppeteer non installé. Exécutez: npm install puppeteer'
      },
      {
        name: 'Serveur local',
        check: async () => {
          if (this.env !== 'local') return true;
          
          try {
            const response = await fetch(this.config.environments.local.baseUrl);
            return response.ok;
          } catch {
            return false;
          }
        },
        error: 'Le serveur local n\'est pas démarré. Exécutez: npm run dev'
      }
    ];

    let allPassed = true;

    for (const check of checks) {
      process.stdout.write(`  ${check.name}... `);
      const passed = await check.check();
      
      if (passed) {
        console.log(`${colors.green}✓${colors.reset}`);
      } else {
        console.log(`${colors.red}✗${colors.reset}`);
        console.log(`    ${colors.red}${check.error}${colors.reset}`);
        allPassed = false;
      }
    }

    return allPassed;
  }

  runCommand(cmd, args, env) {
    return new Promise((resolve) => {
      const child = spawn(cmd, args, {
        env,
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        resolve(code === 0);
      });

      child.on('error', (err) => {
        console.error(`${colors.red}Erreur: ${err.message}${colors.reset}`);
        resolve(false);
      });
    });
  }

  async generateReport() {
    console.log(`\n${colors.blue}Génération du rapport...${colors.reset}`);

    const reportPath = path.join(__dirname, 'reports', `e2e-report-${Date.now()}.html`);
    const reportsDir = path.dirname(reportPath);

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const report = `
<!DOCTYPE html>
<html>
<head>
  <title>Rapport E2E - AttitudesFramework</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .passed { color: green; }
    .failed { color: red; }
    .screenshot { max-width: 300px; margin: 10px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>Rapport de Tests E2E</h1>
  <div class="summary">
    <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
    <p><strong>Environnement:</strong> ${this.env}</p>
    <p><strong>URL:</strong> ${this.config.environments[this.env].baseUrl}</p>
  </div>
  
  <h2>Captures d'écran</h2>
  <div class="screenshots">
    ${this.getScreenshots()}
  </div>
</body>
</html>`;

    fs.writeFileSync(reportPath, report);
    console.log(`${colors.green}✓ Rapport généré: ${reportPath}${colors.reset}`);
  }

  getScreenshots() {
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) return '<p>Aucune capture d\'écran</p>';

    const files = fs.readdirSync(screenshotDir)
      .filter(f => f.endsWith('.png'))
      .sort((a, b) => b.localeCompare(a));

    if (files.length === 0) return '<p>Aucune capture d\'écran</p>';

    return files.map(file => `
      <div class="screenshot">
        <img src="../screenshots/${file}" alt="${file}" style="width: 100%;">
        <p>${file}</p>
      </div>
    `).join('');
  }
}

// Fonction helper pour les tests manuels
async function runManualTest() {
  const puppeteer = require('puppeteer');
  const config = require('./e2e.config');
  
  console.log(`${colors.yellow}Mode test manuel activé${colors.reset}`);
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    slowMo: 100
  });
  
  const page = await browser.newPage();
  await page.goto(config.baseUrl);
  
  console.log(`${colors.green}Navigateur ouvert. Vous pouvez tester manuellement.${colors.reset}`);
  console.log(`${colors.yellow}Appuyez sur Ctrl+C pour fermer.${colors.reset}`);
}

// Point d'entrée
const runner = new E2ETestRunner();

if (process.argv.includes('--manual')) {
  runManualTest().catch(console.error);
} else {
  runner.run().catch(error => {
    console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}