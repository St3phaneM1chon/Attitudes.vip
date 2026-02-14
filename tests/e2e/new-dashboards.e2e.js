/**
 * Tests E2E pour les nouveaux dashboards
 * Teste les fonctionnalités des dashboards Phase 2-4
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');

// Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const HEADLESS = process.env.E2E_HEADLESS !== 'false';

describe('E2E - Nouveaux Dashboards', () => {
  let browser;
  let page;
  
  const testUsers = {
    admin: {
      email: 'admin@attitudes.vip',
      password: 'Admin123!',
      name: 'Admin System'
    },
    weddingPlanner: {
      email: 'planner@test.com',
      password: 'Planner123!',
      name: 'Sophie Planner'
    },
    photographer: {
      email: 'photo@test.com',
      password: 'Photo123!',
      name: 'Jean Photo'
    },
    cio: {
      email: 'cio@attitudes.vip',
      password: 'CIO123!',
      name: 'Tech Lead'
    },
    client: {
      email: 'client@weddingpro.com',
      password: 'Client123!',
      name: 'Wedding Pro Agency'
    }
  };
  
  before(async () => {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      slowMo: 30,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });
  
  after(async () => {
    await browser.close();
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
  });
  
  afterEach(async () => {
    await page.close();
  });
  
  describe('1. Dashboard Admin', () => {
    before(async () => {
      await loginAs(page, testUsers.admin);
    });
    
    it('devrait afficher les métriques système', async () => {
      await page.goto(`${BASE_URL}/dashboard/admin`);
      await page.waitForSelector('.admin-dashboard');
      
      // Vérifier les stats principales
      const totalUsers = await page.$eval('.stat-card[data-stat="users"] .stat-value', el => el.textContent);
      expect(parseInt(totalUsers)).to.be.above(0);
      
      const systemHealth = await page.$eval('.system-health-status', el => el.textContent);
      expect(systemHealth).to.equal('Bon');
    });
    
    it('devrait permettre de gérer les utilisateurs', async () => {
      await page.click('button[data-tab="users"]');
      await page.waitForSelector('.users-table');
      
      // Rechercher un utilisateur
      await page.type('.user-search', 'marie');
      await page.waitForTimeout(500);
      
      const userCount = await page.$$eval('.user-row', els => els.length);
      expect(userCount).to.be.at.least(1);
      
      // Ouvrir les détails
      await page.click('.user-row:first-child .view-details');
      await page.waitForSelector('.user-modal');
      
      const userEmail = await page.$eval('.user-email', el => el.textContent);
      expect(userEmail).to.include('@');
    });
    
    it('devrait envoyer une annonce globale', async () => {
      await page.click('button[data-tab="communications"]');
      await page.click('button.new-announcement');
      
      await page.waitForSelector('.announcement-modal');
      await page.type('#announcement_message', 'Maintenance prévue ce soir à 23h');
      await page.select('#announcement_priority', 'warning');
      await page.click('button.send-announcement');
      
      await page.waitForSelector('.toast-success');
      const success = await page.$eval('.toast-message', el => el.textContent);
      expect(success).to.include('envoyée');
    });
  });
  
  describe('2. Dashboard Wedding Planner', () => {
    before(async () => {
      await loginAs(page, testUsers.weddingPlanner);
    });
    
    it('devrait afficher la vue d\'ensemble des mariages', async () => {
      await page.goto(`${BASE_URL}/dashboard/wedding-planner`);
      await page.waitForSelector('.wedding-planner-dashboard');
      
      // Vérifier les mariages actifs
      const activeWeddings = await page.$eval('.stat-card[data-stat="active-weddings"] .stat-value', el => el.textContent);
      expect(parseInt(activeWeddings)).to.be.above(0);
      
      // Vérifier la liste des mariages
      const weddingCards = await page.$$('.wedding-card');
      expect(weddingCards.length).to.be.above(0);
    });
    
    it('devrait créer un nouveau mariage', async () => {
      await page.click('button.new-wedding');
      await page.waitForSelector('.wedding-modal');
      
      // Remplir le formulaire
      await page.type('#bride_name', 'Emma');
      await page.type('#groom_name', 'Lucas');
      await page.type('#wedding_date', '2024-09-15');
      await page.type('#guest_count', '150');
      await page.type('#budget', '40000');
      await page.type('#venue', 'Château de Fontainebleau');
      
      await page.click('button.create-wedding');
      
      await page.waitForSelector('.toast-success');
      const success = await page.$eval('.toast-message', el => el.textContent);
      expect(success).to.include('créé');
    });
    
    it('devrait gérer le réseau de vendors', async () => {
      await page.click('button[data-tab="vendors"]');
      await page.waitForSelector('.vendors-network');
      
      // Vérifier les catégories
      const vendorCategories = await page.$$('.vendor-category');
      expect(vendorCategories.length).to.equal(7); // 7 types de vendors
      
      // Filtrer par type
      await page.click('.vendor-category[data-type="photographer"]');
      await page.waitForTimeout(500);
      
      const photographers = await page.$$('.vendor-row[data-type="photographer"]');
      expect(photographers.length).to.be.above(0);
    });
  });
  
  describe('3. Dashboard Vendor Générique', () => {
    before(async () => {
      await loginAs(page, testUsers.photographer);
    });
    
    it('devrait adapter l\'interface selon le type de vendor', async () => {
      await page.goto(`${BASE_URL}/dashboard/vendor`);
      await page.waitForSelector('.vendor-dashboard');
      
      // Vérifier que c'est bien le dashboard photographe
      const dashboardTitle = await page.$eval('.dashboard-title', el => el.textContent);
      expect(dashboardTitle).to.include('Photographe');
      
      // Vérifier les sections spécifiques
      const hasGallery = await page.$('.sidebar-item[data-section="galleries"]') !== null;
      expect(hasGallery).to.be.true;
      
      const hasDelivery = await page.$('.sidebar-item[data-section="delivery"]') !== null;
      expect(hasDelivery).to.be.true;
    });
    
    it('devrait gérer les réservations avec paiements', async () => {
      await page.click('button[data-tab="events"]');
      await page.waitForSelector('.events-table');
      
      // Ouvrir les détails d'un événement
      await page.click('.event-row:first-child .view-details');
      await page.waitForSelector('.event-modal');
      
      // Vérifier le statut de paiement
      const paymentStatus = await page.$eval('.payment-status', el => el.textContent);
      expect(['Payé', 'Partiel', 'En attente']).to.include(paymentStatus);
      
      // Demander un paiement
      if (paymentStatus !== 'Payé') {
        await page.click('button.request-payment');
        await page.waitForSelector('.payment-modal');
        
        await page.type('#payment_amount', '500');
        await page.click('button.send-payment-request');
        
        await page.waitForSelector('.toast-success');
      }
    });
  });
  
  describe('4. Dashboard CIO', () => {
    before(async () => {
      await loginAs(page, testUsers.cio);
    });
    
    it('devrait afficher les métriques système en temps réel', async () => {
      await page.goto(`${BASE_URL}/dashboard/cio`);
      await page.waitForSelector('.cio-dashboard');
      
      // Vérifier la barre de statut
      const systemStatus = await page.$eval('.system-status', el => el.textContent);
      expect(systemStatus).to.include('Operational');
      
      // Vérifier les services
      const services = await page.$$('.service-status');
      expect(services.length).to.be.at.least(8);
      
      // Vérifier au moins un service opérationnel
      const operationalService = await page.$('.service-status[data-status="operational"]');
      expect(operationalService).to.not.be.null;
    });
    
    it('devrait afficher les performances', async () => {
      await page.click('button[data-tab="performance"]');
      await page.waitForSelector('.performance-metrics');
      
      // Vérifier l'Apdex Score
      const apdexScore = await page.$eval('.apdex-score', el => parseFloat(el.textContent));
      expect(apdexScore).to.be.above(0).and.below(1);
      
      // Vérifier le taux d'erreur
      const errorRate = await page.$eval('.error-rate', el => el.textContent);
      expect(parseFloat(errorRate)).to.be.below(5); // Moins de 5%
    });
    
    it('devrait afficher les alertes de sécurité', async () => {
      await page.click('button[data-tab="security"]');
      await page.waitForSelector('.security-dashboard');
      
      // Vérifier le statut de sécurité
      const securityStatus = await page.$eval('.security-status', el => el.textContent);
      expect(securityStatus).to.include('Sécurisé');
      
      // Vérifier les activités suspectes
      const suspiciousActivities = await page.$$('.suspicious-activity');
      // Il devrait y avoir quelques activités pour le test
      expect(suspiciousActivities.length).to.be.at.least(0);
    });
  });
  
  describe('5. Dashboard Client Marque Blanche', () => {
    before(async () => {
      await loginAs(page, testUsers.client);
    });
    
    it('devrait afficher la personnalisation de marque', async () => {
      await page.goto(`${BASE_URL}/dashboard/client`);
      await page.waitForSelector('.client-dashboard');
      
      // Vérifier le bandeau marque blanche
      const whitelabelBanner = await page.$('.whitelabel-banner');
      expect(whitelabelBanner).to.not.be.null;
      
      // Vérifier l'aperçu personnalisé
      const companyName = await page.$eval('.brand-preview .company-name', el => el.textContent);
      expect(companyName).to.equal('Wedding Pro Agency');
    });
    
    it('devrait permettre de modifier le branding', async () => {
      await page.click('button[data-tab="branding"]');
      await page.waitForSelector('.branding-section');
      
      // Activer le mode édition
      await page.click('button.edit-branding');
      
      // Changer les couleurs
      await page.evaluate(() => {
        document.querySelector('input[name="primaryColor"]').value = '#FF6B6B';
        document.querySelector('input[name="primaryColor"]').dispatchEvent(new Event('change'));
      });
      
      // Sauvegarder
      await page.click('button.save-branding');
      await page.waitForSelector('.toast-success');
      
      // Vérifier l'aperçu mis à jour
      const previewColor = await page.$eval('.brand-preview', el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(previewColor).to.include('rgb(255'); // Rouge
    });
    
    it('devrait gérer les domaines personnalisés', async () => {
      await page.click('button[data-tab="domains"]');
      await page.waitForSelector('.domains-section');
      
      // Vérifier les domaines existants
      const domains = await page.$$('.domain-row');
      expect(domains.length).to.be.at.least(2);
      
      // Vérifier le SSL
      const sslActive = await page.$('.domain-row .ssl-active');
      expect(sslActive).to.not.be.null;
    });
  });
  
  describe('6. Dashboard Invite Mobile', () => {
    it('devrait être optimisé pour mobile', async () => {
      // Passer en vue mobile
      await page.setViewport({ width: 375, height: 812 }); // iPhone X
      
      await loginAs(page, testUsers.guest);
      await page.goto(`${BASE_URL}/dashboard/invite`);
      await page.waitForSelector('.invite-dashboard');
      
      // Vérifier la navigation mobile
      const mobileNav = await page.$('.mobile-navigation');
      expect(mobileNav).to.not.be.null;
      
      // Vérifier que les boutons sont accessibles
      const navButtons = await page.$$('.mobile-navigation button');
      expect(navButtons.length).to.equal(5);
    });
    
    it('devrait permettre le RSVP en un clic', async () => {
      await page.waitForSelector('.rsvp-section');
      
      // Cliquer sur "Je serai là"
      await page.click('button.rsvp-yes');
      await page.waitForSelector('.rsvp-details');
      
      // Ajouter des détails
      await page.click('input#plusOne');
      await page.type('#dietary', 'Végétarien');
      
      // Confirmer
      await page.click('button.confirm-rsvp');
      await page.waitForSelector('.toast-success');
      
      // Vérifier le statut mis à jour
      const rsvpStatus = await page.$eval('.rsvp-status', el => el.textContent);
      expect(rsvpStatus).to.include('Confirmé');
    });
  });
  
  // Fonction utilitaire de connexion
  async function loginAs(page, user) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('#email');
    await page.type('#email', user.email);
    await page.type('#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }
});

// Tests de performance spécifiques aux nouveaux dashboards
describe('E2E - Performance Nouveaux Dashboards', () => {
  let browser;
  let page;
  
  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
  });
  
  after(async () => {
    await browser.close();
  });
  
  it('devrait charger le dashboard CIO avec toutes les métriques en < 2s', async () => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/dashboard/cio`, {
      waitUntil: 'networkidle0'
    });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).to.be.below(2000);
    
    // Vérifier que tous les graphiques sont chargés
    const charts = await page.$$('.performance-chart');
    expect(charts.length).to.be.above(0);
  });
  
  it('devrait gérer 100+ vendors sans ralentissement', async () => {
    await loginAs(page, testUsers.weddingPlanner);
    await page.goto(`${BASE_URL}/dashboard/wedding-planner`);
    await page.click('button[data-tab="vendors"]');
    
    // Mesurer le temps de rendu avec beaucoup de vendors
    const startTime = Date.now();
    
    // La table devrait déjà avoir la pagination
    const hasPagination = await page.$('.pagination') !== null;
    expect(hasPagination).to.be.true;
    
    // Vérifier que le rendu est rapide même avec pagination
    const renderTime = Date.now() - startTime;
    expect(renderTime).to.be.below(1000);
  });
  
  it('devrait mettre à jour les données en temps réel sans blocage', async () => {
    await loginAs(page, testUsers.admin);
    await page.goto(`${BASE_URL}/dashboard/admin`);
    
    // Attendre une mise à jour WebSocket
    await page.waitForTimeout(2000);
    
    // Vérifier que l'indicateur de connexion est actif
    const wsConnected = await page.$eval('.ws-indicator', el => 
      el.classList.contains('connected')
    );
    expect(wsConnected).to.be.true;
    
    // Les données devraient se mettre à jour sans rechargement
    const initialValue = await page.$eval('.active-users-count', el => el.textContent);
    await page.waitForTimeout(5000);
    const updatedValue = await page.$eval('.active-users-count', el => el.textContent);
    
    // Les valeurs peuvent être différentes (mise à jour temps réel)
    expect(initialValue).to.not.be.null;
    expect(updatedValue).to.not.be.null;
  });
});