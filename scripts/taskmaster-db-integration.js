#!/usr/bin/env node

/**
 * Script d'intégration complète Taskmaster avec base de données
 * Inclut la création des tables, migrations et configuration Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
const colors = require('colors');

// Configuration
const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'demo-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'demo-service-key'
  },
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'attitudes_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  }
};

class TaskmasterDBIntegration {
  constructor() {
    this.supabase = null;
    this.steps = [];
    this.errors = [];
  }

  async initialize() {
    console.log('\n🚀 Taskmaster Database Integration'.cyan.bold);
    console.log('==================================\n'.cyan);

    // Vérifier configuration
    if (!this.validateConfig()) {
      console.error('❌ Configuration invalide. Vérifiez vos variables d\'environnement.'.red);
      process.exit(1);
    }

    // Initialiser Supabase
    this.supabase = createClient(
      config.supabase.url, 
      config.supabase.serviceKey
    );
  }

  validateConfig() {
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`Variables manquantes: ${missing.join(', ')}`.red);
      return false;
    }
    
    return true;
  }

  async executeMigration() {
    const steps = [
      { name: 'Vérifier extensions PostgreSQL', fn: this.checkExtensions.bind(this) },
      { name: 'Créer tables Taskmaster', fn: this.createTables.bind(this) },
      { name: 'Configurer Row Level Security', fn: this.setupRLS.bind(this) },
      { name: 'Créer fonctions et triggers', fn: this.createFunctions.bind(this) },
      { name: 'Insérer données initiales', fn: this.seedData.bind(this) },
      { name: 'Configurer webhooks temps réel', fn: this.setupRealtime.bind(this) },
      { name: 'Créer vues et indexes', fn: this.createViewsIndexes.bind(this) },
      { name: 'Valider l\'installation', fn: this.validateInstallation.bind(this) }
    ];

    for (const step of steps) {
      try {
        console.log(`\n📋 ${step.name}...`.yellow);
        await step.fn();
        console.log(`✅ ${step.name} - Complété`.green);
        this.steps.push({ name: step.name, status: 'success' });
      } catch (error) {
        console.error(`❌ ${step.name} - Échec: ${error.message}`.red);
        this.errors.push({ step: step.name, error: error.message });
        
        // Continuer malgré les erreurs non critiques
        if (!this.isCriticalError(step.name)) {
          continue;
        }
        break;
      }
    }

    this.displaySummary();
  }

  async checkExtensions() {
    const { data, error } = await this.supabase.rpc('check_extensions', {
      extensions: ['uuid-ossp', 'pg_notify', 'pg_cron']
    });

    if (error) {
      // Créer les extensions si nécessaire
      const extensions = ['uuid-ossp'];
      for (const ext of extensions) {
        await this.supabase.rpc('create_extension', { name: ext });
      }
    }
  }

  async createTables() {
    const schema = await fs.readFile(
      path.join(__dirname, 'taskmaster-schema.sql'), 
      'utf8'
    );

    // Exécuter le schéma SQL
    const { error } = await this.supabase.rpc('execute_sql', { 
      sql: schema 
    });

    if (error && !error.message.includes('already exists')) {
      throw error;
    }

    // Tables additionnelles pour l'intégration
    const additionalTables = `
      -- Table de configuration Taskmaster par tenant
      CREATE TABLE IF NOT EXISTS taskmaster_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        config JSONB NOT NULL DEFAULT '{
          "enabled": true,
          "ai_enabled": true,
          "max_concurrent_tasks": 10,
          "retry_attempts": 3,
          "features": {
            "auto_scheduling": true,
            "smart_notifications": true,
            "workflow_templates": true,
            "predictive_analytics": true
          }
        }',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table d'audit Taskmaster
      CREATE TABLE IF NOT EXISTS taskmaster_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        user_id UUID,
        changes JSONB,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Table des executors personnalisés
      CREATE TABLE IF NOT EXISTS taskmaster_executors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        type VARCHAR(50) NOT NULL,
        config JSONB NOT NULL,
        code TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await this.supabase.rpc('execute_sql', { sql: additionalTables });
  }

  async setupRLS() {
    const rlsPolicies = `
      -- RLS pour taskmaster_workflows
      ALTER TABLE taskmaster_workflows ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Workflows visibles par tenant" ON taskmaster_workflows
        FOR SELECT USING (
          auth.uid() IN (
            SELECT user_id FROM user_tenants 
            WHERE tenant_id = (
              SELECT tenant_id FROM weddings WHERE id = wedding_id
            )
          )
        );

      -- RLS pour taskmaster_executions  
      ALTER TABLE taskmaster_executions ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Executions visibles par tenant" ON taskmaster_executions
        FOR SELECT USING (
          auth.uid() IN (
            SELECT user_id FROM user_tenants 
            WHERE tenant_id = (
              SELECT tenant_id FROM weddings WHERE id = wedding_id
            )
          )
        );

      -- RLS pour taskmaster_config
      ALTER TABLE taskmaster_config ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Config par tenant" ON taskmaster_config
        FOR ALL USING (
          auth.uid() IN (
            SELECT user_id FROM user_tenants 
            WHERE tenant_id = taskmaster_config.tenant_id
              AND role IN ('admin', 'owner')
          )
        );
    `;

    await this.supabase.rpc('execute_sql', { sql: rlsPolicies });
  }

  async createFunctions() {
    const functions = `
      -- Fonction pour exécuter une tâche automatique
      CREATE OR REPLACE FUNCTION execute_automated_task(
        p_task_id UUID,
        p_executor VARCHAR(100),
        p_params JSONB DEFAULT '{}'
      ) RETURNS JSONB AS $$
      DECLARE
        v_result JSONB;
        v_task RECORD;
      BEGIN
        -- Récupérer la tâche
        SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
        
        IF NOT FOUND THEN
          RETURN jsonb_build_object('error', 'Task not found');
        END IF;
        
        -- Mettre à jour le statut
        UPDATE tasks 
        SET 
          status = 'in_progress',
          updated_at = NOW()
        WHERE id = p_task_id;
        
        -- Logger l'exécution
        INSERT INTO taskmaster_audit (
          tenant_id, event_type, entity_type, entity_id, metadata
        ) VALUES (
          v_task.tenant_id, 'task_execution_started', 'task', p_task_id,
          jsonb_build_object('executor', p_executor, 'params', p_params)
        );
        
        -- Retourner le résultat
        RETURN jsonb_build_object(
          'status', 'started',
          'task_id', p_task_id,
          'executor', p_executor
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Fonction pour analyser les tâches avec IA
      CREATE OR REPLACE FUNCTION analyze_task_priority(p_wedding_id UUID)
      RETURNS TABLE (
        task_id UUID,
        ai_priority_score NUMERIC,
        recommendations JSONB
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          t.id,
          -- Score basé sur plusieurs facteurs
          CASE 
            WHEN t.due_date < CURRENT_DATE THEN 100
            WHEN t.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 90
            WHEN t.priority = 'urgent' THEN 85
            WHEN t.priority = 'high' THEN 70
            WHEN t.category IN ('ceremony', 'venue') THEN 
              60 + (30 * (1 - EXTRACT(EPOCH FROM (t.due_date - CURRENT_DATE)) / 2592000))
            ELSE 50
          END as ai_priority_score,
          
          -- Recommandations
          jsonb_build_object(
            'urgent', t.due_date < CURRENT_DATE + INTERVAL '3 days',
            'delegate_suggested', t.category IN ('catering', 'flowers', 'decoration'),
            'automation_possible', t.type IN ('notification', 'reminder', 'confirmation')
          ) as recommendations
          
        FROM tasks t
        WHERE t.wedding_id = p_wedding_id
          AND t.status IN ('pending', 'in_progress');
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger pour mise à jour automatique
      CREATE OR REPLACE FUNCTION update_task_ai_metadata()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Calculer le score IA
        NEW.ai_metadata = jsonb_build_object(
          'priority_score', 
          CASE 
            WHEN NEW.due_date < CURRENT_DATE THEN 100
            WHEN NEW.priority = 'urgent' THEN 90
            WHEN NEW.priority = 'high' THEN 75
            ELSE 50
          END,
          'last_analyzed', NOW()
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER task_ai_metadata_trigger
      BEFORE INSERT OR UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_task_ai_metadata();
    `;

    await this.supabase.rpc('execute_sql', { sql: functions });
  }

  async seedData() {
    // Insérer les templates de base
    const templates = [
      {
        name: 'vendor_reminder',
        title: 'Rappel Fournisseur',
        type: 'notification',
        category: 'vendor',
        priority: 'high',
        automation: {
          enabled: true,
          executor: 'notification',
          schedule: '30 days before event'
        }
      },
      {
        name: 'rsvp_reminder',
        title: 'Relance RSVP',
        type: 'email',
        category: 'guest',
        priority: 'medium',
        automation: {
          enabled: true,
          executor: 'email',
          conditions: ['rsvp_rate < 70%', 'days_until_deadline <= 14']
        }
      },
      {
        name: 'payment_reminder',
        title: 'Rappel Paiement',
        type: 'notification',
        category: 'finance',
        priority: 'urgent',
        automation: {
          enabled: true,
          executor: 'payment',
          schedule: '7 days after due'
        }
      }
    ];

    for (const template of templates) {
      await this.supabase
        .from('taskmaster_templates')
        .upsert(template, { onConflict: 'name' });
    }

    // Insérer les workflows par défaut
    const workflows = [
      {
        name: 'Coordination Fournisseurs Complète',
        description: 'Workflow automatique pour la coordination des fournisseurs',
        steps: [
          {
            name: 'Confirmation initiale',
            template: 'vendor_reminder',
            conditions: ['days_until_event <= 30']
          },
          {
            name: 'Brief détaillé',
            template: 'vendor_brief',
            conditions: ['days_until_event <= 7']
          }
        ],
        config: {
          auto_start: true,
          notify_on_complete: true
        }
      }
    ];

    for (const workflow of workflows) {
      await this.supabase
        .from('taskmaster_workflows')
        .insert(workflow);
    }
  }

  async setupRealtime() {
    // Configurer les canaux temps réel pour Taskmaster
    const realtimeConfig = `
      -- Canal pour les notifications de tâches
      CREATE OR REPLACE FUNCTION notify_task_update()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify(
          'taskmaster_updates',
          json_build_object(
            'operation', TG_OP,
            'task_id', NEW.id,
            'wedding_id', NEW.wedding_id,
            'status', NEW.status,
            'automation_config', NEW.automation_config
          )::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER task_update_notification
      AFTER INSERT OR UPDATE ON tasks
      FOR EACH ROW
      EXECUTE FUNCTION notify_task_update();

      -- Canal pour les métriques temps réel
      CREATE OR REPLACE FUNCTION notify_metrics_update()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify(
          'taskmaster_metrics',
          json_build_object(
            'metric_type', NEW.metric_type,
            'value', NEW.metric_value,
            'wedding_id', NEW.wedding_id
          )::text
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER metrics_notification
      AFTER INSERT ON taskmaster_metrics
      FOR EACH ROW
      EXECUTE FUNCTION notify_metrics_update();
    `;

    await this.supabase.rpc('execute_sql', { sql: realtimeConfig });
  }

  async createViewsIndexes() {
    const viewsAndIndexes = `
      -- Vue pour le tableau de bord Taskmaster
      CREATE OR REPLACE VIEW taskmaster_dashboard_extended AS
      SELECT 
        w.id as wedding_id,
        w.couple_names,
        w.event_date,
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
        COUNT(DISTINCT t.id) FILTER (WHERE t.automation_config != '{}') as automated_tasks,
        COUNT(DISTINCT tw.id) as active_workflows,
        AVG((t.ai_metadata->>'priority_score')::NUMERIC) as avg_ai_priority,
        jsonb_agg(DISTINCT t.category) as task_categories
      FROM weddings w
      LEFT JOIN tasks t ON t.wedding_id = w.id
      LEFT JOIN taskmaster_workflows tw ON tw.is_active = true
      GROUP BY w.id, w.couple_names, w.event_date;

      -- Index composites pour performance
      CREATE INDEX IF NOT EXISTS idx_tasks_wedding_status_priority 
        ON tasks(wedding_id, status, priority);
      
      CREATE INDEX IF NOT EXISTS idx_tasks_automation_due_date 
        ON tasks(due_date) 
        WHERE automation_config != '{}';
      
      CREATE INDEX IF NOT EXISTS idx_executions_wedding_workflow 
        ON taskmaster_executions(wedding_id, workflow_id);
      
      -- Index pour recherche Full Text
      CREATE INDEX IF NOT EXISTS idx_tasks_search 
        ON tasks USING gin(to_tsvector('french', title || ' ' || description));
    `;

    await this.supabase.rpc('execute_sql', { sql: viewsAndIndexes });
  }

  async validateInstallation() {
    console.log('\n🔍 Validation de l\'installation...'.cyan);
    
    // Vérifier les tables
    const tables = [
      'taskmaster_workflows',
      'taskmaster_executions',
      'taskmaster_templates',
      'taskmaster_metrics',
      'taskmaster_config',
      'taskmaster_audit'
    ];

    const validation = {
      tables: [],
      functions: [],
      triggers: [],
      policies: []
    };

    for (const table of tables) {
      const { count } = await this.supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      validation.tables.push({
        name: table,
        exists: count !== null,
        rowCount: count || 0
      });
    }

    // Vérifier les fonctions
    const { data: functions } = await this.supabase.rpc('list_functions');
    validation.functions = functions?.filter(f => 
      f.name.includes('taskmaster') || f.name.includes('task')
    ) || [];

    console.log('\n📊 Résultats de validation:'.green);
    console.log(`Tables créées: ${validation.tables.filter(t => t.exists).length}/${tables.length}`);
    console.log(`Fonctions: ${validation.functions.length}`);
    
    return validation;
  }

  isCriticalError(stepName) {
    const criticalSteps = ['Créer tables Taskmaster', 'Configurer Row Level Security'];
    return criticalSteps.includes(stepName);
  }

  displaySummary() {
    console.log('\n' + '='.repeat(50).cyan);
    console.log('📊 RÉSUMÉ DE L\'INTÉGRATION'.cyan.bold);
    console.log('='.repeat(50).cyan);
    
    console.log(`\n✅ Étapes réussies: ${this.steps.filter(s => s.status === 'success').length}`);
    console.log(`❌ Erreurs: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n⚠️  Erreurs rencontrées:'.yellow);
      this.errors.forEach(err => {
        console.log(`  - ${err.step}: ${err.error}`.red);
      });
    }

    console.log('\n📝 Prochaines étapes:'.cyan);
    console.log('1. Configurer les variables d\'environnement dans .env');
    console.log('2. Redémarrer le service Taskmaster');
    console.log('3. Tester avec: npm run test:taskmaster');
    console.log('4. Accéder au dashboard: /dashboard/taskmaster');
    
    console.log('\n🎉 Intégration Taskmaster terminée!'.green.bold);
  }

  async cleanup() {
    // Nettoyer les ressources si nécessaire
  }
}

// Exécution
async function main() {
  const integration = new TaskmasterDBIntegration();
  
  try {
    await integration.initialize();
    await integration.executeMigration();
  } catch (error) {
    console.error('\n💥 Erreur fatale:'.red.bold, error.message);
    process.exit(1);
  } finally {
    await integration.cleanup();
  }
}

// Gérer l'interruption
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Intégration interrompue'.yellow);
  process.exit(0);
});

main();