# 🧪 Standards de Tests Obligatoires

## 📊 Coverage Minimum

### ✅ OBLIGATOIRE - Seuils de Couverture
```yaml
coverage:
  global:
    statements: 80%
    branches: 75%
    functions: 80%
    lines: 80%
  
  nouveaux_fichiers:
    statements: 90%
    branches: 85%
    functions: 90%
    lines: 90%
  
  code_critique:  # Auth, paiements, sécurité
    statements: 100%
    branches: 100%
    functions: 100%
    lines: 100%
```

## 🎯 Types de Tests Requis

### 1. Tests Unitaires
```javascript
// ✅ OBLIGATOIRE - Pour toute fonction business
describe('calculateWeddingBudget', () => {
  it('should calculate total with all services', () => {
    const services = [
      { type: 'venue', price: 5000 },
      { type: 'catering', price: 3000 }
    ];
    
    expect(calculateWeddingBudget(services)).toBe(8000);
  });
  
  it('should handle empty services array', () => {
    expect(calculateWeddingBudget([])).toBe(0);
  });
  
  it('should throw on invalid input', () => {
    expect(() => calculateWeddingBudget(null)).toThrow();
  });
});
```

### 2. Tests d'Intégration
```javascript
// ✅ OBLIGATOIRE - Pour toutes les APIs
describe('POST /api/weddings', () => {
  beforeEach(async () => {
    await db.clean();
    await db.seed();
  });
  
  it('should create wedding with valid data', async () => {
    const response = await request(app)
      .post('/api/weddings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        date: '2025-06-15',
        venue: 'Grand Hotel',
        budget: 50000
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.venue).toBe('Grand Hotel');
  });
  
  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/weddings')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toContain('date is required');
  });
});
```

### 3. Tests End-to-End (E2E)
```javascript
// ✅ OBLIGATOIRE - Parcours utilisateur critiques
describe('Wedding Planning Journey', () => {
  it('should complete full wedding setup', async () => {
    // 1. Registration
    await page.goto('/register');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('[type="submit"]');
    
    // 2. Create wedding
    await page.waitForURL('/dashboard');
    await page.click('[data-test="create-wedding"]');
    await page.fill('[name="date"]', '2025-06-15');
    await page.fill('[name="venue"]', 'Grand Hotel');
    await page.click('[data-test="save"]');
    
    // 3. Invite guests
    await page.click('[data-test="manage-guests"]');
    await page.click('[data-test="add-guest"]');
    await page.fill('[name="email"]', 'guest@example.com');
    await page.click('[data-test="send-invite"]');
    
    // Assertions
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.guest-count')).toHaveText('1');
  });
});
```

### 4. Tests de Performance
```javascript
// ✅ OBLIGATOIRE - Avant chaque release
describe('Performance Tests', () => {
  it('should handle 100 concurrent requests', async () => {
    const results = await loadTest({
      url: 'https://api.attitudes.vip/weddings',
      concurrent: 100,
      duration: '30s'
    });
    
    expect(results.avgResponseTime).toBeLessThan(200);
    expect(results.errorRate).toBeLessThan(0.1);
    expect(results.p95ResponseTime).toBeLessThan(500);
  });
  
  it('should maintain performance with large datasets', async () => {
    // Seed 10000 weddings
    await seedLargeDataset();
    
    const start = Date.now();
    const response = await request(app).get('/api/weddings?limit=100');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
    expect(response.body.data).toHaveLength(100);
  });
});
```

### 5. Tests de Sécurité
```javascript
// ✅ OBLIGATOIRE - Tests automatisés de sécurité
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE weddings; --";
    
    const response = await request(app)
      .get(`/api/weddings/search?q=${maliciousInput}`);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });
  
  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() => 
      request(app).get('/api/weddings')
    );
    
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
  
  it('should validate JWT tokens', async () => {
    const invalidToken = 'invalid.jwt.token';
    
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${invalidToken}`);
    
    expect(response.status).toBe(401);
  });
});
```

## 📝 Structure des Tests

### Organisation des Fichiers
```
tests/
├── unit/              # Tests unitaires
│   ├── services/
│   ├── utils/
│   └── models/
├── integration/       # Tests d'intégration
│   ├── api/
│   ├── database/
│   └── auth/
├── e2e/              # Tests end-to-end
│   ├── journeys/
│   └── smoke/
├── performance/      # Tests de performance
└── security/         # Tests de sécurité
```

## 🚀 Exécution des Tests

### Commandes NPM
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:performance": "k6 run tests/performance",
    "test:security": "npm audit && jest tests/security",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "test:ci": "npm run test:coverage && npm run test:e2e"
  }
}
```

## 📊 Métriques de Qualité

### ✅ OBLIGATOIRE - Métriques à Maintenir
- **Temps d'exécution**: < 5 minutes pour tests unitaires
- **Flakiness**: 0% (tests déterministes)
- **Coverage trend**: Toujours en augmentation
- **Test/Code ratio**: > 1.5

## 🔄 Tests en CI/CD

### Pipeline Obligatoire
```yaml
test-pipeline:
  - stage: lint
    script: npm run lint
    
  - stage: unit-tests
    script: npm run test:unit
    coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
    
  - stage: integration-tests
    script: npm run test:integration
    
  - stage: security-tests
    script: npm run test:security
    
  - stage: e2e-tests
    script: npm run test:e2e
    artifacts:
      - screenshots/
      - videos/
      
  - stage: performance-tests
    script: npm run test:performance
    only:
      - main
      - release/*
```

## 🏷️ Tags et Catégories

### Tags Obligatoires
```javascript
// @critical - Test critique pour la production
// @smoke - Test de smoke testing
// @regression - Test de non-régression
// @flaky - Test instable (à corriger)

describe('Payment Processing @critical @smoke', () => {
  // Tests critiques qui doivent toujours passer
});
```

## 📈 Reporting

### Dashboards Requis
1. **Coverage Evolution**: Graphique de l'évolution du coverage
2. **Test Results**: Taux de succès par catégorie
3. **Performance Trends**: Évolution des temps de réponse
4. **Flaky Tests**: Liste des tests instables

## 🚨 Règles de Blocage

### PR Bloquée Si:
- Coverage diminue
- Tests critiques échouent
- Nouveaux fichiers sans tests
- Tests flaky détectés
- Performance dégradée > 10%

## 💡 Best Practices

### 1. Isolation des Tests
```javascript
// ✅ BON - Test isolé
beforeEach(() => {
  jest.clearAllMocks();
  db.clean();
});

// ❌ MAUVAIS - Dépendance entre tests
let sharedState;
it('test 1', () => {
  sharedState = createData();
});
it('test 2', () => {
  // Utilise sharedState du test 1
});
```

### 2. Données de Test
```javascript
// ✅ BON - Factory pattern
const weddingFactory = Factory.define('wedding', () => ({
  date: faker.date.future(),
  venue: faker.company.name(),
  budget: faker.number.int({ min: 10000, max: 100000 })
}));

// Usage
const wedding = weddingFactory.build();
const premiumWedding = weddingFactory.build({ budget: 150000 });
```

### 3. Assertions Claires
```javascript
// ✅ BON - Message d'erreur explicite
expect(response.status).toBe(200, 
  `Expected successful response but got ${response.status}: ${response.body.error}`
);

// ❌ MAUVAIS - Pas de contexte
expect(response.status).toBe(200);
```

## 🔧 Outils Obligatoires

- **Jest**: Tests unitaires et intégration
- **Playwright**: Tests E2E
- **k6**: Tests de charge
- **Supertest**: Tests d'API
- **Jest-Extended**: Matchers additionnels
- **Faker**: Génération de données

---

**Ces standards garantissent la qualité et la fiabilité du code. Aucune exception n'est tolérée pour le code critique!** 🛡️