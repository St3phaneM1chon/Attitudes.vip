const config = require('./config.js')

class I18nLoader {
  constructor () {
    this.currentLocale = 'fr'
    this.translations = {}
    this.fallbackLocale = 'fr'
    this.config = config
    this.regionalContent = {}
  }

  async loadLocale (locale) {
    if (this.translations[locale]) {
      return this.translations[locale]
    }

    try {
      const response = await fetch(`/src/i18n/locales/${locale}.json`)
      if (!response.ok) {
        throw new Error(`Failed to load locale ${locale}`)
      }

      const translations = await response.json()
      this.translations[locale] = translations
      return translations
    } catch (error) {
      console.warn(`Failed to load locale ${locale}, falling back to ${this.fallbackLocale}`)
      return this.loadLocale(this.fallbackLocale)
    }
  }

  async setLocale (locale) {
    await this.loadLocale(locale)
    this.currentLocale = locale
    this.updatePageContent()
    this.applyRTL()
    this.updateDateTimeFormats()
  }

  t (key, params = {}) {
    const translations = this.translations[this.currentLocale] || {}
    const keys = key.split('.')
    let value = translations

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    if (value === undefined) {
      console.warn(`Translation missing for key: ${key}`)
      return key
    }

    // Remplacer les paramètres {param}
    return value.replace(/\{(\w+)\}/g, (match, param) => params[param] || match)
  }

  // Support RTL (Right-to-Left)
  applyRTL () {
    const isRTL = this.config.rtlLanguages.includes(this.currentLocale)
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = this.currentLocale

    // Appliquer les classes CSS RTL
    document.body.classList.toggle('rtl', isRTL)
    document.body.classList.toggle('ltr', !isRTL)
  }

  // Formats de date et heure
  formatDate (date, format = null) {
    const dateObj = new Date(date)
    const dateFormat = format || this.config.dateFormats[this.currentLocale]?.format || 'DD/MM/YYYY'

    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    if (this.config.dateFormats[this.currentLocale]?.locale) {
      return dateObj.toLocaleDateString(this.config.dateFormats[this.currentLocale].locale, options)
    }

    // Fallback simple
    return dateObj.toLocaleDateString(this.currentLocale)
  }

  formatTime (date, includeSeconds = false) {
    const dateObj = new Date(date)
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds && { second: '2-digit' })
    }

    return dateObj.toLocaleTimeString(this.currentLocale, options)
  }

  formatDateTime (date) {
    return `${this.formatDate(date)} ${this.formatTime(date)}`
  }

  // Formats de nombres
  formatNumber (number, options = {}) {
    const numberFormat = this.config.numberFormats[this.currentLocale]
    if (numberFormat) {
      return new Intl.NumberFormat(numberFormat.locale, options).format(number)
    }
    return number.toLocaleString(this.currentLocale, options)
  }

  formatCurrency (amount, currency = 'EUR') {
    const currencyConfig = this.config.currencies[currency]
    if (!currencyConfig) return this.formatNumber(amount)

    const formattedNumber = this.formatNumber(amount, {
      style: 'currency',
      currency
    })

    return formattedNumber
  }

  // Mise à jour des formats de date/heure dans l'interface
  updateDateTimeFormats () {
    // Mettre à jour tous les éléments avec data-date
    document.querySelectorAll('[data-date]').forEach(element => {
      const dateValue = element.getAttribute('data-date')
      const format = element.getAttribute('data-date-format')
      element.textContent = this.formatDate(dateValue, format)
    })

    // Mettre à jour tous les éléments avec data-time
    document.querySelectorAll('[data-time]').forEach(element => {
      const timeValue = element.getAttribute('data-time')
      const includeSeconds = element.getAttribute('data-time-seconds') === 'true'
      element.textContent = this.formatTime(timeValue, includeSeconds)
    })

    // Mettre à jour tous les éléments avec data-number
    document.querySelectorAll('[data-number]').forEach(element => {
      const numberValue = parseFloat(element.getAttribute('data-number'))
      const options = element.getAttribute('data-number-options')
        ? JSON.parse(element.getAttribute('data-number-options'))
        : {}
      element.textContent = this.formatNumber(numberValue, options)
    })

    // Mettre à jour tous les éléments avec data-currency
    document.querySelectorAll('[data-currency]').forEach(element => {
      const amount = parseFloat(element.getAttribute('data-currency'))
      const currency = element.getAttribute('data-currency-code') || 'EUR'
      element.textContent = this.formatCurrency(amount, currency)
    })
  }

  updatePageContent () {
    // Mettre à jour tous les éléments avec data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n')
      const params = element.dataset.i18nParams ? JSON.parse(element.dataset.i18nParams) : {}
      element.textContent = this.t(key, params)
    })

    // Mettre à jour les placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder')
      element.placeholder = this.t(key)
    })

    // Mettre à jour les titres
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title')
      element.title = this.t(key)
    })

    // Mettre à jour les attributs alt
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
      const key = element.getAttribute('data-i18n-alt')
      element.alt = this.t(key)
    })
  }

  // Détection automatique de la langue
  detectLocale () {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLocale = urlParams.get('lang')

    if (urlLocale && this.config.supportedLocales.includes(urlLocale)) {
      return urlLocale
    }

    const browserLocale = navigator.language.split('-')[0]
    const supportedLocales = this.config.supportedLocales

    // Vérifier si la langue du navigateur est supportée
    if (supportedLocales.includes(browserLocale)) {
      return browserLocale
    }

    // Vérifier les variantes régionales
    const fullBrowserLocale = navigator.language
    if (supportedLocales.includes(fullBrowserLocale)) {
      return fullBrowserLocale
    }

    return this.config.defaultLocale
  }

  // Régionalisation du contenu
  async getRegionalContent (country, religion) {
    const regionMappings = {
      CA: 'north-america',
      US: 'north-america',
      MX: 'north-america',
      FR: 'europe',
      DE: 'europe',
      IT: 'europe',
      ES: 'europe',
      GB: 'europe',
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

    const region = regionMappings[country] || 'north-america'
    const regionConfig = this.config.regionalization[region]

    if (!regionConfig) {
      return {
        region: 'north-america',
        contentPath: '/assets/regional/north-america/',
        culturalAdaptations: this.getCulturalAdaptations('north-america', religion)
      }
    }

    return {
      region,
      contentPath: regionConfig.contentPath,
      culturalAdaptations: this.getCulturalAdaptations(region, religion),
      languages: regionConfig.languages,
      religions: regionConfig.religions,
      countries: regionConfig.countries
    }
  }

  getCulturalAdaptations (region, religion) {
    const adaptations = this.config.regionalization[region]?.culturalAdaptations || {
      colors: ['varied'],
      imagery: 'contemporary',
      traditions: 'casual-formal'
    }

    // Adapter selon la religion si spécifiée
    if (religion) {
      const religiousAdaptations = {
        islam: {
          colors: ['green', 'gold', 'white'],
          imagery: 'traditional',
          ceremonies: ['nikah', 'katb_kitab']
        },
        christianity: {
          colors: ['white', 'ivory', 'pastel'],
          imagery: 'classic',
          ceremonies: ['civil', 'religious']
        },
        judaism: {
          colors: ['blue', 'white', 'gold'],
          imagery: 'traditional',
          ceremonies: ['huppah', 'ketubah']
        },
        hinduism: {
          colors: ['red', 'gold', 'orange'],
          imagery: 'vibrant',
          ceremonies: ['saptapadi', 'puja']
        },
        buddhism: {
          colors: ['gold', 'red', 'white'],
          imagery: 'peaceful',
          ceremonies: ['blessing', 'meditation']
        }
      }

      const religiousConfig = religiousAdaptations[religion]
      if (religiousConfig) {
        return { ...adaptations, ...religiousConfig }
      }
    }

    return adaptations
  }

  // Gestion des fuseaux horaires
  getTimezoneForRegion (region) {
    return this.config.timezones[region] || ['UTC']
  }

  // Conversion de date selon le fuseau horaire
  convertToLocalTime (date, timezone) {
    const dateObj = new Date(date)
    return dateObj.toLocaleString(this.currentLocale, {
      timeZone: timezone
    })
  }

  // Sélecteur de langue
  createLanguageSelector () {
    const selector = document.createElement('div')
    selector.className = 'language-selector'
    selector.innerHTML = `
      <select id="language-select" class="form-select">
        ${this.config.supportedLocales.map(locale => {
          const flag = this.getFlagForLocale(locale)
          const name = this.getLanguageName(locale)
          const selected = locale === this.currentLocale ? 'selected' : ''
          return `<option value="${locale}" ${selected}>${flag} ${name}</option>`
        }).join('')}
      </select>
    `

    selector.querySelector('#language-select').addEventListener('change', (e) => {
      this.setLocale(e.target.value)
    })

    return selector
  }

  getFlagForLocale (locale) {
    const flagMap = {
      fr: '🇫🇷',
      en: '🇺🇸',
      'en-US': '🇺🇸',
      'en-GB': '🇬🇧',
      'en-CA': '🇨🇦',
      'en-AU': '🇦🇺',
      'en-NZ': '🇳🇿',
      es: '🇪🇸',
      'es-MX': '🇲🇽',
      'es-AR': '🇦🇷',
      'es-BR': '🇧🇷',
      'es-CO': '🇨🇴',
      'es-PE': '🇵🇪',
      'es-VE': '🇻🇪',
      'es-CL': '🇨🇱',
      'es-EC': '🇪🇨',
      'es-BO': '🇧🇴',
      'es-PY': '🇵🇾',
      'es-UY': '🇺🇾',
      de: '🇩🇪',
      it: '🇮🇹',
      pt: '🇵🇹',
      'pt-BR': '🇧🇷',
      'fr-CA': '🇨🇦',
      nl: '🇳🇱',
      sv: '🇸🇪',
      no: '🇳🇴',
      da: '🇩🇰',
      fi: '🇫🇮',
      pl: '🇵🇱',
      cs: '🇨🇿',
      hu: '🇭🇺',
      ro: '🇷🇴',
      bg: '🇧🇬',
      hr: '🇭🇷',
      sk: '🇸🇰',
      sl: '🇸🇮',
      et: '🇪🇪',
      lv: '🇱🇻',
      lt: '🇱🇹',
      mt: '🇲🇹',
      el: '🇬🇷',
      cy: '🇨🇾',
      ar: '🇸🇦',
      he: '🇮🇱',
      fa: '🇮🇷',
      tr: '🇹🇷',
      ku: '🇹🇷',
      'zh-CN': '🇨🇳',
      'zh-TW': '🇹🇼',
      ja: '🇯🇵',
      ko: '🇰🇷',
      th: '🇹🇭',
      vi: '🇻🇳',
      id: '🇮🇩',
      ms: '🇲🇾',
      tl: '🇵🇭',
      hi: '🇮🇳',
      bn: '🇧🇩',
      ur: '🇵🇰',
      ta: '🇮🇳',
      te: '🇮🇳',
      kn: '🇮🇳',
      ml: '🇮🇳',
      gu: '🇮🇳',
      pa: '🇮🇳',
      ne: '🇳🇵',
      si: '🇱🇰',
      my: '🇲🇲',
      km: '🇰🇭',
      lo: '🇱🇦',
      am: '🇪🇹',
      sw: '🇹🇿',
      yo: '🇳🇬',
      ig: '🇳🇬',
      ha: '🇳🇬',
      zu: '🇿🇦',
      xh: '🇿🇦',
      af: '🇿🇦',
      st: '🇿🇦',
      tn: '🇿🇦',
      ts: '🇿🇦',
      ss: '🇿🇦',
      ve: '🇿🇦',
      nr: '🇿🇦',
      sn: '🇿🇼',
      mi: '🇳🇿',
      fj: '🇫🇯',
      to: '🇹🇴',
      sm: '🇼🇸',
      haw: '🇺🇸',
      // Créoles
      ht: '🇭🇹',
      gcf: '🇬🇵',
      crs: '🇸🇨',
      jam: '🇯🇲',
      pcm: '🇳🇬',
      bjs: '🇧🇧',
      mfe: '🇲🇺',
      rcf: '🇷🇪',
      sag: '🇨🇫'
    }

    return flagMap[locale] || '🌐'
  }

  getLanguageName (locale) {
    const languageNames = {
      fr: 'Français',
      en: 'English',
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'en-CA': 'English (Canada)',
      'en-AU': 'English (Australia)',
      'en-NZ': 'English (New Zealand)',
      es: 'Español',
      'es-MX': 'Español (México)',
      'es-AR': 'Español (Argentina)',
      'es-BR': 'Español (Brasil)',
      'es-CO': 'Español (Colombia)',
      'es-PE': 'Español (Perú)',
      'es-VE': 'Español (Venezuela)',
      'es-CL': 'Español (Chile)',
      'es-EC': 'Español (Ecuador)',
      'es-BO': 'Español (Bolivia)',
      'es-PY': 'Español (Paraguay)',
      'es-UY': 'Español (Uruguay)',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Português',
      'pt-BR': 'Português (Brasil)',
      'fr-CA': 'Français (Canada)',
      nl: 'Nederlands',
      sv: 'Svenska',
      no: 'Norsk',
      da: 'Dansk',
      fi: 'Suomi',
      pl: 'Polski',
      cs: 'Čeština',
      hu: 'Magyar',
      ro: 'Română',
      bg: 'Български',
      hr: 'Hrvatski',
      sk: 'Slovenčina',
      sl: 'Slovenščina',
      et: 'Eesti',
      lv: 'Latviešu',
      lt: 'Lietuvių',
      mt: 'Malti',
      el: 'Ελληνικά',
      cy: 'Cymraeg',
      ar: 'العربية',
      he: 'עברית',
      fa: 'فارسی',
      tr: 'Türkçe',
      ku: 'Kurdî',
      'zh-CN': '中文 (简体)',
      'zh-TW': '中文 (繁體)',
      ja: '日本語',
      ko: '한국어',
      th: 'ไทย',
      vi: 'Tiếng Việt',
      id: 'Bahasa Indonesia',
      ms: 'Bahasa Melayu',
      tl: 'Tagalog',
      hi: 'हिन्दी',
      bn: 'বাংলা',
      ur: 'اردو',
      ta: 'தமிழ்',
      te: 'తెలుగు',
      kn: 'ಕನ್ನಡ',
      ml: 'മലയാളം',
      gu: 'ગુજરાતી',
      pa: 'ਪੰਜਾਬੀ',
      ne: 'नेपाली',
      si: 'සිංහල',
      my: 'မြန်မာ',
      km: 'ខ្មែរ',
      lo: 'ລາວ',
      am: 'አማርኛ',
      sw: 'Kiswahili',
      yo: 'Yorùbá',
      ig: 'Igbo',
      ha: 'Hausa',
      zu: 'isiZulu',
      xh: 'isiXhosa',
      af: 'Afrikaans',
      st: 'Sesotho',
      tn: 'Setswana',
      ts: 'Xitsonga',
      ss: 'siSwati',
      ve: 'Tshivenda',
      nr: 'isiNdebele',
      sn: 'chiShona',
      mi: 'Māori',
      fj: 'Vosa Vakaviti',
      to: 'lea fakatonga',
      sm: 'gagana Samoa',
      haw: 'ʻŌlelo Hawaiʻi',
      // Créoles
      ht: 'Kreyòl Ayisyen',
      gcf: 'Kréyòl Gwadloup',
      crs: 'Seselwa',
      jam: 'Jamaican Patois',
      pcm: 'Nigerian Pidgin',
      bjs: 'Bajan',
      mfe: 'Kreol Morisien',
      rcf: 'Kréol Rényoné',
      sag: 'Sängö'
    }

    return languageNames[locale] || locale
  }
}

// Instance globale
window.i18n = new I18nLoader()

// Initialisation automatique
document.addEventListener('DOMContentLoaded', async () => {
  const locale = window.i18n.detectLocale()
  await window.i18n.setLocale(locale)
})

module.exports = I18nLoader
