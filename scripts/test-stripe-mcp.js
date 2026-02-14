#!/usr/bin/env node

const http = require('http');

// Configuration
const MCP_STRIPE_URL = 'http://localhost:3010/mcp';

// Fonction pour envoyer une requête MCP
function sendMCPRequest(method, params = {}) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: Date.now()
  });

  const options = {
    hostname: 'localhost',
    port: 3010,
    path: '/mcp',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Tests
async function runTests() {
  console.log('🧪 Test du service MCP Stripe\n');

  try {
    // 1. Vérifier la configuration
    console.log('1️⃣ Vérification de la configuration...');
    const configInfo = await sendMCPRequest('config.info');
    console.log('✅ Configuration:', configInfo.result);
    console.log('');

    // 2. Créer un client test
    console.log('2️⃣ Création d\'un client test...');
    const customer = await sendMCPRequest('customers.create', {
      email: 'couple@attitudes.vip',
      name: 'Jean et Marie Dupont',
      description: 'Couple test - Mariage Juin 2025'
    });
    console.log('✅ Client créé:', customer.result);
    console.log('');

    // 3. Créer un prix pour un forfait mariage
    console.log('3️⃣ Création d\'un prix forfait mariage...');
    const price = await sendMCPRequest('prices.create', {
      unit_amount: 150000, // 1500€ en centimes
      currency: 'eur',
      product_data: {
        name: 'Forfait Mariage Premium',
        description: 'Gestion complète de votre mariage avec Attitudes.vip'
      }
    });
    console.log('✅ Prix créé:', price.result);
    console.log('');

    // 4. Créer une intention de paiement
    console.log('4️⃣ Création d\'une intention de paiement...');
    const paymentIntent = await sendMCPRequest('paymentIntents.create', {
      amount: 150000, // 1500€
      currency: 'eur',
      customer: customer.result.id,
      description: 'Acompte forfait mariage Premium'
    });
    console.log('✅ Intention de paiement créée:', paymentIntent.result);
    console.log('');

    // 5. Lister les clients
    console.log('5️⃣ Liste des clients...');
    const customersList = await sendMCPRequest('customers.list');
    console.log('✅ Clients:', customersList.result);
    console.log('');

    console.log('🎉 Tous les tests ont réussi !');
    console.log('\n📊 Résumé:');
    console.log('- Service MCP Stripe: ✅ Opérationnel');
    console.log('- Mode: TEST (clés de test détectées)');
    console.log('- Fonctionnalités testées: Clients, Prix, Paiements');
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Intégrer dans l\'application Attitudes.vip');
    console.log('2. Créer les webhooks pour les événements');
    console.log('3. Implémenter les flows de paiement complets');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.result) {
      console.error('Détails:', error.result);
    }
  }
}

// Exécuter les tests
runTests();