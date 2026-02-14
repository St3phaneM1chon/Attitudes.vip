/**
 * MediaService - Gestion complète des médias (photos/vidéos)
 * Upload, compression, organisation, partage et droits d'accès
 */

import { createClient } from '@supabase/supabase-js'
import Bull from 'bull'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { PerformanceMonitor } from '../../utils/performance'
import { logger } from '../../utils/logger'

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Configuration des tailles d'images
const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  small: { width: 480, height: 480, quality: 85 },
  medium: { width: 1080, height: 1080, quality: 90 },
  large: { width: 1920, height: 1920, quality: 95 },
  original: null
}

// Configuration des formats vidéo
const VIDEO_FORMATS = {
  preview: { width: 480, height: 270, bitrate: '500k' },
  standard: { width: 1280, height: 720, bitrate: '2000k' },
  hd: { width: 1920, height: 1080, bitrate: '4000k' }
}

// Types de médias supportés
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heif', 'image/heic']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export class MediaService {
  constructor () {
    // Files de traitement
    this.uploadQueue = new Bull('media-upload', process.env.REDIS_URL)
    this.processingQueue = new Bull('media-processing', process.env.REDIS_URL)
    this.notificationQueue = new Bull('media-notifications', process.env.REDIS_URL)

    // Configuration
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'wedding-media'
    this.cdnUrl = process.env.CDN_URL || `${process.env.SUPABASE_URL}/storage/v1/object/public/${this.bucketName}`

    // Performance
    this.performanceMonitor = new PerformanceMonitor('MediaService')

    // Cache des métadonnées
    this.metadataCache = new Map()

    this.initialize()
  }

  async initialize () {
    try {
      // Créer le bucket s'il n'existe pas
      await this.ensureBucketExists()

      // Configurer les processeurs de queue
      this.setupQueueProcessors()

      logger.info('MediaService initialized')
    } catch (error) {
      logger.error('Failed to initialize MediaService:', error)
      throw error
    }
  }

  async ensureBucketExists () {
    try {
      const { data: buckets } = await supabase.storage.listBuckets()

      if (!buckets.find(b => b.name === this.bucketName)) {
        await supabase.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 104857600, // 100MB
          allowedMimeTypes: [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]
        })
      }
    } catch (error) {
      logger.error('Error ensuring bucket exists:', error)
    }
  }

  /**
   * Upload de média avec traitement asynchrone
   */
  async upload (file, options = {}) {
    this.performanceMonitor.mark('upload-start')

    try {
      // Validation
      await this.validateFile(file)

      // Générer l'ID et le chemin
      const mediaId = uuidv4()
      const filePath = this.generateFilePath(mediaId, file, options)

      // Upload du fichier original
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer || file, {
          contentType: file.mimetype || file.type,
          upsert: false
        })

      if (uploadError) throw uploadError

      // Créer l'entrée dans la base de données
      const { data: media, error: dbError } = await supabase
        .from('media')
        .insert({
          id: mediaId,
          wedding_id: options.weddingId,
          uploaded_by: options.uploadedBy,
          file_path: filePath,
          file_name: file.originalname || file.name,
          file_size: file.size,
          mime_type: file.mimetype || file.type,
          media_type: this.getMediaType(file.mimetype || file.type),
          status: 'processing',
          metadata: {
            ...options.metadata,
            originalPath: uploadData.path
          }
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Ajouter à la queue de traitement
      await this.processingQueue.add('process-media', {
        mediaId,
        filePath,
        fileType: file.mimetype || file.type,
        options
      })

      this.performanceMonitor.mark('upload-end')
      this.performanceMonitor.measure('media-upload', 'upload-start', 'upload-end')

      return {
        id: mediaId,
        url: this.getMediaUrl(filePath),
        status: 'processing',
        media
      }
    } catch (error) {
      logger.error('Upload failed:', error)
      throw error
    }
  }

  /**
   * Upload multiple avec progression
   */
  async uploadMultiple (files, options = {}) {
    const results = []
    const total = files.length

    for (let i = 0; i < total; i++) {
      try {
        const result = await this.upload(files[i], options)
        results.push({ success: true, ...result })

        // Callback de progression
        if (options.onProgress) {
          options.onProgress({
            current: i + 1,
            total,
            percentage: Math.round(((i + 1) / total) * 100)
          })
        }
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          file: files[i].name
        })
      }
    }

    return results
  }

  /**
   * Processeur de médias
   */
  setupQueueProcessors () {
    // Processeur principal
    this.processingQueue.process('process-media', async (job) => {
      const { mediaId, filePath, fileType, options } = job.data

      try {
        if (this.isImage(fileType)) {
          await this.processImage(mediaId, filePath, options)
        } else if (this.isVideo(fileType)) {
          await this.processVideo(mediaId, filePath, options)
        }

        // Mettre à jour le statut
        await this.updateMediaStatus(mediaId, 'ready')

        // Notifier
        await this.notificationQueue.add('media-ready', { mediaId })

        return { success: true }
      } catch (error) {
        await this.updateMediaStatus(mediaId, 'failed', error.message)
        throw error
      }
    })

    // Configuration des queues
    this.processingQueue.on('failed', (job, error) => {
      logger.error(`Media processing failed for ${job.data.mediaId}:`, error)
    })
  }

  /**
   * Traitement d'image
   */
  async processImage (mediaId, originalPath, options = {}) {
    try {
      // Télécharger l'image originale
      const { data: originalData, error } = await supabase.storage
        .from(this.bucketName)
        .download(originalPath)

      if (error) throw error

      const buffer = await originalData.arrayBuffer()
      const image = sharp(Buffer.from(buffer))

      // Obtenir les métadonnées
      const metadata = await image.metadata()

      // Générer les différentes tailles
      const variants = {}

      for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
        if (sizeName === 'original') continue

        const variantPath = this.getVariantPath(originalPath, sizeName)

        // Redimensionner et optimiser
        let processed = image.clone()

        if (config.width || config.height) {
          processed = processed.resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
        }

        // Optimiser selon le format
        if (metadata.format === 'jpeg') {
          processed = processed.jpeg({ quality: config.quality, progressive: true })
        } else if (metadata.format === 'png') {
          processed = processed.png({ quality: config.quality, compressionLevel: 9 })
        } else {
          processed = processed.webp({ quality: config.quality })
        }

        // Upload de la variante
        const variantBuffer = await processed.toBuffer()

        const { error: uploadError } = await supabase.storage
          .from(this.bucketName)
          .upload(variantPath, variantBuffer, {
            contentType: `image/${metadata.format}`
          })

        if (uploadError) throw uploadError

        variants[sizeName] = {
          path: variantPath,
          url: this.getMediaUrl(variantPath),
          width: config.width,
          height: config.height,
          size: variantBuffer.length
        }
      }

      // Détecter les visages si demandé
      let faces = []
      if (options.detectFaces) {
        faces = await this.detectFaces(buffer)
      }

      // Extraire les couleurs dominantes
      const colors = await this.extractColors(image)

      // Mettre à jour les métadonnées
      await supabase
        .from('media')
        .update({
          width: metadata.width,
          height: metadata.height,
          variants,
          metadata: {
            format: metadata.format,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation,
            exif: metadata.exif,
            faces,
            colors
          }
        })
        .eq('id', mediaId)

      return variants
    } catch (error) {
      logger.error('Image processing failed:', error)
      throw error
    }
  }

  /**
   * Traitement vidéo
   */
  async processVideo (mediaId, originalPath, options = {}) {
    try {
      // Générer un thumbnail
      const thumbnailPath = this.getVariantPath(originalPath, 'thumbnail')
      const thumbnail = await this.generateVideoThumbnail(originalPath)

      await supabase.storage
        .from(this.bucketName)
        .upload(thumbnailPath, thumbnail)

      // Obtenir les métadonnées vidéo
      const metadata = await this.getVideoMetadata(originalPath)

      // Mettre à jour la base de données
      await supabase
        .from('media')
        .update({
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
          thumbnail_path: thumbnailPath,
          metadata: {
            codec: metadata.codec,
            bitrate: metadata.bitrate,
            framerate: metadata.framerate
          }
        })
        .eq('id', mediaId)

      // Si transcoding demandé
      if (options.transcode) {
        await this.processingQueue.add('transcode-video', {
          mediaId,
          originalPath,
          formats: options.formats || ['standard']
        })
      }

      return { thumbnail: this.getMediaUrl(thumbnailPath) }
    } catch (error) {
      logger.error('Video processing failed:', error)
      throw error
    }
  }

  /**
   * Gestion des albums
   */
  async createAlbum (albumData) {
    try {
      const { data, error } = await supabase
        .from('media_albums')
        .insert({
          ...albumData,
          id: uuidv4(),
          settings: {
            privacy: albumData.privacy || 'private',
            allowDownload: albumData.allowDownload ?? true,
            allowComments: albumData.allowComments ?? true,
            allowSharing: albumData.allowSharing ?? false,
            ...albumData.settings
          }
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      logger.error('Failed to create album:', error)
      throw error
    }
  }

  async addToAlbum (albumId, mediaIds) {
    try {
      const items = mediaIds.map(mediaId => ({
        album_id: albumId,
        media_id: mediaId,
        added_at: new Date()
      }))

      const { error } = await supabase
        .from('album_media')
        .insert(items)

      if (error) throw error

      // Mettre à jour le compteur
      await supabase.rpc('increment_album_count', {
        album_id: albumId,
        count: mediaIds.length
      })

      return true
    } catch (error) {
      logger.error('Failed to add media to album:', error)
      throw error
    }
  }

  /**
   * Gestion des droits et partage
   */
  async shareMedia (mediaId, shareData) {
    try {
      const shareId = uuidv4()
      const expiresAt = shareData.expiresIn
        ? new Date(Date.now() + shareData.expiresIn)
        : null

      const { data, error } = await supabase
        .from('media_shares')
        .insert({
          id: shareId,
          media_id: mediaId,
          shared_by: shareData.sharedBy,
          share_type: shareData.type, // 'public', 'link', 'user'
          recipients: shareData.recipients,
          permissions: shareData.permissions || ['view'],
          expires_at: expiresAt,
          password: shareData.password ? await this.hashPassword(shareData.password) : null
        })
        .select()
        .single()

      if (error) throw error

      const shareUrl = `${process.env.APP_URL}/share/${shareId}`

      return {
        ...data,
        shareUrl,
        shortUrl: await this.generateShortUrl(shareUrl)
      }
    } catch (error) {
      logger.error('Failed to share media:', error)
      throw error
    }
  }

  async checkAccess (mediaId, userId) {
    try {
      // Vérifier si l'utilisateur a accès au média
      const { data: media } = await supabase
        .from('media')
        .select('*, wedding:weddings(*)')
        .eq('id', mediaId)
        .single()

      if (!media) return false

      // Propriétaire
      if (media.uploaded_by === userId) return true

      // Membre du mariage
      const { data: member } = await supabase
        .from('wedding_members')
        .select('role')
        .eq('wedding_id', media.wedding_id)
        .eq('user_id', userId)
        .single()

      if (member) return true

      // Partage spécifique
      const { data: share } = await supabase
        .from('media_shares')
        .select('*')
        .eq('media_id', mediaId)
        .or(`recipients.cs.{${userId}},share_type.eq.public`)
        .single()

      return !!share
    } catch (error) {
      logger.error('Failed to check access:', error)
      return false
    }
  }

  /**
   * Recherche et filtrage
   */
  async searchMedia (weddingId, filters = {}) {
    try {
      let query = supabase
        .from('media')
        .select(`
          *,
          uploaded_by_user:users!uploaded_by(name, avatar_url),
          albums:album_media(album:media_albums(*))
        `)
        .eq('wedding_id', weddingId)
        .eq('status', 'ready')

      // Filtres
      if (filters.type) {
        query = query.eq('media_type', filters.type)
      }

      if (filters.uploadedBy) {
        query = query.eq('uploaded_by', filters.uploadedBy)
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags)
      }

      if (filters.faces) {
        query = query.not('metadata->>faces', 'is', null)
      }

      // Tri
      const orderBy = filters.orderBy || 'created_at'
      const order = filters.order || 'desc'
      query = query.order(orderBy, { ascending: order === 'asc' })

      // Pagination
      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)
      }

      const { data, error, count } = await query

      if (error) throw error

      return {
        media: data || [],
        total: count || 0
      }
    } catch (error) {
      logger.error('Failed to search media:', error)
      throw error
    }
  }

  /**
   * Détection de visages
   */
  async detectFaces (imageBuffer) {
    // Intégration avec service de détection de visages
    // (AWS Rekognition, Google Vision, etc.)
    return []
  }

  /**
   * Extraction des couleurs dominantes
   */
  async extractColors (sharpImage) {
    try {
      const { dominant } = await sharpImage.stats()

      return {
        dominant: this.rgbToHex(dominant),
        palette: [] // À implémenter avec une librairie spécialisée
      }
    } catch (error) {
      return { dominant: null, palette: [] }
    }
  }

  /**
   * Génération de miniature vidéo
   */
  async generateVideoThumbnail (videoPath) {
    // Utiliser ffmpeg ou un service cloud
    // Pour l'instant, retourner une image placeholder
    const placeholderPath = path.join(__dirname, 'assets/video-placeholder.jpg')
    return fs.readFile(placeholderPath)
  }

  /**
   * Obtenir les métadonnées vidéo
   */
  async getVideoMetadata (videoPath) {
    // Utiliser ffprobe ou un service cloud
    return {
      duration: 0,
      width: 1920,
      height: 1080,
      codec: 'h264',
      bitrate: '4000k',
      framerate: 30
    }
  }

  /**
   * Utilitaires
   */
  validateFile (file) {
    const maxSize = 104857600 // 100MB

    if (file.size > maxSize) {
      throw new Error(`File size exceeds maximum of ${maxSize / 1048576}MB`)
    }

    const mimeType = file.mimetype || file.type
    const supportedTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]

    if (!supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`)
    }
  }

  generateFilePath (mediaId, file, options = {}) {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const ext = this.getFileExtension(file.originalname || file.name)

    let path = `${options.weddingId || 'general'}/${year}/${month}`

    if (options.albumId) {
      path += `/albums/${options.albumId}`
    }

    return `${path}/${mediaId}${ext}`
  }

  getFileExtension (filename) {
    return filename.substring(filename.lastIndexOf('.'))
  }

  getMediaType (mimeType) {
    if (SUPPORTED_IMAGE_TYPES.includes(mimeType)) return 'image'
    if (SUPPORTED_VIDEO_TYPES.includes(mimeType)) return 'video'
    return 'unknown'
  }

  isImage (mimeType) {
    return SUPPORTED_IMAGE_TYPES.includes(mimeType)
  }

  isVideo (mimeType) {
    return SUPPORTED_VIDEO_TYPES.includes(mimeType)
  }

  getMediaUrl (path) {
    return `${this.cdnUrl}/${path}`
  }

  getVariantPath (originalPath, variant) {
    const dir = originalPath.substring(0, originalPath.lastIndexOf('/'))
    const filename = originalPath.substring(originalPath.lastIndexOf('/') + 1)
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'))
    const ext = filename.substring(filename.lastIndexOf('.'))

    return `${dir}/${nameWithoutExt}_${variant}${ext}`
  }

  rgbToHex ({ r, g, b }) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  async updateMediaStatus (mediaId, status, error = null) {
    await supabase
      .from('media')
      .update({
        status,
        error,
        processed_at: status === 'ready' ? new Date() : null
      })
      .eq('id', mediaId)
  }

  async hashPassword (password) {
    const bcrypt = require('bcrypt')
    return bcrypt.hash(password, 10)
  }

  async generateShortUrl (longUrl) {
    // Intégrer avec un service de raccourcissement d'URL
    return longUrl
  }

  /**
   * Nettoyage et maintenance
   */
  async cleanupExpiredShares () {
    const { error } = await supabase
      .from('media_shares')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .not('expires_at', 'is', null)

    if (error) {
      logger.error('Failed to cleanup expired shares:', error)
    }
  }

  async cleanupOrphanedFiles () {
    // Nettoyer les fichiers qui ne sont plus référencés dans la BD
    // À implémenter avec prudence
  }
}

// Instance singleton
export const mediaService = new MediaService()
