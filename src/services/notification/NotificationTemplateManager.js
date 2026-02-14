/**
 * NotificationTemplateManager - Gestionnaire de templates de notifications
 * Gère les templates multicanal et multilingue
 */

import Handlebars from 'handlebars'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '../../utils/logger'

// Configuration Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Canaux supportés
const CHANNELS = ['email', 'sms', 'push', 'websocket', 'whatsapp']

// Langues supportées
const LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh']

export class NotificationTemplateManager {
  constructor () {
    this.templates = new Map()
    this.helpers = new Map()
    this.partials = new Map()
    this.cache = new Map()

    this.initialize()
  }

  async initialize () {
    try {
      // Enregistrer les helpers Handlebars
      this.registerHelpers()

      // Charger les partials
      await this.loadPartials()

      // Charger les templates depuis les fichiers
      await this.loadFileTemplates()

      // Charger les templates depuis la base de données
      await this.loadDatabaseTemplates()

      logger.info('NotificationTemplateManager initialized')
    } catch (error) {
      logger.error('Failed to initialize NotificationTemplateManager:', error)
      throw error
    }
  }

  /**
   * Enregistrer les helpers Handlebars
   */
  registerHelpers () {
    // Helper pour formater les dates
    Handlebars.registerHelper('formatDate', (date, format) => {
      const d = new Date(date)

      switch (format) {
        case 'full':
          return d.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        case 'short':
          return d.toLocaleDateString('fr-FR')
        case 'time':
          return d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        default:
          return d.toLocaleString('fr-FR')
      }
    })

    // Helper pour formater les montants
    Handlebars.registerHelper('formatCurrency', (amount, currency = 'EUR') => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency
      }).format(amount)
    })

    // Helper pour les pluriels
    Handlebars.registerHelper('plural', (count, singular, plural) => {
      return count === 1 ? singular : plural
    })

    // Helper pour les conditions
    Handlebars.registerHelper('eq', (a, b) => a === b)
    Handlebars.registerHelper('ne', (a, b) => a !== b)
    Handlebars.registerHelper('lt', (a, b) => a < b)
    Handlebars.registerHelper('gt', (a, b) => a > b)
    Handlebars.registerHelper('lte', (a, b) => a <= b)
    Handlebars.registerHelper('gte', (a, b) => a >= b)

    // Helper pour les tableaux
    Handlebars.registerHelper('join', (array, separator = ', ') => {
      return Array.isArray(array) ? array.join(separator) : ''
    })

    // Helper pour les URLs
    Handlebars.registerHelper('url', (path, params) => {
      const baseUrl = process.env.APP_URL || 'https://attitudes.vip'
      const url = new URL(path, baseUrl)

      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value)
        })
      }

      return url.toString()
    })

    // Helper pour les boutons d'action
    Handlebars.registerHelper('actionButton', (text, url, style = 'primary') => {
      const styles = {
        primary: 'background-color: #4A90E2; color: white;',
        secondary: 'background-color: #E0E0E0; color: #333;',
        danger: 'background-color: #E74C3C; color: white;',
        success: 'background-color: #27AE60; color: white;'
      }

      return new Handlebars.SafeString(`
        <a href="${url}" style="display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 4px; ${styles[style] || styles.primary}">
          ${text}
        </a>
      `)
    })

    // Helper pour les countdown
    Handlebars.registerHelper('countdown', (targetDate) => {
      const now = new Date()
      const target = new Date(targetDate)
      const diff = target - now

      if (diff <= 0) {
        return "C'est aujourd'hui !"
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        return `${days} jour${days > 1 ? 's' : ''}`
      } else {
        return `${hours} heure${hours > 1 ? 's' : ''}`
      }
    })
  }

  /**
   * Charger les partials
   */
  async loadPartials () {
    const partialsDir = path.join(__dirname, 'templates', 'partials')

    try {
      const files = await fs.readdir(partialsDir)

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const name = path.basename(file, '.hbs')
          const content = await fs.readFile(path.join(partialsDir, file), 'utf-8')

          Handlebars.registerPartial(name, content)
          this.partials.set(name, content)
        }
      }

      logger.info(`Loaded ${this.partials.size} template partials`)
    } catch (error) {
      logger.warn('No partials directory found')
    }
  }

  /**
   * Charger les templates depuis les fichiers
   */
  async loadFileTemplates () {
    const templatesDir = path.join(__dirname, 'templates')

    for (const channel of CHANNELS) {
      const channelDir = path.join(templatesDir, channel)

      try {
        const files = await fs.readdir(channelDir)

        for (const file of files) {
          if (file.endsWith('.hbs')) {
            const type = path.basename(file, '.hbs')
            const content = await fs.readFile(path.join(channelDir, file), 'utf-8')

            // Compiler et stocker
            const key = `${type}:${channel}:fr` // Par défaut en français
            this.compileAndStore(key, content)
          }
        }
      } catch (error) {
        logger.warn(`No templates directory for channel ${channel}`)
      }
    }
  }

  /**
   * Charger les templates depuis la base de données
   */
  async loadDatabaseTemplates () {
    try {
      const { data: templates } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('active', true)

      for (const template of templates || []) {
        const key = `${template.type}:${template.channel}:${template.language}`
        this.compileAndStore(key, template.content, template.metadata)
      }

      logger.info(`Loaded ${templates?.length || 0} database templates`)
    } catch (error) {
      logger.error('Failed to load database templates:', error)
    }
  }

  /**
   * Compiler et stocker un template
   */
  compileAndStore (key, content, metadata = {}) {
    try {
      const compiled = Handlebars.compile(content)

      this.templates.set(key, {
        compiled,
        content,
        metadata,
        compiledAt: new Date()
      })
    } catch (error) {
      logger.error(`Failed to compile template ${key}:`, error)
    }
  }

  /**
   * Rendre un template
   */
  async render (type, channel, data, options = {}) {
    const language = options.language || data.language || 'fr'
    const key = `${type}:${channel}:${language}`

    // Vérifier le cache
    const cacheKey = `${key}:${JSON.stringify(data)}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }

    // Obtenir le template
    let template = this.templates.get(key)

    // Fallback vers la langue par défaut
    if (!template && language !== 'fr') {
      template = this.templates.get(`${type}:${channel}:fr`)
    }

    // Fallback vers un template générique
    if (!template) {
      template = this.getGenericTemplate(type, channel)
    }

    if (!template) {
      throw new Error(`No template found for ${type}:${channel}:${language}`)
    }

    // Préparer les données
    const context = {
      ...this.getDefaultContext(),
      ...data,
      channel,
      language,
      type
    }

    // Rendre le template
    const rendered = template.compiled(context)

    // Traiter selon le canal
    const processed = await this.processForChannel(rendered, channel, context)

    // Mettre en cache
    this.cache.set(cacheKey, processed)

    // Nettoyer le cache si trop grand
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    return processed
  }

  /**
   * Traiter le rendu pour un canal spécifique
   */
  async processForChannel (rendered, channel, context) {
    switch (channel) {
      case 'email':
        return this.processEmailTemplate(rendered, context)

      case 'sms':
        return this.processSmsTemplate(rendered, context)

      case 'push':
        return this.processPushTemplate(rendered, context)

      case 'websocket':
        return this.processWebSocketTemplate(rendered, context)

      case 'whatsapp':
        return this.processWhatsAppTemplate(rendered, context)

      default:
        return rendered
    }
  }

  /**
   * Traiter un template email
   */
  async processEmailTemplate (rendered, context) {
    // Parser le contenu (supposer format YAML-like)
    const sections = this.parseTemplateSections(rendered)

    // Générer la version HTML complète
    const html = await this.generateEmailHtml(sections, context)

    // Générer la version texte
    const text = this.generateEmailText(sections)

    return {
      subject: sections.subject || context.title || 'Notification',
      html,
      text,
      headers: sections.headers || {}
    }
  }

  /**
   * Traiter un template SMS
   */
  processSmsTemplate (rendered, context) {
    // Limiter la longueur
    const maxLength = 160
    let text = rendered.trim()

    if (text.length > maxLength) {
      text = text.substring(0, maxLength - 3) + '...'
    }

    return {
      body: text,
      encoding: this.detectSmsEncoding(text)
    }
  }

  /**
   * Traiter un template Push
   */
  processPushTemplate (rendered, context) {
    const sections = this.parseTemplateSections(rendered)

    return {
      title: sections.title || context.title,
      body: sections.body || sections.content,
      icon: sections.icon || context.icon || '/icon-192.png',
      badge: sections.badge || context.badge,
      image: sections.image || context.image,
      actions: sections.actions || [],
      data: sections.data || {}
    }
  }

  /**
   * Traiter un template WebSocket
   */
  processWebSocketTemplate (rendered, context) {
    const sections = this.parseTemplateSections(rendered)

    return {
      type: context.type,
      title: sections.title || context.title,
      message: sections.message || sections.content,
      severity: sections.severity || 'info',
      actions: sections.actions || [],
      metadata: sections.metadata || {}
    }
  }

  /**
   * Traiter un template WhatsApp
   */
  processWhatsAppTemplate (rendered, context) {
    const sections = this.parseTemplateSections(rendered)

    return {
      text: sections.content || rendered,
      media: sections.media || null,
      buttons: sections.buttons || [],
      template: sections.template || null
    }
  }

  /**
   * Parser les sections d'un template
   */
  parseTemplateSections (content) {
    const sections = {}
    const lines = content.split('\n')
    let currentSection = 'content'
    let sectionContent = []

    for (const line of lines) {
      const sectionMatch = line.match(/^---\s*(\w+)\s*---$/)

      if (sectionMatch) {
        // Sauvegarder la section précédente
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim()
        }

        // Nouvelle section
        currentSection = sectionMatch[1]
        sectionContent = []
      } else {
        sectionContent.push(line)
      }
    }

    // Sauvegarder la dernière section
    if (sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n').trim()
    }

    // Parser les sections JSON
    ['headers', 'actions', 'data', 'metadata', 'buttons'].forEach(key => {
      if (sections[key]) {
        try {
          sections[key] = JSON.parse(sections[key])
        } catch (e) {
          // Garder comme string si pas du JSON valide
        }
      }
    })

    return sections
  }

  /**
   * Générer le HTML d'un email
   */
  async generateEmailHtml (sections, context) {
    const layout = await this.getEmailLayout(context.layout || 'default')

    const content = {
      preheader: sections.preheader || '',
      header: sections.header || '',
      content: sections.content || '',
      footer: sections.footer || this.getDefaultFooter(context),
      ...sections
    }

    return layout(content)
  }

  /**
   * Générer le texte d'un email
   */
  generateEmailText (sections) {
    const parts = []

    if (sections.subject) parts.push(sections.subject)
    if (sections.header) parts.push(sections.header)
    if (sections.content) parts.push(sections.content)
    if (sections.footer) parts.push(sections.footer)

    return parts.join('\n\n')
  }

  /**
   * Obtenir le layout email
   */
  async getEmailLayout (name) {
    const layoutKey = `layout:${name}`

    if (!this.templates.has(layoutKey)) {
      // Layout par défaut
      const defaultLayout = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f8f9fa; padding: 20px; text-align: center; }
    .content { padding: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    {{#if preheader}}<div style="display: none;">{{preheader}}</div>{{/if}}
    {{#if header}}<div class="header">{{{header}}}</div>{{/if}}
    <div class="content">{{{content}}}</div>
    <div class="footer">{{{footer}}}</div>
  </div>
</body>
</html>
      `

      this.compileAndStore(layoutKey, defaultLayout)
    }

    return this.templates.get(layoutKey).compiled
  }

  /**
   * Obtenir le contexte par défaut
   */
  getDefaultContext () {
    return {
      appName: 'Attitudes.vip',
      appUrl: process.env.APP_URL || 'https://attitudes.vip',
      supportEmail: 'support@attitudes.vip',
      currentYear: new Date().getFullYear(),
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Obtenir le footer par défaut
   */
  getDefaultFooter (context) {
    return `
      <p>Cordialement,<br>L'équipe ${context.appName}</p>
      <p style="font-size: 12px; color: #6c757d;">
        Vous recevez cet email car vous êtes inscrit sur ${context.appName}.<br>
        <a href="${context.appUrl}/settings/notifications">Gérer vos préférences</a> | 
        <a href="${context.appUrl}/unsubscribe?token=${context.unsubscribeToken}">Se désabonner</a>
      </p>
    `
  }

  /**
   * Obtenir un template générique
   */
  getGenericTemplate (type, channel) {
    const generic = {
      email: {
        compiled: (data) => ({
          subject: data.title || 'Notification',
          html: `<p>${data.message || data.body}</p>`,
          text: data.message || data.body
        })
      },
      sms: {
        compiled: (data) => ({
          body: `${data.title}: ${data.message || data.body}`
        })
      },
      push: {
        compiled: (data) => ({
          title: data.title || 'Notification',
          body: data.message || data.body
        })
      },
      websocket: {
        compiled: (data) => ({
          type: data.type || 'notification',
          title: data.title,
          message: data.message || data.body
        })
      }
    }

    return generic[channel]
  }

  /**
   * Détecter l'encodage SMS
   */
  detectSmsEncoding (text) {
    // Vérifier si le texte contient des caractères non-GSM
    const gsmRegex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-Z\[\]^_`a-z{|}~¨¿äöñüàÄÖÑÜ§]+$/

    return gsmRegex.test(text) ? 'GSM' : 'UCS2'
  }

  /**
   * Créer un nouveau template
   */
  async createTemplate (type, channel, language, content, metadata = {}) {
    try {
      // Valider le template
      Handlebars.compile(content)

      // Sauvegarder dans la base de données
      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          type,
          channel,
          language,
          content,
          metadata,
          active: true
        })
        .select()
        .single()

      if (error) throw error

      // Ajouter au cache
      const key = `${type}:${channel}:${language}`
      this.compileAndStore(key, content, metadata)

      return data
    } catch (error) {
      logger.error('Failed to create template:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un template
   */
  async updateTemplate (id, updates) {
    try {
      // Valider le nouveau contenu si fourni
      if (updates.content) {
        Handlebars.compile(updates.content)
      }

      // Mettre à jour dans la base de données
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Mettre à jour le cache
      const key = `${data.type}:${data.channel}:${data.language}`
      if (data.active) {
        this.compileAndStore(key, data.content, data.metadata)
      } else {
        this.templates.delete(key)
      }

      return data
    } catch (error) {
      logger.error('Failed to update template:', error)
      throw error
    }
  }

  /**
   * Prévisualiser un template
   */
  async preview (type, channel, language, sampleData = {}) {
    const defaultData = {
      user: {
        name: 'Jean Dupont',
        email: 'jean.dupont@example.com'
      },
      wedding: {
        name: 'Mariage de Marie & Pierre',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: 'Château de Versailles'
      },
      vendor: {
        name: 'Fleurs Magiques',
        category: 'Fleuriste'
      },
      amount: 1500,
      ...sampleData
    }

    return this.render(type, channel, defaultData, { language })
  }

  /**
   * Exporter les templates
   */
  async exportTemplates (filters = {}) {
    const templates = []

    for (const [key, template] of this.templates) {
      const [type, channel, language] = key.split(':')

      if (filters.type && type !== filters.type) continue
      if (filters.channel && channel !== filters.channel) continue
      if (filters.language && language !== filters.language) continue

      templates.push({
        type,
        channel,
        language,
        content: template.content,
        metadata: template.metadata
      })
    }

    return templates
  }

  /**
   * Importer des templates
   */
  async importTemplates (templates) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    }

    for (const template of templates) {
      try {
        await this.createTemplate(
          template.type,
          template.channel,
          template.language,
          template.content,
          template.metadata
        )
        results.success++
      } catch (error) {
        results.failed++
        results.errors.push({
          template: `${template.type}:${template.channel}:${template.language}`,
          error: error.message
        })
      }
    }

    return results
  }
}

// Instance singleton
export const templateManager = new NotificationTemplateManager()
