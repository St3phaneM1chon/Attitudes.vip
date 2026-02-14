const express = require('express');
const path = require('path');
const cors = require('cors');
const { readEnvFile, saveKeys, getServicesStatus, testService } = require('../scripts/api-keys-manager');

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Route pour servir le formulaire
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'configure-api-keys.html'));
});

// API pour obtenir les clés existantes (masquées)
app.get('/api/config/keys', (req, res) => {
    const env = readEnvFile();
    const maskedEnv = {};
    
    // Masquer les valeurs sensibles
    Object.entries(env).forEach(([key, value]) => {
        if (value && !value.includes('your_')) {
            // Garder les 4 premiers et 4 derniers caractères
            if (value.length > 10) {
                maskedEnv[key] = value.substring(0, 4) + '...' + value.substring(value.length - 4);
            } else {
                maskedEnv[key] = '****';
            }
        }
    });
    
    res.json(maskedEnv);
});

// API pour sauvegarder les clés
app.post('/api/config/save-keys', async (req, res) => {
    try {
        const result = saveKeys(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la sauvegarde: ' + error.message
        });
    }
});

// API pour obtenir le statut des services
app.get('/api/config/status', (req, res) => {
    const status = getServicesStatus();
    res.json(status);
});

// API pour tester un service
app.post('/api/test-service/:service', async (req, res) => {
    const { service } = req.params;
    
    try {
        const result = await testService(service);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test: ' + error.message
        });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🔑 Serveur de configuration des clés API démarré sur http://localhost:${PORT}`);
    console.log('\n📋 Endpoints disponibles:');
    console.log(`   GET  /                        - Formulaire de configuration`);
    console.log(`   GET  /api/config/keys         - Obtenir les clés (masquées)`);
    console.log(`   POST /api/config/save-keys    - Sauvegarder les clés`);
    console.log(`   GET  /api/config/status       - Statut des services`);
    console.log(`   POST /api/test-service/:name  - Tester un service`);
});