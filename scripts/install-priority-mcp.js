#!/usr/bin/env node

/**
 * Installation prioritaire de MCP spécifiques
 * Pour les besoins immédiats: Perplexity, Figma, O3, CodeRabbit, Paiements
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class PriorityMCPInstaller {
  constructor() {
    this.priorityMCPs = {
      'perplexity': {
        name: 'mcp-server-perplexity',
        description: 'Accès à Perplexity AI pour recherches avancées',
        capabilities: ['search', 'research', 'question_answering'],
        installCommand: 'npm install -g mcp-server-perplexity',
        triggers: ['perplexity', 'search', 'research', 'question'],
        config: {
          command: 'mcp-server-perplexity',
          args: []
        },
        score: 0.95,
        status: 'available'
      },
      
      'figma': {
        name: 'mcp-server-figma',
        description: 'Intégration Figma pour design et prototypage',
        capabilities: ['design', 'prototype', 'collaboration', 'export'],
        installCommand: 'npm install -g @figma/mcp-server',
        triggers: ['figma', 'design', 'prototype', 'ui', 'ux'],
        config: {
          command: 'figma-mcp-server',
          args: ['--token', '${FIGMA_TOKEN}']
        },
        score: 0.88,
        status: 'needs_token'
      },
      
      'o3': {
        name: 'mcp-server-openai-o3',
        description: 'Accès OpenAI O3 pour raisonnement avancé',
        capabilities: ['reasoning', 'complex_analysis', 'code_review'],
        installCommand: 'npm install -g mcp-server-openai-o3',
        triggers: ['o3', 'reasoning', 'analysis', 'complex'],
        config: {
          command: 'openai-o3-mcp',
          args: ['--api-key', '${OPENAI_API_KEY}']
        },
        score: 0.92,
        status: 'needs_api_key'
      },
      
      'coderabbit': {
        name: 'mcp-server-coderabbit',
        description: 'CodeRabbit pour révision de code automatisée',
        capabilities: ['code_review', 'static_analysis', 'security_scan'],
        installCommand: 'npm install -g mcp-server-coderabbit',
        triggers: ['coderabbit', 'code review', 'analysis', 'security', 'rabbit', 'Rabbit', 'RABBIT'],
        config: {
          command: 'coderabbit-mcp',
          args: ['--token', '${CODERABBIT_TOKEN}']
        },
        score: 0.85,
        status: 'needs_token'
      },
      
      'stripe': {
        name: 'mcp-server-stripe',
        description: 'Stripe pour paiements en ligne',
        capabilities: ['payment_processing', 'subscription', 'invoicing'],
        installCommand: 'npm install -g mcp-server-stripe',
        triggers: ['stripe', 'payment', 'paiement', 'checkout', 'subscription'],
        config: {
          command: 'stripe-mcp-server',
          args: ['--secret-key', '${STRIPE_SECRET_KEY}']
        },
        score: 0.90,
        status: 'needs_api_key'
      },
      
      'paypal': {
        name: 'mcp-server-paypal',
        description: 'PayPal pour paiements alternatifs',
        capabilities: ['payment_processing', 'express_checkout'],
        installCommand: 'npm install -g mcp-server-paypal',
        triggers: ['paypal', 'payment', 'paiement'],
        config: {
          command: 'paypal-mcp-server',
          args: ['--client-id', '${PAYPAL_CLIENT_ID}', '--client-secret', '${PAYPAL_CLIENT_SECRET}']
        },
        score: 0.82,
        status: 'needs_credentials'
      }
    };
    
    this.dataDir = path.join(__dirname, '../data');
    this.configPath = path.join(this.dataDir, 'mcp-selfcheck-config.json');
    this.claudeConfigPath = path.join(__dirname, '../config/mcp/claude_desktop_config.json');
  }

  async install() {
    console.log('🚀 Installation prioritaire des MCP...\n');
    
    const results = {
      installed: [],
      configured: [],
      needsCredentials: [],
      failed: []
    };

    for (const [key, mcp] of Object.entries(this.priorityMCPs)) {
      console.log(`📦 Traitement de ${mcp.name}...`);
      
      try {
        // 1. Essayer l'installation
        const installResult = await this.installMCP(mcp);
        
        if (installResult.success) {
          results.installed.push(key);
          console.log(`  ✅ Installé: ${mcp.name}`);
          
          // 2. Configurer pour Claude Desktop
          await this.configureForClaude(key, mcp);
          results.configured.push(key);
          console.log(`  ✅ Configuré pour Claude`);
          
          // 3. Ajouter au Self-Check
          await this.addToSelfCheck(key, mcp);
          console.log(`  ✅ Ajouté au Self-Check`);
          
        } else if (installResult.needsCredentials) {
          results.needsCredentials.push({
            name: key,
            credentials: installResult.credentials,
            mcp: mcp
          });
          console.log(`  ⚠️  Credentials requis: ${installResult.credentials.join(', ')}`);
          
        } else {
          results.failed.push({ name: key, error: installResult.error });
          console.log(`  ❌ Échec: ${installResult.error}`);
        }
        
      } catch (error) {
        results.failed.push({ name: key, error: error.message });
        console.log(`  ❌ Erreur: ${error.message}`);
      }
      
      console.log('');
    }
    
    // Générer le rapport
    await this.generateReport(results);
    
    // Redémarrer les services si nécessaire
    if (results.configured.length > 0) {
      console.log('🔄 Redémarrage recommandé de Claude Desktop pour activer les nouveaux MCP');
    }
    
    return results;
  }

  async installMCP(mcp) {
    try {
      // Vérifier si déjà installé
      const checkResult = await this.checkIfInstalled(mcp);
      if (checkResult.installed) {
        return { success: true, alreadyInstalled: true };
      }
      
      // Essayer l'installation sans credentials d'abord
      if (mcp.status === 'available') {
        await execAsync(mcp.installCommand);
        return { success: true };
      }
      
      // Si nécessite des credentials, simuler l'installation
      if (mcp.status.includes('needs_')) {
        const credentialType = mcp.status.replace('needs_', '');
        return {
          success: false,
          needsCredentials: true,
          credentials: this.getRequiredCredentials(credentialType)
        };
      }
      
      // Installation standard
      await execAsync(mcp.installCommand);
      return { success: true };
      
    } catch (error) {
      // Si l'installation échoue, c'est probablement que le paquet n'existe pas encore
      // On va le simuler pour la configuration
      if (error.message.includes('404') || error.message.includes('not found')) {
        return {
          success: false,
          needsCredentials: mcp.status !== 'available',
          credentials: mcp.status !== 'available' ? this.getRequiredCredentials(mcp.status.replace('needs_', '')) : [],
          simulated: true
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  async checkIfInstalled(mcp) {
    try {
      // Vérifier si le paquet existe globalement
      const { stdout } = await execAsync(`npm list -g ${mcp.name} --depth=0`);
      return { installed: true };
    } catch (error) {
      return { installed: false };
    }
  }

  getRequiredCredentials(type) {
    const credentialMap = {
      'token': ['TOKEN'],
      'api_key': ['API_KEY'],
      'credentials': ['CLIENT_ID', 'CLIENT_SECRET']
    };
    
    return credentialMap[type] || ['API_KEY'];
  }

  async configureForClaude(key, mcp) {
    try {
      // Lire la configuration existante
      let claudeConfig = {};
      try {
        const content = await fs.readFile(this.claudeConfigPath, 'utf8');
        claudeConfig = JSON.parse(content);
      } catch (error) {
        claudeConfig = { mcpServers: {} };
      }
      
      if (!claudeConfig.mcpServers) {
        claudeConfig.mcpServers = {};
      }
      
      // Ajouter la configuration MCP
      claudeConfig.mcpServers[`attitudes-${key}`] = {
        command: mcp.config.command,
        args: mcp.config.args
      };
      
      // Sauvegarder
      await fs.writeFile(this.claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
      
    } catch (error) {
      console.warn(`Attention: Impossible de configurer Claude Desktop: ${error.message}`);
    }
  }

  async addToSelfCheck(key, mcp) {
    try {
      // Créer le répertoire si nécessaire
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Lire la configuration Self-Check existante
      let selfCheckConfig = {};
      try {
        const content = await fs.readFile(this.configPath, 'utf8');
        selfCheckConfig = JSON.parse(content);
      } catch (error) {
        selfCheckConfig = {};
      }
      
      // Ajouter le MCP
      selfCheckConfig[key] = {
        service: key,
        capabilities: mcp.capabilities,
        triggers: mcp.triggers,
        patterns: this.generatePatterns(mcp.triggers),
        semanticConcepts: mcp.capabilities,
        command: mcp.installCommand,
        available: true,
        autoDiscovered: false,
        manuallyAdded: true,
        utilityScore: mcp.score,
        discoveredAt: new Date().toISOString(),
        description: mcp.description
      };
      
      // Sauvegarder
      await fs.writeFile(this.configPath, JSON.stringify(selfCheckConfig, null, 2));
      
    } catch (error) {
      console.warn(`Attention: Impossible de configurer Self-Check: ${error.message}`);
    }
  }

  generatePatterns(triggers) {
    return triggers.map(trigger => ({
      regex: new RegExp(`\\b${trigger}\\b`, 'i').source,
      weight: 0.8
    }));
  }

  async generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: Object.keys(this.priorityMCPs).length,
        installed: results.installed.length,
        configured: results.configured.length,
        needsCredentials: results.needsCredentials.length,
        failed: results.failed.length
      },
      details: results,
      nextSteps: []
    };
    
    // Ajouter les étapes suivantes
    if (results.needsCredentials.length > 0) {
      report.nextSteps.push('Configurer les credentials pour: ' + 
        results.needsCredentials.map(item => item.name).join(', '));
    }
    
    if (results.configured.length > 0) {
      report.nextSteps.push('Redémarrer Claude Desktop');
    }
    
    // Sauvegarder le rapport
    const reportPath = path.join(this.dataDir, 'priority-mcp-install-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Afficher le résumé
    console.log('📊 RÉSUMÉ D\'INSTALLATION');
    console.log('=========================');
    console.log(`✅ Installés: ${results.installed.length}/${report.summary.total}`);
    console.log(`⚙️  Configurés: ${results.configured.length}/${report.summary.total}`);
    console.log(`⚠️  Besoins credentials: ${results.needsCredentials.length}`);
    console.log(`❌ Échecs: ${results.failed.length}`);
    
    if (results.needsCredentials.length > 0) {
      console.log('\n🔑 CREDENTIALS REQUIS:');
      results.needsCredentials.forEach(item => {
        console.log(`• ${item.name}: ${item.credentials.join(', ')}`);
      });
    }
    
    if (results.failed.length > 0) {
      console.log('\n❌ ÉCHECS:');
      results.failed.forEach(item => {
        console.log(`• ${item.name}: ${item.error}`);
      });
    }
    
    console.log(`\n📄 Rapport complet: ${reportPath}`);
  }
}

// Exécution
if (require.main === module) {
  const installer = new PriorityMCPInstaller();
  installer.install()
    .then(results => {
      console.log('\n🎉 Installation prioritaire terminée!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erreur durant l\'installation:', error);
      process.exit(1);
    });
}

module.exports = PriorityMCPInstaller;