/**
 * Configuration pour les tests End-to-End
 */

module.exports = {
  // URL de base pour les tests
  baseUrl: process.env.E2E_BASE_URL || 'http://localhost:3000',
  
  // Configuration Puppeteer
  puppeteer: {
    headless: process.env.E2E_HEADLESS !== 'false',
    slowMo: process.env.E2E_SLOW_MO ? parseInt(process.env.E2E_SLOW_MO) : 0,
    devtools: process.env.E2E_DEVTOOLS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 800
    }
  },
  
  // Timeouts
  timeouts: {
    navigation: 30000,
    element: 10000,
    test: 60000
  },
  
  // Utilisateurs de test
  testUsers: {
    admin: {
      email: 'admin@attitudes.vip',
      password: 'Admin123!@#',
      name: 'Admin Test'
    },
    couple: {
      email: 'couple@test.attitudes.vip',
      password: 'Couple123!',
      name: 'Marie Dupont',
      partnerName: 'Thomas Dupont'
    },
    weddingPlanner: {
      email: 'planner@test.attitudes.vip',
      password: 'Planner123!',
      name: 'Sophie Planner'
    },
    dj: {
      email: 'dj@test.attitudes.vip',
      password: 'DjPro123!',
      name: 'DJ Pro'
    },
    photographer: {
      email: 'photo@test.attitudes.vip',
      password: 'Photo123!',
      name: 'Jean Photo'
    },
    caterer: {
      email: 'traiteur@test.attitudes.vip',
      password: 'Traiteur123!',
      name: 'Chef Gastro'
    },
    guest: {
      email: 'invite@test.attitudes.vip',
      password: 'Guest123!',
      name: 'Pierre Invité'
    }
  },
  
  // Données de test pour mariage
  testWedding: {
    coupleName: 'Marie & Thomas Dupont',
    date: '2024-08-15',
    venue: 'Château de Versailles',
    guestCount: 120,
    budget: 30000,
    theme: 'classic'
  },
  
  // Sélecteurs CSS communs
  selectors: {
    // Authentification
    loginForm: '#login-form',
    emailInput: '#email',
    passwordInput: '#password',
    submitButton: 'button[type="submit"]',
    
    // Navigation
    dashboardNav: '.dashboard-nav',
    tabButton: 'button[data-tab]',
    
    // Modals
    modal: '.modal',
    modalClose: '.modal-close',
    modalSave: '.modal-save',
    
    // Messages
    toast: '.toast',
    toastSuccess: '.toast-success',
    toastError: '.toast-error',
    
    // Chargement
    loader: '.loader',
    spinner: '.spinner'
  },
  
  // Fonctions utilitaires réutilisables
  helpers: {
    // Attendre que le chargement soit terminé
    waitForLoad: async (page) => {
      await page.waitForSelector('.loader', { hidden: true });
    },
    
    // Prendre une capture d'écran en cas d'erreur
    takeErrorScreenshot: async (page, testName) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await page.screenshot({
        path: `./tests/e2e/screenshots/error-${testName}-${timestamp}.png`,
        fullPage: true
      });
    },
    
    // Effacer et remplir un champ
    clearAndType: async (page, selector, text) => {
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, text);
    },
    
    // Attendre et cliquer
    waitAndClick: async (page, selector, options = {}) => {
      await page.waitForSelector(selector, options);
      await page.click(selector);
    },
    
    // Vérifier le texte d'un élément
    getElementText: async (page, selector) => {
      await page.waitForSelector(selector);
      return page.$eval(selector, el => el.textContent.trim());
    },
    
    // Attendre la navigation
    clickAndWaitForNavigation: async (page, selector) => {
      await Promise.all([
        page.waitForNavigation(),
        page.click(selector)
      ]);
    }
  },
  
  // Configuration des environnements
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api'
    },
    staging: {
      baseUrl: 'https://staging.attitudes.vip',
      apiUrl: 'https://staging.attitudes.vip/api'
    },
    production: {
      baseUrl: 'https://attitudes.vip',
      apiUrl: 'https://attitudes.vip/api'
    }
  },
  
  // Données pour les tests de performance
  performance: {
    maxLoadTime: 3000, // 3 secondes
    maxApiResponseTime: 1000, // 1 seconde
    maxRenderTime: 500 // 500ms
  }
};