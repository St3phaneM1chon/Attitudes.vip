# Internationalization (i18n) System

Comprehensive internationalization system for Attitudes.vip supporting 100+ languages across 9 global regions.

## Features

- 🌍 **100+ Languages**: Including major languages and regional dialects
- 🌎 **9 Global Regions**: Culturally adapted content for each region
- 🔄 **RTL Support**: Full right-to-left language support (Arabic, Hebrew, etc.)
- 💱 **Multi-Currency**: Automatic currency formatting based on locale
- 📅 **Date/Time Formatting**: Locale-specific date and time formats
- 🎨 **Cultural Adaptations**: Wedding traditions and customs by region
- 🔍 **Automatic Detection**: Browser, cookie, and user preference detection
- ⚡ **Performance**: Lazy loading and caching for optimal performance

## Quick Start

### Server-Side (Express)

```javascript
const express = require('express');
const { setupI18n } = require('./src/i18n');

const app = express();

// Setup i18n
await setupI18n(app);

// Use in routes
app.get('/', (req, res) => {
  res.send(req.t('welcome.title'));
});
```

### Client-Side (React)

```javascript
import { useTranslation } from './src/i18n/client';

function WelcomeComponent() {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <button onClick={() => i18n.changeLanguage('fr')}>
        Français
      </button>
    </div>
  );
}
```

## Directory Structure

```
src/i18n/
├── config.js              # Main configuration
├── middleware.js          # Express middleware
├── client.js              # Client-side configuration
├── index.js               # Main export
├── locales/               # Translation files
│   ├── en/                # English translations
│   │   ├── translation.json
│   │   ├── common.json
│   │   ├── wedding.json
│   │   ├── dashboard.json
│   │   ├── errors.json
│   │   ├── forms.json
│   │   └── vendors.json
│   ├── fr/                # French translations
│   ├── es/                # Spanish translations
│   ├── ar/                # Arabic translations
│   ├── zh/                # Chinese translations
│   └── ...                # Other languages
└── regional-content/      # Region-specific assets
```

## Translation Namespaces

### `translation` (default)
- App metadata
- Navigation
- Authentication
- Common UI elements

### `common`
- Buttons, labels, status messages
- Validation messages
- Date/time formats
- Table and pagination

### `wedding`
- Wedding-specific terminology
- Religious variations
- Planning tools
- Guest management
- Traditions

### `dashboard`
- Role-specific dashboards
- Widgets and metrics
- Quick actions

### `errors`
- HTTP error messages
- Business logic errors
- System errors

### `forms`
- Form fields and labels
- Validation messages
- Help text

### `vendors`
- Vendor categories
- Service descriptions
- Booking workflow

## API Endpoints

### Change Language
```http
POST /api/language
Content-Type: application/json

{
  "language": "fr"
}
```

### Get Translations
```http
GET /api/translations/wedding?lang=es
```

### Detect Language
```http
GET /api/language/detect
```

## Template Usage

### EJS Example
```ejs
<!DOCTYPE html>
<html lang="<%= language %>" dir="<%= dir %>">
<head>
  <title><%= t('app.name') %></title>
</head>
<body>
  <h1><%= t('welcome.title', { appName: t('app.name') }) %></h1>
  
  <!-- Language Switcher -->
  <select onchange="location.href='<%= languageUrl(this.value) %>'">
    <% languages.forEach(lang => { %>
      <option value="<%= lang %>" <%= lang === language ? 'selected' : '' %>>
        <%= lang %>
      </option>
    <% }) %>
  </select>
  
  <!-- Formatted values -->
  <p><%= formatCurrency(99.99) %></p>
  <p><%= formatDate(new Date()) %></p>
</body>
</html>
```

## Helper Functions

### Server-Side Helpers

```javascript
// Available in req and res.locals
t(key, options)              // Translate
language                     // Current language
dir                          // Text direction (ltr/rtl)
formatCurrency(amount)       // Format currency
formatDate(date)            // Format date
formatDateTime(date)        // Format date and time
isRTL()                     // Check if RTL language
getRegion()                 // Get current region
languageUrl(lang)          // Generate language switch URL
```

### Client-Side Helpers

```javascript
import { 
  useTranslation,
  changeLanguage,
  getCurrentLanguage,
  getLanguageDirection,
  formatCurrency,
  formatDate
} from './src/i18n/client';

// In React component
const { t, i18n } = useTranslation();

// Change language
await changeLanguage('ar');

// Format values
const price = formatCurrency(100);
const date = formatDate(new Date());
```

## Adding New Languages

1. Create language directory:
```bash
mkdir -p src/i18n/locales/[lang]
```

2. Copy English translations as template:
```bash
cp -r src/i18n/locales/en/* src/i18n/locales/[lang]/
```

3. Add language to config:
```javascript
// src/i18n/config.js
supportedLocales: [
  // ...
  'new-lang'
]
```

4. Translate the JSON files

## Cultural Adaptations

### Wedding Terminology by Religion

The system automatically adapts wedding terminology based on religion:

```javascript
// Get wedding terminology for Hindu weddings in Hindi
const terms = getWeddingTerminology('hi', 'hindu');
// Returns: { ceremony: 'Vivah Sanskar', officiant: 'Pandit', ... }
```

### Regional Content

Content adapts based on region:

```javascript
const adaptations = getCulturalAdaptations('ar');
// Returns: { 
//   weddingTraditions: true,
//   colorPalette: 'warm',
//   ceremonies: ['nikah', 'katb_kitab'],
//   customs: ['henna', 'zaffe']
// }
```

## Best Practices

1. **Use Translation Keys**: Never hardcode text
   ```javascript
   // Bad
   res.send('Welcome');
   
   // Good
   res.send(req.t('welcome.title'));
   ```

2. **Namespace Organization**: Use appropriate namespaces
   ```javascript
   req.t('forms:fields.email.label'); // Form-specific
   req.t('wedding:terminology.bride'); // Wedding-specific
   ```

3. **Interpolation**: Use variables in translations
   ```json
   {
     "welcome": "Welcome, {{name}}!"
   }
   ```
   ```javascript
   req.t('welcome', { name: user.name });
   ```

4. **Pluralization**: Handle plural forms
   ```json
   {
     "items": "{{count}} item",
     "items_plural": "{{count}} items"
   }
   ```

5. **Loading Namespaces**: Load only what you need
   ```javascript
   app.get('/wedding/*', 
     loadNamespaces('wedding', 'vendors'),
     weddingRoutes
   );
   ```

## Testing

```javascript
// Test language detection
const detected = detectUserLanguage(req);

// Test translations
const translated = req.t('key');

// Test formatting
const formatted = formatCurrency(100, 'ja');
```

## Performance Optimization

1. **Lazy Loading**: Load translations on demand
2. **Caching**: Browser and server-side caching
3. **CDN**: Serve translations from CDN
4. **Compression**: Gzip translation files
5. **Namespaces**: Split translations by feature

## Troubleshooting

### Missing Translations
- Check console for missing key warnings
- Verify namespace is loaded
- Check file path and structure

### Wrong Language Detected
- Check cookie: `attitudes_language`
- Verify Accept-Language header
- Check user preferences in database

### RTL Layout Issues
- Verify `dir="rtl"` on HTML element
- Check CSS for RTL-specific styles
- Use logical properties (start/end vs left/right)

## Support

For questions or issues:
- Check the example files
- Review test cases
- Contact the development team