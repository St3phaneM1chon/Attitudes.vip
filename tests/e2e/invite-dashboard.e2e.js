/**
 * Tests E2E pour Dashboard Invite
 * Tests complets du parcours invité
 */

import { test, expect } from '@playwright/test';

// Configuration de base
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const INVITE_TOKEN = 'test-invite-token-123';

// Helper pour accéder au dashboard invité
async function accessInviteDashboard(page, token = INVITE_TOKEN) {
  await page.goto(`${BASE_URL}/invite/${token}`);
  await page.waitForSelector('[data-testid="invite-dashboard"]', { state: 'visible' });
}

test.describe('Dashboard Invite E2E', () => {
  test.describe('Accès et Navigation', () => {
    test('devrait accéder au dashboard avec un token valide', async ({ page }) => {
      await accessInviteDashboard(page);
      
      // Vérifier les éléments principaux
      await expect(page.locator('h1')).toContainText(/Marie & Pierre/);
      await expect(page.locator('[data-testid="wedding-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="countdown-timer"]')).toBeVisible();
    });

    test('devrait afficher une erreur avec un token invalide', async ({ page }) => {
      await page.goto(`${BASE_URL}/invite/invalid-token`);
      
      await expect(page.locator('text=Invitation non trouvée')).toBeVisible();
      await expect(page.locator('a:has-text("Retour à l\'accueil")')).toBeVisible();
    });

    test('devrait naviguer entre les tabs', async ({ page }) => {
      await accessInviteDashboard(page);
      
      const tabs = [
        { name: 'RSVP', content: 'Confirmez votre présence' },
        { name: 'Informations', content: 'Détails du mariage' },
        { name: 'Invités', content: 'Liste des invités' },
        { name: 'Photos', content: 'Galerie' },
        { name: 'Liste de mariage', content: 'Cadeaux' },
        { name: 'Messages', content: 'Livre d\'or' },
        { name: 'Voyage', content: 'Transport et hébergement' }
      ];
      
      for (const tab of tabs) {
        await page.click(`[role="tab"]:has-text("${tab.name}")`);
        await expect(page.locator('h2, h3')).toContainText(new RegExp(tab.content, 'i'));
      }
    });
  });

  test.describe('RSVP Fonctionnalités', () => {
    test('devrait confirmer la présence avec tous les détails', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("RSVP")');
      
      // Confirmer présence
      await page.click('label:has-text("Oui, je serai présent(e)")');
      
      // Nombre de personnes
      await page.selectOption('select[name="guest_count"]', '2');
      
      // Nom de l'accompagnant
      await page.fill('input[placeholder="Prénom et nom"]', 'Jean Dupont');
      
      // Sélectionner des événements
      const events = page.locator('input[type="checkbox"]');
      const eventCount = await events.count();
      if (eventCount > 0) {
        await events.first().check();
      }
      
      // Régime alimentaire
      await page.click('label:has-text("Végétarien")');
      
      // Demandes spéciales
      await page.fill('textarea[placeholder*="besoins spécifiques"]', 'Table près de la sortie svp');
      
      // Soumettre
      await page.click('button:has-text("Confirmer ma réponse")');
      
      // Vérifier la confirmation
      await expect(page.locator('text=Merci pour votre réponse')).toBeVisible();
      await expect(page.locator('text=Nous avons hâte de célébrer avec vous')).toBeVisible();
    });

    test('devrait décliner l\'invitation', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("RSVP")');
      
      // Décliner
      await page.click('label:has-text("Non, je ne pourrai pas venir")');
      
      // Soumettre
      await page.click('button:has-text("Confirmer ma réponse")');
      
      // Vérifier la confirmation
      await expect(page.locator('text=Nous regrettons que vous ne puissiez pas')).toBeVisible();
    });

    test('devrait gérer les enfants dans le RSVP', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("RSVP")');
      
      // Confirmer présence
      await page.click('label:has-text("Oui, je serai présent(e)")');
      
      // Ajouter un enfant
      await page.click('button:has-text("Ajouter un enfant")');
      
      // Remplir les détails de l'enfant
      await page.fill('input[placeholder="Prénom de l\'enfant"]', 'Emma');
      await page.fill('input[placeholder="Âge"]', '5');
      await page.check('input[type="checkbox"]:has(+ span:has-text("Repas nécessaire"))');
      
      // Ajouter un deuxième enfant
      await page.click('button:has-text("Ajouter un enfant")');
      const secondChildInputs = page.locator('input[placeholder="Prénom de l\'enfant"]').nth(1);
      await secondChildInputs.fill('Lucas');
      
      // Vérifier que les enfants sont ajoutés
      await expect(page.locator('text=Emma')).toBeVisible();
      await expect(page.locator('text=Lucas')).toBeVisible();
    });
  });

  test.describe('Galerie Photos', () => {
    test('devrait afficher et naviguer dans la galerie', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Photos")');
      
      // Vérifier la présence de photos
      const photos = page.locator('[data-testid="photo-thumbnail"]');
      const photoCount = await photos.count();
      
      if (photoCount > 0) {
        // Cliquer sur une photo
        await photos.first().click();
        
        // Vérifier le viewer
        await expect(page.locator('[data-testid="photo-viewer"]')).toBeVisible();
        
        // Navigation
        if (photoCount > 1) {
          await page.click('[data-testid="next-photo"]');
          await page.click('[data-testid="prev-photo"]');
        }
        
        // Fermer le viewer
        await page.keyboard.press('Escape');
        await expect(page.locator('[data-testid="photo-viewer"]')).not.toBeVisible();
      }
    });

    test('devrait uploader une photo', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Photos")');
      
      // Cliquer sur ajouter photo
      await page.click('button:has-text("Ajouter des photos")');
      
      // Upload fichier
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-testid="file-input-trigger"]');
      const fileChooser = await fileChooserPromise;
      
      // Créer un fichier test
      await fileChooser.setFiles({
        name: 'test-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Confirmer upload
      await page.click('button:has-text("Uploader")');
      
      // Vérifier le succès
      await expect(page.locator('text=Upload réussi')).toBeVisible();
    });
  });

  test.describe('Liste des Invités', () => {
    test('devrait afficher la liste des invités confirmés', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Invités")');
      
      // Vérifier la présence de la liste
      await expect(page.locator('[data-testid="guests-list"]')).toBeVisible();
      
      // Vérifier les filtres
      await page.click('button:has-text("Confirmés")');
      
      // Vérifier qu'au moins un invité est affiché
      const guestItems = page.locator('[data-testid="guest-item"]');
      await expect(guestItems.first()).toBeVisible();
    });

    test('devrait rechercher des invités', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Invités")');
      
      // Rechercher
      await page.fill('[placeholder="Rechercher un invité"]', 'Marie');
      
      // Vérifier les résultats
      const results = page.locator('[data-testid="guest-item"]');
      const count = await results.count();
      
      if (count > 0) {
        const firstResult = await results.first().textContent();
        expect(firstResult).toContain('Marie');
      }
    });
  });

  test.describe('Liste de Mariage', () => {
    test('devrait afficher et réserver des cadeaux', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Liste de mariage")');
      
      // Vérifier la présence de cadeaux
      const gifts = page.locator('[data-testid="gift-item"]');
      const giftCount = await gifts.count();
      
      if (giftCount > 0) {
        // Trouver un cadeau disponible
        const availableGift = gifts.filter({ hasText: 'Disponible' }).first();
        
        if (await availableGift.count() > 0) {
          // Réserver le cadeau
          await availableGift.locator('button:has-text("Réserver")').click();
          
          // Confirmer la réservation
          await page.fill('[name="giver_name"]', 'Test User');
          await page.fill('[name="message"]', 'Félicitations !');
          await page.click('button:has-text("Confirmer la réservation")');
          
          // Vérifier le succès
          await expect(page.locator('text=Cadeau réservé avec succès')).toBeVisible();
        }
      }
    });

    test('devrait filtrer les cadeaux par catégorie', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Liste de mariage")');
      
      // Sélectionner une catégorie
      await page.selectOption('[data-testid="category-filter"]', 'maison');
      
      // Vérifier que les cadeaux affichés sont de la bonne catégorie
      const gifts = page.locator('[data-testid="gift-item"]');
      const firstGift = gifts.first();
      
      if (await firstGift.count() > 0) {
        await expect(firstGift).toContainText(/maison|décoration|cuisine/i);
      }
    });
  });

  test.describe('Messages et Livre d\'Or', () => {
    test('devrait laisser un message dans le livre d\'or', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Messages")');
      
      // Écrire un message
      await page.fill('[name="author"]', 'Test Invité');
      await page.fill('[name="message"]', 'Félicitations aux mariés ! Nous vous souhaitons tout le bonheur du monde.');
      
      // Envoyer
      await page.click('button:has-text("Envoyer mon message")');
      
      // Vérifier l'affichage
      await expect(page.locator('text=Message envoyé')).toBeVisible();
      await expect(page.locator('text=Test Invité')).toBeVisible();
    });

    test('devrait afficher les messages existants', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Messages")');
      
      // Vérifier la présence de messages
      const messages = page.locator('[data-testid="guestbook-message"]');
      await expect(messages.first()).toBeVisible();
    });
  });

  test.describe('Informations Pratiques', () => {
    test('devrait afficher toutes les informations du mariage', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Informations")');
      
      // Vérifier les sections
      await expect(page.locator('text=Cérémonie')).toBeVisible();
      await expect(page.locator('text=Réception')).toBeVisible();
      await expect(page.locator('text=Dress code')).toBeVisible();
      
      // Vérifier le lien vers la carte
      const mapLink = page.locator('a:has-text("Voir sur la carte")');
      await expect(mapLink).toBeVisible();
      await expect(mapLink).toHaveAttribute('href', /maps\.google\.com/);
    });

    test('devrait afficher le planning détaillé', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Informations")');
      
      // Vérifier le timeline
      const timeline = page.locator('[data-testid="wedding-timeline"]');
      await expect(timeline).toBeVisible();
      
      // Vérifier au moins un événement
      const events = timeline.locator('[data-testid="timeline-event"]');
      await expect(events.first()).toBeVisible();
    });
  });

  test.describe('Voyage et Hébergement', () => {
    test('devrait afficher les options de transport', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Voyage")');
      
      // Vérifier les sections
      await expect(page.locator('text=Comment venir')).toBeVisible();
      
      // Si transport organisé
      const organizedTransport = page.locator('text=Transport organisé');
      if (await organizedTransport.count() > 0) {
        await expect(page.locator('[data-testid="transport-schedule"]')).toBeVisible();
      }
    });

    test('devrait afficher les hébergements recommandés', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Voyage")');
      
      // Vérifier la liste d'hôtels
      const hotels = page.locator('[data-testid="hotel-recommendation"]');
      if (await hotels.count() > 0) {
        const firstHotel = hotels.first();
        await expect(firstHotel.locator('[data-testid="hotel-name"]')).toBeVisible();
        await expect(firstHotel.locator('[data-testid="hotel-distance"]')).toBeVisible();
      }
    });
  });

  test.describe('Fonctionnalités temps réel', () => {
    test('devrait recevoir des notifications de nouvelles photos', async ({ page, context }) => {
      await accessInviteDashboard(page);
      
      // Simuler l'ajout d'une photo par un autre invité
      const page2 = await context.newPage();
      await accessInviteDashboard(page2, 'another-invite-token');
      await page2.click('[role="tab"]:has-text("Photos")');
      
      // Upload une photo (simulé)
      // ...
      
      // Vérifier la notification sur la première page
      await expect(page.locator('[data-testid="notification"]')).toContainText('Nouvelle photo');
      
      await page2.close();
    });
  });

  test.describe('Responsive Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('devrait être utilisable sur mobile', async ({ page }) => {
      await accessInviteDashboard(page);
      
      // Vérifier que le header s'adapte
      await expect(page.locator('h1')).toBeVisible();
      
      // Vérifier la navigation horizontale scrollable
      const nav = page.locator('[role="tablist"]');
      await expect(nav).toHaveCSS('overflow-x', 'auto');
      
      // Tester le RSVP sur mobile
      await page.click('[role="tab"]:has-text("RSVP")');
      await expect(page.locator('text=Confirmez votre présence')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('devrait charger rapidement', async ({ page }) => {
      const startTime = Date.now();
      
      await accessInviteDashboard(page);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    test('devrait gérer le lazy loading des photos', async ({ page }) => {
      await accessInviteDashboard(page);
      await page.click('[role="tab"]:has-text("Photos")');
      
      // Vérifier que les images utilisent lazy loading
      const images = page.locator('img[loading="lazy"]');
      await expect(images.first()).toBeVisible();
    });
  });

  test.describe('Accessibilité', () => {
    test('devrait être navigable au clavier', async ({ page }) => {
      await accessInviteDashboard(page);
      
      // Navigation par Tab
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Navigation dans les tabs avec les flèches
      await page.locator('[role="tablist"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('RSVP');
    });

    test('devrait avoir des labels ARIA corrects', async ({ page }) => {
      await accessInviteDashboard(page);
      
      // Vérifier les rôles ARIA
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(8);
      
      // Vérifier les labels des formulaires
      await page.click('[role="tab"]:has-text("RSVP")');
      const formInputs = page.locator('input, select, textarea');
      const inputCount = await formInputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i);
        const label = await input.getAttribute('aria-label') || 
                     await page.locator(`label[for="${await input.getAttribute('id')}"]`).textContent();
        expect(label).toBeTruthy();
      }
    });
  });
});

// Tests de régression spécifiques
test.describe('Regression Tests - Invite', () => {
  test('devrait gérer l\'expiration du token', async ({ page }) => {
    // Simuler un token expiré
    await page.goto(`${BASE_URL}/invite/expired-token`);
    
    await expect(page.locator('text=Invitation expirée')).toBeVisible();
    await expect(page.locator('text=Veuillez contacter les mariés')).toBeVisible();
  });

  test('devrait gérer les erreurs de réseau lors du RSVP', async ({ page, context }) => {
    await accessInviteDashboard(page);
    await page.click('[role="tab"]:has-text("RSVP")');
    
    // Intercepter et bloquer la requête RSVP
    await context.route('**/api/invites/*/rsvp', route => route.abort());
    
    // Essayer de soumettre
    await page.click('label:has-text("Oui, je serai présent(e)")');
    await page.click('button:has-text("Confirmer ma réponse")');
    
    // Vérifier le message d'erreur
    await expect(page.locator('text=Erreur')).toBeVisible();
  });

  test('devrait sauvegarder le brouillon du RSVP', async ({ page }) => {
    await accessInviteDashboard(page);
    await page.click('[role="tab"]:has-text("RSVP")');
    
    // Remplir partiellement le formulaire
    await page.click('label:has-text("Oui, je serai présent(e)")');
    await page.selectOption('select[name="guest_count"]', '2');
    await page.fill('input[placeholder="Prénom et nom"]', 'Test Accompagnant');
    
    // Naviguer ailleurs
    await page.click('[role="tab"]:has-text("Photos")');
    
    // Revenir au RSVP
    await page.click('[role="tab"]:has-text("RSVP")');
    
    // Vérifier que les données sont conservées
    await expect(page.locator('input[value="confirmed"]:checked')).toBeVisible();
    await expect(page.locator('select[name="guest_count"]')).toHaveValue('2');
    await expect(page.locator('input[placeholder="Prénom et nom"]')).toHaveValue('Test Accompagnant');
  });
});