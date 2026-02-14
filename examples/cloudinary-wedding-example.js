// Exemple d'utilisation Cloudinary pour Attitudes.vip
// Avec vos vraies clés API configurées

const CLOUDINARY_CONFIG = {
    cloud_name: 'dmpsvmi1n',
    api_key: '937822623228143',
    api_secret: 'GXxYvAKD-P3b5V4qn6fJiCGJ4_g'
};

// URLs d'exemple pour votre cloud Cloudinary
const cloudinaryExamples = {
    // 1. Upload d'une photo de mariage
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloud_name}/image/upload`,
    
    // 2. URLs de transformation pour les photos
    transformations: {
        // Photo originale
        original: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/wedding_photo.jpg',
        
        // Optimisée pour le web (format et qualité auto)
        webOptimized: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/f_auto,q_auto/wedding_photo.jpg',
        
        // Vignette pour galerie (300x300)
        thumbnail: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/w_300,h_300,c_fill,g_face/wedding_photo.jpg',
        
        // Photo de couverture (1920x600)
        cover: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/w_1920,h_600,c_fill,g_auto/wedding_photo.jpg',
        
        // Version mobile (800px largeur)
        mobile: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/w_800,c_scale,q_auto/wedding_photo.jpg',
        
        // Avec watermark Attitudes.vip
        watermarked: 'https://res.cloudinary.com/dmpsvmi1n/image/upload/l_text:Arial_40:Attitudes.vip,co_white,o_50,g_south_east,x_10,y_10/wedding_photo.jpg'
    },
    
    // 3. Dossiers organisés par type
    folders: {
        ceremonies: '/weddings/ceremonies/',
        receptions: '/weddings/receptions/',
        couples: '/weddings/couples/',
        guests: '/weddings/guests/',
        vendors: '/weddings/vendors/',
        invitations: '/weddings/invitations/'
    }
};

// Fonction pour générer une URL Cloudinary avec transformations
function generateCloudinaryUrl(publicId, transformations = {}) {
    const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloud_name}/image/upload/`;
    
    // Construire la chaîne de transformation
    const transforms = [];
    
    if (transformations.width) transforms.push(`w_${transformations.width}`);
    if (transformations.height) transforms.push(`h_${transformations.height}`);
    if (transformations.crop) transforms.push(`c_${transformations.crop}`);
    if (transformations.quality) transforms.push(`q_${transformations.quality}`);
    if (transformations.format) transforms.push(`f_${transformations.format}`);
    if (transformations.effect) transforms.push(`e_${transformations.effect}`);
    
    const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';
    
    return `${baseUrl}${transformString}${publicId}`;
}

// Exemples d'utilisation pour Attitudes.vip
console.log('🎨 Exemples Cloudinary pour Attitudes.vip\n');
console.log('Configuration:');
console.log(`Cloud Name: ${CLOUDINARY_CONFIG.cloud_name}`);
console.log(`API Key: ${CLOUDINARY_CONFIG.api_key}\n`);

console.log('📸 Exemples d\'URLs de transformation:\n');

// Exemple 1: Photo de couple
const couplePhotoId = 'weddings/couples/jean-marie-2025';
console.log('1. Photo de couple:');
console.log('   Original:', generateCloudinaryUrl(couplePhotoId));
console.log('   Galerie:', generateCloudinaryUrl(couplePhotoId, { width: 800, height: 600, crop: 'fill', quality: 'auto' }));
console.log('   Mobile:', generateCloudinaryUrl(couplePhotoId, { width: 400, crop: 'scale', quality: 'auto', format: 'auto' }));
console.log('');

// Exemple 2: Photo de groupe
const groupPhotoId = 'weddings/guests/group-photo-ceremony';
console.log('2. Photo de groupe:');
console.log('   Détection visages:', generateCloudinaryUrl(groupPhotoId, { width: 1200, height: 800, crop: 'fill', gravity: 'faces' }));
console.log('   Version imprimable:', generateCloudinaryUrl(groupPhotoId, { quality: 100, format: 'png' }));
console.log('');

// Exemple 3: Carte d'invitation
const invitationId = 'weddings/invitations/jean-marie-invite';
console.log('3. Carte d\'invitation:');
console.log('   Web:', generateCloudinaryUrl(invitationId, { width: 600, quality: 'auto', format: 'auto' }));
console.log('   Email:', generateCloudinaryUrl(invitationId, { width: 800, quality: 80, format: 'jpg' }));
console.log('   Impression:', generateCloudinaryUrl(invitationId, { dpi: 300, format: 'pdf' }));
console.log('');

// Exemple 4: Photo avec effets
const venuePhotoId = 'weddings/venues/chateau-versailles';
console.log('4. Photo du lieu avec effets:');
console.log('   Sépia:', generateCloudinaryUrl(venuePhotoId, { effect: 'sepia', width: 1000 }));
console.log('   Noir et blanc:', generateCloudinaryUrl(venuePhotoId, { effect: 'grayscale', width: 1000 }));
console.log('   Flou artistique:', generateCloudinaryUrl(venuePhotoId, { effect: 'blur:300', width: 1000 }));
console.log('');

console.log('💡 Intégration dans Attitudes.vip:');
console.log('1. Dashboard Photographe: Upload et organisation des photos');
console.log('2. Dashboard Customer: Visualisation et téléchargement');
console.log('3. Dashboard Invite: Accès aux photos avec mot de passe');
console.log('4. Génération automatique de montages vidéo');
console.log('5. Détection de visages pour tagging automatique');

// Export pour utilisation dans l'application
module.exports = {
    CLOUDINARY_CONFIG,
    generateCloudinaryUrl,
    cloudinaryExamples
};