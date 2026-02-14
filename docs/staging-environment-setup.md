# 🚀 Configuration de l'Environnement de Staging - AttitudesFramework

## Vue d'ensemble

Ce guide détaille la configuration complète de l'environnement de staging sur Supabase pour AttitudesFramework, incluant la base de données, l'authentification, les règles de sécurité, et le déploiement CI/CD.

## 📋 Prérequis

- Compte Supabase (https://supabase.com)
- Node.js 18+ et npm
- Git et GitHub Actions
- Accès aux secrets du projet

## 🗄️ 1. Configuration Supabase

### 1.1 Création du projet Staging

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Créer le projet
supabase projects create attitudes-staging \
  --org-id your-org-id \
  --plan free \
  --region eu-west-1
```

### 1.2 Structure de la base de données

```sql
-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension RLS
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Tables principales
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_names TEXT NOT NULL,
    wedding_date DATE NOT NULL,
    venue TEXT,
    budget DECIMAL(10,2),
    guest_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN (
        'admin', 'couple', 'wedding_planner', 'photographer',
        'videographer', 'caterer', 'decorator', 'dj',
        'venue_manager', 'officiant', 'transport_provider',
        'accommodation_provider', 'guest'
    )),
    wedding_id UUID REFERENCES weddings(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tables Taskmaster
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    ai_score INTEGER DEFAULT 50,
    category TEXT,
    due_date DATE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes pour performance
CREATE INDEX idx_tasks_wedding ON tasks(wedding_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_ai_score ON tasks(ai_score DESC);
CREATE INDEX idx_users_wedding ON users(wedding_id);
```

### 1.3 Row Level Security (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Politique pour weddings
CREATE POLICY "Users can view their wedding" ON weddings
    FOR SELECT USING (
        id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Couples can update their wedding" ON weddings
    FOR UPDATE USING (
        id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid() AND role = 'couple'
        )
    );

-- Politique pour users
CREATE POLICY "Users can view wedding members" ON users
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

-- Politique pour tasks
CREATE POLICY "Wedding members can view tasks" ON tasks
    FOR SELECT USING (
        wedding_id IN (
            SELECT wedding_id FROM users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Assigned users can update tasks" ON tasks
    FOR UPDATE USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid()
    );
```

## 🔐 2. Configuration de l'Authentification

### 2.1 Paramètres Auth

```javascript
// supabase/config.staging.js
export const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    providers: ['email', 'google'],
    redirectTo: 'https://staging.attitudes.vip/auth/callback'
  },
  global: {
    headers: {
      'X-Environment': 'staging'
    }
  }
};
```

### 2.2 Email Templates

```html
<!-- Email de confirmation -->
<h2>Bienvenue sur Attitudes.vip Staging!</h2>
<p>Confirmez votre email pour accéder à l'environnement de test.</p>
<a href="{{ .ConfirmationURL }}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
  Confirmer mon email
</a>
<p style="color: #666; font-size: 12px;">
  Ceci est un environnement de staging. Les données peuvent être réinitialisées.
</p>
```

## 🔧 3. Variables d'Environnement

### 3.1 Fichier .env.staging

```bash
# Supabase
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# Application
NODE_ENV=staging
APP_URL=https://staging.attitudes.vip
API_URL=https://api-staging.attitudes.vip

# Monitoring
SENTRY_DSN=your-sentry-staging-dsn
LOG_LEVEL=debug

# Features flags
ENABLE_AI_FEATURES=true
ENABLE_WEBSOCKET=true
ENABLE_ANALYTICS=false
```

### 3.2 Configuration GitHub Secrets

```yaml
# .github/workflows/deploy-staging.yml
env:
  SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SUPABASE_SERVICE_KEY }}
```

## 🚀 4. Pipeline CI/CD

### 4.1 GitHub Actions Workflow

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  pull_request:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Run E2E tests
        env:
          E2E_ENV: staging
        run: npm run test:e2e

  deploy:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Database Migrations
        run: |
          supabase db push --db-url ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Build Application
        run: |
          npm run build:staging
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod --env=staging'
```

### 4.2 Scripts de déploiement

```bash
#!/bin/bash
# scripts/deploy-staging.sh

echo "🚀 Déploiement sur Staging..."

# 1. Vérifier les tests
npm test || exit 1

# 2. Build de l'application
npm run build:staging || exit 1

# 3. Migrations base de données
supabase db push --db-url $STAGING_DATABASE_URL || exit 1

# 4. Déployer les Edge Functions
supabase functions deploy --project-ref $STAGING_PROJECT_REF || exit 1

# 5. Déployer l'application
vercel --prod --env=staging || exit 1

# 6. Tests de smoke
npm run test:smoke:staging || exit 1

echo "✅ Déploiement terminé!"
```

## 📊 5. Monitoring et Logs

### 5.1 Configuration Sentry

```javascript
// src/monitoring/sentry.staging.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "staging",
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 1.0, // 100% en staging
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Ajouter contexte staging
    event.tags = {
      ...event.tags,
      environment: 'staging',
      deployment: process.env.VERCEL_GIT_COMMIT_SHA
    };
    return event;
  }
});
```

### 5.2 Logs Supabase

```javascript
// src/utils/logger.staging.js
class StagingLogger {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async log(level, message, metadata = {}) {
    const logEntry = {
      level,
      message,
      metadata,
      environment: 'staging',
      timestamp: new Date().toISOString(),
      user_id: metadata.userId,
      session_id: metadata.sessionId
    };

    // Log local en développement
    console.log(`[${level.toUpperCase()}]`, message, metadata);

    // Log distant en staging
    if (process.env.NODE_ENV === 'staging') {
      await this.supabase
        .from('application_logs')
        .insert(logEntry);
    }
  }
}
```

## 🧪 6. Tests Automatisés

### 6.1 Tests de déploiement

```javascript
// tests/deployment/staging.test.js
describe('Staging Deployment Tests', () => {
  const stagingUrl = 'https://staging.attitudes.vip';

  test('Application is accessible', async () => {
    const response = await fetch(stagingUrl);
    expect(response.status).toBe(200);
  });

  test('API health check', async () => {
    const response = await fetch(`${stagingUrl}/api/health`);
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.environment).toBe('staging');
  });

  test('Database connection', async () => {
    const response = await fetch(`${stagingUrl}/api/db-check`);
    const data = await response.json();
    expect(data.connected).toBe(true);
  });

  test('Auth flow works', async () => {
    // Test signup, login, logout
    const testUser = {
      email: `test-${Date.now()}@staging.attitudes.vip`,
      password: 'TestStaging123!'
    };
    
    // Signup
    const signupResponse = await fetch(`${stagingUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    expect(signupResponse.status).toBe(201);
  });
});
```

### 6.2 Tests de performance

```javascript
// tests/performance/staging.test.js
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

describe('Staging Performance Tests', () => {
  test('Lighthouse scores meet thresholds', async () => {
    const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
    const options = {
      logLevel: 'info',
      output: 'json',
      port: chrome.port
    };
    
    const runnerResult = await lighthouse('https://staging.attitudes.vip', options);
    const scores = runnerResult.lhr.categories;
    
    expect(scores.performance.score).toBeGreaterThan(0.8);
    expect(scores.accessibility.score).toBeGreaterThan(0.9);
    expect(scores.seo.score).toBeGreaterThan(0.9);
    
    await chrome.kill();
  });
});
```

## 🔄 7. Synchronisation des Données

### 7.1 Script de seed

```javascript
// scripts/seed-staging.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.STAGING_SUPABASE_URL,
  process.env.STAGING_SUPABASE_SERVICE_KEY
);

async function seedStagingData() {
  console.log('🌱 Seeding staging data...');

  // 1. Créer des mariages de test
  const weddings = [
    {
      couple_names: 'Marie & Thomas Test',
      wedding_date: '2024-08-15',
      venue: 'Château de Test',
      budget: 25000,
      guest_count: 100
    },
    {
      couple_names: 'Sophie & Lucas Demo',
      wedding_date: '2024-09-20',
      venue: 'Villa Demo',
      budget: 35000,
      guest_count: 150
    }
  ];

  const { data: weddingData } = await supabase
    .from('weddings')
    .insert(weddings)
    .select();

  // 2. Créer des utilisateurs de test
  for (const wedding of weddingData) {
    const users = [
      {
        email: `couple-${wedding.id}@staging.attitudes.vip`,
        name: wedding.couple_names.split(' & ')[0],
        role: 'couple',
        wedding_id: wedding.id
      },
      {
        email: `dj-${wedding.id}@staging.attitudes.vip`,
        name: 'DJ Test',
        role: 'dj',
        wedding_id: wedding.id
      },
      {
        email: `photo-${wedding.id}@staging.attitudes.vip`,
        name: 'Photo Test',
        role: 'photographer',
        wedding_id: wedding.id
      }
    ];

    await supabase.from('users').insert(users);

    // 3. Créer des tâches de test
    const tasks = [
      {
        wedding_id: wedding.id,
        title: 'Confirmer le menu avec le traiteur',
        priority: 'high',
        ai_score: 85,
        due_date: '2024-07-01'
      },
      {
        wedding_id: wedding.id,
        title: 'Envoyer les invitations',
        priority: 'medium',
        ai_score: 70,
        due_date: '2024-06-15'
      }
    ];

    await supabase.from('tasks').insert(tasks);
  }

  console.log('✅ Staging data seeded!');
}

// Exécuter
seedStagingData().catch(console.error);
```

## 🛡️ 8. Sécurité Staging

### 8.1 Protection des données

```javascript
// middleware/staging-protection.js
export function stagingProtection(req, res, next) {
  // Bannière d'avertissement
  res.locals.stagingBanner = true;
  
  // Headers de sécurité
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('X-Environment', 'staging');
  
  // Authentification basique pour staging
  const auth = req.headers.authorization;
  if (!auth || auth !== `Basic ${process.env.STAGING_AUTH_TOKEN}`) {
    res.status(401).send('Staging Authentication Required');
    return;
  }
  
  next();
}
```

### 8.2 Rotation des secrets

```bash
#!/bin/bash
# scripts/rotate-staging-secrets.sh

echo "🔐 Rotation des secrets staging..."

# Générer nouveaux secrets
NEW_JWT_SECRET=$(openssl rand -base64 32)
NEW_ANON_KEY=$(supabase gen keys --project-ref $STAGING_PROJECT_REF | grep anon | cut -d: -f2)

# Mettre à jour GitHub Secrets
gh secret set STAGING_JWT_SECRET --body "$NEW_JWT_SECRET"
gh secret set STAGING_SUPABASE_ANON_KEY --body "$NEW_ANON_KEY"

# Redéployer
npm run deploy:staging

echo "✅ Secrets rotés!"
```

## 📱 9. Configuration Mobile Staging

```javascript
// mobile/config.staging.js
export const stagingConfig = {
  apiUrl: 'https://api-staging.attitudes.vip',
  wsUrl: 'wss://ws-staging.attitudes.vip',
  features: {
    pushNotifications: true,
    offlineMode: true,
    analytics: false // Désactivé en staging
  },
  cache: {
    ttl: 300, // 5 minutes en staging
    maxSize: 50 // MB
  }
};
```

## 📋 10. Checklist de Déploiement

### Avant le déploiement
- [ ] Tests unitaires passent
- [ ] Tests E2E passent
- [ ] Lint sans erreurs
- [ ] Build réussi
- [ ] Migrations testées localement

### Pendant le déploiement
- [ ] Backup de la DB staging
- [ ] Migrations appliquées
- [ ] Variables d'env vérifiées
- [ ] Edge Functions déployées
- [ ] Frontend déployé

### Après le déploiement
- [ ] Tests de smoke passent
- [ ] Monitoring actif
- [ ] Logs vérifiés
- [ ] Performance validée
- [ ] Notification équipe

## 🚨 Troubleshooting

### Problèmes courants

1. **Erreur de migration**
```bash
# Rollback
supabase db reset --db-url $STAGING_DATABASE_URL
```

2. **Build échoué**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build:staging
```

3. **Auth ne fonctionne pas**
- Vérifier SITE_URL dans Supabase
- Vérifier les redirect URLs
- Vérifier les email templates

---

Pour toute question, consultez la documentation complète ou contactez l'équipe DevOps.