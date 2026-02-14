/**
 * Tests E2E pour les workflows mobiles
 * Teste l'expérience utilisateur sur mobile
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');
const config = require('./e2e.config');

describe('E2E Mobile - Workflows Critiques', () => {
  let browser;
  let page;

  // Configurations d'appareils mobiles
  const devices = {
    iPhoneX: {
      name: 'iPhone X',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38',
      viewport: {
        width: 375,
        height: 812,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      }
    },
    pixel5: {
      name: 'Pixel 5',
      userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36',
      viewport: {
        width: 393,
        height: 851,
        deviceScaleFactor: 2.75,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      }
    },
    iPadPro: {
      name: 'iPad Pro',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34',
      viewport: {
        width: 1024,
        height: 1366,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      }
    }
  };

  before(async () => {
    browser = await puppeteer.launch({
      headless: config.puppeteer.headless,
      args: [...config.puppeteer.args, '--window-size=400,900']
    });
  });

  after(async () => {
    await browser.close();
  });

  describe('Interface Mobile - iPhone X', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      await page.emulate(devices.iPhoneX);
    });

    afterEach(async () => {
      await page.close();
    });

    it('devrait afficher le menu burger sur mobile', async () => {
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Le menu principal doit être caché
      const desktopMenuVisible = await page.$eval('.desktop-nav', el => 
        window.getComputedStyle(el).display !== 'none'
      ).catch(() => false);
      expect(desktopMenuVisible).to.be.false;
      
      // Le burger menu doit être visible
      await page.waitForSelector('.mobile-menu-toggle');
      const burgerVisible = await page.$eval('.mobile-menu-toggle', el => 
        window.getComputedStyle(el).display !== 'none'
      );
      expect(burgerVisible).to.be.true;
    });

    it('devrait permettre la navigation tactile', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Ouvrir le menu mobile
      await page.tap('.mobile-menu-toggle');
      await page.waitForSelector('.mobile-menu.open');
      
      // Naviguer vers les invités
      await page.tap('.mobile-menu-item[data-section="guests"]');
      
      // Vérifier le changement de section
      await page.waitForSelector('.guests-section');
      const sectionTitle = await page.$eval('.section-title', el => el.textContent);
      expect(sectionTitle).to.include('Invités');
    });

    it('devrait adapter le formulaire d\'ajout d\'invité pour mobile', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Aller aux invités
      await page.tap('.quick-action-guests');
      await page.waitForSelector('.guests-section');
      
      // Ouvrir le formulaire d'ajout
      await page.tap('.add-guest-fab'); // Floating Action Button
      await page.waitForSelector('.mobile-modal');
      
      // Vérifier que le formulaire est en plein écran
      const modalHeight = await page.$eval('.mobile-modal', el => el.offsetHeight);
      const viewportHeight = 812; // iPhone X height
      expect(modalHeight).to.be.at.least(viewportHeight * 0.9);
      
      // Remplir le formulaire avec des gestes tactiles
      await page.tap('#guest_name');
      await page.type('#guest_name', 'Marie Mobile');
      
      // Scroller pour voir le bouton sauvegarder
      await page.evaluate(() => {
        document.querySelector('.modal-save').scrollIntoView();
      });
      
      await page.tap('.modal-save');
      
      // Vérifier l'ajout
      await page.waitForSelector('.guest-card');
      const guestName = await page.$eval('.guest-card .guest-name', el => el.textContent);
      expect(guestName).to.equal('Marie Mobile');
    });

    it('devrait gérer le swipe pour les actions', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Aller aux tâches
      await page.tap('.quick-action-tasks');
      await page.waitForSelector('.tasks-section');
      
      // Simuler un swipe sur une tâche
      const task = await page.$('.task-item');
      const box = await task.boundingBox();
      
      await page.touchscreen.drag({
        x: box.x + box.width - 50,
        y: box.y + box.height / 2
      }, {
        x: box.x + 50,
        y: box.y + box.height / 2
      });
      
      // Vérifier l'apparition des actions
      await page.waitForSelector('.task-actions-revealed');
      const actionsVisible = await page.$('.task-action-complete');
      expect(actionsVisible).to.not.be.null;
    });
  });

  describe('Interface Tablette - iPad Pro', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      await page.emulate(devices.iPadPro);
    });

    afterEach(async () => {
      await page.close();
    });

    it('devrait afficher une interface adaptée tablette', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Vérifier le layout 2 colonnes
      const hasTabletLayout = await page.$eval('.dashboard-container', el => 
        window.getComputedStyle(el).display === 'grid' &&
        window.getComputedStyle(el).gridTemplateColumns.includes('1fr 1fr')
      );
      expect(hasTabletLayout).to.be.true;
      
      // Vérifier que les widgets sont bien disposés
      const widgets = await page.$$('.dashboard-widget');
      expect(widgets.length).to.be.at.least(4);
    });

    it('devrait permettre le drag & drop tactile pour le plan de table', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Aller au plan de table
      await page.tap('[data-tab="seating"]');
      await page.waitForSelector('.seating-plan');
      
      // Sélectionner un invité et une table
      const guest = await page.$('.unassigned-guest');
      const table = await page.$('.table-dropzone');
      
      const guestBox = await guest.boundingBox();
      const tableBox = await table.boundingBox();
      
      // Simuler un drag & drop tactile
      await page.touchscreen.drag(
        { x: guestBox.x + guestBox.width / 2, y: guestBox.y + guestBox.height / 2 },
        { x: tableBox.x + tableBox.width / 2, y: tableBox.y + tableBox.height / 2 }
      );
      
      // Vérifier l'assignation
      await page.waitForTimeout(500);
      const assignedGuests = await page.$$('.table-guest');
      expect(assignedGuests.length).to.be.at.least(1);
    });
  });

  describe('DJ Dashboard - Mode Tablette Paysage', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      // iPad en mode paysage
      await page.setViewport({
        width: 1366,
        height: 1024,
        isMobile: true,
        hasTouch: true,
        isLandscape: true
      });
    });

    afterEach(async () => {
      await page.close();
    });

    it('devrait forcer l\'orientation paysage', async () => {
      await loginAsMobile(page, config.testUsers.dj);
      await page.goto(`${config.baseUrl}/dashboard/dj`);
      
      // Vérifier le message si en portrait
      await page.setViewport({
        width: 1024,
        height: 1366,
        isMobile: true,
        hasTouch: true,
        isLandscape: false
      });
      
      await page.waitForSelector('.orientation-warning');
      const warningText = await page.$eval('.orientation-warning', el => el.textContent);
      expect(warningText).to.include('paysage');
    });

    it('devrait gérer les gestes tactiles pour les demandes', async () => {
      await loginAsMobile(page, config.testUsers.dj);
      await page.goto(`${config.baseUrl}/dashboard/dj`);
      
      // Attendre une demande musicale (simulée)
      await page.evaluate(() => {
        window.simulateMusicRequest({
          id: 'test-1',
          song_title: 'Test Song',
          artist: 'Test Artist',
          guest_name: 'Guest Test'
        });
      });
      
      await page.waitForSelector('.music-request-item');
      
      // Accepter avec un tap
      await page.tap('.accept-request');
      
      // Vérifier la disparition
      await page.waitForTimeout(500);
      const requests = await page.$$('.music-request-item');
      expect(requests.length).to.equal(0);
    });

    it('devrait afficher correctement sur tablette 10 pouces', async () => {
      // Simuler une tablette 10 pouces standard
      await page.setViewport({
        width: 1280,
        height: 800,
        isMobile: true,
        hasTouch: true,
        isLandscape: true
      });
      
      await loginAsMobile(page, config.testUsers.dj);
      await page.goto(`${config.baseUrl}/dashboard/dj`);
      
      // Vérifier que les 3 colonnes sont visibles
      const columns = await page.$$('.dj-column');
      expect(columns.length).to.equal(3);
      
      // Vérifier que les éléments ne sont pas tronqués
      const isOverflowing = await page.evaluate(() => {
        const elements = document.querySelectorAll('.dj-column');
        return Array.from(elements).some(el => el.scrollHeight > el.clientHeight);
      });
      expect(isOverflowing).to.be.false;
    });
  });

  describe('Performance Mobile', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      await page.emulate(devices.iPhoneX);
    });

    afterEach(async () => {
      await page.close();
    });

    it('devrait charger rapidement sur 3G', async () => {
      // Simuler une connexion 3G
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 150 // 150ms
      });
      
      const startTime = Date.now();
      await page.goto(`${config.baseUrl}/dashboard/customer`, {
        waitUntil: 'networkidle0'
      });
      const loadTime = Date.now() - startTime;
      
      // Devrait charger en moins de 5 secondes sur 3G
      expect(loadTime).to.be.below(5000);
    });

    it('devrait utiliser le lazy loading pour les images', async () => {
      await loginAsMobile(page, config.testUsers.couple);
      await page.goto(`${config.baseUrl}/dashboard/customer`);
      
      // Vérifier que les images ont l'attribut loading="lazy"
      const images = await page.$$eval('img', imgs => 
        imgs.map(img => img.getAttribute('loading'))
      );
      
      const lazyImages = images.filter(loading => loading === 'lazy');
      expect(lazyImages.length).to.be.at.least(1);
    });

    it('devrait avoir un viewport meta correct', async () => {
      await page.goto(config.baseUrl);
      
      const viewport = await page.$eval('meta[name="viewport"]', el => 
        el.getAttribute('content')
      );
      
      expect(viewport).to.include('width=device-width');
      expect(viewport).to.include('initial-scale=1');
      expect(viewport).to.include('user-scalable=no'); // Pour éviter le zoom accidentel
    });
  });

  // Fonctions utilitaires pour mobile
  async function loginAsMobile(page, user) {
    await page.goto(`${config.baseUrl}/login`);
    
    // Utiliser tap au lieu de click pour mobile
    await page.tap('#email');
    await page.type('#email', user.email);
    
    await page.tap('#password');
    await page.type('#password', user.password);
    
    await page.tap('button[type="submit"]');
    await page.waitForNavigation();
  }
});

// Tests spécifiques PWA
describe('E2E - Progressive Web App', () => {
  let browser;
  let page;

  before(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--enable-features=WebAppInstallation']
    });
  });

  after(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  it('devrait avoir un manifeste PWA valide', async () => {
    await page.goto(config.baseUrl);
    
    const manifest = await page.$eval('link[rel="manifest"]', el => 
      el.getAttribute('href')
    );
    expect(manifest).to.not.be.null;
    
    // Vérifier le contenu du manifeste
    const response = await page.goto(`${config.baseUrl}${manifest}`);
    const manifestContent = await response.json();
    
    expect(manifestContent.name).to.equal('Attitudes.vip');
    expect(manifestContent.start_url).to.exist;
    expect(manifestContent.display).to.equal('standalone');
    expect(manifestContent.icons).to.have.length.at.least(1);
  });

  it('devrait fonctionner en mode offline (service worker)', async () => {
    // Charger la page une première fois
    await page.goto(`${config.baseUrl}/dashboard/customer`);
    
    // Attendre que le service worker soit actif
    await page.waitForTimeout(2000);
    
    // Passer en mode offline
    await page.setOfflineMode(true);
    
    // Recharger la page
    await page.reload();
    
    // Vérifier qu'une version cache est affichée
    const offlineMessage = await page.$('.offline-banner');
    expect(offlineMessage).to.not.be.null;
  });
});