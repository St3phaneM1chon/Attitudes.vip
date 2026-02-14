/**
 * Test de charge K6 pour l'environnement staging
 * Usage: k6 run tests/load/staging-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-staging.attitudes.vip';

// Métriques personnalisées
const errorRate = new Rate('errors');

// Options du test
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Montée progressive à 10 users
    { duration: '5m', target: 50 },   // Montée à 50 users
    { duration: '10m', target: 100 }, // Maintien à 100 users
    { duration: '5m', target: 200 },  // Pic à 200 users
    { duration: '10m', target: 100 }, // Retour à 100 users
    { duration: '5m', target: 0 },    // Descente progressive
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes < 500ms
    http_req_failed: ['rate<0.1'],    // Taux d'erreur < 10%
    errors: ['rate<0.1'],             // Taux d'erreur custom < 10%
  },
};

// Données de test
const testUsers = [
  { email: 'test1@example.com', password: 'Test123!' },
  { email: 'test2@example.com', password: 'Test123!' },
  { email: 'test3@example.com', password: 'Test123!' },
];

// Scénario principal
export default function () {
  // 1. Test de santé
  testHealthCheck();
  
  // 2. Test d'authentification
  const token = testAuthentication();
  
  if (token) {
    // 3. Tests authentifiés
    testGetVendors(token);
    testSearchVendors(token);
    testGetWeddings(token);
    testCreateTask(token);
    testNotifications(token);
  }
  
  // Pause entre les itérations
  sleep(1);
}

// Tests individuels

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/api/v1/health`);
  
  const success = check(res, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  errorRate.add(!success);
}

function testAuthentication() {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };
  
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);
  
  const success = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== '',
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  
  if (success && res.json('token')) {
    return res.json('token');
  }
  
  return null;
}

function testGetVendors(token) {
  const params = {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.get(`${BASE_URL}/api/v1/vendors?limit=20`, params);
  
  const success = check(res, {
    'get vendors status is 200': (r) => r.status === 200,
    'get vendors has data': (r) => r.json('data') && r.json('data').length > 0,
    'get vendors response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  errorRate.add(!success);
}

function testSearchVendors(token) {
  const payload = JSON.stringify({
    q: 'photographe',
    filters: {
      type: 'photographer',
      minRating: 4,
    },
  });
  
  const params = {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(`${BASE_URL}/api/v1/vendors/search`, payload, params);
  
  const success = check(res, {
    'search vendors status is 200': (r) => r.status === 200,
    'search vendors has results': (r) => r.json('data') && Array.isArray(r.json('data')),
    'search vendors response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  errorRate.add(!success);
}

function testGetWeddings(token) {
  const params = {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.get(`${BASE_URL}/api/v1/weddings`, params);
  
  const success = check(res, {
    'get weddings status is 200': (r) => r.status === 200,
    'get weddings response time < 800ms': (r) => r.timings.duration < 800,
  });
  
  errorRate.add(!success);
}

function testCreateTask(token) {
  const payload = JSON.stringify({
    title: `Task ${Date.now()}`,
    description: 'Load test task',
    priority: 'medium',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  const params = {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  // Créer seulement 10% du temps pour éviter de polluer la DB
  if (Math.random() < 0.1) {
    const res = http.post(`${BASE_URL}/api/v1/tasks`, payload, params);
    
    const success = check(res, {
      'create task status is 201': (r) => r.status === 201,
      'create task has id': (r) => r.json('data.id') !== '',
      'create task response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
  }
}

function testNotifications(token) {
  const params = {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.get(`${BASE_URL}/api/v1/notifications`, params);
  
  const success = check(res, {
    'get notifications status is 200': (r) => r.status === 200,
    'get notifications response time < 600ms': (r) => r.timings.duration < 600,
  });
  
  errorRate.add(!success);
}

// Hook de fin pour afficher le résumé
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const { metrics } = data;
  
  return `
=== Test de Charge Staging ===

Durée totale: ${Math.round(metrics.iteration_duration.values.avg / 1000)}s
Requêtes totales: ${metrics.http_reqs.values.count}
Requêtes/sec: ${metrics.http_reqs.values.rate.toFixed(2)}

✓ Checks réussis: ${metrics.checks.values.passes}
✗ Checks échoués: ${metrics.checks.values.fails}
Taux de succès: ${((metrics.checks.values.passes / (metrics.checks.values.passes + metrics.checks.values.fails)) * 100).toFixed(2)}%

Temps de réponse:
- Médiane: ${Math.round(metrics.http_req_duration.values.med)}ms
- P95: ${Math.round(metrics.http_req_duration.values['p(95)'])}ms
- P99: ${Math.round(metrics.http_req_duration.values['p(99)'])}ms

Taux d'erreur: ${(metrics.errors.values.rate * 100).toFixed(2)}%
`;
}