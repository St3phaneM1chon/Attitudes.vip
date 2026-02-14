#!/usr/bin/env node

const http = require('http');

// Configuration Cloudinary depuis les clés sauvegardées
const CLOUDINARY_CONFIG = {
    cloud_name: 'dmpsvmi1n',
    api_key: '937822623228143',
    api_secret: 'GXxYvAKD-P3b5V4qn6fJiCGJ4_g'
};

// URL du service MCP Cloudinary
const MCP_CLOUDINARY_URL = 'http://localhost:3016/mcp';

// Fonction pour envoyer une requête MCP
function sendMCPRequest(method, params = {}) {
    const data = JSON.stringify({
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now()
    });

    const options = {
        hostname: 'localhost',
        port: 3016,
        path: '/mcp',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

// Tests Cloudinary pour Attitudes.vip
async function testCloudinaryIntegration() {
    console.log('🖼️  Test d\'intégration Cloudinary pour Attitudes.vip\n');
    console.log('Configuration:');
    console.log(`  Cloud Name: ${CLOUDINARY_CONFIG.cloud_name}`);
    console.log(`  API Key: ${CLOUDINARY_CONFIG.api_key}`);
    console.log('');

    try {
        // 1. Test de configuration
        console.log('1️⃣ Vérification de la configuration...');
        const configInfo = await sendMCPRequest('config.info');
        console.log('✅ Service configuré:', configInfo.result);
        console.log('');

        // 2. Upload d'une image de test (exemple de chaussures)
        console.log('2️⃣ Upload d\'une image de test...');
        const uploadResult = await sendMCPRequest('upload.image', {
            publicId: 'attitudes_wedding_shoes',
            folder: 'weddings/demo',
            tags: ['demo', 'wedding', 'shoes'],
            format: 'jpg',
            width: 1920,
            height: 1080
        });
        console.log('✅ Image uploadée:');
        console.log(`   Public ID: ${uploadResult.result.publicId}`);
        console.log(`   URL: ${uploadResult.result.url}`);
        console.log('');

        // 3. Transformation d'image - Optimisation
        console.log('3️⃣ Création de transformations optimisées...');
        const transformResult = await sendMCPRequest('transform.image', {
            publicId: 'attitudes_wedding_shoes',
            transformation: 'w_800,h_600,c_fill,q_auto'
        });
        console.log('✅ Transformations disponibles:');
        console.log(`   Thumbnail: ${transformResult.result.presets.thumbnail}`);
        console.log(`   Galerie: ${transformResult.result.presets.gallery}`);
        console.log(`   Hero: ${transformResult.result.presets.hero}`);
        console.log('');

        // 4. Création d'une galerie de mariage
        console.log('4️⃣ Création d\'une galerie de mariage test...');
        const galleryResult = await sendMCPRequest('gallery.create', {
            name: 'Mariage Jean & Marie - Demo',
            description: 'Galerie de démonstration pour le mariage',
            images: ['attitudes_wedding_shoes', 'wedding_test_attitudes'],
            coverImage: 'attitudes_wedding_shoes',
            privacy: 'private',
            password: 'demo2025'
        });
        console.log('✅ Galerie créée:');
        console.log(`   ID: ${galleryResult.result.id}`);
        console.log(`   URL de partage: ${galleryResult.result.shareUrl}`);
        console.log(`   Mot de passe: demo2025`);
        console.log('');

        // 5. Analyse d'image (IA)
        console.log('5️⃣ Analyse d\'image avec IA...');
        const analyzeResult = await sendMCPRequest('analyze.image', {
            publicId: 'attitudes_wedding_shoes'
        });
        console.log('✅ Analyse IA:');
        console.log(`   Visages détectés: ${analyzeResult.result.faces}`);
        console.log(`   Couleurs dominantes: ${analyzeResult.result.predominantColors.join(', ')}`);
        console.log(`   Tags: ${analyzeResult.result.tags.join(', ')}`);
        console.log(`   Score esthétique: ${analyzeResult.result.aestheticScore}/1.0`);
        console.log('');

        // 6. Exemple de montage vidéo
        console.log('6️⃣ Création d\'un montage vidéo de mariage...');
        const montageResult = await sendMCPRequest('video.createMontage', {
            name: 'Montage Mariage Jean & Marie',
            clips: [
                { publicId: 'ceremony_clip1', duration: 10 },
                { publicId: 'ceremony_clip2', duration: 8 },
                { publicId: 'ceremony_clip3', duration: 12 }
            ],
            music: 'wedding_music_romantic',
            transitions: 'fade'
        });
        console.log('✅ Montage vidéo créé:');
        console.log(`   ID: ${montageResult.result.id}`);
        console.log(`   Durée: ${montageResult.result.duration} secondes`);
        console.log(`   URL: ${montageResult.result.outputUrl}`);
        console.log('');

        // URLs générées avec transformations
        console.log('🔗 URLs Cloudinary générées:');
        console.log('');
        console.log('Image originale:');
        console.log(`https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/attitudes_wedding_shoes.jpg`);
        console.log('');
        console.log('Optimisée (auto-format, auto-quality):');
        console.log(`https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/f_auto,q_auto/attitudes_wedding_shoes.jpg`);
        console.log('');
        console.log('Carré recadré (500x500):');
        console.log(`https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/c_auto,g_auto,w_500,h_500/attitudes_wedding_shoes.jpg`);
        console.log('');
        console.log('Galerie (800x600):');
        console.log(`https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/w_800,h_600,c_fill,q_auto/attitudes_wedding_shoes.jpg`);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 Intégration Cloudinary réussie !');
        console.log('='.repeat(60));
        console.log('\n💡 Prochaines étapes:');
        console.log('1. Intégrer l\'upload dans le dashboard photographe');
        console.log('2. Créer des galeries privées pour chaque mariage');
        console.log('3. Implémenter la détection de visages pour tags automatiques');
        console.log('4. Activer les transformations à la volée pour optimiser la bande passante');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        if (error.result) {
            console.error('Détails:', error.result);
        }
    }
}

// Exécuter les tests
testCloudinaryIntegration();