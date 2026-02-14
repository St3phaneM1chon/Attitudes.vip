import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

/**
 * Client-side i18n configuration for React applications
 */

// Import the configuration from the main config file
import config from './config';

// Initialize i18next for React
i18n
  .use(HttpApi) // Load translations using http
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    backend: {
      loadPath: '/api/translations/{{ns}}?lang={{lng}}',
      addPath: '/api/translations/{{ns}}?lang={{lng}}',
    },
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'querystring', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
      cookieName: 'attitudes_language',
      lookupQuerystring: 'lang',
      lookupCookie: 'attitudes_language',
      lookupLocalStorage: 'attitudes_language',
    },
    fallbackLng: config.fallbackLocale || 'en',
    supportedLngs: config.supportedLocales,
    ns: ['translation', 'common', 'wedding', 'dashboard', 'errors', 'forms', 'vendors'],
    defaultNS: 'translation',
    keySeparator: '.',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: getCurrencyByLanguage(lng)
          }).format(value);
        }
        if (format === 'date') {
          return new Intl.DateTimeFormat(lng).format(new Date(value));
        }
        if (format === 'datetime') {
          return new Intl.DateTimeFormat(lng, {
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(new Date(value));
        }
        if (format === 'relative') {
          return getRelativeTime(value, lng);
        }
        return value;
      }
    },
    react: {
      useSuspense: false, // Disable suspense to handle loading states manually
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'b', 'em', 'u'],
    },
    saveMissing: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
  });

// Helper function to get currency by language
function getCurrencyByLanguage(lng) {
  const currencyMap = {
    'en': 'USD',
    'en-US': 'USD',
    'en-CA': 'CAD',
    'en-GB': 'GBP',
    'fr': 'EUR',
    'es': 'EUR',
    'ar': 'AED',
    'zh': 'CNY',
    'de': 'EUR',
    'it': 'EUR',
    'pt': 'EUR',
    'ru': 'RUB',
    'ja': 'JPY',
    'ko': 'KRW',
    'hi': 'INR',
    'he': 'ILS',
    'tr': 'TRY',
    'nl': 'EUR'
  };
  return currencyMap[lng] || 'USD';
}

// Helper function for relative time
function getRelativeTime(date, lng) {
  const rtf = new Intl.RelativeTimeFormat(lng, { numeric: 'auto' });
  const diff = new Date(date) - new Date();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (Math.abs(days) > 0) return rtf.format(days, 'day');
  if (Math.abs(hours) > 0) return rtf.format(hours, 'hour');
  if (Math.abs(minutes) > 0) return rtf.format(minutes, 'minute');
  return rtf.format(seconds, 'second');
}

// Helper hooks for React components
export { useTranslation, Trans, Translation } from 'react-i18next';

// Helper function to change language
export const changeLanguage = async (lng) => {
  await i18n.changeLanguage(lng);
  // Save to localStorage and cookie
  localStorage.setItem('attitudes_language', lng);
  document.cookie = `attitudes_language=${lng};path=/;max-age=${30 * 24 * 60 * 60}`;
  // Update document direction for RTL languages
  document.documentElement.dir = config.rtlLanguages?.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  // Notify server of language change
  try {
    await fetch('/api/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lng })
    });
  } catch (error) {
    console.error('Failed to update language on server:', error);
  }
};

// Helper function to get current language
export const getCurrentLanguage = () => i18n.language;

// Helper function to get language direction
export const getLanguageDirection = (lng = i18n.language) => {
  return config.rtlLanguages?.includes(lng) ? 'rtl' : 'ltr';
};

// Helper function to format currency
export const formatCurrency = (amount, lng = i18n.language) => {
  const currency = getCurrencyByLanguage(lng);
  return new Intl.NumberFormat(lng, {
    style: 'currency',
    currency
  }).format(amount);
};

// Helper function to format date
export const formatDate = (date, lng = i18n.language, options = {}) => {
  return new Intl.DateTimeFormat(lng, options).format(new Date(date));
};

// React component for language switcher
export const LanguageSwitcher = ({ className = '', showFlags = true, showNames = true }) => {
  const { i18n } = useTranslation();
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' }
  ];
  
  return (
    <select 
      className={className}
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {showFlags && lang.flag} {showNames && lang.name}
        </option>
      ))}
    </select>
  );
};

export default i18n;