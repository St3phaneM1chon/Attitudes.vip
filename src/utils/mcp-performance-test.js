/**
 * Test de performance et validation du système MCP Self-Check V2
 * Compare V1 vs V2 et génère des métriques de performance
 */

const { MCPSelfCheck, checkMCP } = require('./mcp-self-check')
const { MCPSelfCheckV2, checkMCPv2, mcpFeedback, mcpStats, mcpReport } = require('./mcp-self-check-v2')

// Cas de test représentatifs
const testCases = [
  // Cas simples
  {
    id: 'simple_file',
    request: 'Je veux créer un nouveau fichier config.json',
    expectedServices: ['filesystem'],
    context: {}
  },
  {
    id: 'simple_db',
    request: 'Afficher toutes les données de la table users',
    expectedServices: ['postgres'],
    context: {}
  },

  // Cas avec fautes de frappe
  {
    id: 'typo_file',
    request: 'Je veux crer un nouvau ficher pour la configuration',
    expectedServices: ['filesystem'],
    context: {}
  },
  {
    id: 'typo_git',
    request: 'fair un comit avec les changements',
    expectedServices: ['git'],
    context: {}
  },

  // Cas complexes multi-services
  {
    id: 'multi_service',
    request: 'Créer une migration pour ajouter une table products et commit les changements',
    expectedServices: ['postgres', 'filesystem', 'git'],
    context: {}
  },
  {
    id: 'cache_session',
    request: 'Implémenter un système de cache pour les sessions utilisateur en temps réel',
    expectedServices: ['redis'],
    context: {}
  },

  // Cas implicites
  {
    id: 'implicit_crud',
    request: 'Je veux modifier les informations du client #1234',
    expectedServices: ['postgres', 'filesystem'],
    context: { entity: 'client' }
  },
  {
    id: 'implicit_save',
    request: 'Sauvegarder l\'état actuel de l\'application pour plus tard',
    expectedServices: ['redis', 'filesystem'],
    context: {}
  },

  // Cas négatifs (ne devrait pas déclencher MCP)
  {
    id: 'negative_explain',
    request: 'Peux-tu m\'expliquer comment fonctionne React?',
    expectedServices: [],
    context: {}
  },
  {
    id: 'negative_calc',
    request: 'Calcule la somme de 2 + 2',
    expectedServices: [],
    context: {}
  },

  // Cas ambigus
  {
    id: 'ambiguous_version',
    request: 'Quelle est la version actuelle du projet?',
    expectedServices: ['git'], // Pourrait utiliser git pour vérifier les tags
    context: {}
  },
  {
    id: 'ambiguous_data',
    request: 'J\'ai besoin des données de performance du dernier mois',
    expectedServices: ['postgres', 'redis'], // Pourrait être dans DB ou cache
    context: { timeframe: 'last_month' }
  }
]

/**
 * Exécute un test de performance
 */
async function runPerformanceTest () {
  console.log('🚀 Démarrage des tests de performance MCP Self-Check\n')

  const results = {
    v1: {
      totalTime: 0,
      correctDetections: 0,
      falsePositives: 0,
      falseNegatives: 0,
      avgConfidence: 0,
      details: []
    },
    v2: {
      totalTime: 0,
      correctDetections: 0,
      falsePositives: 0,
      falseNegatives: 0,
      avgConfidence: 0,
      details: []
    }
  }

  // Préchauffer les systèmes
  console.log('⚡ Préchauffage des systèmes...')
  await checkMCP('test warmup')
  await checkMCPv2('test warmup')

  console.log('\n📋 Exécution des tests...\n')

  for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.id} ---`)
    console.log(`Request: "${testCase.request}"`)
    console.log(`Expected: [${testCase.expectedServices.join(', ')}]`)

    // Test V1
    const v1Start = Date.now()
    const v1Result = await checkMCP(testCase.request, testCase.context)
    const v1Time = Date.now() - v1Start

    const v1Services = v1Result.services.map(s => s.service)
    const v1Correct = isCorrectDetection(v1Services, testCase.expectedServices)

    results.v1.totalTime += v1Time
    if (v1Correct.correct) results.v1.correctDetections++
    results.v1.falsePositives += v1Correct.falsePositives
    results.v1.falseNegatives += v1Correct.falseNegatives

    // Test V2
    const v2Start = Date.now()
    const v2Result = await checkMCPv2(testCase.request, testCase.context)
    const v2Time = Date.now() - v2Start

    const v2Services = v2Result.services.map(s => s.service)
    const v2Correct = isCorrectDetection(v2Services, testCase.expectedServices)

    results.v2.totalTime += v2Time
    if (v2Correct.correct) results.v2.correctDetections++
    results.v2.falsePositives += v2Correct.falsePositives
    results.v2.falseNegatives += v2Correct.falseNegatives

    // Simuler un feedback pour V2 (apprentissage)
    if (v2Services.length > 0) {
      await mcpFeedback(v2Services[0], v2Correct.correct, {
        executionTime: v2Time,
        testCase: testCase.id
      })
    }

    // Afficher les résultats
    console.log(`\nV1: [${v1Services.join(', ')}] (${v1Time}ms) ${v1Correct.correct ? '✅' : '❌'}`)
    console.log(`V2: [${v2Services.join(', ')}] (${v2Time}ms) ${v2Correct.correct ? '✅' : '❌'}`)

    // Stocker les détails
    results.v1.details.push({
      testCase: testCase.id,
      detected: v1Services,
      time: v1Time,
      correct: v1Correct.correct,
      confidence: v1Result.services[0]?.confidence || 0
    })

    results.v2.details.push({
      testCase: testCase.id,
      detected: v2Services,
      time: v2Time,
      correct: v2Correct.correct,
      confidence: v2Result.services[0]?.score || 0
    })

    if (v1Result.services[0]) {
      results.v1.avgConfidence += v1Result.services[0].confidence
    }
    if (v2Result.services[0]) {
      results.v2.avgConfidence += v2Result.services[0].score
    }
  }

  // Calculer les moyennes
  results.v1.avgConfidence /= testCases.length
  results.v2.avgConfidence /= testCases.length

  // Afficher le rapport final
  console.log('\n\n📊 === RAPPORT DE PERFORMANCE ===\n')

  console.log('🔵 MCP Self-Check V1:')
  console.log(`  - Précision: ${(results.v1.correctDetections / testCases.length * 100).toFixed(1)}%`)
  console.log(`  - Temps total: ${results.v1.totalTime}ms`)
  console.log(`  - Temps moyen: ${(results.v1.totalTime / testCases.length).toFixed(1)}ms`)
  console.log(`  - Faux positifs: ${results.v1.falsePositives}`)
  console.log(`  - Faux négatifs: ${results.v1.falseNegatives}`)
  console.log(`  - Confiance moyenne: ${(results.v1.avgConfidence * 100).toFixed(1)}%`)

  console.log('\n🟢 MCP Self-Check V2:')
  console.log(`  - Précision: ${(results.v2.correctDetections / testCases.length * 100).toFixed(1)}%`)
  console.log(`  - Temps total: ${results.v2.totalTime}ms`)
  console.log(`  - Temps moyen: ${(results.v2.totalTime / testCases.length).toFixed(1)}ms`)
  console.log(`  - Faux positifs: ${results.v2.falsePositives}`)
  console.log(`  - Faux négatifs: ${results.v2.falseNegatives}`)
  console.log(`  - Confiance moyenne: ${(results.v2.avgConfidence * 100).toFixed(1)}%`)

  console.log('\n📈 Améliorations V2 vs V1:')
  const precisionImprovement = ((results.v2.correctDetections - results.v1.correctDetections) / results.v1.correctDetections * 100)
  const speedImprovement = ((results.v1.totalTime - results.v2.totalTime) / results.v1.totalTime * 100)
  console.log(`  - Précision: ${precisionImprovement > 0 ? '+' : ''}${precisionImprovement.toFixed(1)}%`)
  console.log(`  - Vitesse: ${speedImprovement > 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`)
  console.log(`  - Réduction faux positifs: ${results.v1.falsePositives - results.v2.falsePositives}`)
  console.log(`  - Réduction faux négatifs: ${results.v1.falseNegatives - results.v2.falseNegatives}`)

  // Test de cache pour V2
  console.log('\n\n🔄 Test de performance du cache V2...')
  const cacheTestRequest = 'Je veux créer un fichier et faire un commit'

  // Premier appel (miss)
  const missStart = Date.now()
  await checkMCPv2(cacheTestRequest)
  const missTime = Date.now() - missStart

  // Deuxième appel (hit)
  const hitStart = Date.now()
  await checkMCPv2(cacheTestRequest)
  const hitTime = Date.now() - hitStart

  console.log(`  - Cache miss: ${missTime}ms`)
  console.log(`  - Cache hit: ${hitTime}ms`)
  console.log(`  - Amélioration: ${((missTime - hitTime) / missTime * 100).toFixed(1)}%`)

  // Statistiques V2
  const v2Stats = await mcpStats()
  console.log('\n📊 Statistiques V2:')
  console.log(`  - Total checks: ${v2Stats.metrics.totalChecks}`)
  console.log(`  - Cache hit ratio: ${v2Stats.cache.hitRatio}`)
  console.log(`  - Learning updates: ${v2Stats.metrics.learningUpdates}`)

  // Rapport d'apprentissage
  const learningReport = await mcpReport()
  console.log('\n🧠 Rapport d\'apprentissage V2:')
  console.log('  Top services:')
  learningReport.learning.topServices.forEach(service => {
    console.log(`    - ${service.service}: ${service.uses} uses (${service.successRate} success)`)
  })

  if (learningReport.recommendations.improvements.length > 0) {
    console.log('\n  Suggestions d\'amélioration:')
    learningReport.recommendations.improvements.forEach(suggestion => {
      console.log(`    - ${suggestion.message}`)
    })
  }

  // Sauvegarder les résultats
  const fs = require('fs').promises
  const reportPath = './performance-report.json'
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    v2Stats,
    learningReport
  }, null, 2))

  console.log(`\n\n✅ Tests terminés! Rapport sauvegardé dans ${reportPath}`)
}

/**
 * Vérifie si la détection est correcte
 */
function isCorrectDetection (detected, expected) {
  const detectedSet = new Set(detected)
  const expectedSet = new Set(expected)

  let falsePositives = 0
  let falseNegatives = 0

  // Faux positifs: détectés mais pas attendus
  for (const service of detected) {
    if (!expectedSet.has(service)) {
      falsePositives++
    }
  }

  // Faux négatifs: attendus mais pas détectés
  for (const service of expected) {
    if (!detectedSet.has(service)) {
      falseNegatives++
    }
  }

  const correct = falsePositives === 0 && falseNegatives === 0

  return { correct, falsePositives, falseNegatives }
}

// Exécuter les tests
runPerformanceTest().catch(console.error)
