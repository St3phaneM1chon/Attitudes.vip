#!/usr/bin/env node

const http = require('http');

// Configuration des services MCP
const services = {
  stripe: { port: 3010, name: 'Stripe' },
  twilio: { port: 3013, name: 'Twilio' },
  sendgrid: { port: 3014, name: 'SendGrid' },
  cloudinary: { port: 3016, name: 'Cloudinary' },
  calendar: { port: 3019, name: 'Google Calendar' },
  echo: { port: 3030, name: 'Echo' },
  memory: { port: 3031, name: 'Memory' }
};

// Fonction pour envoyer une requête MCP
function sendMCPRequest(port, method, params = {}) {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: Date.now()
  });

  const options = {
    hostname: 'localhost',
    port: port,
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

// Tests pour chaque service
async function testServices() {
  console.log('🧪 Test Complet des Services MCP - Attitudes.vip\n');
  console.log('=' . repeat(50));
  
  const results = {
    passed: 0,
    failed: 0,
    services: {}
  };

  // 1. Test Stripe
  try {
    console.log('\n💳 Test Service Stripe...');
    const stripeConfig = await sendMCPRequest(services.stripe.port, 'config.info');
    console.log('✅ Stripe: Configuré et opérationnel');
    console.log(`   Mode: ${stripeConfig.result.mode}`);
    results.services.stripe = 'OK';
    results.passed++;
  } catch (e) {
    console.log('❌ Stripe: Erreur -', e.message);
    results.services.stripe = 'FAILED';
    results.failed++;
  }

  // 2. Test Twilio
  try {
    console.log('\n📱 Test Service Twilio...');
    const twilioConfig = await sendMCPRequest(services.twilio.port, 'config.info');
    console.log('✅ Twilio: Configuré et opérationnel');
    console.log(`   Numéro: ${twilioConfig.result.phoneNumber}`);
    results.services.twilio = 'OK';
    results.passed++;
  } catch (e) {
    console.log('❌ Twilio: Erreur -', e.message);
    results.services.twilio = 'FAILED';
    results.failed++;
  }

  // 3. Test SendGrid
  try {
    console.log('\n📧 Test Service SendGrid...');
    const sendgridConfig = await sendMCPRequest(services.sendgrid.port, 'config.info');
    console.log('✅ SendGrid: Configuré et opérationnel');
    console.log(`   Email: ${sendgridConfig.result.fromEmail}`);
    results.services.sendgrid = 'OK';
    results.passed++;
  } catch (e) {
    console.log('❌ SendGrid: Erreur -', e.message);
    results.services.sendgrid = 'FAILED';
    results.failed++;
  }

  // 4. Test Cloudinary
  try {
    console.log('\n🖼️  Test Service Cloudinary...');
    const cloudinaryConfig = await sendMCPRequest(services.cloudinary.port, 'config.info');
    console.log('✅ Cloudinary: Configuré et opérationnel');
    console.log(`   Cloud: ${cloudinaryConfig.result.cloudName}`);
    results.services.cloudinary = 'OK';
    results.passed++;
  } catch (e) {
    console.log('❌ Cloudinary: Erreur -', e.message);
    results.services.cloudinary = 'FAILED';
    results.failed++;
  }

  // 5. Test Google Calendar
  try {
    console.log('\n📅 Test Service Google Calendar...');
    const calendarConfig = await sendMCPRequest(services.calendar.port, 'config.info');
    console.log('✅ Google Calendar: Configuré et opérationnel');
    console.log(`   Features: ${calendarConfig.result.features.join(', ')}`);
    results.services.calendar = 'OK';
    results.passed++;
  } catch (e) {
    console.log('❌ Google Calendar: Erreur -', e.message);
    results.services.calendar = 'FAILED';
    results.failed++;
  }

  // Test d'intégration: Créer un workflow mariage
  console.log('\n🎯 Test d\'Intégration: Workflow Mariage Complet');
  console.log('-'.repeat(50));
  
  try {
    // 1. Créer un événement calendrier
    const event = await sendMCPRequest(services.calendar.port, 'events.create', {
      summary: 'Mariage de Jean et Marie',
      description: 'Cérémonie et réception',
      location: 'Château de Versailles',
      start: { dateTime: '2025-06-15T15:00:00+02:00' },
      end: { dateTime: '2025-06-16T02:00:00+02:00' },
      attendees: [
        { email: 'jean@attitudes.vip', displayName: 'Jean Dupont' },
        { email: 'marie@attitudes.vip', displayName: 'Marie Martin' }
      ]
    });
    console.log('✅ Événement créé:', event.result.id);

    // 2. Envoyer invitation par email
    const email = await sendMCPRequest(services.sendgrid.port, 'mail.send', {
      to: ['invites@attitudes.vip'],
      subject: 'Invitation - Mariage Jean & Marie',
      content: [{
        type: 'text/html',
        value: '<h1>Vous êtes invités!</h1><p>Jean et Marie seraient honorés de votre présence.</p>'
      }]
    });
    console.log('✅ Email envoyé:', email.result.id);

    // 3. Envoyer SMS de rappel
    const sms = await sendMCPRequest(services.twilio.port, 'messages.send', {
      to: '+33612345678',
      body: 'Rappel: Mariage Jean & Marie le 15 juin à 15h au Château de Versailles'
    });
    console.log('✅ SMS envoyé:', sms.result.sid);

    // 4. Upload photo test
    const photo = await sendMCPRequest(services.cloudinary.port, 'upload.image', {
      publicId: 'wedding_test_photo',
      folder: 'weddings/jean-marie',
      tags: ['test', 'wedding']
    });
    console.log('✅ Photo uploadée:', photo.result.url);

    console.log('\n🎉 Workflow mariage complet testé avec succès!');
    
  } catch (e) {
    console.log('❌ Erreur workflow:', e.message);
  }

  // Résumé final
  console.log('\n' + '='.repeat(50));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(50));
  console.log(`✅ Tests réussis: ${results.passed}`);
  console.log(`❌ Tests échoués: ${results.failed}`);
  console.log(`📈 Taux de réussite: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  
  console.log('\n📋 Détails par service:');
  Object.entries(results.services).forEach(([service, status]) => {
    const icon = status === 'OK' ? '✅' : '❌';
    console.log(`   ${icon} ${service.toUpperCase()}: ${status}`);
  });

  console.log('\n💡 Prochaines étapes:');
  console.log('1. Configurer les clés API réelles dans .env.mcp-extended');
  console.log('2. Intégrer ces services dans les dashboards');
  console.log('3. Créer les workflows automatisés avec Taskmaster');
  console.log('4. Implémenter les webhooks pour les événements temps réel');
}

// Exécuter les tests
testServices().catch(console.error);