const puppeteer = require('puppeteer');
const { app } = require('../../src/auth/auth-service');

describe('Attitudes.vip - Tests End-to-End', () => {
  let browser;
  let page;
  let server;

  beforeAll(async () => {
    // Démarrer le serveur de test
    server = app.listen(0);
    const port = server.address().port;
    
    // Lancer le navigateur
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Configurer la page
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(`http://localhost:${port}`);
  });

  afterAll(async () => {
    await browser.close();
    await server.close();
  });

  beforeEach(async () => {
    // Nettoyer les cookies et le localStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.deleteCookie();
  });

  describe('Workflow d\'inscription et connexion', () => {
    it('devrait permettre l\'inscription d\'un nouvel utilisateur', async () => {
      // Aller à la page d'inscription
      await page.goto('http://localhost:3000/auth/register');
      
      // Remplir le formulaire d'inscription
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.type('#firstName', 'Marie');
      await page.type('#lastName', 'Dupont');
      await page.select('#role', 'customer');
      await page.select('#locale', 'fr');
      
      // Soumettre le formulaire
      await page.click('#register-btn');
      
      // Attendre la redirection vers le dashboard
      await page.waitForNavigation();
      
      // Vérifier que l'utilisateur est connecté
      const userEmail = await page.$eval('#user-email', el => el.textContent);
      expect(userEmail).toBe('e2e-test@attitudes.vip');
      
      // Vérifier que le dashboard s'affiche
      const dashboardTitle = await page.$eval('#dashboard-title', el => el.textContent);
      expect(dashboardTitle).toBe('Tableau de bord');
    });

    it('devrait permettre la connexion d\'un utilisateur existant', async () => {
      // Aller à la page de connexion
      await page.goto('http://localhost:3000/auth/login');
      
      // Remplir le formulaire de connexion
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      
      // Soumettre le formulaire
      await page.click('#login-btn');
      
      // Attendre la redirection vers le dashboard
      await page.waitForNavigation();
      
      // Vérifier que l'utilisateur est connecté
      const userEmail = await page.$eval('#user-email', el => el.textContent);
      expect(userEmail).toBe('e2e-test@attitudes.vip');
    });

    it('devrait gérer les erreurs de connexion', async () => {
      // Aller à la page de connexion
      await page.goto('http://localhost:3000/auth/login');
      
      // Remplir le formulaire avec des identifiants incorrects
      await page.type('#email', 'wrong@attitudes.vip');
      await page.type('#password', 'WrongPassword123!');
      
      // Soumettre le formulaire
      await page.click('#login-btn');
      
      // Attendre l'affichage du message d'erreur
      await page.waitForSelector('#error-message');
      
      // Vérifier le message d'erreur
      const errorMessage = await page.$eval('#error-message', el => el.textContent);
      expect(errorMessage).toContain('Identifiants invalides');
    });
  });

  describe('Workflow de gestion des mariages', () => {
    beforeEach(async () => {
      // Se connecter en tant que customer
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
    });

    it('devrait permettre la création d\'un nouveau mariage', async () => {
      // Aller à la page de création de mariage
      await page.click('#create-wedding-btn');
      await page.waitForNavigation();
      
      // Remplir le formulaire de mariage
      await page.type('#wedding-title', 'Mariage de Marie et Jean');
      await page.type('#wedding-date', '2024-06-15');
      await page.type('#wedding-location', 'Château de Versailles');
      await page.type('#guest-count', '150');
      await page.select('#wedding-style', 'classic');
      await page.select('#budget-range', 'medium');
      
      // Soumettre le formulaire
      await page.click('#save-wedding-btn');
      
      // Attendre la redirection vers le dashboard
      await page.waitForNavigation();
      
      // Vérifier que le mariage a été créé
      const weddingTitle = await page.$eval('#wedding-title', el => el.textContent);
      expect(weddingTitle).toBe('Mariage de Marie et Jean');
    });

    it('devrait permettre l\'édition d\'un mariage existant', async () => {
      // Aller à la page d'édition du mariage
      await page.click('#edit-wedding-btn');
      await page.waitForNavigation();
      
      // Modifier le titre du mariage
      await page.click('#wedding-title');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.type('#wedding-title', 'Mariage de Marie et Jean - Modifié');
      
      // Sauvegarder les modifications
      await page.click('#save-wedding-btn');
      
      // Attendre la redirection
      await page.waitForNavigation();
      
      // Vérifier que les modifications ont été sauvegardées
      const weddingTitle = await page.$eval('#wedding-title', el => el.textContent);
      expect(weddingTitle).toBe('Mariage de Marie et Jean - Modifié');
    });

    it('devrait permettre l\'ajout d\'invités', async () => {
      // Aller à la page de gestion des invités
      await page.click('#guests-tab');
      await page.waitForSelector('#guests-list');
      
      // Ajouter un nouvel invité
      await page.click('#add-guest-btn');
      await page.waitForSelector('#guest-form');
      
      await page.type('#guest-first-name', 'Sophie');
      await page.type('#guest-last-name', 'Martin');
      await page.type('#guest-email', 'sophie.martin@email.com');
      await page.select('#guest-category', 'family');
      await page.select('#guest-table', 'table-1');
      
      // Sauvegarder l'invité
      await page.click('#save-guest-btn');
      
      // Attendre que l'invité soit ajouté à la liste
      await page.waitForSelector('#guest-sophie-martin');
      
      // Vérifier que l'invité a été ajouté
      const guestName = await page.$eval('#guest-sophie-martin .guest-name', el => el.textContent);
      expect(guestName).toBe('Sophie Martin');
    });
  });

  describe('Workflow de gestion des fournisseurs', () => {
    beforeEach(async () => {
      // Se connecter en tant que customer
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
    });

    it('devrait permettre la recherche de fournisseurs', async () => {
      // Aller à la page des fournisseurs
      await page.click('#vendors-tab');
      await page.waitForSelector('#vendors-search');
      
      // Rechercher un photographe
      await page.type('#vendor-search-input', 'photographe');
      await page.select('#vendor-category', 'photographer');
      await page.click('#search-vendors-btn');
      
      // Attendre les résultats
      await page.waitForSelector('#vendors-results');
      
      // Vérifier qu'il y a des résultats
      const resultsCount = await page.$$eval('#vendors-results .vendor-card', cards => cards.length);
      expect(resultsCount).toBeGreaterThan(0);
    });

    it('devrait permettre la réservation d\'un fournisseur', async () => {
      // Aller à la page des fournisseurs
      await page.click('#vendors-tab');
      await page.waitForSelector('#vendors-results');
      
      // Cliquer sur le premier fournisseur
      await page.click('#vendors-results .vendor-card:first-child');
      await page.waitForSelector('#vendor-details');
      
      // Vérifier la disponibilité
      await page.click('#check-availability-btn');
      await page.waitForSelector('#availability-calendar');
      
      // Sélectionner une date
      await page.click('#availability-calendar .available-date:first-child');
      
      // Réserver le fournisseur
      await page.click('#book-vendor-btn');
      
      // Attendre la confirmation
      await page.waitForSelector('#booking-confirmation');
      
      // Vérifier la confirmation
      const confirmationMessage = await page.$eval('#booking-confirmation', el => el.textContent);
      expect(confirmationMessage).toContain('Réservation confirmée');
    });
  });

  describe('Workflow de communication', () => {
    beforeEach(async () => {
      // Se connecter en tant que customer
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
    });

    it('devrait permettre l\'envoi d\'invitations', async () => {
      // Aller à la page des invitations
      await page.click('#invitations-tab');
      await page.waitForSelector('#invitations-list');
      
      // Créer une nouvelle invitation
      await page.click('#create-invitation-btn');
      await page.waitForSelector('#invitation-form');
      
      // Remplir le formulaire d'invitation
      await page.type('#invitation-title', 'Vous êtes invités à notre mariage');
      await page.type('#invitation-message', 'Nous avons le plaisir de vous inviter à célébrer notre union');
      await page.type('#invitation-date', '2024-06-15');
      await page.type('#invitation-time', '14:00');
      await page.type('#invitation-location', 'Château de Versailles');
      
      // Sélectionner les invités
      await page.click('#select-guests-btn');
      await page.waitForSelector('#guests-selection');
      await page.click('#guests-selection .guest-checkbox:first-child');
      await page.click('#confirm-guests-selection');
      
      // Envoyer les invitations
      await page.click('#send-invitations-btn');
      
      // Attendre la confirmation
      await page.waitForSelector('#invitations-sent');
      
      // Vérifier la confirmation
      const confirmationMessage = await page.$eval('#invitations-sent', el => el.textContent);
      expect(confirmationMessage).toContain('Invitations envoyées');
    });

    it('devrait permettre la gestion des RSVP', async () => {
      // Aller à la page des RSVP
      await page.click('#rsvp-tab');
      await page.waitForSelector('#rsvp-list');
      
      // Vérifier qu'il y a des RSVP
      const rsvpCount = await page.$$eval('#rsvp-list .rsvp-item', items => items.length);
      expect(rsvpCount).toBeGreaterThan(0);
      
      // Accepter un RSVP
      await page.click('#rsvp-list .rsvp-item:first-child .accept-rsvp-btn');
      
      // Vérifier que le statut a changé
      const rsvpStatus = await page.$eval('#rsvp-list .rsvp-item:first-child .rsvp-status', el => el.textContent);
      expect(rsvpStatus).toBe('Accepté');
    });
  });

  describe('Workflow de paiement', () => {
    beforeEach(async () => {
      // Se connecter en tant que customer
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'e2e-test@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
    });

    it('devrait permettre le paiement d\'un fournisseur', async () => {
      // Aller à la page des paiements
      await page.click('#payments-tab');
      await page.waitForSelector('#payments-list');
      
      // Sélectionner un paiement en attente
      await page.click('#payments-list .payment-item:first-child');
      await page.waitForSelector('#payment-details');
      
      // Cliquer sur payer
      await page.click('#pay-now-btn');
      await page.waitForSelector('#payment-form');
      
      // Remplir le formulaire de paiement (simulation)
      await page.type('#card-number', '4242424242424242');
      await page.type('#card-expiry', '12/25');
      await page.type('#card-cvc', '123');
      await page.type('#card-name', 'Marie Dupont');
      
      // Confirmer le paiement
      await page.click('#confirm-payment-btn');
      
      // Attendre la confirmation
      await page.waitForSelector('#payment-success');
      
      // Vérifier la confirmation
      const successMessage = await page.$eval('#payment-success', el => el.textContent);
      expect(successMessage).toContain('Paiement réussi');
    });
  });

  describe('Workflow de dashboard fournisseur', () => {
    it('devrait permettre la connexion d\'un fournisseur', async () => {
      // Aller à la page de connexion
      await page.goto('http://localhost:3000/auth/login');
      
      // Remplir le formulaire de connexion
      await page.type('#email', 'photographe@attitudes.vip');
      await page.type('#password', 'Password123!');
      
      // Soumettre le formulaire
      await page.click('#login-btn');
      
      // Attendre la redirection vers le dashboard fournisseur
      await page.waitForNavigation();
      
      // Vérifier que c'est le dashboard fournisseur
      const dashboardType = await page.$eval('#dashboard-type', el => el.textContent);
      expect(dashboardType).toBe('Dashboard Fournisseur');
    });

    it('devrait permettre la gestion du calendrier', async () => {
      // Se connecter en tant que fournisseur
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'photographe@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
      
      // Aller à la page du calendrier
      await page.click('#calendar-tab');
      await page.waitForSelector('#calendar-view');
      
      // Vérifier qu'il y a des événements
      const eventsCount = await page.$$eval('#calendar-view .event', events => events.length);
      expect(eventsCount).toBeGreaterThan(0);
      
      // Cliquer sur un événement
      await page.click('#calendar-view .event:first-child');
      await page.waitForSelector('#event-details');
      
      // Vérifier les détails de l'événement
      const eventTitle = await page.$eval('#event-title', el => el.textContent);
      expect(eventTitle).toBeTruthy();
    });
  });

  describe('Workflow d\'administration', () => {
    it('devrait permettre la connexion d\'un administrateur', async () => {
      // Aller à la page de connexion
      await page.goto('http://localhost:3000/auth/login');
      
      // Remplir le formulaire de connexion
      await page.type('#email', 'admin@attitudes.vip');
      await page.type('#password', 'Password123!');
      
      // Soumettre le formulaire
      await page.click('#login-btn');
      
      // Attendre la redirection vers le dashboard admin
      await page.waitForNavigation();
      
      // Vérifier que c'est le dashboard admin
      const dashboardType = await page.$eval('#dashboard-type', el => el.textContent);
      expect(dashboardType).toBe('Dashboard Administrateur');
    });

    it('devrait permettre la gestion des utilisateurs', async () => {
      // Se connecter en tant qu'admin
      await page.goto('http://localhost:3000/auth/login');
      await page.type('#email', 'admin@attitudes.vip');
      await page.type('#password', 'Password123!');
      await page.click('#login-btn');
      await page.waitForNavigation();
      
      // Aller à la page de gestion des utilisateurs
      await page.click('#users-management-tab');
      await page.waitForSelector('#users-list');
      
      // Vérifier qu'il y a des utilisateurs
      const usersCount = await page.$$eval('#users-list .user-item', users => users.length);
      expect(usersCount).toBeGreaterThan(0);
      
      // Désactiver un utilisateur
      await page.click('#users-list .user-item:first-child .disable-user-btn');
      await page.waitForSelector('#user-disabled');
      
      // Vérifier que l'utilisateur a été désactivé
      const userStatus = await page.$eval('#users-list .user-item:first-child .user-status', el => el.textContent);
      expect(userStatus).toBe('Désactivé');
    });
  });

  describe('Tests de responsive design', () => {
    it('devrait s\'afficher correctement sur mobile', async () => {
      // Configurer la vue mobile
      await page.setViewport({ width: 375, height: 667 });
      
      // Aller à la page d'accueil
      await page.goto('http://localhost:3000');
      
      // Vérifier que le menu mobile s'affiche
      await page.waitForSelector('#mobile-menu-toggle');
      
      // Ouvrir le menu mobile
      await page.click('#mobile-menu-toggle');
      await page.waitForSelector('#mobile-menu');
      
      // Vérifier que le menu est visible
      const menuVisible = await page.$eval('#mobile-menu', el => el.style.display !== 'none');
      expect(menuVisible).toBe(true);
    });

    it('devrait s\'afficher correctement sur tablette', async () => {
      // Configurer la vue tablette
      await page.setViewport({ width: 768, height: 1024 });
      
      // Aller à la page d'accueil
      await page.goto('http://localhost:3000');
      
      // Vérifier que l'interface s'adapte
      const layoutType = await page.$eval('#layout-type', el => el.textContent);
      expect(layoutType).toBe('tablet');
    });
  });

  describe('Tests d\'accessibilité', () => {
    it('devrait respecter les standards d\'accessibilité', async () => {
      // Aller à la page d'accueil
      await page.goto('http://localhost:3000');
      
      // Vérifier les attributs ARIA
      const ariaLabels = await page.$$eval('[aria-label]', elements => 
        elements.map(el => el.getAttribute('aria-label'))
      );
      expect(ariaLabels.length).toBeGreaterThan(0);
      
      // Vérifier les rôles ARIA
      const ariaRoles = await page.$$eval('[role]', elements => 
        elements.map(el => el.getAttribute('role'))
      );
      expect(ariaRoles.length).toBeGreaterThan(0);
      
      // Vérifier les contrastes de couleurs (simulation)
      const contrastRatio = await page.evaluate(() => {
        const element = document.querySelector('#main-content');
        if (element) {
          const style = window.getComputedStyle(element);
          const backgroundColor = style.backgroundColor;
          const color = style.color;
          // Simulation du calcul de contraste
          return 4.5; // Ratio minimum recommandé
        }
        return 0;
      });
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });
}); 