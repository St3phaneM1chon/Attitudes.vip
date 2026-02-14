const config = require('../config.js')

class RegionalContentManager {
  constructor () {
    this.config = config
    this.currentRegion = null
    this.currentReligion = null
    this.culturalContent = {}
  }

  // Définir la région et religion actuelles
  setRegionAndReligion (country, religion = null) {
    this.currentRegion = this.getRegionFromCountry(country)
    this.currentReligion = religion
    this.loadCulturalContent()
  }

  // Obtenir la région à partir du pays
  getRegionFromCountry (country) {
    const regionMappings = {
      // Amérique du Nord
      CA: 'north-america',
      US: 'north-america',
      MX: 'north-america',

      // Europe
      FR: 'europe',
      DE: 'europe',
      IT: 'europe',
      ES: 'europe',
      PT: 'europe',
      NL: 'europe',
      BE: 'europe',
      CH: 'europe',
      AT: 'europe',
      SE: 'europe',
      NO: 'europe',
      DK: 'europe',
      FI: 'europe',
      PL: 'europe',
      CZ: 'europe',
      HU: 'europe',
      RO: 'europe',
      BG: 'europe',
      HR: 'europe',
      SK: 'europe',
      SI: 'europe',
      EE: 'europe',
      LV: 'europe',
      LT: 'europe',
      MT: 'europe',
      GR: 'europe',
      CY: 'europe',
      IE: 'europe',
      GB: 'europe',

      // Moyen-Orient
      AE: 'middle-east',
      SA: 'middle-east',
      QA: 'middle-east',
      KW: 'middle-east',
      OM: 'middle-east',
      BH: 'middle-east',
      JO: 'middle-east',
      LB: 'middle-east',
      SY: 'middle-east',
      IQ: 'middle-east',
      IR: 'middle-east',
      TR: 'middle-east',
      IL: 'middle-east',
      PS: 'middle-east',

      // Asie
      CN: 'asia',
      JP: 'asia',
      KR: 'asia',
      TH: 'asia',
      VN: 'asia',
      ID: 'asia',
      MY: 'asia',
      SG: 'asia',
      PH: 'asia',
      IN: 'asia',
      BD: 'asia',
      PK: 'asia',
      LK: 'asia',
      NP: 'asia',
      MM: 'asia',
      KH: 'asia',
      LA: 'asia',
      MN: 'asia',

      // Amérique du Sud
      BR: 'south-america',
      AR: 'south-america',
      CO: 'south-america',
      PE: 'south-america',
      VE: 'south-america',
      CL: 'south-america',
      EC: 'south-america',
      BO: 'south-america',
      PY: 'south-america',
      UY: 'south-america',
      GY: 'south-america',
      SR: 'south-america',
      GF: 'south-america',

      // Afrique
      ZA: 'africa',
      NG: 'africa',
      EG: 'africa',
      KE: 'africa',
      GH: 'africa',
      ET: 'africa',
      TZ: 'africa',
      UG: 'africa',
      DZ: 'africa',
      SD: 'africa',
      MA: 'africa',
      TN: 'africa',
      LY: 'africa',
      CI: 'africa',
      BF: 'africa',
      ML: 'africa',
      NE: 'africa',
      TD: 'africa',
      CM: 'africa',
      CF: 'africa',
      CG: 'africa',
      CD: 'africa',
      AO: 'africa',
      ZM: 'africa',
      ZW: 'africa',
      BW: 'africa',
      NA: 'africa',
      SZ: 'africa',
      LS: 'africa',
      MG: 'africa',
      MU: 'africa',
      SC: 'africa',
      KM: 'africa',
      DJ: 'africa',
      SO: 'africa',
      ER: 'africa',
      RW: 'africa',
      BI: 'africa',
      MW: 'africa',
      MZ: 'africa',

      // Océanie
      AU: 'oceania',
      NZ: 'oceania',
      FJ: 'oceania',
      PG: 'oceania',
      NC: 'oceania',
      VU: 'oceania',
      SB: 'oceania',
      TO: 'oceania',
      WS: 'oceania',
      KI: 'oceania',
      TV: 'oceania',
      NR: 'oceania',
      PW: 'oceania',
      MH: 'oceania',
      FM: 'oceania',
      CK: 'oceania',
      NU: 'oceania',
      TK: 'oceania'
    }

    return regionMappings[country] || 'north-america'
  }

  // Charger le contenu culturel
  async loadCulturalContent () {
    if (!this.currentRegion) return

    const regionConfig = this.config.regionalization[this.currentRegion]
    if (!regionConfig) return

    this.culturalContent = {
      ...regionConfig.culturalAdaptations,
      region: this.currentRegion,
      contentPath: regionConfig.contentPath,
      languages: regionConfig.languages,
      religions: regionConfig.religions,
      countries: regionConfig.countries
    }

    // Adapter selon la religion
    if (this.currentReligion) {
      this.culturalContent = {
        ...this.culturalContent,
        ...this.getReligiousAdaptations(this.currentReligion)
      }
    }
  }

  // Obtenir les adaptations religieuses
  getReligiousAdaptations (religion) {
    const religiousAdaptations = {
      islam: {
        colors: ['green', 'gold', 'white', 'emerald'],
        imagery: 'traditional',
        ceremonies: ['nikah', 'katb_kitab', 'walima'],
        customs: ['henna', 'zaffe', 'dabke', 'mehndi'],
        traditions: ['mahr', 'witnesses', 'quran_recitation'],
        music: ['nasheed', 'traditional_arabic'],
        attire: ['abaya', 'thobe', 'hijab'],
        food: ['halal', 'traditional_middle_eastern'],
        decorations: ['arabic_calligraphy', 'geometric_patterns']
      },
      christianity: {
        colors: ['white', 'ivory', 'pastel', 'gold'],
        imagery: 'classic',
        ceremonies: ['civil', 'religious', 'blessing'],
        customs: ['white_dress', 'veil', 'rings_exchange', 'unity_candle'],
        traditions: ['vows', 'blessing', 'communion'],
        music: ['hymns', 'classical', 'gospel'],
        attire: ['white_dress', 'suit', 'veil'],
        food: ['traditional_western', 'cake'],
        decorations: ['flowers', 'candles', 'cross']
      },
      judaism: {
        colors: ['blue', 'white', 'gold', 'silver'],
        imagery: 'traditional',
        ceremonies: ['huppah', 'ketubah', 'bedeken'],
        customs: ['breaking_glass', 'seven_blessings', 'yichud'],
        traditions: ['chuppah', 'ketubah_signing', 'tisch'],
        music: ['klezmer', 'traditional_jewish'],
        attire: ['kippah', 'tallit', 'modest_dress'],
        food: ['kosher', 'traditional_jewish'],
        decorations: ['star_of_david', 'menorah', 'hebrew_text']
      },
      hinduism: {
        colors: ['red', 'gold', 'orange', 'green'],
        imagery: 'vibrant',
        ceremonies: ['saptapadi', 'puja', 'kanyadaan'],
        customs: ['red_dress', 'gold_jewelry', 'fire_ceremony', 'mangalsutra'],
        traditions: ['seven_steps', 'blessing', 'tilak'],
        music: ['classical_indian', 'bhajans', 'sitar'],
        attire: ['sari', 'lehenga', 'sherwani', 'dhoti'],
        food: ['vegetarian', 'traditional_indian', 'sweets'],
        decorations: ['rangoli', 'flowers', 'diya', 'mandap']
      },
      buddhism: {
        colors: ['gold', 'red', 'white', 'orange'],
        imagery: 'peaceful',
        ceremonies: ['blessing', 'meditation', 'chanting'],
        customs: ['blessing_ceremony', 'incense', 'prayer_flags'],
        traditions: ['monk_blessing', 'meditation', 'compassion'],
        music: ['chanting', 'meditation_music', 'traditional_asian'],
        attire: ['modest', 'traditional_asian', 'white'],
        food: ['vegetarian', 'simple', 'traditional_asian'],
        decorations: ['buddha_statues', 'incense', 'flowers', 'lanterns']
      },
      sikhism: {
        colors: ['orange', 'blue', 'white', 'gold'],
        imagery: 'traditional',
        ceremonies: ['anand_karaj', 'ardas', 'langar'],
        customs: ['turban', 'kara', 'kirpan', 'kachera'],
        traditions: ['four_rounds', 'guru_granth_sahib', 'community_meal'],
        music: ['kirtan', 'gurbani', 'traditional_punjabi'],
        attire: ['turban', 'salwar_kameez', 'kara'],
        food: ['vegetarian', 'langar', 'traditional_punjabi'],
        decorations: ['khanda', 'flowers', 'guru_granth_sahib']
      }
    }

    return religiousAdaptations[religion] || {}
  }

  // Obtenir la palette de couleurs adaptée
  getColorPalette () {
    if (!this.culturalContent) return this.config.colors?.default || ['#000000', '#ffffff']

    const colors = this.culturalContent.colors || ['varied']

    // Mapper les noms de couleurs vers des codes hex
    const colorMap = {
      green: '#22c55e',
      gold: '#fbbf24',
      white: '#ffffff',
      emerald: '#10b981',
      red: '#ef4444',
      orange: '#f97316',
      blue: '#3b82f6',
      silver: '#9ca3af',
      ivory: '#fafaf9',
      pastel: ['#fef3c7', '#dbeafe', '#fce7f3', '#dcfce7'],
      warm: ['#fbbf24', '#f97316', '#ef4444', '#dc2626'],
      vibrant: ['#ef4444', '#fbbf24', '#10b981', '#3b82f6'],
      earthy: ['#a16207', '#92400e', '#78350f', '#451a03'],
      natural: ['#22c55e', '#10b981', '#059669', '#047857']
    }

    if (Array.isArray(colors)) {
      return colors.map(color => colorMap[color] || color)
    }

    return colorMap[colors] || ['#000000', '#ffffff']
  }

  // Obtenir les cérémonies adaptées
  getCeremonies () {
    if (!this.culturalContent) return []

    return this.culturalContent.ceremonies || []
  }

  // Obtenir les coutumes adaptées
  getCustoms () {
    if (!this.culturalContent) return []

    return this.culturalContent.customs || []
  }

  // Obtenir les traditions adaptées
  getTraditions () {
    if (!this.culturalContent) return []

    return this.culturalContent.traditions || []
  }

  // Obtenir la musique adaptée
  getMusic () {
    if (!this.culturalContent) return []

    return this.culturalContent.music || []
  }

  // Obtenir les vêtements adaptés
  getAttire () {
    if (!this.culturalContent) return []

    return this.culturalContent.attire || []
  }

  // Obtenir la nourriture adaptée
  getFood () {
    if (!this.culturalContent) return []

    return this.culturalContent.food || []
  }

  // Obtenir les décorations adaptées
  getDecorations () {
    if (!this.culturalContent) return []

    return this.culturalContent.decorations || []
  }

  // Appliquer les adaptations culturelles à l'interface
  applyCulturalAdaptations () {
    if (!this.culturalContent) return

    // Appliquer la palette de couleurs
    const colors = this.getColorPalette()
    this.applyColorPalette(colors)

    // Appliquer l'imagerie
    this.applyImagery(this.culturalContent.imagery)

    // Appliquer les styles RTL si nécessaire
    if (this.culturalContent.rtl) {
      document.documentElement.dir = 'rtl'
      document.body.classList.add('rtl')
    }

    // Appliquer les classes CSS régionales
    document.body.classList.add(`region-${this.currentRegion}`)
    if (this.currentReligion) {
      document.body.classList.add(`religion-${this.currentReligion}`)
    }
  }

  // Appliquer la palette de couleurs
  applyColorPalette (colors) {
    const root = document.documentElement

    colors.forEach((color, index) => {
      root.style.setProperty(`--color-primary-${index + 1}`, color)
    })

    // Définir la couleur primaire
    if (colors.length > 0) {
      root.style.setProperty('--color-primary', colors[0])
    }
  }

  // Appliquer l'imagerie
  applyImagery (imagery) {
    const body = document.body

    // Supprimer les classes d'imagerie existantes
    body.classList.remove('imagery-traditional', 'imagery-modern', 'imagery-classic',
      'imagery-contemporary', 'imagery-vibrant', 'imagery-peaceful')

    // Ajouter la nouvelle classe d'imagerie
    if (imagery) {
      body.classList.add(`imagery-${imagery}`)
    }
  }

  // Obtenir le contenu régional pour un module spécifique
  getRegionalContentForModule (moduleName) {
    if (!this.culturalContent) return {}

    const moduleContent = {
      wedding_ceremony: {
        ceremonies: this.getCeremonies(),
        traditions: this.getTraditions(),
        customs: this.getCustoms()
      },
      music: {
        styles: this.getMusic(),
        instruments: this.getRegionalInstruments()
      },
      food: {
        cuisine: this.getFood(),
        dietary_restrictions: this.getDietaryRestrictions()
      },
      decorations: {
        elements: this.getDecorations(),
        colors: this.getColorPalette()
      },
      attire: {
        styles: this.getAttire(),
        accessories: this.getRegionalAccessories()
      }
    }

    return moduleContent[moduleName] || {}
  }

  // Obtenir les instruments régionaux
  getRegionalInstruments () {
    const instruments = {
      'middle-east': ['oud', 'qanun', 'nay', 'darbuka', 'tabla'],
      asia: ['sitar', 'tabla', 'erhu', 'koto', 'guzheng'],
      europe: ['piano', 'violin', 'guitar', 'accordion', 'harp'],
      'north-america': ['guitar', 'piano', 'drums', 'saxophone', 'trumpet'],
      'south-america': ['guitar', 'percussion', 'accordion', 'charango', 'quena'],
      africa: ['djembe', 'kora', 'mbira', 'balafon', 'talking_drum'],
      oceania: ['ukulele', 'guitar', 'percussion', 'traditional_instruments']
    }

    return instruments[this.currentRegion] || []
  }

  // Obtenir les restrictions alimentaires
  getDietaryRestrictions () {
    const restrictions = {
      islam: ['halal', 'no_pork', 'no_alcohol'],
      judaism: ['kosher', 'no_pork', 'no_shellfish'],
      hinduism: ['vegetarian', 'no_beef'],
      buddhism: ['vegetarian', 'simple_food'],
      sikhism: ['vegetarian', 'no_alcohol']
    }

    return restrictions[this.currentReligion] || []
  }

  // Obtenir les accessoires régionaux
  getRegionalAccessories () {
    const accessories = {
      'middle-east': ['henna', 'jewelry', 'veil', 'traditional_headwear'],
      asia: ['jewelry', 'traditional_headwear', 'sari_pins', 'bindi'],
      europe: ['veil', 'jewelry', 'gloves', 'traditional_accessories'],
      'north-america': ['jewelry', 'veil', 'garter', 'traditional_accessories'],
      'south-america': ['jewelry', 'traditional_accessories', 'flowers'],
      africa: ['jewelry', 'traditional_headwear', 'beads', 'fabrics'],
      oceania: ['jewelry', 'flowers', 'traditional_accessories']
    }

    return accessories[this.currentRegion] || []
  }

  // Obtenir les suggestions de contenu régional
  getRegionalSuggestions () {
    if (!this.culturalContent) return []

    const suggestions = {
      'middle-east': [
        'Inclure une cérémonie de henna',
        'Ajouter de la musique traditionnelle arabe',
        'Utiliser des motifs géométriques dans les décorations',
        'Proposer des options de cuisine halal'
      ],
      asia: [
        'Inclure une cérémonie du thé',
        'Ajouter de la musique traditionnelle asiatique',
        'Utiliser des couleurs vives et des motifs traditionnels',
        'Proposer des options végétariennes'
      ],
      europe: [
        'Inclure une cérémonie civile ou religieuse classique',
        'Ajouter de la musique classique européenne',
        'Utiliser des décorations élégantes et sobres',
        'Proposer des options de cuisine européenne traditionnelle'
      ],
      'north-america': [
        'Inclure des traditions américaines modernes',
        'Ajouter de la musique contemporaine',
        'Utiliser des décorations personnalisées',
        'Proposer des options de cuisine variées'
      ],
      'south-america': [
        'Inclure des traditions latino-américaines',
        'Ajouter de la musique latine',
        'Utiliser des couleurs vives et des décorations festives',
        'Proposer des options de cuisine latino-américaine'
      ],
      africa: [
        'Inclure des traditions africaines',
        'Ajouter de la musique africaine traditionnelle',
        'Utiliser des motifs tribaux et des couleurs terreuses',
        'Proposer des options de cuisine africaine'
      ],
      oceania: [
        'Inclure des traditions océaniennes',
        'Ajouter de la musique insulaire',
        'Utiliser des décorations naturelles et des couleurs tropicales',
        'Proposer des options de cuisine océanienne'
      ]
    }

    return suggestions[this.currentRegion] || []
  }

  getRegionalContent (region, religion = null) {
    const content = {
      'middle-east': {
        colorPalette: {
          primary: '#8B4513',
          secondary: '#DAA520',
          accent: '#CD853F',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Nikah', 'Katb Kitab', 'Huppah', 'Henna Ceremony'],
        customs: ['Henna', 'Zaffe', 'Dabke Dance', 'Traditional Attire'],
        music: ['Arabic Music', 'Oud', 'Qanun', 'Traditional Songs'],
        attire: ['Abaya', 'Thobe', 'Traditional Dress', 'Head Coverings'],
        food: ['Mezze', 'Kebab', 'Baklava', 'Arabic Coffee'],
        decorations: ['Lanterns', 'Carpets', 'Traditional Patterns', 'Flowers']
      },
      caribbean: {
        colorPalette: {
          primary: '#FF6B35',
          secondary: '#F7931E',
          accent: '#FFD700',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Traditional Ceremony', 'Church Ceremony', 'Vodou Ceremony', 'Rasta Ceremony'],
        customs: ['Rum Ceremony', 'Steel Drum', 'Reggae Music', 'Colorful Attire'],
        music: ['Reggae', 'Calypso', 'Steel Drum', 'Kompa', 'Zouk'],
        attire: ['Colorful Dresses', 'Traditional Attire', 'Island Style'],
        food: ['Jerk Chicken', 'Rice and Peas', 'Tropical Fruits', 'Rum Punch'],
        decorations: ['Tropical Flowers', 'Palm Leaves', 'Bright Colors', 'Island Theme']
      },
      'indian-ocean': {
        colorPalette: {
          primary: '#1E90FF',
          secondary: '#87CEEB',
          accent: '#FFD700',
          background: '#F0F8FF',
          text: '#2F2F2F'
        },
        ceremonies: ['Traditional Ceremony', 'Hindu Ceremony', 'Church Ceremony', 'Ocean Ceremony'],
        customs: ['Sega Dance', 'Ocean Ceremony', 'Tropical Flowers', 'Island Traditions'],
        music: ['Sega', 'Bhojpuri', 'Traditional Island Music', 'Maloya'],
        attire: ['Traditional Dress', 'Island Style', 'Colorful Attire'],
        food: ['Curry', 'Tropical Fruits', 'Seafood', 'Traditional Dishes'],
        decorations: ['Tropical Flowers', 'Ocean Theme', 'Island Decorations']
      },
      africa: {
        colorPalette: {
          primary: '#8B4513',
          secondary: '#DAA520',
          accent: '#CD853F',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Traditional Ceremony', 'Church Ceremony', 'Modern Ceremony'],
        customs: ['Dowry', 'Blessing Ceremony', 'Dance Rituals', 'Community Celebration'],
        music: ['African Drums', 'Traditional Songs', 'Modern African Music'],
        attire: ['Traditional Dress', 'Colorful Attire', 'Modern African Style'],
        food: ['Traditional Dishes', 'African Cuisine', 'Local Specialties'],
        decorations: ['Traditional Patterns', 'African Art', 'Natural Materials']
      },
      asia: {
        colorPalette: {
          primary: '#DC143C',
          secondary: '#FFD700',
          accent: '#FF69B4',
          background: '#FFF0F5',
          text: '#2F2F2F'
        },
        ceremonies: ['Tea Ceremony', 'Saptapadi', 'Nikah', 'Puja'],
        customs: ['Red Dress', 'Gold Jewelry', 'Fire Ceremony', 'Traditional Rituals'],
        music: ['Traditional Asian Music', 'Sitar', 'Tabla', 'Modern Asian Music'],
        attire: ['Traditional Dress', 'Red Attire', 'Gold Jewelry', 'Modern Asian Style'],
        food: ['Traditional Asian Cuisine', 'Rice Dishes', 'Spicy Food', 'Tea Ceremony'],
        decorations: ['Red Lanterns', 'Traditional Patterns', 'Flowers', 'Gold Decorations']
      },
      europe: {
        colorPalette: {
          primary: '#4169E1',
          secondary: '#9370DB',
          accent: '#FFD700',
          background: '#F8F8FF',
          text: '#2F2F2F'
        },
        ceremonies: ['Civil Ceremony', 'Religious Ceremony', 'Traditional Ceremony'],
        customs: ['White Dress', 'Veil', 'Rings Exchange', 'First Dance'],
        music: ['Classical Music', 'Traditional Songs', 'Modern Music'],
        attire: ['White Dress', 'Traditional Attire', 'Modern European Style'],
        food: ['European Cuisine', 'Wine', 'Traditional Dishes', 'Cake Cutting'],
        decorations: ['Elegant Flowers', 'Classic Decorations', 'Candles', 'Elegant Theme']
      },
      'north-america': {
        colorPalette: {
          primary: '#FF69B4',
          secondary: '#9370DB',
          accent: '#FFD700',
          background: '#FFF0F5',
          text: '#2F2F2F'
        },
        ceremonies: ['Civil Ceremony', 'Religious Ceremony', 'Cultural Ceremony'],
        customs: ['First Dance', 'Cake Cutting', 'Bouquet Toss', 'Garter Toss'],
        music: ['Modern Music', 'Classical Music', 'Cultural Music'],
        attire: ['White Dress', 'Modern Attire', 'Cultural Dress'],
        food: ['American Cuisine', 'International Food', 'Wedding Cake'],
        decorations: ['Modern Decorations', 'Flowers', 'Personalized Theme']
      },
      'south-america': {
        colorPalette: {
          primary: '#FF4500',
          secondary: '#FFD700',
          accent: '#FF69B4',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Civil Ceremony', 'Religious Ceremony', 'African Ceremony'],
        customs: ['Samba', 'Tango', 'Colorful Attire', 'Community Celebration'],
        music: ['Samba', 'Tango', 'Latin Music', 'Traditional Songs'],
        attire: ['Colorful Dress', 'Traditional Attire', 'Modern Latin Style'],
        food: ['Latin Cuisine', 'Traditional Dishes', 'Spicy Food', 'Tropical Fruits'],
        decorations: ['Bright Colors', 'Tropical Flowers', 'Latin Theme', 'Passionate Decorations']
      },
      oceania: {
        colorPalette: {
          primary: '#32CD32',
          secondary: '#87CEEB',
          accent: '#FFD700',
          background: '#F0FFF0',
          text: '#2F2F2F'
        },
        ceremonies: ['Traditional Ceremony', 'Modern Ceremony', 'Island Style'],
        customs: ['Lei Exchange', 'Haka', 'Island Dance', 'Ocean Ceremony'],
        music: ['Traditional Island Music', 'Modern Music', 'Ocean Sounds'],
        attire: ['Island Dress', 'Traditional Attire', 'Modern Island Style'],
        food: ['Island Cuisine', 'Seafood', 'Tropical Fruits', 'Traditional Dishes'],
        decorations: ['Tropical Flowers', 'Ocean Theme', 'Island Decorations', 'Natural Materials']
      }
    }

    // Contenu spécifique aux créoles
    const creoleContent = {
      ht: { // Créole haïtien
        colorPalette: {
          primary: '#FF6B35',
          secondary: '#F7931E',
          accent: '#FFD700',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Seremoni Vodou', 'Seremoni Tradisyonèl Ayisyen', 'Seremoni Legliz'],
        customs: ['Seremoni Womn', 'Dans Konpa', 'Rara', 'Ritiyèl Vodou'],
        music: ['Kompa', 'Rara', 'Mizik Vodou', 'Tradisyonèl Ayisyen'],
        attire: ['Rad Tradisyonèl', 'Koulè Vif', 'Stil Zile'],
        food: ['Manje Ayisyen', 'Womn', 'Fwi Twopikal', 'Kafe Ayisyen'],
        decorations: ['Fle Twopikal', 'Koulè Vif', 'Tema Zile', 'Tradisyon Vodou']
      },
      gcf: { // Créole guadeloupéen
        colorPalette: {
          primary: '#FF6B35',
          secondary: '#F7931E',
          accent: '#FFD700',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Seremoni Tradisyonèl Kréyòl', 'Seremoni Legliz', 'Seremoni Modèn'],
        customs: ['Seremoni Womn', 'Dans Gwo Ka', 'Zouk', 'Bigwin'],
        music: ['Gwo Ka', 'Zouk', 'Bigwin', 'Mizik Tradisyonèl'],
        attire: ['Rad Tradisyonèl', 'Koulè Vif', 'Stil Gwadloup'],
        food: ['Manje Gwadloupéyen', 'Womn', 'Fwi Twopikal', 'Kafe Kréyòl'],
        decorations: ['Fle Twopikal', 'Koulè Vif', 'Tema Zile', 'Tradisyon Gwo Ka']
      },
      mfe: { // Créole mauricien
        colorPalette: {
          primary: '#1E90FF',
          secondary: '#87CEEB',
          accent: '#FFD700',
          background: '#F0F8FF',
          text: '#2F2F2F'
        },
        ceremonies: ['Seremoni Tradisyonèl Morisien', 'Seremoni Endou', 'Seremoni Legliz'],
        customs: ['Seremoni Osean', 'Dans Sega', 'Fle Zile', 'Mizik Bhojpuri'],
        music: ['Sega', 'Bhojpuri', 'Mizik Tradisyonèl Morisien', 'Maloya'],
        attire: ['Rad Tradisyonèl', 'Stil Zile', 'Koulè Vif'],
        food: ['Manje Morisien', 'Kari', 'Fwi Twopikal', 'Te Endou'],
        decorations: ['Fle Zile', 'Tema Osean', 'Dekorasyon Zile', 'Tradisyon Sega']
      },
      jam: { // Créole jamaïcain
        colorPalette: {
          primary: '#FF6B35',
          secondary: '#F7931E',
          accent: '#FFD700',
          background: '#FFF8DC',
          text: '#2F2F2F'
        },
        ceremonies: ['Seremoni Rasta', 'Seremoni Tradisyonèl Jamayiken', 'Seremoni Legliz'],
        customs: ['Seremoni Ganja', 'Tradisyon Rasta', 'Selebrasyon Zile'],
        music: ['Reggae', 'Dancehall', 'Mento', 'Mizik Tradisyonèl'],
        attire: ['Rad Tradisyonèl', 'Koulè Rasta', 'Stil Zile'],
        food: ['Manje Jamayiken', 'Jerk Chicken', 'Fwi Twopikal', 'Te Jamayiken'],
        decorations: ['Koulè Rasta', 'Fle Twopikal', 'Tema Zile', 'Tradisyon Reggae']
      }
    }

    // Retourner le contenu régional ou créole spécifique
    if (creoleContent[region]) {
      return creoleContent[region]
    }

    return content[region] || content.europe
  }
}

module.exports = RegionalContentManager
