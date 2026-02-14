/**
 * Configuration Playwright pour tests E2E
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Répertoire des tests
  testDir: './tests/e2e',
  
  // Timeout par test
  timeout: 30 * 1000,
  
  // Timeout pour expect
  expect: {
    timeout: 5000
  },
  
  // Configuration parallèle
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  
  // Retry en cas d'échec
  retries: process.env.CI ? 2 : 0,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // Configuration globale
  use: {
    // URL de base
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Traces pour debug
    trace: 'on-first-retry',
    
    // Screenshots
    screenshot: 'only-on-failure',
    
    // Vidéo
    video: 'retain-on-failure',
    
    // Options de navigation
    navigationTimeout: 30000,
    actionTimeout: 10000,
    
    // Headers personnalisés
    extraHTTPHeaders: {
      'Accept-Language': 'fr-FR'
    }
  },

  // Projets (différents navigateurs)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    }
  ],

  // Serveur web local pour les tests
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  }
});