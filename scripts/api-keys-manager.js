#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Chemins des fichiers
const ENV_FILE = path.join(__dirname, '..', '.env.mcp-extended');
const TRACKER_FILE = path.join(__dirname, '..', 'mcp-servers', 'mcp-tracker.json');

// Liste des services et leurs clés requises
const SERVICES = {
    stripe: {
        keys: ['STRIPE_API_KEY', 'STRIPE_PUBLIC_KEY', 'STRIPE_WEBHOOK_SECRET'],
        name: 'Stripe',
        port: 3010
    },
    twilio: {
        keys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
        name: 'Twilio',
        port: 3013
    },
    sendgrid: {
        keys: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
        name: 'SendGrid',
        port: 3014
    },
    cloudinary: {
        keys: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
        name: 'Cloudinary',
        port: 3016
    },
    google_calendar: {
        keys: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CALENDAR_REFRESH_TOKEN'],
        name: 'Google Calendar',
        port: 3019
    },
    square: {
        keys: ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID'],
        name: 'Square',
        port: 3011
    },
    paypal: {
        keys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
        name: 'PayPal',
        port: 3012
    },
    slack: {
        keys: ['SLACK_BOT_TOKEN', 'SLACK_APP_TOKEN'],
        name: 'Slack',
        port: 3015
    }
};

// Lire le fichier .env actuel
function readEnvFile() {
    if (!fs.existsSync(ENV_FILE)) {
        return {};
    }
    
    const content = fs.readFileSync(ENV_FILE, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
        if (line && !line.startsWith('#') && line.includes('=')) {
            const [key, ...valueParts] = line.split('=');
            env[key.trim()] = valueParts.join('=').trim();
        }
    });
    
    return env;
}

// Écrire le fichier .env
function writeEnvFile(env) {
    let content = '';
    
    // Grouper par catégorie
    const categories = {
        '# Payment Services': ['STRIPE_', 'SQUARE_', 'PAYPAL_'],
        '# Communication Services': ['TWILIO_', 'SENDGRID_', 'SLACK_'],
        '# Storage Services': ['CLOUDINARY_', 'AWS_', 'S3_', 'GOOGLE_DRIVE'],
        '# Calendar Services': ['GOOGLE_CALENDAR_', 'CALENDLY_', 'TODOIST_'],
        '# Analytics Services': ['MIXPANEL_', 'SALESFORCE_', 'GA_'],
        '# AI Services': ['OPENAI_', 'ANTHROPIC_', 'ZAPIER_'],
        '# Geolocation Services': ['GOOGLE_MAPS_', 'MAPBOX_']
    };
    
    Object.entries(categories).forEach(([category, prefixes]) => {
        content += category + '\n';
        
        Object.entries(env).forEach(([key, value]) => {
            if (prefixes.some(prefix => key.startsWith(prefix))) {
                content += `${key}=${value}\n`;
            }
        });
        
        content += '\n';
    });
    
    fs.writeFileSync(ENV_FILE, content);
}

// Vérifier si un service est configuré
function isServiceConfigured(serviceName, env) {
    const service = SERVICES[serviceName];
    if (!service) return false;
    
    return service.keys.every(key => {
        const value = env[key];
        return value && !value.includes('your_') && value !== '';
    });
}

// Obtenir le statut de tous les services
function getServicesStatus() {
    const env = readEnvFile();
    const status = {};
    
    Object.entries(SERVICES).forEach(([key, service]) => {
        status[key] = {
            name: service.name,
            configured: isServiceConfigured(key, env),
            port: service.port
        };
    });
    
    return status;
}

// Sauvegarder les nouvelles clés
function saveKeys(newKeys) {
    const env = readEnvFile();
    
    // Mettre à jour avec les nouvelles clés
    Object.entries(newKeys).forEach(([key, value]) => {
        if (value && value !== '') {
            env[key] = value;
        }
    });
    
    // Écrire le fichier
    writeEnvFile(env);
    
    // Mettre à jour le tracker
    updateTracker();
    
    return {
        success: true,
        message: 'Clés API sauvegardées avec succès'
    };
}

// Mettre à jour le tracker MCP
function updateTracker() {
    if (!fs.existsSync(TRACKER_FILE)) {
        console.log('Tracker file not found');
        return;
    }
    
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    const env = readEnvFile();
    
    // Mettre à jour les statuts
    Object.entries(tracker.categories).forEach(([category, data]) => {
        if (data.servers) {
            data.servers.forEach(server => {
                const serviceName = server.name.replace('-', '_');
                if (SERVICES[serviceName] && isServiceConfigured(serviceName, env)) {
                    server.status = 'active';
                    server.configured = true;
                }
            });
        }
    });
    
    // Recalculer les statistiques
    let active = 0;
    let pending = 0;
    
    Object.values(tracker.categories).forEach(category => {
        if (category.servers) {
            category.servers.forEach(server => {
                if (server.status === 'active') active++;
                else if (server.status === 'pending') pending++;
            });
        }
    });
    
    tracker.statistics.active = active;
    tracker.statistics.pending = pending;
    tracker.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
}

// Redémarrer les services MCP
function restartServices() {
    console.log('Redémarrage des services MCP...');
    
    try {
        // Arrêter les services
        execSync('docker-compose -f docker-compose.mcp-local.yml down', { stdio: 'inherit' });
        
        // Redémarrer avec les nouvelles variables
        execSync('docker-compose -f docker-compose.mcp-local.yml up -d', { stdio: 'inherit' });
        
        return { success: true, message: 'Services redémarrés' };
    } catch (error) {
        return { success: false, message: 'Erreur lors du redémarrage: ' + error.message };
    }
}

// Tester un service
async function testService(serviceName) {
    const service = SERVICES[serviceName];
    if (!service) {
        return { success: false, message: 'Service inconnu' };
    }
    
    const http = require('http');
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: service.port,
            path: '/health',
            method: 'GET',
            timeout: 5000
        };
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve({
                        success: true,
                        message: `Service ${service.name} opérationnel`,
                        data: result
                    });
                } catch (e) {
                    resolve({
                        success: false,
                        message: `Erreur de parsing: ${e.message}`
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                message: `Service ${service.name} non accessible: ${error.message}`
            });
        });
        
        req.on('timeout', () => {
            req.destroy();
            resolve({
                success: false,
                message: `Timeout lors du test de ${service.name}`
            });
        });
        
        req.end();
    });
}

// Export pour utilisation dans un serveur Express
module.exports = {
    readEnvFile,
    saveKeys,
    getServicesStatus,
    testService,
    restartServices
};

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'status':
            console.log('📊 Statut des services MCP:');
            const status = getServicesStatus();
            Object.entries(status).forEach(([key, service]) => {
                const icon = service.configured ? '✅' : '❌';
                console.log(`${icon} ${service.name}: ${service.configured ? 'Configuré' : 'Non configuré'}`);
            });
            break;
            
        case 'update':
            updateTracker();
            console.log('✅ Tracker mis à jour');
            break;
            
        case 'test':
            const serviceName = args[1];
            if (!serviceName) {
                console.log('Usage: node api-keys-manager.js test <service>');
                break;
            }
            testService(serviceName).then(result => {
                console.log(result.success ? '✅' : '❌', result.message);
            });
            break;
            
        default:
            console.log('Usage:');
            console.log('  node api-keys-manager.js status    - Afficher le statut');
            console.log('  node api-keys-manager.js update    - Mettre à jour le tracker');
            console.log('  node api-keys-manager.js test <service> - Tester un service');
    }
}