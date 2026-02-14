#!/usr/bin/env node

/**
 * Script de test pour l'autonomie MCP
 * Teste la fonction d'auto-vérification avec différents scénarios
 */

const { checkMCP, mcpSelfCheck } = require('../src/utils/mcp-self-check.js');

// Couleurs pour output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🧪 Test d'Autonomie MCP - Attitudes.vip${colors.reset}\n`);

// Scénarios de test
const testScenarios = [
  {
    name: "Création de fichier",
    request: "Je veux créer un nouveau fichier de configuration pour les webhooks",
    expectedMCP: ['filesystem']
  },
  {
    name: "Requête base de données",
    request: "Affiche-moi toutes les tables de la base de données PostgreSQL",
    expectedMCP: ['postgres']
  },
  {
    name: "Gestion de cache",
    request: "Il faut optimiser les performances avec un système de cache Redis",
    expectedMCP: ['redis']
  },
  {
    name: "Opération Git",
    request: "Fais un commit des changements récents avec un message descriptif",
    expectedMCP: ['git']
  },
  {
    name: "Multiples services",
    request: "Lis le fichier de config, modifie la base de données et fais un commit",
    expectedMCP: ['filesystem', 'postgres', 'git']
  },
  {
    name: "Paiement (non configuré)",
    request: "Configure l'intégration Stripe pour les paiements",
    expectedMCP: [] // Stripe n'est pas encore configuré
  },
  {
    name: "Action sans MCP",
    request: "Explique-moi comment fonctionne React",
    expectedMCP: [] // Pas besoin de MCP
  },
  {
    name: "SMS notification",
    request: "Envoie un SMS de notification aux invités",
    expectedMCP: [] // Twilio pas encore configuré
  }
];

// Fonction de test
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    console.log(`\n${colors.yellow}📋 Test: ${scenario.name}${colors.reset}`);
    console.log(`   Requête: "${scenario.request}"`);
    
    try {
      // Exécuter l'auto-vérification
      const result = await checkMCP(scenario.request);
      
      // Extraire les services recommandés
      const recommendedServices = result.services.map(s => s.service);
      
      // Afficher les résultats
      console.log(`   MCP détectés: ${recommendedServices.join(', ') || 'Aucun'}`);
      
      if (result.shouldUseMCP) {
        console.log(`   Raisons:`);
        result.reasoning.forEach(r => console.log(`     - ${r}`));
        
        console.log(`   Plan d'action:`);
        result.actionPlan.primaryActions.forEach(a => 
          console.log(`     - ${a.step} (${a.reason})`)
        );
      }
      
      // Vérifier le résultat
      const expectedSet = new Set(scenario.expectedMCP);
      const actualSet = new Set(recommendedServices);
      
      const isCorrect = 
        expectedSet.size === actualSet.size &&
        [...expectedSet].every(service => actualSet.has(service));
      
      if (isCorrect) {
        console.log(`   ${colors.green}✅ PASS${colors.reset}`);
        passed++;
      } else {
        console.log(`   ${colors.red}❌ FAIL${colors.reset}`);
        console.log(`   Attendu: ${scenario.expectedMCP.join(', ') || 'Aucun'}`);
        console.log(`   Obtenu: ${recommendedServices.join(', ') || 'Aucun'}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`   ${colors.red}❌ ERREUR: ${error.message}${colors.reset}`);
      failed++;
    }
  }
  
  // Résumé des tests
  console.log(`\n${colors.blue}📊 Résumé des Tests${colors.reset}`);
  console.log(`   Total: ${testScenarios.length}`);
  console.log(`   ${colors.green}Réussis: ${passed}${colors.reset}`);
  console.log(`   ${colors.red}Échoués: ${failed}${colors.reset}`);
  console.log(`   Taux de réussite: ${((passed/testScenarios.length)*100).toFixed(1)}%`);
  
  // Test du statut des services
  console.log(`\n${colors.blue}📡 Statut des Services MCP${colors.reset}`);
  const status = await mcpSelfCheck.getServicesStatus();
  
  for (const [service, info] of Object.entries(status)) {
    const icon = info.available ? '✅' : '⏳';
    console.log(`   ${icon} ${service}: ${info.available ? 'Disponible' : 'Non configuré'}`);
    if (info.available && info.command !== 'Not configured') {
      console.log(`      Commande: ${info.command}`);
    }
  }
  
  // Test de performance
  console.log(`\n${colors.blue}⚡ Test de Performance${colors.reset}`);
  const startTime = Date.now();
  const iterations = 100;
  
  for (let i = 0; i < iterations; i++) {
    await checkMCP("Créer un fichier et faire un commit");
  }
  
  const avgTime = (Date.now() - startTime) / iterations;
  console.log(`   Temps moyen par vérification: ${avgTime.toFixed(2)}ms`);
  console.log(`   ${avgTime < 10 ? colors.green + '✅ Excellent' : colors.yellow + '⚠️  Peut être optimisé'}${colors.reset}`);
  
  // Apprentissage
  console.log(`\n${colors.blue}🧠 Test d'Apprentissage${colors.reset}`);
  console.log(`   Historique de vérifications: ${mcpSelfCheck.checkHistory.length}`);
  
  // Simuler l'apprentissage
  mcpSelfCheck.learnFromHistory();
  console.log(`   ${colors.green}✅ Patterns d'utilisation analysés${colors.reset}`);
}

// Exécuter les tests
runTests().catch(error => {
  console.error(`${colors.red}Erreur fatale: ${error.message}${colors.reset}`);
  process.exit(1);
});