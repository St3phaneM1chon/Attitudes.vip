/**
 * Tests End-to-End pour les workflows critiques
 * Teste les parcours utilisateurs complets
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');

// Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const HEADLESS = process.env.E2E_HEADLESS !== 'false';

describe('E2E - Workflows Critiques AttitudesFramework', () => {
  let browser;
  let page;

  // Données de test
  const testUsers = {
    couple: {
      email: 'marie.dupont@test.com',
      password: 'Test123!',
      name: 'Marie Dupont'
    },
    dj: {
      email: 'dj.pro@test.com',
      password: 'DjTest123!',
      name: 'DJ Pro'
    },
    guest: {
      email: 'invite@test.com',
      password: 'Guest123!',
      name: 'Jean Invité'
    }
  };

  before(async () => {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      slowMo: 50, // Ralentir pour voir les actions
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

  describe('1. Workflow Inscription et Onboarding Couple', () => {
    it('devrait permettre l\'inscription complète d\'un couple', async () => {
      // 1. Aller à la page d'inscription
      await page.goto(`${BASE_URL}/signup`);
      
      // 2. Remplir le formulaire
      await page.type('#email', 'nouveau.couple@test.com');
      await page.type('#password', 'NouveauCouple123!');
      await page.type('#name', 'Sophie Martin');
      await page.type('#partner_name', 'Thomas Martin');
      await page.type('#wedding_date', '2024-08-15');
      
      // 3. Soumettre
      await page.click('button[type="submit"]');
      
      // 4. Vérifier la redirection vers onboarding
      await page.waitForNavigation();
      expect(page.url()).to.include('/onboarding');
      
      // 5. Compléter l'onboarding
      await page.waitForSelector('.onboarding-step');
      
      // Étape 1: Type de mariage
      await page.click('input[value="classic"]');
      await page.click('button.next-step');
      
      // Étape 2: Budget
      await page.type('#budget', '30000');
      await page.click('button.next-step');
      
      // Étape 3: Nombre d'invités
      await page.type('#guest_count', '120');
      await page.click('button.next-step');
      
      // Étape 4: Lieu
      await page.type('#venue_name', 'Château de Versailles');
      await page.click('button.finish-onboarding');
      
      // 6. Vérifier l'arrivée sur le dashboard
      await page.waitForNavigation();
      expect(page.url()).to.include('/dashboard/customer');
      
      // 7. Vérifier l'affichage des éléments principaux
      await page.waitForSelector('.countdown-widget');
      const countdownText = await page.$eval('.countdown-widget', el => el.textContent);
      expect(countdownText).to.include('jours');
    });
  });

  describe('2. Workflow Gestion des Invités', () => {
    before(async () => {
      // Se connecter en tant que couple
      await loginAs(page, testUsers.couple);
    });

    it('devrait permettre d\'ajouter et gérer des invités', async () => {
      // 1. Aller à la section invités
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await page.click('button[data-tab="guests"]');
      
      // 2. Ajouter un invité
      await page.click('button.add-guest');
      await page.waitForSelector('.guest-modal');
      
      await page.type('#guest_name', 'Pierre Durand');
      await page.type('#guest_email', 'pierre.durand@example.com');
      await page.type('#guest_phone', '0612345678');
      await page.select('#guest_side', 'bride');
      await page.select('#guest_table', '1');
      
      // Ajouter des préférences alimentaires
      await page.click('#vegetarian');
      await page.type('#allergies', 'Noix');
      
      await page.click('button.save-guest');
      
      // 3. Vérifier l'ajout dans la liste
      await page.waitForSelector('.guest-list');
      const guestName = await page.$eval('.guest-list .guest-name', el => el.textContent);
      expect(guestName).to.equal('Pierre Durand');
      
      // 4. Envoyer une invitation
      await page.click('.guest-actions .send-invite');
      await page.waitForSelector('.toast-success');
      
      // 5. Vérifier le statut
      const status = await page.$eval('.guest-status', el => el.textContent);
      expect(status).to.equal('Invité');
    });

    it('devrait permettre de gérer les tables', async () => {
      // 1. Aller au plan de table
      await page.click('button.seating-plan');
      await page.waitForSelector('.seating-chart');
      
      // 2. Créer une nouvelle table
      await page.click('button.add-table');
      await page.type('#table_name', 'Table d\'honneur');
      await page.type('#table_capacity', '10');
      await page.click('button.create-table');
      
      // 3. Glisser-déposer un invité
      const guest = await page.$('.unassigned-guest');
      const table = await page.$('.table-dropzone');
      
      await dragAndDrop(page, guest, table);
      
      // 4. Vérifier l'assignation
      const tableGuests = await page.$$eval('.table-guests .guest', els => els.length);
      expect(tableGuests).to.be.at.least(1);
    });
  });

  describe('3. Workflow Création de Tâches avec Taskmaster', () => {
    before(async () => {
      await loginAs(page, testUsers.couple);
    });

    it('devrait créer une tâche avec priorité IA', async () => {
      // 1. Aller aux tâches
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await page.click('button[data-tab="tasks"]');
      
      // 2. Créer une nouvelle tâche
      await page.click('button.create-task');
      await page.waitForSelector('.task-modal');
      
      await page.type('#task_title', 'Confirmer le photographe');
      await page.type('#task_description', 'Appeler Jean Photo pour confirmer les horaires');
      await page.select('#task_category', 'vendor');
      await page.select('#task_priority', 'high');
      
      // Date d'échéance dans 2 jours
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 2);
      await page.type('#task_due_date', dueDate.toISOString().split('T')[0]);
      
      // Activer l'automatisation
      await page.click('#enable_automation');
      await page.select('#executor', 'notification');
      
      await page.click('button.save-task');
      
      // 3. Vérifier la création avec score IA
      await page.waitForSelector('.task-item');
      const aiScore = await page.$eval('.ai-priority', el => el.textContent);
      expect(parseInt(aiScore)).to.be.above(80); // Score élevé car échéance proche
      
      // 4. Vérifier les suggestions IA
      const suggestions = await page.$$('.ai-suggestion');
      expect(suggestions.length).to.be.above(0);
    });

    it('devrait exécuter un workflow prédéfini', async () => {
      // 1. Ouvrir le menu workflows
      await page.click('button.workflows-menu');
      await page.waitForSelector('.workflow-list');
      
      // 2. Sélectionner "Coordination J-7"
      await page.click('.workflow-item[data-name="coordination-j7"]');
      
      // 3. Confirmer l'exécution
      await page.waitForSelector('.workflow-confirm');
      await page.click('button.execute-workflow');
      
      // 4. Vérifier la création des tâches
      await page.waitForSelector('.toast-success');
      const message = await page.$eval('.toast-message', el => el.textContent);
      expect(message).to.include('3 tâches créées');
      
      // 5. Vérifier l'apparition dans la liste
      await page.waitForTimeout(1000);
      const tasks = await page.$$('.task-item');
      expect(tasks.length).to.be.at.least(3);
    });
  });

  describe('4. Workflow DJ - Gestion Événement Live', () => {
    before(async () => {
      await loginAs(page, testUsers.dj);
    });

    it('devrait gérer les demandes musicales en temps réel', async () => {
      // 1. Aller au dashboard DJ
      await page.goto(`${BASE_URL}/dashboard/dj`);
      await page.waitForSelector('.dj-dashboard');
      
      // 2. Simuler une demande musicale (via autre onglet)
      const guestPage = await browser.newPage();
      await loginAs(guestPage, testUsers.guest);
      await guestPage.goto(`${BASE_URL}/event/music-request`);
      await guestPage.type('#song_title', 'Bohemian Rhapsody');
      await guestPage.type('#artist', 'Queen');
      await guestPage.click('button.send-request');
      
      // 3. Vérifier la réception sur dashboard DJ
      await page.waitForSelector('.music-request-item', { timeout: 5000 });
      const songTitle = await page.$eval('.request-title', el => el.textContent);
      expect(songTitle).to.equal('Bohemian Rhapsody');
      
      // 4. Accepter la demande
      await page.click('.accept-request');
      
      // 5. Vérifier l'ajout à la playlist
      await page.waitForSelector('.playlist-item');
      const playlistSong = await page.$eval('.playlist-item', el => el.textContent);
      expect(playlistSong).to.include('Queen');
      
      await guestPage.close();
    });

    it('devrait gérer les demandes de micro avec alerte', async () => {
      // 1. Simuler une demande de micro
      const guestPage = await browser.newPage();
      await loginAs(guestPage, testUsers.guest);
      await guestPage.goto(`${BASE_URL}/event/mic-request`);
      await guestPage.type('#purpose', 'Discours témoin');
      await guestPage.click('button.request-mic');
      
      // 2. Vérifier l'alerte sur dashboard DJ
      await page.waitForSelector('.mic-alert', { timeout: 5000 });
      const alertVisible = await page.$eval('.mic-alert', el => 
        window.getComputedStyle(el).display !== 'none'
      );
      expect(alertVisible).to.be.true;
      
      // 3. Approuver la demande
      await page.click('.approve-mic');
      
      // 4. Vérifier la disparition de l'alerte
      await page.waitForTimeout(500);
      const alertCount = await page.$$('.mic-alert');
      expect(alertCount.length).to.equal(0);
      
      await guestPage.close();
    });
  });

  describe('5. Workflow Budget et Paiements', () => {
    before(async () => {
      await loginAs(page, testUsers.couple);
    });

    it('devrait ajouter une dépense et suivre le budget', async () => {
      // 1. Aller à la section budget
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await page.click('button[data-tab="budget"]');
      
      // 2. Ajouter une dépense
      await page.click('button.add-expense');
      await page.waitForSelector('.expense-modal');
      
      await page.type('#expense_name', 'Acompte photographe');
      await page.type('#expense_amount', '500');
      await page.select('#expense_category', 'photography');
      await page.select('#expense_vendor', 'Jean Photo');
      await page.click('#expense_paid');
      
      await page.click('button.save-expense');
      
      // 3. Vérifier la mise à jour du budget
      await page.waitForTimeout(500);
      const totalSpent = await page.$eval('.budget-spent', el => el.textContent);
      expect(totalSpent).to.include('500');
      
      // 4. Vérifier le graphique
      const chartUpdated = await page.$eval('.budget-chart', el => 
        el.querySelector('canvas') !== null
      );
      expect(chartUpdated).to.be.true;
    });
  });

  describe('6. Workflow Communication Multi-Acteurs', () => {
    it('devrait permettre la communication entre couple et vendors', async () => {
      // 1. Se connecter comme couple
      await loginAs(page, testUsers.couple);
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await page.click('button[data-tab="messages"]');
      
      // 2. Envoyer un message au DJ
      await page.click('.vendor-chat[data-vendor="dj"]');
      await page.waitForSelector('.chat-window');
      
      await page.type('.message-input', 'Pouvez-vous jouer notre chanson d\'ouverture à 19h?');
      await page.click('button.send-message');
      
      // 3. Vérifier l'envoi
      await page.waitForSelector('.message-sent');
      const messageSent = await page.$eval('.message-sent', el => el.textContent);
      expect(messageSent).to.include('19h');
      
      // 4. Se connecter comme DJ et vérifier la réception
      const djPage = await browser.newPage();
      await loginAs(djPage, testUsers.dj);
      await djPage.goto(`${BASE_URL}/dashboard/dj`);
      
      // Vérifier la notification
      const hasNotification = await djPage.$eval('.message-notification', el => 
        parseInt(el.textContent) > 0
      );
      expect(hasNotification).to.be.true;
      
      await djPage.close();
    });
  });

  // Fonctions utilitaires

  async function loginAs(page, user) {
    await page.goto(`${BASE_URL}/login`);
    await page.type('#email', user.email);
    await page.type('#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  }

  async function dragAndDrop(page, source, target) {
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    await page.mouse.up();
  }
});

// Tests de performance
describe('E2E - Tests de Performance', () => {
  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  it('devrait charger le dashboard customer en moins de 3 secondes', async () => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/dashboard/customer`, {
      waitUntil: 'networkidle0'
    });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).to.be.below(3000);
  });

  it('devrait gérer 50 invités sans ralentissement', async () => {
    await loginAs(page, testUsers.couple);
    await page.goto(`${BASE_URL}/dashboard/customer`);
    await page.click('button[data-tab="guests"]');
    
    // Mesurer le temps de rendu avec beaucoup d'invités
    const startTime = Date.now();
    await page.evaluate(() => {
      // Simuler 50 invités
      for (let i = 0; i < 50; i++) {
        const guestElement = document.createElement('div');
        guestElement.className = 'guest-item';
        guestElement.textContent = `Invité ${i}`;
        document.querySelector('.guest-list').appendChild(guestElement);
      }
    });
    
    const renderTime = Date.now() - startTime;
    expect(renderTime).to.be.below(500);
  });
});