module.exports = {
  defaultLocale: 'fr',
  supportedLocales: [
    // Europe
    'fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'mt', 'el', 'cy',
    // Amériques
    'en-US', 'en-CA', 'es-MX', 'es-AR', 'es-BR', 'es-CO', 'es-PE', 'es-VE', 'pt-BR', 'fr-CA',
    // Asie
    'zh-CN', 'zh-TW', 'ja', 'ko', 'th', 'vi', 'id', 'ms', 'tl', 'hi', 'bn', 'ur', 'ta', 'te', 'kn', 'ml', 'gu', 'pa', 'ne', 'si', 'my', 'km', 'lo',
    // Moyen-Orient et Afrique
    'ar', 'he', 'fa', 'tr', 'ku', 'am', 'sw', 'yo', 'ig', 'ha', 'zu', 'xh', 'af', 'st', 'tn', 'ts', 'ss', 've', 'nr', 'sn',
    // Océanie
    'en-AU', 'en-NZ', 'mi', 'fj', 'to', 'sm', 'haw',
    // Créoles - Caraïbes et Océan Indien
    'ht', 'gcf', 'crs', 'jam', 'pcm', 'bjs', 'mfe', 'rcf', 'sag', 'crs-SC', 'mfe-MU', 'rcf-RE'
  ],
  fallbackLocale: 'fr',
  
  // Configuration des régions
  regionalization: {
    'middle-east': {
      countries: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'JO', 'LB', 'SY', 'IQ', 'IR', 'TR', 'IL', 'PS'],
      languages: ['ar', 'he', 'fa', 'tr', 'ku'],
      religions: ['islam', 'christianity', 'judaism'],
      contentPath: '/assets/regional/middle-east/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'warm',
        imagery: 'traditional',
        rtl: true,
        ceremonies: ['nikah', 'katb_kitab', 'huppah'],
        customs: ['henna', 'zaffe', 'dabke']
      }
    },
    'asia': {
      countries: ['CN', 'JP', 'KR', 'TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'IN', 'BD', 'PK', 'LK', 'NP', 'MM', 'KH', 'LA', 'MN'],
      languages: ['zh-CN', 'zh-TW', 'ja', 'ko', 'th', 'vi', 'id', 'ms', 'tl', 'hi', 'bn', 'ur', 'ta', 'te', 'kn', 'ml', 'gu', 'pa', 'ne', 'si', 'my', 'km', 'lo'],
      religions: ['buddhism', 'hinduism', 'islam', 'christianity', 'shinto', 'taoism'],
      contentPath: '/assets/regional/asia/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'vibrant',
        imagery: 'modern-traditional',
        ceremonies: ['tea_ceremony', 'saptapadi', 'nikah', 'puja'],
        customs: ['red_dress', 'gold_jewelry', 'fire_ceremony']
      }
    },
    'europe': {
      countries: ['FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'GR', 'CY', 'IE', 'GB'],
      languages: ['fr', 'de', 'it', 'es', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et', 'lv', 'lt', 'mt', 'el', 'cy'],
      religions: ['christianity', 'judaism', 'islam'],
      contentPath: '/assets/regional/europe/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'elegant',
        imagery: 'classic',
        ceremonies: ['civil', 'religious', 'traditional'],
        customs: ['white_dress', 'veil', 'rings_exchange']
      }
    },
    'north-america': {
      countries: ['US', 'CA', 'MX'],
      languages: ['en-US', 'en-CA', 'es-MX', 'fr-CA'],
      religions: ['christianity', 'judaism', 'islam', 'hinduism', 'buddhism'],
      contentPath: '/assets/regional/north-america/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'diverse',
        imagery: 'contemporary',
        ceremonies: ['civil', 'religious', 'cultural'],
        customs: ['first_dance', 'cake_cutting', 'bouquet_toss']
      }
    },
    'south-america': {
      countries: ['BR', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF'],
      languages: ['pt-BR', 'es-AR', 'es-CO', 'es-PE', 'es-VE', 'es-CL', 'es-EC', 'es-BO', 'es-PY', 'es-UY'],
      religions: ['christianity', 'african_religions', 'indigenous'],
      contentPath: '/assets/regional/south-america/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'vibrant',
        imagery: 'passionate',
        ceremonies: ['civil', 'religious', 'african'],
        customs: ['samba', 'tango', 'colorful_attire']
      }
    },
    'caribbean': {
      countries: ['HT', 'JM', 'BB', 'GD', 'LC', 'VC', 'AG', 'KN', 'DM', 'TT', 'GY', 'SR', 'GF', 'MQ', 'GP', 'BL', 'MF', 'CW', 'AW', 'BQ', 'SX', 'TC', 'AI', 'VG', 'VI', 'PR', 'DO', 'CU', 'BS', 'TC', 'KY', 'BM', 'MS', 'VG', 'AI', 'TC'],
      languages: ['ht', 'gcf', 'crs', 'jam', 'pcm', 'bjs', 'en', 'es', 'fr', 'nl'],
      religions: ['christianity', 'african_religions', 'voodoo', 'rastafarianism'],
      contentPath: '/assets/regional/caribbean/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'tropical',
        imagery: 'island-vibrant',
        ceremonies: ['civil', 'religious', 'traditional', 'rasta'],
        customs: ['steel_drum', 'reggae', 'calypso', 'colorful_attire', 'rum_ceremony']
      }
    },
    'indian-ocean': {
      countries: ['MU', 'RE', 'SC', 'KM', 'MG', 'YT', 'MV'],
      languages: ['mfe', 'rcf', 'sag', 'crs-SC', 'mfe-MU', 'rcf-RE', 'fr', 'en'],
      religions: ['christianity', 'hinduism', 'islam', 'buddhism'],
      contentPath: '/assets/regional/indian-ocean/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'ocean-tropical',
        imagery: 'island-paradise',
        ceremonies: ['civil', 'religious', 'traditional', 'sega'],
        customs: ['sega_dance', 'ocean_ceremony', 'tropical_flowers', 'island_music']
      }
    },
    'africa': {
      countries: ['ZA', 'NG', 'EG', 'KE', 'GH', 'ET', 'TZ', 'UG', 'DZ', 'SD', 'MA', 'TN', 'LY', 'CI', 'BF', 'ML', 'NE', 'TD', 'CM', 'CF', 'CG', 'CD', 'AO', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MG', 'MU', 'SC', 'KM', 'DJ', 'SO', 'ER', 'RW', 'BI', 'MW', 'MZ', 'ZW'],
      languages: ['en', 'fr', 'ar', 'sw', 'yo', 'ig', 'ha', 'zu', 'xh', 'af', 'st', 'tn', 'ts', 'ss', 've', 'nr', 'sn'],
      religions: ['christianity', 'islam', 'african_religions', 'hinduism'],
      contentPath: '/assets/regional/africa/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'earthy',
        imagery: 'tribal-modern',
        ceremonies: ['traditional', 'religious', 'modern'],
        customs: ['dowry', 'blessing_ceremony', 'dance_rituals']
      }
    },
    'oceania': {
      countries: ['AU', 'NZ', 'FJ', 'PG', 'NC', 'VU', 'SB', 'TO', 'WS', 'KI', 'TV', 'NR', 'PW', 'MH', 'FM', 'CK', 'NU', 'TK'],
      languages: ['en-AU', 'en-NZ', 'mi', 'fj', 'to', 'sm', 'haw'],
      religions: ['christianity', 'indigenous', 'islam'],
      contentPath: '/assets/regional/oceania/',
      culturalAdaptations: {
        weddingTraditions: true,
        colorPalette: 'natural',
        imagery: 'island-paradise',
        ceremonies: ['traditional', 'modern', 'island_style'],
        customs: ['lei_exchange', 'haka', 'island_dance']
      }
    }
  },

  // Configuration des langues RTL
  rtlLanguages: ['ar', 'he', 'fa', 'ur', 'ku', 'ps', 'sd'],

  // Configuration des langues créoles
  creoleLanguages: {
    'ht': {
      name: 'Kreyòl Ayisyen',
      nativeName: 'Kreyòl Ayisyen',
      region: 'Haiti',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇭🇹',
      weddingTraditions: ['vodou_ceremony', 'traditional_haitian', 'church_ceremony'],
      music: ['kompa', 'rara', 'vodou_music'],
      customs: ['rum_ceremony', 'traditional_dress', 'community_celebration']
    },
    'gcf': {
      name: 'Kréyòl Gwadloup',
      nativeName: 'Kréyòl Gwadloup',
      region: 'Guadeloupe',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇬🇵',
      weddingTraditions: ['traditional_creole', 'church_ceremony'],
      music: ['gwo_ka', 'zouk', 'biguine'],
      customs: ['rhum_ceremony', 'traditional_attire', 'island_celebration']
    },
    'crs': {
      name: 'Seselwa',
      nativeName: 'Seselwa',
      region: 'Seychelles',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇸🇨',
      weddingTraditions: ['traditional_seychellois', 'church_ceremony'],
      music: ['sega', 'moutya', 'traditional_seychellois'],
      customs: ['ocean_ceremony', 'tropical_flowers', 'island_traditions']
    },
    'jam': {
      name: 'Jamaican Patois',
      nativeName: 'Jamaican Patois',
      region: 'Jamaica',
      baseLanguage: 'en',
      script: 'latin',
      flag: '🇯🇲',
      weddingTraditions: ['rasta_ceremony', 'traditional_jamaican', 'church_ceremony'],
      music: ['reggae', 'dancehall', 'mento'],
      customs: ['ganja_ceremony', 'rasta_traditions', 'island_celebration']
    },
    'pcm': {
      name: 'Nigerian Pidgin',
      nativeName: 'Nigerian Pidgin',
      region: 'Nigeria',
      baseLanguage: 'en',
      script: 'latin',
      flag: '🇳🇬',
      weddingTraditions: ['traditional_nigerian', 'church_ceremony'],
      music: ['afrobeat', 'highlife', 'traditional_nigerian'],
      customs: ['traditional_attire', 'community_celebration', 'african_traditions']
    },
    'bjs': {
      name: 'Bajan',
      nativeName: 'Bajan',
      region: 'Barbados',
      baseLanguage: 'en',
      script: 'latin',
      flag: '🇧🇧',
      weddingTraditions: ['traditional_barbadian', 'church_ceremony'],
      music: ['calypso', 'spouge', 'tuk_band'],
      customs: ['rum_ceremony', 'traditional_attire', 'island_celebration']
    },
    'mfe': {
      name: 'Kreol Morisien',
      nativeName: 'Kreol Morisien',
      region: 'Mauritius',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇲🇺',
      weddingTraditions: ['traditional_mauritian', 'hindu_ceremony', 'church_ceremony'],
      music: ['sega', 'bhojpuri', 'traditional_mauritian'],
      customs: ['ocean_ceremony', 'tropical_flowers', 'multi_cultural_celebration']
    },
    'rcf': {
      name: 'Kréol Rényoné',
      nativeName: 'Kréol Rényoné',
      region: 'Réunion',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇷🇪',
      weddingTraditions: ['traditional_reunionnais', 'church_ceremony'],
      music: ['maloya', 'sega', 'traditional_reunionnais'],
      customs: ['rhum_ceremony', 'traditional_attire', 'island_celebration']
    },
    'sag': {
      name: 'Sängö',
      nativeName: 'Sängö',
      region: 'Central African Republic',
      baseLanguage: 'fr',
      script: 'latin',
      flag: '🇨🇫',
      weddingTraditions: ['traditional_central_african', 'church_ceremony'],
      music: ['traditional_central_african', 'modern_african'],
      customs: ['traditional_attire', 'community_celebration', 'african_traditions']
    }
  },

  // Configuration des formats de date
  dateFormats: {
    'fr': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'en': { locale: 'en-US', format: 'MM/DD/YYYY' },
    'en-GB': { locale: 'en-GB', format: 'DD/MM/YYYY' },
    'de': { locale: 'de-DE', format: 'DD.MM.YYYY' },
    'es': { locale: 'es-ES', format: 'DD/MM/YYYY' },
    'it': { locale: 'it-IT', format: 'DD/MM/YYYY' },
    'pt': { locale: 'pt-PT', format: 'DD/MM/YYYY' },
    'ar': { locale: 'ar-SA', format: 'DD/MM/YYYY' },
    'ja': { locale: 'ja-JP', format: 'YYYY/MM/DD' },
    'zh-CN': { locale: 'zh-CN', format: 'YYYY/MM/DD' },
    'ko': { locale: 'ko-KR', format: 'YYYY/MM/DD' },
    // Créoles - utiliser le format de la langue de base
    'ht': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'gcf': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'crs': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'jam': { locale: 'en-US', format: 'MM/DD/YYYY' },
    'pcm': { locale: 'en-US', format: 'MM/DD/YYYY' },
    'bjs': { locale: 'en-US', format: 'MM/DD/YYYY' },
    'mfe': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'rcf': { locale: 'fr-FR', format: 'DD/MM/YYYY' },
    'sag': { locale: 'fr-FR', format: 'DD/MM/YYYY' }
  },

  // Configuration des formats de nombres
  numberFormats: {
    'fr': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'en': { locale: 'en-US', decimal: '.', thousands: ',' },
    'en-GB': { locale: 'en-GB', decimal: '.', thousands: ',' },
    'de': { locale: 'de-DE', decimal: ',', thousands: '.' },
    'es': { locale: 'es-ES', decimal: ',', thousands: '.' },
    'ar': { locale: 'ar-SA', decimal: '.', thousands: ',' },
    // Créoles - utiliser le format de la langue de base
    'ht': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'gcf': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'crs': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'jam': { locale: 'en-US', decimal: '.', thousands: ',' },
    'pcm': { locale: 'en-US', decimal: '.', thousands: ',' },
    'bjs': { locale: 'en-US', decimal: '.', thousands: ',' },
    'mfe': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'rcf': { locale: 'fr-FR', decimal: ',', thousands: ' ' },
    'sag': { locale: 'fr-FR', decimal: ',', thousands: ' ' }
  },

  // Configuration des devises
  currencies: {
    'EUR': { symbol: '€', position: 'before' },
    'USD': { symbol: '$', position: 'before' },
    'GBP': { symbol: '£', position: 'before' },
    'JPY': { symbol: '¥', position: 'before' },
    'CNY': { symbol: '¥', position: 'before' },
    'KRW': { symbol: '₩', position: 'before' },
    'INR': { symbol: '₹', position: 'before' },
    'AED': { symbol: 'د.إ', position: 'before' },
    'SAR': { symbol: 'ر.س', position: 'before' },
    // Devises créoles
    'HTG': { symbol: 'G', position: 'after' }, // Gourde haïtienne
    'XCD': { symbol: 'EC$', position: 'before' }, // Dollar des Caraïbes orientales
    'JMD': { symbol: 'J$', position: 'before' }, // Dollar jamaïcain
    'NGN': { symbol: '₦', position: 'before' }, // Naira nigérian
    'BBD': { symbol: 'Bds$', position: 'before' }, // Dollar barbadien
    'MUR': { symbol: '₨', position: 'before' }, // Roupie mauricienne
    'EUR': { symbol: '€', position: 'before' }, // Euro (Réunion, Guadeloupe)
    'XAF': { symbol: 'FCFA', position: 'after' } // Franc CFA (République centrafricaine)
  },

  // Configuration des fuseaux horaires par région
  timezones: {
    'middle-east': ['Asia/Dubai', 'Asia/Riyadh', 'Asia/Kuwait', 'Asia/Muscat', 'Asia/Bahrain', 'Asia/Amman', 'Asia/Beirut', 'Asia/Damascus', 'Asia/Baghdad', 'Asia/Tehran', 'Europe/Istanbul', 'Asia/Jerusalem'],
    'asia': ['Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Bangkok', 'Asia/Ho_Chi_Minh', 'Asia/Jakarta', 'Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Manila', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Karachi', 'Asia/Colombo', 'Asia/Kathmandu', 'Asia/Yangon', 'Asia/Phnom_Penh', 'Asia/Vientiane', 'Asia/Ulaanbaatar'],
    'europe': ['Europe/Paris', 'Europe/Berlin', 'Europe/Rome', 'Europe/Madrid', 'Europe/Lisbon', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Zurich', 'Europe/Vienna', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki', 'Europe/Warsaw', 'Europe/Prague', 'Europe/Budapest', 'Europe/Bucharest', 'Europe/Sofia', 'Europe/Zagreb', 'Europe/Bratislava', 'Europe/Ljubljana', 'Europe/Tallinn', 'Europe/Riga', 'Europe/Vilnius', 'Europe/Valletta', 'Europe/Athens', 'Europe/Nicosia', 'Europe/Dublin', 'Europe/London'],
    'north-america': ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Vancouver', 'America/Mexico_City'],
    'south-america': ['America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'America/Lima', 'America/Caracas', 'America/Santiago', 'America/Guayaquil', 'America/La_Paz', 'America/Asuncion', 'America/Montevideo', 'America/Guyana', 'America/Paramaribo', 'America/Cayenne'],
    'caribbean': ['America/Port-au-Prince', 'America/Jamaica', 'America/Barbados', 'America/Grenada', 'America/St_Lucia', 'America/St_Vincent', 'America/Antigua', 'America/St_Kitts', 'America/Dominica', 'America/Port_of_Spain', 'America/Guyana', 'America/Paramaribo', 'America/Cayenne', 'America/Martinique', 'America/Guadeloupe', 'America/St_Barthelemy', 'America/Marigot', 'America/Curacao', 'America/Aruba', 'America/Kralendijk', 'America/Lower_Princes', 'America/Grand_Turk', 'America/Anguilla', 'America/Tortola', 'America/St_Thomas', 'America/Puerto_Rico', 'America/Santo_Domingo', 'America/Havana', 'America/Nassau', 'America/Grand_Turk', 'America/Cayman', 'America/Bermuda', 'America/Montserrat', 'America/Tortola', 'America/Anguilla', 'America/Grand_Turk'],
    'indian-ocean': ['Indian/Mauritius', 'Indian/Reunion', 'Indian/Mahe', 'Indian/Comoro', 'Indian/Antananarivo', 'Indian/Mayotte', 'Asia/Kolkata'],
    'africa': ['Africa/Johannesburg', 'Africa/Lagos', 'Africa/Cairo', 'Africa/Nairobi', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Dar_es_Salaam', 'Africa/Kampala', 'Africa/Algiers', 'Africa/Khartoum', 'Africa/Casablanca', 'Africa/Tunis', 'Africa/Tripoli', 'Africa/Abidjan', 'Africa/Ouagadougou', 'Africa/Bamako', 'Africa/Niamey', 'Africa/Ndjamena', 'Africa/Douala', 'Africa/Bangui', 'Africa/Brazzaville', 'Africa/Kinshasa', 'Africa/Luanda', 'Africa/Lusaka', 'Africa/Harare', 'Africa/Gaborone', 'Africa/Windhoek', 'Africa/Mbabane', 'Africa/Maseru', 'Africa/Antananarivo', 'Africa/Port_Louis', 'Indian/Mahe', 'Indian/Comoro', 'Africa/Djibouti', 'Africa/Mogadishu', 'Africa/Asmara', 'Africa/Kigali', 'Africa/Bujumbura', 'Africa/Blantyre', 'Africa/Maputo', 'Africa/Harare'],
    'oceania': ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin', 'Australia/Hobart', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Port_Moresby', 'Pacific/Noumea', 'Pacific/Efate', 'Pacific/Guadalcanal', 'Pacific/Tongatapu', 'Pacific/Apia', 'Pacific/Tarawa', 'Pacific/Funafuti', 'Pacific/Nauru', 'Pacific/Palau', 'Pacific/Majuro', 'Pacific/Chuuk', 'Pacific/Pohnpei', 'Pacific/Kosrae', 'Pacific/Rarotonga', 'Pacific/Niue', 'Pacific/Fakaofo']
  }
};
