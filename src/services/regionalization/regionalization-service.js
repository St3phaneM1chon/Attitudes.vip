const RegionalContentManager = require('../../i18n/utils/regional-content.js')

class RegionalizationService {
  constructor () {
    this.regionalManager = new RegionalContentManager()
    this.currentUserRegion = null
    this.currentUserReligion = null
    this.userPreferences = {}
  }

  // Initialiser le service avec les préférences utilisateur
  async initialize (userCountry, userReligion = null, userPreferences = {}) {
    this.currentUserRegion = userCountry
    this.currentUserReligion = userReligion
    this.userPreferences = userPreferences

    await this.regionalManager.setRegionAndReligion(userCountry, userReligion)
    this.regionalManager.applyCulturalAdaptations()

    // Charger les contenus régionaux
    await this.loadRegionalContent()
  }

  // Charger le contenu régional
  async loadRegionalContent () {
    try {
      const region = this.regionalManager.currentRegion
      const contentPath = this.regionalManager.culturalContent?.contentPath

      if (!contentPath) return

      // Charger les images régionales
      await this.loadRegionalImages(region)

      // Charger les templates régionaux
      await this.loadRegionalTemplates(region)

      // Charger les styles régionaux
      await this.loadRegionalStyles(region)
    } catch (error) {
      console.error('Error loading regional content:', error)
    }
  }

  // Charger les images régionales
  async loadRegionalImages (region) {
    const imageCategories = [
      'wedding_venues',
      'decorations',
      'attire',
      'food',
      'ceremonies',
      'music'
    ]

    for (const category of imageCategories) {
      try {
        const response = await fetch(`/assets/regional/${region}/images/${category}.json`)
        if (response.ok) {
          const images = await response.json()
          this.setRegionalImages(category, images)
        }
      } catch (error) {
        console.warn(`Could not load ${category} images for region ${region}`)
      }
    }
  }

  // Charger les templates régionaux
  async loadRegionalTemplates (region) {
    const templateTypes = [
      'wedding_invitation',
      'ceremony_script',
      'menu_template',
      'decorations_guide',
      'music_playlist'
    ]

    for (const type of templateTypes) {
      try {
        const response = await fetch(`/assets/regional/${region}/templates/${type}.json`)
        if (response.ok) {
          const template = await response.json()
          this.setRegionalTemplate(type, template)
        }
      } catch (error) {
        console.warn(`Could not load ${type} template for region ${region}`)
      }
    }
  }

  // Charger les styles régionaux
  async loadRegionalStyles (region) {
    try {
      const response = await fetch(`/assets/regional/${region}/styles/regional.css`)
      if (response.ok) {
        const css = await response.text()
        this.injectRegionalStyles(css, region)
      }
    } catch (error) {
      console.warn(`Could not load regional styles for region ${region}`)
    }
  }

  // Injecter les styles régionaux
  injectRegionalStyles (css, region) {
    const styleId = `regional-styles-${region}`
    let styleElement = document.getElementById(styleId)

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = styleId
      document.head.appendChild(styleElement)
    }

    styleElement.textContent = css
  }

  // Définir les images régionales
  setRegionalImages (category, images) {
    if (!this.regionalImages) {
      this.regionalImages = {}
    }
    this.regionalImages[category] = images
  }

  // Définir les templates régionaux
  setRegionalTemplate (type, template) {
    if (!this.regionalTemplates) {
      this.regionalTemplates = {}
    }
    this.regionalTemplates[type] = template
  }

  // Obtenir les suggestions personnalisées
  getPersonalizedSuggestions () {
    const baseSuggestions = this.regionalManager.getRegionalSuggestions()
    const personalizedSuggestions = []

    // Adapter selon les préférences utilisateur
    if (this.userPreferences.budget === 'low') {
      personalizedSuggestions.push('Privilégier les options économiques tout en respectant les traditions')
    } else if (this.userPreferences.budget === 'high') {
      personalizedSuggestions.push('Considérer des options premium et des services personnalisés')
    }

    if (this.userPreferences.guestCount > 200) {
      personalizedSuggestions.push('Adapter les traditions pour un grand nombre d\'invités')
    }

    if (this.userPreferences.outdoor) {
      personalizedSuggestions.push('Adapter les cérémonies pour un mariage en extérieur')
    }

    return [...baseSuggestions, ...personalizedSuggestions]
  }

  // Obtenir le contenu adapté pour un module
  getAdaptedContent (moduleName, userPreferences = {}) {
    const baseContent = this.regionalManager.getRegionalContentForModule(moduleName)
    const adaptedContent = { ...baseContent }

    // Adapter selon les préférences utilisateur
    switch (moduleName) {
      case 'wedding_ceremony':
        adaptedContent.ceremonies = this.filterCeremoniesByPreferences(
          baseContent.ceremonies,
          userPreferences
        )
        break

      case 'music':
        adaptedContent.styles = this.filterMusicByPreferences(
          baseContent.styles,
          userPreferences
        )
        break

      case 'food':
        adaptedContent.cuisine = this.filterFoodByPreferences(
          baseContent.cuisine,
          userPreferences
        )
        break

      case 'decorations':
        adaptedContent.elements = this.filterDecorationsByPreferences(
          baseContent.elements,
          userPreferences
        )
        break
    }

    return adaptedContent
  }

  // Filtrer les cérémonies selon les préférences
  filterCeremoniesByPreferences (ceremonies, preferences) {
    if (!ceremonies) return []

    let filtered = [...ceremonies]

    // Filtrer selon la durée
    if (preferences.ceremonyDuration === 'short') {
      filtered = filtered.filter(ceremony =>
        !['multi-day', 'elaborate'].includes(ceremony)
      )
    }

    // Filtrer selon le lieu
    if (preferences.outdoor) {
      filtered = filtered.filter(ceremony =>
        !['indoor_only', 'temple'].includes(ceremony)
      )
    }

    // Filtrer selon le budget
    if (preferences.budget === 'low') {
      filtered = filtered.filter(ceremony =>
        !['elaborate', 'luxury'].includes(ceremony)
      )
    }

    return filtered
  }

  // Filtrer la musique selon les préférences
  filterMusicByPreferences (music, preferences) {
    if (!music) return []

    let filtered = [...music]

    // Filtrer selon l'ambiance
    if (preferences.ambiance === 'traditional') {
      filtered = filtered.filter(style =>
        ['traditional', 'classical', 'religious'].includes(style)
      )
    } else if (preferences.ambiance === 'modern') {
      filtered = filtered.filter(style =>
        ['contemporary', 'pop', 'jazz'].includes(style)
      )
    }

    // Filtrer selon le budget
    if (preferences.budget === 'low') {
      filtered = filtered.filter(style =>
        !['orchestra', 'live_band'].includes(style)
      )
    }

    return filtered
  }

  // Filtrer la nourriture selon les préférences
  filterFoodByPreferences (food, preferences) {
    if (!food) return []

    let filtered = [...food]

    // Filtrer selon les restrictions alimentaires
    if (preferences.dietaryRestrictions) {
      preferences.dietaryRestrictions.forEach(restriction => {
        if (restriction === 'vegetarian') {
          filtered = filtered.filter(item =>
            !['meat', 'fish', 'poultry'].includes(item)
          )
        } else if (restriction === 'vegan') {
          filtered = filtered.filter(item =>
            !['dairy', 'eggs', 'honey'].includes(item)
          )
        }
      })
    }

    // Filtrer selon le budget
    if (preferences.budget === 'low') {
      filtered = filtered.filter(item =>
        !['luxury', 'premium'].includes(item)
      )
    }

    return filtered
  }

  // Filtrer les décorations selon les préférences
  filterDecorationsByPreferences (decorations, preferences) {
    if (!decorations) return []

    let filtered = [...decorations]

    // Filtrer selon le thème
    if (preferences.theme === 'minimalist') {
      filtered = filtered.filter(item =>
        !['elaborate', 'ornate'].includes(item)
      )
    } else if (preferences.theme === 'luxury') {
      filtered = filtered.filter(item =>
        !['simple', 'minimal'].includes(item)
      )
    }

    // Filtrer selon le budget
    if (preferences.budget === 'low') {
      filtered = filtered.filter(item =>
        !['expensive', 'luxury'].includes(item)
      )
    }

    return filtered
  }

  // Obtenir les recommandations de fournisseurs régionaux
  getRegionalVendorRecommendations () {
    const region = this.regionalManager.currentRegion
    const religion = this.currentUserReligion

    const vendorRecommendations = {
      'middle-east': {
        photographers: ['Photographes spécialisés en cérémonies traditionnelles'],
        caterers: ['Catering halal et cuisine traditionnelle'],
        musicians: ['Musiciens traditionnels arabes'],
        decorators: ['Décorateurs spécialisés en motifs géométriques']
      },
      asia: {
        photographers: ['Photographes spécialisés en cérémonies asiatiques'],
        caterers: ['Catering végétarien et cuisine traditionnelle'],
        musicians: ['Musiciens traditionnels asiatiques'],
        decorators: ['Décorateurs spécialisés en motifs traditionnels']
      },
      europe: {
        photographers: ['Photographes classiques et élégants'],
        caterers: ['Catering européen traditionnel'],
        musicians: ['Musiciens classiques et contemporains'],
        decorators: ['Décorateurs élégants et sophistiqués']
      },
      'north-america': {
        photographers: ['Photographes modernes et créatifs'],
        caterers: ['Catering varié et personnalisé'],
        musicians: ['Musiciens contemporains et DJs'],
        decorators: ['Décorateurs créatifs et personnalisés']
      }
    }

    return vendorRecommendations[region] || vendorRecommendations['north-america']
  }

  // Obtenir les conseils de planification régionaux
  getRegionalPlanningTips () {
    const region = this.regionalManager.currentRegion
    const religion = this.currentUserReligion

    const planningTips = {
      'middle-east': [
        'Planifier la cérémonie de henna 1-2 jours avant',
        'Réserver un imam pour la cérémonie religieuse',
        'Prévoir des espaces séparés pour hommes et femmes',
        'Organiser le zaffe (procession traditionnelle)'
      ],
      asia: [
        'Planifier les cérémonies sur plusieurs jours',
        'Réserver un temple ou un lieu de culte',
        'Prévoir les cérémonies traditionnelles familiales',
        'Organiser la cérémonie du thé'
      ],
      europe: [
        'Planifier la cérémonie civile et/ou religieuse',
        'Réserver l\'église ou la mairie',
        'Prévoir les traditions familiales',
        'Organiser le cocktail et le dîner'
      ],
      'north-america': [
        'Planifier la cérémonie personnalisée',
        'Réserver le lieu de réception',
        'Prévoir les traditions modernes',
        'Organiser les activités d\'engagement'
      ]
    }

    let tips = planningTips[region] || planningTips['north-america']

    // Ajouter des conseils spécifiques à la religion
    if (religion) {
      const religiousTips = {
        islam: [
          'Planifier le nikah avec un imam',
          'Prévoir la séparation des sexes',
          'Organiser le walima (festin)'
        ],
        christianity: [
          'Planifier la cérémonie religieuse',
          'Prévoir la bénédiction',
          'Organiser la communion'
        ],
        judaism: [
          'Planifier la cérémonie sous la huppah',
          'Prévoir la signature de la ketubah',
          'Organiser le bedeken'
        ]
      }

      tips = [...tips, ...(religiousTips[religion] || [])]
    }

    return tips
  }

  // Obtenir les adaptations pour les réseaux sociaux
  getSocialMediaAdaptations () {
    const region = this.regionalManager.currentRegion
    const religion = this.currentUserReligion

    const adaptations = {
      'middle-east': {
        hashtags: ['#mariagearabe', '#nikah', '#henna', '#zaffe'],
        content: 'Partager les moments de la cérémonie de henna et du zaffe',
        privacy: 'Respecter la pudeur dans les photos partagées'
      },
      asia: {
        hashtags: ['#mariageasiatique', '#ceremonieduthe', '#traditions'],
        content: 'Partager les cérémonies traditionnelles et familiales',
        privacy: 'Demander l\'autorisation pour les photos de famille'
      },
      europe: {
        hashtags: ['#mariageeuropeen', '#traditions', '#elegance'],
        content: 'Partager les moments élégants et traditionnels',
        privacy: 'Respecter l\'intimité des invités'
      },
      'north-america': {
        hashtags: ['#wedding', '#love', '#celebration'],
        content: 'Partager tous les moments de célébration',
        privacy: 'Utiliser les paramètres de confidentialité appropriés'
      }
    }

    return adaptations[region] || adaptations['north-america']
  }

  // Mettre à jour les préférences utilisateur
  updateUserPreferences (newPreferences) {
    this.userPreferences = { ...this.userPreferences, ...newPreferences }

    // Recalculer les suggestions personnalisées
    this.getPersonalizedSuggestions()
  }

  // Obtenir un rapport de régionalisation
  getRegionalizationReport () {
    return {
      region: this.regionalManager.currentRegion,
      religion: this.currentUserReligion,
      culturalContent: this.regionalManager.culturalContent,
      suggestions: this.getPersonalizedSuggestions(),
      vendorRecommendations: this.getRegionalVendorRecommendations(),
      planningTips: this.getRegionalPlanningTips(),
      socialMediaAdaptations: this.getSocialMediaAdaptations(),
      userPreferences: this.userPreferences
    }
  }

  initializeUserRegion (user) {
    // Détection automatique basée sur la langue et la localisation
    const detectedRegion = this.detectRegionFromLocale(user.locale || 'fr')
    const detectedReligion = this.detectReligionFromRegion(detectedRegion)

    return {
      region: detectedRegion,
      religion: detectedReligion,
      locale: user.locale || 'fr',
      timezone: user.timezone || this.getDefaultTimezone(detectedRegion),
      currency: this.getDefaultCurrency(detectedRegion),
      culturalPreferences: this.getCulturalPreferences(detectedRegion, detectedReligion)
    }
  }

  detectRegionFromLocale (locale) {
    const regionMap = {
      // Europe
      fr: 'europe',
      de: 'europe',
      it: 'europe',
      es: 'europe',
      pt: 'europe',
      nl: 'europe',
      sv: 'europe',
      no: 'europe',
      da: 'europe',
      fi: 'europe',
      pl: 'europe',
      cs: 'europe',
      hu: 'europe',
      ro: 'europe',
      bg: 'europe',
      hr: 'europe',
      sk: 'europe',
      sl: 'europe',
      et: 'europe',
      lv: 'europe',
      lt: 'europe',
      mt: 'europe',
      el: 'europe',
      cy: 'europe',

      // Amérique du Nord
      'en-US': 'north-america',
      'en-CA': 'north-america',
      'fr-CA': 'north-america',
      'es-MX': 'north-america',

      // Amérique du Sud
      'pt-BR': 'south-america',
      'es-AR': 'south-america',
      'es-CO': 'south-america',
      'es-PE': 'south-america',
      'es-VE': 'south-america',
      'es-CL': 'south-america',
      'es-EC': 'south-america',
      'es-BO': 'south-america',
      'es-PY': 'south-america',
      'es-UY': 'south-america',

      // Caraïbes
      ht: 'caribbean',
      gcf: 'caribbean',
      crs: 'caribbean',
      jam: 'caribbean',
      bjs: 'caribbean',

      // Océan Indien
      mfe: 'indian-ocean',
      rcf: 'indian-ocean',
      'crs-SC': 'indian-ocean',
      'mfe-MU': 'indian-ocean',
      'rcf-RE': 'indian-ocean',

      // Asie
      'zh-CN': 'asia',
      'zh-TW': 'asia',
      ja: 'asia',
      ko: 'asia',
      th: 'asia',
      vi: 'asia',
      id: 'asia',
      ms: 'asia',
      tl: 'asia',
      hi: 'asia',
      bn: 'asia',
      ur: 'asia',
      ta: 'asia',
      te: 'asia',
      kn: 'asia',
      ml: 'asia',
      gu: 'asia',
      pa: 'asia',
      ne: 'asia',
      si: 'asia',
      my: 'asia',
      km: 'asia',
      lo: 'asia',

      // Moyen-Orient
      ar: 'middle-east',
      he: 'middle-east',
      fa: 'middle-east',
      tr: 'middle-east',
      ku: 'middle-east',

      // Afrique
      am: 'africa',
      sw: 'africa',
      yo: 'africa',
      ig: 'africa',
      ha: 'africa',
      zu: 'africa',
      xh: 'africa',
      af: 'africa',
      st: 'africa',
      tn: 'africa',
      ts: 'africa',
      ss: 'africa',
      ve: 'africa',
      nr: 'africa',
      sn: 'africa',
      pcm: 'africa',
      sag: 'africa',

      // Océanie
      'en-AU': 'oceania',
      'en-NZ': 'oceania',
      mi: 'oceania',
      fj: 'oceania',
      to: 'oceania',
      sm: 'oceania',
      haw: 'oceania'
    }

    return regionMap[locale] || 'europe'
  }
}

module.exports = RegionalizationService
