#!/usr/bin/env node

/**
 * Test rapide de la configuration OAuth
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🔍 TEST CONFIGURATION OAUTH - ATTITUDES.VIP\n');

// Test variables d'environnement
console.log('1️⃣ VARIABLES D\'ENVIRONNEMENT:');
console.log('   NODE_ENV:', process.env.NODE_ENV || '❌ Non défini');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? `✅ Défini (${process.env.JWT_SECRET.length} chars)` : '❌ Non défini');
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? '✅ Défini' : '❌ Non défini');
console.log('   REDIS_URL:', process.env.REDIS_URL ? '✅ Défini' : '❌ Non défini');

console.log('\n2️⃣ OAUTH PROVIDERS:');
console.log('   Google:');
console.log('     - CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Défini' : '❌ Non défini');
console.log('     - CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Défini' : '❌ Non défini');

console.log('   Facebook:');
console.log('     - APP_ID:', process.env.FACEBOOK_APP_ID ? '✅ Défini' : '❌ Non défini');
console.log('     - APP_SECRET:', process.env.FACEBOOK_APP_SECRET ? '✅ Défini' : '❌ Non défini');

console.log('   Twitter:');
console.log('     - CONSUMER_KEY:', process.env.TWITTER_CONSUMER_KEY ? '✅ Défini' : '❌ Non défini');
console.log('     - CONSUMER_SECRET:', process.env.TWITTER_CONSUMER_SECRET ? '✅ Défini' : '❌ Non défini');

console.log('   Apple:');
console.log('     - SERVICE_ID:', process.env.APPLE_SERVICE_ID ? '✅ Défini' : '❌ Non défini');
console.log('     - TEAM_ID:', process.env.APPLE_TEAM_ID ? '✅ Défini' : '❌ Non défini');

console.log('\n3️⃣ SERVICES TIERS:');
console.log('   Stripe:', process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Non configuré');
console.log('   Twilio:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configuré' : '❌ Non configuré');
console.log('   SendGrid:', process.env.SENDGRID_API_KEY ? '✅ Configuré' : '❌ Non configuré');
console.log('   Cloudinary:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configuré' : '❌ Non configuré');

// Test fichier auth-service.js
console.log('\n4️⃣ VÉRIFICATION FICHIERS:');
const authServicePath = path.join(process.cwd(), 'src/auth/auth-service.js');
try {
  const authContent = fs.readFileSync(authServicePath, 'utf8');
  
  console.log('   auth-service.js: ✅ Trouvé');
  console.log('     - GoogleStrategy:', authContent.includes('GoogleStrategy') ? '✅ Implémentée' : '❌ Non implémentée');
  console.log('     - FacebookStrategy:', authContent.includes('FacebookStrategy') ? '✅ Implémentée' : '❌ Non implémentée');
  console.log('     - TwitterStrategy:', authContent.includes('TwitterStrategy') ? '✅ Implémentée' : '❌ Non implémentée');
  console.log('     - AppleStrategy:', authContent.includes('AppleStrategy') ? '✅ Implémentée' : '❌ Non implémentée');
} catch (error) {
  console.log('   auth-service.js: ❌ Non trouvé');
}

// Test connexion DB
console.log('\n5️⃣ TEST CONNEXION DATABASE:');
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 5000
  });

  pool.query('SELECT NOW()')
    .then(result => {
      console.log('   PostgreSQL: ✅ Connecté -', result.rows[0].now);
      pool.end();
    })
    .catch(error => {
      console.log('   PostgreSQL: ❌ Erreur -', error.message);
      pool.end();
    });
} else {
  console.log('   PostgreSQL: ❌ DATABASE_URL non défini');
}

// Test connexion Redis
console.log('\n6️⃣ TEST CONNEXION REDIS:');
if (process.env.REDIS_URL) {
  const redis = require('redis');
  const client = redis.createClient({
    url: process.env.REDIS_URL,
    socket: { connectTimeout: 5000 }
  });

  client.connect()
    .then(async () => {
      await client.ping();
      console.log('   Redis: ✅ Connecté');
      await client.quit();
    })
    .catch(error => {
      console.log('   Redis: ❌ Erreur -', error.message);
    });
} else {
  console.log('   Redis: ❌ REDIS_URL non défini');
}

console.log('\n---');
console.log('💡 Pour configurer OAuth en production:');
console.log('1. Créer des applications sur chaque plateforme (Google, Facebook, Twitter, Apple)');
console.log('2. Obtenir les credentials (Client ID, Secret, etc.)');
console.log('3. Mettre à jour le fichier .env avec les vraies valeurs');
console.log('4. Configurer les URLs de callback dans chaque plateforme');
console.log('---\n');