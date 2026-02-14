/**
 * Test de charge complet avec K6
 * Simule des scénarios réalistes d'utilisation
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api-staging.attitudes.vip';
const WS_URL = __ENV.WS_URL || 'wss://ws-staging.attitudes.vip';

// Métriques personnalisées
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const searchDuration = new Trend('search_duration');
const paymentDuration = new Trend('payment_duration');
const websocketConnections = new Gauge('websocket_connections');
const successfulBookings = new Counter('successful_bookings');

// Options du test
export const options = {
  scenarios: {
    // Scénario 1: Navigation normale
    regular_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },  // Montée à 100 users
        { duration: '10m', target: 100 }, // Maintien 100 users
        { duration: '5m', target: 200 },  // Montée à 200 users
        { duration: '10m', target: 200 }, // Maintien 200 users
        { duration: '5m', target: 0 },    // Descente
      ],
      gracefulRampDown: '30s',
      exec: 'regularUserScenario',
    },
    
    // Scénario 2: Recherche intensive
    search_users: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30m',
      exec: 'searchScenario',
      startTime: '5m', // Commence après 5 min
    },
    
    // Scénario 3: Réservations (heures de pointe)
    booking_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '5m', target: 5 },   // 5 bookings/sec
        { duration: '2m', target: 20 },  // Pic à 20 bookings/sec
        { duration: '5m', target: 5 },   // Retour à 5 bookings/sec
      ],
      exec: 'bookingScenario',
      startTime: '10m', // Commence après 10 min
    },
    
    // Scénario 4: WebSocket connections
    realtime_users: {
      executor: 'constant-vus',
      vus: 30,
      duration: '35m',
      exec: 'websocketScenario',
    },
  },
  
  thresholds: {
    // Temps de réponse
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{type:api}': ['p(95)<300'],
    'http_req_duration{type:search}': ['p(95)<1000'],
    'http_req_duration{type:payment}': ['p(95)<2000'],
    
    // Taux d'erreur
    http_req_failed: ['rate<0.05'], // <5% erreur global
    errors: ['rate<0.1'],           // <10% erreur métier
    
    // Métriques métier
    login_duration: ['p(95)<500'],
    search_duration: ['p(95)<1000'],
    payment_duration: ['p(95)<3000'],
    successful_bookings: ['count>100'],
  },
};

// Données de test
const vendorTypes = ['photographer', 'dj', 'caterer', 'venue', 'florist'];
const locations = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Nice'];
const priceRanges = [
  { min: 0, max: 1000 },
  { min: 1000, max: 3000 },
  { min: 3000, max: 5000 },
  { min: 5000, max: 10000 },
];

// Scénarios

export function regularUserScenario() {
  // 1. Page d'accueil
  group('Homepage', () => {
    const res = http.get(BASE_URL, {
      tags: { type: 'static' },
    });
    check(res, {
      'homepage loads': (r) => r.status === 200,
    });
  });
  
  sleep(randomIntBetween(1, 3));
  
  // 2. Login
  const token = group('Authentication', () => {
    const startTime = Date.now();
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        email: `user${randomIntBetween(1, 1000)}@test.com`,
        password: 'TestPass123!',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'api' },
      }
    );
    
    loginDuration.add(Date.now() - startTime);
    
    const success = check(loginRes, {
      'login successful': (r) => r.status === 200 && r.json('token'),
    });
    
    errorRate.add(!success);
    
    return success ? loginRes.json('token') : null;
  });
  
  if (!token) return;
  
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(randomIntBetween(2, 5));
  
  // 3. Parcourir les vendors
  group('Browse Vendors', () => {
    const vendorType = randomItem(vendorTypes);
    const res = http.get(
      `${BASE_URL}/api/v1/vendors?type=${vendorType}&limit=20`,
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    check(res, {
      'vendors loaded': (r) => r.status === 200 && r.json('data').length > 0,
    });
    
    sleep(randomIntBetween(3, 8));
    
    // Voir les détails d'un vendor
    if (res.status === 200 && res.json('data').length > 0) {
      const vendor = randomItem(res.json('data'));
      const detailRes = http.get(
        `${BASE_URL}/api/v1/vendors/${vendor.id}`,
        {
          headers: authHeaders,
          tags: { type: 'api' },
        }
      );
      
      check(detailRes, {
        'vendor details loaded': (r) => r.status === 200,
      });
    }
  });
  
  sleep(randomIntBetween(2, 5));
  
  // 4. Dashboard
  group('Dashboard', () => {
    const dashRes = http.get(
      `${BASE_URL}/api/v1/weddings`,
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    check(dashRes, {
      'dashboard loaded': (r) => r.status === 200,
    });
  });
  
  sleep(randomIntBetween(5, 10));
}

export function searchScenario() {
  const token = authenticate();
  if (!token) return;
  
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  group('Search Operations', () => {
    // Recherche simple
    const startTime = Date.now();
    const query = randomItem(['photographe', 'dj', 'traiteur', 'fleuriste']);
    const location = randomItem(locations);
    
    const searchRes = http.post(
      `${BASE_URL}/api/v1/vendors/search`,
      JSON.stringify({
        q: query,
        filters: {
          location: location,
          available_dates: [generateFutureDate()],
        },
      }),
      {
        headers: authHeaders,
        tags: { type: 'search' },
      }
    );
    
    searchDuration.add(Date.now() - startTime);
    
    const success = check(searchRes, {
      'search successful': (r) => r.status === 200,
      'search has results': (r) => r.json('data') && r.json('data').length > 0,
    });
    
    errorRate.add(!success);
    
    sleep(randomIntBetween(3, 7));
    
    // Recherche avec filtres
    const priceRange = randomItem(priceRanges);
    const filteredRes = http.post(
      `${BASE_URL}/api/v1/vendors/search`,
      JSON.stringify({
        q: query,
        filters: {
          location: location,
          price_range: priceRange,
          min_rating: 4,
          vendor_types: [randomItem(vendorTypes)],
        },
      }),
      {
        headers: authHeaders,
        tags: { type: 'search' },
      }
    );
    
    check(filteredRes, {
      'filtered search successful': (r) => r.status === 200,
    });
  });
  
  sleep(randomIntBetween(5, 10));
}

export function bookingScenario() {
  const token = authenticate();
  if (!token) return;
  
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  group('Booking Flow', () => {
    // 1. Sélectionner un vendor
    const vendorsRes = http.get(
      `${BASE_URL}/api/v1/vendors?type=photographer&limit=10`,
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    if (vendorsRes.status !== 200 || !vendorsRes.json('data').length) {
      errorRate.add(1);
      return;
    }
    
    const vendor = randomItem(vendorsRes.json('data'));
    
    // 2. Vérifier disponibilité
    const date = generateFutureDate();
    const availRes = http.get(
      `${BASE_URL}/api/v1/vendors/${vendor.id}/availability?date=${date}`,
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    if (!check(availRes, { 'vendor available': (r) => r.status === 200 })) {
      return;
    }
    
    // 3. Créer réservation
    const bookingRes = http.post(
      `${BASE_URL}/api/v1/bookings`,
      JSON.stringify({
        vendor_id: vendor.id,
        wedding_id: 'test-wedding-' + randomIntBetween(1, 100),
        date: date,
        package_id: vendor.packages?.[0]?.id,
      }),
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    const bookingSuccess = check(bookingRes, {
      'booking created': (r) => r.status === 201,
    });
    
    if (bookingSuccess) {
      successfulBookings.add(1);
      
      // 4. Processus de paiement
      const startTime = Date.now();
      const paymentRes = http.post(
        `${BASE_URL}/api/v1/payments/checkout`,
        JSON.stringify({
          booking_id: bookingRes.json('data.id'),
          amount: vendor.packages?.[0]?.price || 2500,
          payment_type: 'deposit',
          deposit_percentage: 30,
        }),
        {
          headers: authHeaders,
          tags: { type: 'payment' },
        }
      );
      
      paymentDuration.add(Date.now() - startTime);
      
      check(paymentRes, {
        'payment initiated': (r) => r.status === 200 && r.json('checkout_url'),
      });
    } else {
      errorRate.add(1);
    }
  });
  
  sleep(randomIntBetween(2, 5));
}

export function websocketScenario() {
  // Note: K6 WebSocket support limité, simulation simplifiée
  websocketConnections.add(1);
  
  // Simuler des événements WebSocket via API REST
  const token = authenticate();
  if (!token) return;
  
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // Polling des notifications (simule WebSocket)
  for (let i = 0; i < 10; i++) {
    const notifRes = http.get(
      `${BASE_URL}/api/v1/notifications?since=${Date.now() - 60000}`,
      {
        headers: authHeaders,
        tags: { type: 'api' },
      }
    );
    
    check(notifRes, {
      'notifications fetched': (r) => r.status === 200,
    });
    
    sleep(30); // Poll toutes les 30 secondes
  }
  
  websocketConnections.add(-1);
}

// Fonctions utilitaires

function authenticate() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: `loadtest${randomIntBetween(1, 100)}@test.com`,
      password: 'LoadTest123!',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  return res.status === 200 ? res.json('token') : null;
}

function generateFutureDate() {
  const future = new Date();
  future.setDate(future.getDate() + randomIntBetween(30, 365));
  return future.toISOString().split('T')[0];
}

// Rapport de fin
export function handleSummary(data) {
  const summary = {
    'Total Requests': data.metrics.http_reqs.values.count,
    'RPS': data.metrics.http_reqs.values.rate.toFixed(2),
    'Success Rate': ((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2) + '%',
    'Avg Response Time': Math.round(data.metrics.http_req_duration.values.avg) + 'ms',
    'P95 Response Time': Math.round(data.metrics.http_req_duration.values['p(95)']) + 'ms',
    'P99 Response Time': Math.round(data.metrics.http_req_duration.values['p(99)']) + 'ms',
    'Error Rate': (data.metrics.errors.values.rate * 100).toFixed(2) + '%',
    'Successful Bookings': data.metrics.successful_bookings.values.count,
  };
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': htmlReport(data, summary),
  };
}

function textSummary(data, options) {
  return `
========================================
     Load Test Results - Attitudes.vip
========================================

Duration: ${Math.round(data.state.testRunDurationMs / 1000)}s
VUs Max: ${data.state.vusMax}

✓ Checks: ${data.metrics.checks.values.passes} / ${data.metrics.checks.values.passes + data.metrics.checks.values.fails}
✗ Errors: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%

Response Times:
  Avg: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
  Min: ${Math.round(data.metrics.http_req_duration.values.min)}ms
  Med: ${Math.round(data.metrics.http_req_duration.values.med)}ms
  Max: ${Math.round(data.metrics.http_req_duration.values.max)}ms
  P90: ${Math.round(data.metrics.http_req_duration.values['p(90)'])}ms
  P95: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms

Business Metrics:
  Login Duration (P95): ${Math.round(data.metrics.login_duration.values['p(95)'])}ms
  Search Duration (P95): ${Math.round(data.metrics.search_duration.values['p(95)'])}ms
  Payment Duration (P95): ${Math.round(data.metrics.payment_duration.values['p(95)'])}ms
  Successful Bookings: ${data.metrics.successful_bookings.values.count}

========================================
`;
}

function htmlReport(data, summary) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Report - Attitudes.vip</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .metric { background: #f0f0f0; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>Load Test Report - Attitudes.vip</h1>
  <h2>Summary</h2>
  <table>
    ${Object.entries(summary).map(([key, value]) => `
      <tr>
        <td><strong>${key}</strong></td>
        <td>${value}</td>
      </tr>
    `).join('')}
  </table>
  <h2>Thresholds</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Threshold</th>
      <th>Result</th>
      <th>Status</th>
    </tr>
    ${Object.entries(data.metrics)
      .filter(([_, metric]) => metric.thresholds)
      .map(([name, metric]) => {
        const passed = Object.values(metric.thresholds).every(t => t.ok);
        return `
          <tr>
            <td>${name}</td>
            <td>${Object.keys(metric.thresholds).join(', ')}</td>
            <td>${metric.values['p(95)'] || metric.values.rate || metric.values.avg}</td>
            <td class="${passed ? 'success' : 'error'}">${passed ? 'PASS' : 'FAIL'}</td>
          </tr>
        `;
      }).join('')}
  </table>
</body>
</html>
  `;
}