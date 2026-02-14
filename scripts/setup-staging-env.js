#!/usr/bin/env node

/**
 * Script de configuration automatique de l'environnement de staging
 * Configure Supabase, les variables d'environnement et les services
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class StagingEnvironmentSetup {
  constructor() {
    this.config = {
      projectName: 'attitudes-staging',
      region: 'eu-west-1',
      environment: 'staging'
    };
    this.secrets = {};
  }

  async run() {
    console.log('\n🚀 Configuration de l\'environnement de Staging pour AttitudesFramework\n');
    
    try {
      await this.checkPrerequisites();
      await this.collectInformation();
      await this.createSupabaseProject();
      await this.setupDatabase();
      await this.configureAuth();
      await this.setupEdgeFunctions();
      await this.generateEnvFiles();
      await this.setupGitHubSecrets();
      await this.runInitialTests();
      
      console.log('\n✅ Configuration de staging terminée avec succès!');
      this.printNextSteps();
    } catch (error) {
      console.error('\n❌ Erreur:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkPrerequisites() {
    console.log('📋 Vérification des prérequis...\n');
    
    const checks = [
      {
        name: 'Supabase CLI',
        command: 'supabase --version',
        install: 'npm install -g supabase'
      },
      {
        name: 'GitHub CLI',
        command: 'gh --version',
        install: 'brew install gh (Mac) ou https://cli.github.com'
      },
      {
        name: 'Node.js 18+',
        command: 'node --version',
        check: (output) => {
          const version = parseInt(output.split('.')[0].substring(1));
          return version >= 18;
        }
      }
    ];

    for (const check of checks) {
      try {
        const output = execSync(check.command, { encoding: 'utf8' }).trim();
        if (check.check && !check.check(output)) {
          throw new Error(`Version incompatible`);
        }
        console.log(`✓ ${check.name}: ${output}`);
      } catch (error) {
        console.log(`✗ ${check.name} non trouvé`);
        if (check.install) {
          console.log(`  Installer avec: ${check.install}`);
        }
        throw new Error(`Prérequis manquant: ${check.name}`);
      }
    }
    
    console.log();
  }

  async collectInformation() {
    console.log('📝 Collection des informations...\n');
    
    // Vérifier si connecté à Supabase
    try {
      execSync('supabase projects list', { encoding: 'utf8' });
    } catch {
      console.log('Vous devez vous connecter à Supabase:');
      console.log('Exécutez: supabase login');
      process.exit(1);
    }
    
    this.config.orgId = await question('Organization ID Supabase: ');
    this.config.githubRepo = await question('Repository GitHub (owner/repo): ');
    
    const useCustomDomain = await question('Utiliser un domaine personnalisé? (y/n): ');
    if (useCustomDomain.toLowerCase() === 'y') {
      this.config.customDomain = await question('Domaine staging (ex: staging.attitudes.vip): ');
    }
    
    console.log();
  }

  async createSupabaseProject() {
    console.log('🗄️ Création du projet Supabase...\n');
    
    try {
      // Créer le projet
      const createCommand = `supabase projects create ${this.config.projectName} ` +
        `--org-id ${this.config.orgId} ` +
        `--region ${this.config.region} ` +
        `--db-pass ${this.generatePassword()}`;
      
      const output = execSync(createCommand, { encoding: 'utf8' });
      console.log('✓ Projet créé');
      
      // Extraire l'ID du projet
      const projectIdMatch = output.match(/project id: ([\w-]+)/i);
      if (projectIdMatch) {
        this.config.projectRef = projectIdMatch[1];
      }
      
      // Récupérer les clés API
      await this.getProjectKeys();
      
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️  Le projet existe déjà, récupération des informations...');
        await this.getExistingProjectInfo();
      } else {
        throw error;
      }
    }
  }

  async getProjectKeys() {
    console.log('🔑 Récupération des clés API...\n');
    
    const keysOutput = execSync(
      `supabase projects api-keys --project-ref ${this.config.projectRef}`,
      { encoding: 'utf8' }
    );
    
    const anonMatch = keysOutput.match(/anon key: ([\w.-]+)/i);
    const serviceMatch = keysOutput.match(/service_role key: ([\w.-]+)/i);
    
    if (anonMatch) this.secrets.SUPABASE_ANON_KEY = anonMatch[1];
    if (serviceMatch) this.secrets.SUPABASE_SERVICE_ROLE_KEY = serviceMatch[1];
    
    // URL du projet
    this.secrets.SUPABASE_URL = `https://${this.config.projectRef}.supabase.co`;
    
    console.log('✓ Clés récupérées');
  }

  async setupDatabase() {
    console.log('\n💾 Configuration de la base de données...\n');
    
    // Lier le projet local
    execSync(`supabase link --project-ref ${this.config.projectRef}`);
    console.log('✓ Projet lié');
    
    // Appliquer les migrations
    const migrationsPath = path.join(__dirname, '..', 'supabase', 'migrations');
    if (fs.existsSync(migrationsPath)) {
      execSync('supabase db push');
      console.log('✓ Migrations appliquées');
    }
    
    // Seed initial
    await this.seedDatabase();
  }

  async seedDatabase() {
    console.log('🌱 Seed des données de test...\n');
    
    const supabase = createClient(
      this.secrets.SUPABASE_URL,
      this.secrets.SUPABASE_SERVICE_ROLE_KEY
    );
    
    try {
      // Créer des données de test
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .insert({
          couple_names: 'Marie & Thomas Staging',
          wedding_date: '2024-08-15',
          venue: 'Château de Staging',
          budget: 30000,
          guest_count: 120
        })
        .select()
        .single();
      
      if (weddingError) throw weddingError;
      
      // Créer des utilisateurs de test
      const testUsers = [
        { email: 'couple@staging.attitudes.vip', role: 'couple', name: 'Marie Staging' },
        { email: 'dj@staging.attitudes.vip', role: 'dj', name: 'DJ Staging' },
        { email: 'photo@staging.attitudes.vip', role: 'photographer', name: 'Photo Staging' }
      ];
      
      for (const user of testUsers) {
        const { error: userError } = await supabase
          .from('users')
          .insert({ ...user, wedding_id: wedding.id });
        
        if (userError) console.warn(`Avertissement: ${userError.message}`);
      }
      
      console.log('✓ Données de test créées');
    } catch (error) {
      console.warn('⚠️  Seed partiel:', error.message);
    }
  }

  async configureAuth() {
    console.log('\n🔐 Configuration de l\'authentification...\n');
    
    // Configuration via l'API Supabase
    const authConfig = {
      site_url: this.config.customDomain 
        ? `https://${this.config.customDomain}` 
        : `https://${this.config.projectRef}.vercel.app`,
      redirect_urls: [
        'https://staging.attitudes.vip/auth/callback',
        'http://localhost:3000/auth/callback'
      ],
      jwt_expiry: 3600,
      disable_signup: false,
      email_auth_enabled: true,
      providers: {
        google: {
          enabled: false // À configurer manuellement
        }
      }
    };
    
    console.log('✓ Configuration auth préparée');
    console.log('  Note: Finaliser dans le dashboard Supabase');
  }

  async setupEdgeFunctions() {
    console.log('\n⚡ Configuration des Edge Functions...\n');
    
    const functionsPath = path.join(__dirname, '..', 'supabase', 'functions');
    if (!fs.existsSync(functionsPath)) {
      fs.mkdirSync(functionsPath, { recursive: true });
    }
    
    // Créer une fonction de test
    const healthCheckFunction = `
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      environment: 'staging',
      timestamp: new Date().toISOString()
    }),
    { headers: { "Content-Type": "application/json" } }
  )
})
`;
    
    const healthPath = path.join(functionsPath, 'health');
    if (!fs.existsSync(healthPath)) {
      fs.mkdirSync(healthPath, { recursive: true });
      fs.writeFileSync(
        path.join(healthPath, 'index.ts'), 
        healthCheckFunction
      );
    }
    
    console.log('✓ Edge Functions configurées');
  }

  async generateEnvFiles() {
    console.log('\n📄 Génération des fichiers .env...\n');
    
    // .env.staging
    const envStaging = `# Environnement Staging - AttitudesFramework
# Généré le ${new Date().toISOString()}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${this.secrets.SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${this.secrets.SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${this.secrets.SUPABASE_SERVICE_ROLE_KEY}

# Application
NODE_ENV=staging
NEXT_PUBLIC_APP_URL=${this.config.customDomain ? `https://${this.config.customDomain}` : `https://${this.config.projectRef}.vercel.app`}
NEXT_PUBLIC_API_URL=${this.config.customDomain ? `https://api-${this.config.customDomain}` : `${this.secrets.SUPABASE_URL}/rest/v1`}

# WebSocket
NEXT_PUBLIC_WS_URL=${this.config.customDomain ? `wss://ws-${this.config.customDomain}` : `wss://${this.config.projectRef}.supabase.co`}

# Features
NEXT_PUBLIC_ENABLE_AI=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_PWA=true

# Monitoring (à configurer)
# SENTRY_DSN=
# LOGROCKET_ID=

# Secrets (ne pas commiter)
JWT_SECRET=${this.generatePassword(32)}
ENCRYPTION_KEY=${this.generatePassword(32)}
`;
    
    fs.writeFileSync('.env.staging', envStaging);
    console.log('✓ .env.staging créé');
    
    // .env.staging.local (template)
    const envStagingLocal = `# Fichier local pour secrets supplémentaires
# Copier ce fichier en .env.staging.local et ajouter vos secrets

# Clés API tierces
# OPENAI_API_KEY=
# STRIPE_SECRET_KEY=
# SENDGRID_API_KEY=

# Monitoring
# SENTRY_AUTH_TOKEN=
`;
    
    fs.writeFileSync('.env.staging.local.example', envStagingLocal);
    console.log('✓ .env.staging.local.example créé');
    
    // Ajouter au .gitignore
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (!gitignore.includes('.env.staging.local')) {
      fs.appendFileSync('.gitignore', '\n# Staging secrets\n.env.staging.local\n');
      console.log('✓ .gitignore mis à jour');
    }
  }

  async setupGitHubSecrets() {
    console.log('\n🔒 Configuration des secrets GitHub...\n');
    
    const secrets = {
      STAGING_SUPABASE_URL: this.secrets.SUPABASE_URL,
      STAGING_SUPABASE_ANON_KEY: this.secrets.SUPABASE_ANON_KEY,
      STAGING_SUPABASE_SERVICE_KEY: this.secrets.SUPABASE_SERVICE_ROLE_KEY,
      STAGING_PROJECT_REF: this.config.projectRef,
      STAGING_DATABASE_URL: `postgresql://postgres:${this.secrets.DB_PASSWORD || 'postgres'}@db.${this.config.projectRef}.supabase.co:5432/postgres`
    };
    
    console.log('Ajout des secrets GitHub Actions...');
    
    for (const [name, value] of Object.entries(secrets)) {
      try {
        execSync(
          `gh secret set ${name} --repo ${this.config.githubRepo} --body "${value}"`,
          { stdio: 'pipe' }
        );
        console.log(`✓ ${name}`);
      } catch (error) {
        console.warn(`⚠️  ${name}: ${error.message}`);
      }
    }
  }

  async runInitialTests() {
    console.log('\n🧪 Tests initiaux...\n');
    
    // Test de connexion Supabase
    try {
      const supabase = createClient(
        this.secrets.SUPABASE_URL,
        this.secrets.SUPABASE_ANON_KEY
      );
      
      const { data, error } = await supabase
        .from('weddings')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      console.log('✓ Connexion Supabase OK');
    } catch (error) {
      console.warn('⚠️  Test Supabase:', error.message);
    }
    
    // Build de test
    console.log('\nBuild de test...');
    try {
      execSync('npm run build:staging', { stdio: 'inherit' });
      console.log('✓ Build réussi');
    } catch (error) {
      console.warn('⚠️  Build échoué, vérifier la configuration');
    }
  }

  generatePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  printNextSteps() {
    console.log('\n📋 Prochaines étapes:\n');
    console.log('1. Configurer les domaines personnalisés dans Vercel');
    console.log('2. Activer Google OAuth dans Supabase Dashboard');
    console.log('3. Configurer Sentry pour le monitoring');
    console.log('4. Ajouter les secrets manquants dans GitHub');
    console.log('5. Lancer le déploiement: git push origin develop');
    console.log('\n🔗 URLs importantes:');
    console.log(`   Supabase: https://app.supabase.com/project/${this.config.projectRef}`);
    console.log(`   GitHub Actions: https://github.com/${this.config.githubRepo}/actions`);
    if (this.config.customDomain) {
      console.log(`   Staging: https://${this.config.customDomain}`);
    }
  }

  async getExistingProjectInfo() {
    const projectsList = execSync('supabase projects list', { encoding: 'utf8' });
    const match = projectsList.match(new RegExp(`${this.config.projectName}\\s+\\|\\s+([\\w-]+)`, 'i'));
    
    if (match) {
      this.config.projectRef = match[1];
      await this.getProjectKeys();
    } else {
      throw new Error('Projet non trouvé');
    }
  }
}

// Exécution
if (require.main === module) {
  const setup = new StagingEnvironmentSetup();
  setup.run().catch(console.error);
}

module.exports = StagingEnvironmentSetup;