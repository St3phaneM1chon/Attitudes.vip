#!/usr/bin/env node

/**
 * Script pour exécuter les tests avec environnement fixé
 * Attitudes.vip
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Définir l'environnement de test
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/attitudes_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret-key';

console.log('🧪 Préparation de l'environnement de test...\n');

// Vérifier que les dépendances sont installées
try {
  execSync('npm list jest', { stdio: 'ignore' });
} catch (error) {
  console.log('📦 Installation des dépendances de test...');
  execSync('npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event', { stdio: 'inherit' });
}

// Créer le répertoire de coverage s'il n'existe pas
const coverageDir = path.join(__dirname, '..', 'coverage');
if (!fs.existsSync(coverageDir)) {
  fs.mkdirSync(coverageDir, { recursive: true });
}

// Options Jest
const jestOptions = [
  '--passWithNoTests',
  '--testTimeout=10000',
  '--forceExit',
  '--detectOpenHandles',
  '--coverage',
  '--coverageDirectory=coverage',
  '--collectCoverageFrom="src/**/*.{js,jsx}"',
  '--coveragePathIgnorePatterns="/node_modules/|/dist/|/coverage/"',
  '--testPathIgnorePatterns="/node_modules/|/dist/|/e2e/"',
  '--maxWorkers=2',
  '--silent=false'
];

// Filtrer les tests qui peuvent causer des problèmes
const testFilter = process.argv.includes('--unit') ? '--testMatch="**/tests/unit/**/*.test.js"' : '';

console.log('🚀 Exécution des tests...\n');

try {
  // Exécuter les tests
  const command = `npx jest ${jestOptions.join(' ')} ${testFilter}`;
  console.log(`Commande: ${command}\n`);
  
  execSync(command, { 
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: 'true', // Désactiver le mode watch
      FORCE_COLOR: '1' // Garder les couleurs
    }
  });
  
  console.log('\n✅ Tests exécutés avec succès!');
  
  // Afficher le résumé de couverture
  const coverageFile = path.join(coverageDir, 'coverage-summary.json');
  if (fs.existsSync(coverageFile)) {
    const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    console.log('\n📊 Résumé de couverture:');
    console.log(`  - Lignes: ${coverage.total.lines.pct}%`);
    console.log(`  - Branches: ${coverage.total.branches.pct}%`);
    console.log(`  - Fonctions: ${coverage.total.functions.pct}%`);
    console.log(`  - Déclarations: ${coverage.total.statements.pct}%`);
  }
  
} catch (error) {
  console.error('\n❌ Erreur lors de l'exécution des tests');
  console.error('Essayez de lancer les tests unitaires uniquement avec: npm run test:unit');
  process.exit(1);
}