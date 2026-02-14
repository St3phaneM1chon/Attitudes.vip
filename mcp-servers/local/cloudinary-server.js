const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configuration Cloudinary simulée
const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET
};

// Base de données simulée pour les médias
const assets = [];
const folders = ['weddings', 'couples', 'venues', 'vendors', 'invitations'];
const transformations = [];

app.use(express.json({ limit: '50mb' })); // Plus grande limite pour les images

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'cloudinary-mcp',
    configured: !!(cloudinaryConfig.cloudName && cloudinaryConfig.apiKey),
    cloudName: cloudinaryConfig.cloudName
  });
});

// MCP Protocol endpoint principal
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  let result = {};
  
  try {
    switch(method) {
      // Upload d'image
      case 'upload.image':
        const image = {
          publicId: params.publicId || 'wedding_' + Date.now(),
          url: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${params.publicId || 'wedding_' + Date.now()}.jpg`,
          secureUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${params.publicId || 'wedding_' + Date.now()}.jpg`,
          format: params.format || 'jpg',
          width: params.width || 1920,
          height: params.height || 1080,
          bytes: params.bytes || 250000,
          folder: params.folder || 'weddings',
          tags: params.tags || ['wedding', 'attitudes.vip'],
          metadata: params.metadata || {},
          created: new Date().toISOString()
        };
        assets.push(image);
        result = image;
        console.log('Image uploadée:', image.publicId);
        break;
        
      // Upload de vidéo
      case 'upload.video':
        const video = {
          publicId: params.publicId || 'wedding_video_' + Date.now(),
          url: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/${params.publicId || 'wedding_video_' + Date.now()}.mp4`,
          secureUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/${params.publicId || 'wedding_video_' + Date.now()}.mp4`,
          format: 'mp4',
          duration: params.duration || 180,
          width: 1920,
          height: 1080,
          folder: params.folder || 'weddings/videos',
          tags: params.tags || ['wedding-video'],
          created: new Date().toISOString()
        };
        assets.push(video);
        result = video;
        break;
        
      // Transformation d'image
      case 'transform.image':
        const transformation = {
          publicId: params.publicId,
          transformation: params.transformation,
          url: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${params.transformation}/${params.publicId}`,
          presets: {
            thumbnail: 'w_150,h_150,c_fill,g_face',
            gallery: 'w_800,h_600,c_fill,q_auto',
            hero: 'w_1920,h_1080,c_fill,q_auto:best',
            social: 'w_1200,h_630,c_fill'
          }
        };
        transformations.push(transformation);
        result = transformation;
        break;
        
      // Création de galerie
      case 'gallery.create':
        const gallery = {
          id: 'gal_' + Math.random().toString(36).substr(2, 9),
          name: params.name,
          description: params.description,
          images: params.images || [],
          coverImage: params.coverImage,
          privacy: params.privacy || 'private',
          password: params.password,
          shareUrl: `https://attitudes.vip/gallery/${Math.random().toString(36).substr(2, 9)}`,
          created: new Date().toISOString()
        };
        result = gallery;
        break;
        
      // Génération de montage vidéo
      case 'video.createMontage':
        const montage = {
          id: 'mnt_' + Math.random().toString(36).substr(2, 9),
          name: params.name || 'Montage Mariage',
          clips: params.clips,
          music: params.music,
          duration: params.clips.reduce((acc, clip) => acc + (clip.duration || 5), 0),
          transitions: params.transitions || 'fade',
          outputUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/video/upload/montage_${Date.now()}.mp4`,
          status: 'processing',
          created: new Date().toISOString()
        };
        result = montage;
        break;
        
      // Suppression d'assets
      case 'delete.assets':
        const deletedCount = params.publicIds.length;
        result = {
          deleted: deletedCount,
          publicIds: params.publicIds
        };
        break;
        
      // Liste des assets
      case 'assets.list':
        result = {
          assets: assets.filter(a => !params.folder || a.folder === params.folder),
          total: assets.length,
          folders: folders
        };
        break;
        
      // Analyse d'image (détection visages, objets)
      case 'analyze.image':
        result = {
          publicId: params.publicId,
          faces: Math.floor(Math.random() * 10) + 1,
          predominantColors: ['#FFFFFF', '#F5E6D3', '#8B7355'],
          tags: ['wedding', 'couple', 'outdoor', 'romantic', 'sunset'],
          quality: 0.92,
          aestheticScore: 0.88
        };
        break;
        
      // Configuration
      case 'config.info':
        result = {
          configured: !!(cloudinaryConfig.cloudName && cloudinaryConfig.apiKey),
          cloudName: cloudinaryConfig.cloudName,
          capabilities: ['images', 'videos', 'transformations', 'galleries', 'analysis'],
          assetsCount: assets.length,
          storageUsed: assets.reduce((acc, asset) => acc + (asset.bytes || 0), 0),
          folders: folders
        };
        break;
        
      default:
        result = { error: `Unknown method: ${method}` };
    }
    
    res.json({ 
      jsonrpc: '2.0', 
      result,
      id: id || 1 
    });
    
  } catch (error) {
    res.json({ 
      jsonrpc: '2.0', 
      error: {
        code: -32603,
        message: error.message
      },
      id: id || 1 
    });
  }
});

// Webhook endpoint pour les notifications
app.post('/webhooks/cloudinary', (req, res) => {
  console.log('Webhook Cloudinary reçu:', req.body);
  res.status(200).send('OK');
});

// Endpoint pour servir les images (simulation)
app.get('/demo/:publicId', (req, res) => {
  res.json({
    publicId: req.params.publicId,
    url: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/${req.params.publicId}`
  });
});

app.listen(port, () => {
  console.log(`Cloudinary MCP Server listening on port ${port}`);
  console.log(`Cloud: ${cloudinaryConfig.cloudName}`);
});