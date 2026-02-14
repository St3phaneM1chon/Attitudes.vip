/**
 * Tests E2E pour Dashboard Vendor
 * Tests complets du parcours vendor
 */

import { test, expect } from '@playwright/test';

// Configuration de base
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const VENDOR_USER = {
  email: 'vendor@attitudes.vip',
  password: 'Vendor123!@#'
};

// Helper pour login vendor
async function loginVendor(page, user = VENDOR_USER) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
  await page.click('[type="submit"]');
  
  // Attendre la redirection vers le dashboard vendor
  await page.waitForURL(/\/dashboard\/vendor/);
}

// Helper pour attendre le chargement
async function waitForDashboardLoad(page) {
  await page.waitForSelector('[data-testid="vendor-header"]', { state: 'visible' });
  await page.waitForLoadState('networkidle');
}

test.describe('Dashboard Vendor E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await loginVendor(page);
    await waitForDashboardLoad(page);
  });

  test.describe('Navigation et Layout', () => {
    test('devrait afficher tous les éléments principaux du dashboard', async ({ page }) => {
      // Header
      await expect(page.locator('[data-testid="vendor-header"]')).toBeVisible();
      await expect(page.locator('text=Fleurs Magiques')).toBeVisible();
      await expect(page.locator('text=Fleuriste')).toBeVisible();
      
      // Status en ligne
      await expect(page.locator('text=Disponible')).toBeVisible();
      
      // Navigation tabs
      const tabs = [
        'Vue d\'ensemble', 
        'Réservations', 
        'Contrats', 
        'Paiements', 
        'Calendrier', 
        'Messages', 
        'Analytics', 
        'Paramètres'
      ];
      
      for (const tab of tabs) {
        await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible();
      }
    });

    test('devrait naviguer entre les tabs correctement', async ({ page }) => {
      const tabTests = [
        { name: 'Réservations', heading: 'Gestion des réservations' },
        { name: 'Contrats', heading: 'Gestion des contrats' },
        { name: 'Paiements', heading: 'Suivi des paiements' },
        { name: 'Calendrier', heading: 'Calendrier' }
      ];

      for (const { name, heading } of tabTests) {
        await page.click(`[role="tab"]:has-text("${name}")`);
        await expect(page.locator('h2')).toContainText(heading);
        await expect(page).toHaveURL(new RegExp(`tab=${name.toLowerCase()}`));
      }
    });
  });

  test.describe('Overview Tab', () => {
    test('devrait afficher les métriques principales', async ({ page }) => {
      // Vérifier les cartes de métriques
      await expect(page.locator('text=Réservations totales')).toBeVisible();
      await expect(page.locator('text=Contrats actifs')).toBeVisible();
      await expect(page.locator('text=Revenus du mois')).toBeVisible();
      await expect(page.locator('text=Note moyenne')).toBeVisible();
      
      // Graphique des revenus
      await expect(page.locator('text=Évolution des revenus')).toBeVisible();
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('devrait afficher les réservations récentes', async ({ page }) => {
      const recentBookings = page.locator('text=Réservations récentes');
      await expect(recentBookings).toBeVisible();
      
      // Vérifier la présence d'au moins une réservation
      const bookingItems = page.locator('[data-testid="booking-item"]');
      if (await bookingItems.count() > 0) {
        const firstBooking = bookingItems.first();
        await expect(firstBooking.locator('text=/Mariage/')).toBeVisible();
        await expect(firstBooking.locator('text=/€/')).toBeVisible();
      }
    });

    test('devrait permettre les actions rapides', async ({ page }) => {
      // Vérifier les boutons d'action rapide
      await expect(page.locator('text=Nouvelle réservation')).toBeVisible();
      await expect(page.locator('text=Créer une facture')).toBeVisible();
      await expect(page.locator('text=Bloquer des dates')).toBeVisible();
      await expect(page.locator('text=Rapport mensuel')).toBeVisible();
    });
  });

  test.describe('Contracts Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Contrats")');
      await page.waitForSelector('[data-testid="contracts-table"]');
    });

    test('devrait créer un nouveau contrat', async ({ page }) => {
      // Cliquer sur nouveau contrat
      await page.click('button:has-text("Nouveau contrat")');
      
      // Remplir le formulaire
      await page.fill('[name="contract_number"]', 'CONT-2024-001');
      await page.selectOption('[name="wedding_id"]', { index: 1 });
      await page.fill('[name="service_description"]', 'Décoration florale complète');
      await page.fill('[name="total_amount"]', '2500');
      
      // Ajouter un paiement échelonné
      await page.click('button:has-text("Ajouter échéance")');
      await page.fill('[name="payment_1_amount"]', '1000');
      await page.fill('[name="payment_1_due_date"]', '2024-06-01');
      
      // Sauvegarder
      await page.click('[data-testid="save-contract"]');
      
      // Vérifier la création
      await expect(page.locator('text=Contrat créé avec succès')).toBeVisible();
      await expect(page.locator('text=CONT-2024-001')).toBeVisible();
    });

    test('devrait envoyer un contrat au client', async ({ page }) => {
      // Trouver un contrat en brouillon
      const draftContract = page.locator('tr').filter({ hasText: 'draft' }).first();
      
      if (await draftContract.count() > 0) {
        // Cliquer sur envoyer
        await draftContract.locator('button[title="Envoyer"]').click();
        
        // Confirmer l'envoi
        await page.click('[data-testid="confirm-send"]');
        
        // Vérifier le changement de statut
        await expect(page.locator('text=Contrat envoyé avec succès')).toBeVisible();
      }
    });

    test('devrait filtrer les contrats', async ({ page }) => {
      // Filtrer par statut
      await page.selectOption('select:has-text("Tous les statuts")', 'signed');
      
      // Vérifier que seuls les contrats signés sont visibles
      const contracts = page.locator('tbody tr');
      const count = await contracts.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(contracts.nth(i).locator('text=signed')).toBeVisible();
        }
      }
    });
  });

  test.describe('Payments Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Paiements")');
      await page.waitForSelector('[data-testid="payments-table"]');
    });

    test('devrait afficher les statistiques financières', async ({ page }) => {
      await expect(page.locator('text=Revenus totaux')).toBeVisible();
      await expect(page.locator('text=En attente')).toBeVisible();
      await expect(page.locator('text=Solde disponible')).toBeVisible();
      
      // Graphique des revenus mensuels
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('devrait filtrer les paiements par période', async ({ page }) => {
      // Sélectionner ce mois
      await page.selectOption('select:nth-of-type(2)', 'month');
      
      // Attendre le rechargement
      await page.waitForTimeout(500);
      
      // Vérifier que les paiements affichés sont de ce mois
      const payments = page.locator('tbody tr');
      const firstPayment = payments.first();
      
      if (await firstPayment.count() > 0) {
        const dateText = await firstPayment.locator('td:first-child').textContent();
        const paymentDate = new Date(dateText);
        const now = new Date();
        
        expect(paymentDate.getMonth()).toBe(now.getMonth());
        expect(paymentDate.getFullYear()).toBe(now.getFullYear());
      }
    });

    test('devrait exporter les paiements', async ({ page }) => {
      // Intercepter le téléchargement
      const downloadPromise = page.waitForEvent('download');
      
      // Cliquer sur exporter
      await page.click('button:has-text("Exporter")');
      
      // Vérifier le téléchargement
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('paiements');
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('devrait demander un paiement', async ({ page }) => {
      const soldeElement = page.locator('text=Solde disponible').locator('..').locator('text=/€/');
      const soldeText = await soldeElement.textContent();
      const solde = parseFloat(soldeText.replace(/[^0-9.,]/g, '').replace(',', '.'));
      
      if (solde > 0) {
        // Cliquer sur demander paiement
        await page.click('button:has-text("Demander")');
        
        // Confirmer
        await page.click('[data-testid="confirm-payout"]');
        
        // Vérifier le message de succès
        await expect(page.locator('text=Demande de paiement envoyée')).toBeVisible();
      }
    });
  });

  test.describe('Calendar Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Calendrier")');
      await page.waitForSelector('[data-testid="calendar-view"]');
    });

    test('devrait afficher le calendrier avec les événements', async ({ page }) => {
      // Vérifier la présence du calendrier
      await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
      
      // Vérifier les contrôles de navigation
      await expect(page.locator('button:has-text("Aujourd\'hui")')).toBeVisible();
      await expect(page.locator('button:has-text("Mois")')).toBeVisible();
      await expect(page.locator('button:has-text("Semaine")')).toBeVisible();
    });

    test('devrait bloquer des dates', async ({ page }) => {
      // Cliquer sur une date libre
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateSelector = `[data-date="${tomorrow.toISOString().split('T')[0]}"]`;
      
      await page.click(dateSelector);
      
      // Remplir le formulaire de blocage
      await page.fill('[name="reason"]', 'Congés');
      await page.click('[data-testid="block-date"]');
      
      // Vérifier le blocage
      await expect(page.locator('text=Date bloquée avec succès')).toBeVisible();
    });

    test('devrait changer de vue calendrier', async ({ page }) => {
      // Passer en vue semaine
      await page.click('button:has-text("Semaine")');
      await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
      
      // Passer en vue jour
      await page.click('button:has-text("Jour")');
      await expect(page.locator('[data-testid="day-view"]')).toBeVisible();
      
      // Passer en vue liste
      await page.click('button:has-text("Liste")');
      await expect(page.locator('text=Événements à venir')).toBeVisible();
    });

    test('devrait gérer les disponibilités', async ({ page }) => {
      // Ouvrir le modal disponibilités
      await page.click('button:has-text("Disponibilités")');
      
      // Définir les horaires pour un jour
      await page.click('[data-day="monday"]');
      await page.fill('[name="monday_start"]', '09:00');
      await page.fill('[name="monday_end"]', '18:00');
      
      // Sauvegarder
      await page.click('[data-testid="save-availability"]');
      
      // Vérifier la sauvegarde
      await expect(page.locator('text=Disponibilités mises à jour')).toBeVisible();
    });
  });

  test.describe('Messages Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Messages")');
      await page.waitForSelector('[data-testid="messages-container"]');
    });

    test('devrait afficher la liste des conversations', async ({ page }) => {
      await expect(page.locator('[data-testid="conversations-list"]')).toBeVisible();
      
      // Vérifier la présence d'au moins une conversation
      const conversations = page.locator('[data-testid="conversation-item"]');
      if (await conversations.count() > 0) {
        await conversations.first().click();
        await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();
      }
    });

    test('devrait envoyer un message', async ({ page }) => {
      // Sélectionner une conversation
      const firstConversation = page.locator('[data-testid="conversation-item"]').first();
      
      if (await firstConversation.count() > 0) {
        await firstConversation.click();
        
        // Écrire et envoyer un message
        await page.fill('[data-testid="message-input"]', 'Message de test E2E');
        await page.click('[data-testid="send-message"]');
        
        // Vérifier l'envoi
        await expect(page.locator('text=Message de test E2E')).toBeVisible();
      }
    });
  });

  test.describe('Analytics Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Analytics")');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
    });

    test('devrait afficher les graphiques analytics', async ({ page }) => {
      // Vérifier les différents graphiques
      await expect(page.locator('text=Revenus mensuels')).toBeVisible();
      await expect(page.locator('text=Réservations par mois')).toBeVisible();
      await expect(page.locator('text=Taux de conversion')).toBeVisible();
      await expect(page.locator('text=Satisfaction clients')).toBeVisible();
      
      // Vérifier la présence des graphiques
      const charts = page.locator('canvas');
      expect(await charts.count()).toBeGreaterThan(2);
    });

    test('devrait filtrer les analytics par période', async ({ page }) => {
      // Sélectionner les 3 derniers mois
      await page.selectOption('[data-testid="analytics-period"]', '3months');
      
      // Attendre le rechargement des données
      await page.waitForTimeout(1000);
      
      // Vérifier que les graphiques sont mis à jour
      await expect(page.locator('text=Derniers 3 mois')).toBeVisible();
    });

    test('devrait télécharger un rapport', async ({ page }) => {
      // Intercepter le téléchargement
      const downloadPromise = page.waitForEvent('download');
      
      // Cliquer sur télécharger rapport
      await page.click('button:has-text("Télécharger rapport")');
      
      // Sélectionner le type de rapport
      await page.click('[data-testid="report-type-monthly"]');
      await page.click('[data-testid="generate-report"]');
      
      // Vérifier le téléchargement
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('rapport');
      expect(download.suggestedFilename()).toContain('.pdf');
    });
  });

  test.describe('Settings Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Paramètres")');
      await page.waitForSelector('[data-testid="settings-container"]');
    });

    test('devrait mettre à jour les informations du profil', async ({ page }) => {
      // Modifier les informations
      await page.fill('[name="business_name"]', 'Fleurs Magiques Updated');
      await page.fill('[name="description"]', 'Description mise à jour');
      await page.fill('[name="phone"]', '+33612345678');
      
      // Sauvegarder
      await page.click('[data-testid="save-profile"]');
      
      // Vérifier la sauvegarde
      await expect(page.locator('text=Profil mis à jour avec succès')).toBeVisible();
    });

    test('devrait gérer les services proposés', async ({ page }) => {
      // Ajouter un nouveau service
      await page.click('button:has-text("Ajouter un service")');
      await page.fill('[name="service_name"]', 'Décoration de voiture');
      await page.fill('[name="service_price"]', '150');
      await page.fill('[name="service_description"]', 'Décoration florale pour voiture des mariés');
      
      // Sauvegarder
      await page.click('[data-testid="save-service"]');
      
      // Vérifier l'ajout
      await expect(page.locator('text=Décoration de voiture')).toBeVisible();
    });

    test('devrait configurer les notifications', async ({ page }) => {
      // Aller dans l'onglet notifications
      await page.click('[data-testid="settings-notifications-tab"]');
      
      // Modifier les préférences
      await page.uncheck('[name="email_new_booking"]');
      await page.check('[name="push_payment_received"]');
      
      // Sauvegarder
      await page.click('[data-testid="save-notifications"]');
      
      // Vérifier la sauvegarde
      await expect(page.locator('text=Préférences de notification mises à jour')).toBeVisible();
    });
  });

  test.describe('Fonctionnalités temps réel', () => {
    test('devrait recevoir des notifications en temps réel', async ({ page, context }) => {
      // Ouvrir une deuxième page pour simuler un client
      const page2 = await context.newPage();
      await page2.goto(`${BASE_URL}/booking/vendor/fleurs-magiques`);
      
      // Page 2: Faire une demande de réservation
      await page2.fill('[name="event_date"]', '2024-08-15');
      await page2.fill('[name="message"]', 'Demande de devis pour mariage');
      await page2.click('[data-testid="submit-booking-request"]');
      
      // Page 1: Vérifier la notification
      await expect(page.locator('[data-testid="notification-toast"]')).toContainText('Nouvelle demande de réservation');
      
      // Vérifier le badge de notification
      await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
      
      await page2.close();
    });

    test('devrait synchroniser les mises à jour entre onglets', async ({ context }) => {
      // Ouvrir deux onglets
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await loginVendor(page1);
      await page1.goto(`${BASE_URL}/dashboard/vendor?tab=contracts`);
      
      await page2.goto(`${BASE_URL}/dashboard/vendor?tab=contracts`);
      await page2.waitForSelector('[data-testid="contracts-table"]');
      
      // Page 1: Mettre à jour un contrat
      const firstContract = page1.locator('tbody tr').first();
      await firstContract.locator('button[title="Modifier"]').click();
      await page1.fill('[name="notes"]', 'Note mise à jour en temps réel');
      await page1.click('[data-testid="save-contract"]');
      
      // Page 2: Vérifier la mise à jour
      await expect(page2.locator('text=Note mise à jour en temps réel')).toBeVisible({ timeout: 5000 });
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Performance et accessibilité', () => {
    test('devrait charger rapidement', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/dashboard/vendor`);
      await waitForDashboardLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      // Le dashboard devrait charger en moins de 3 secondes
      expect(loadTime).toBeLessThan(3000);
    });

    test('devrait être navigable au clavier', async ({ page }) => {
      // Navigation par Tab
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Naviguer entre les tabs avec les flèches
      await page.locator('[role="tablist"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Réservations');
    });

    test('devrait avoir des labels ARIA corrects', async ({ page }) => {
      // Vérifier les rôles ARIA
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(8);
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();
    });
  });

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('devrait s\'adapter aux écrans mobiles', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/vendor`);
      await waitForDashboardLoad(page);
      
      // Le menu devrait être en mode mobile
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Ouvrir le menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    });
  });
});

// Tests de régression spécifiques
test.describe('Regression Tests - Vendor', () => {
  test('devrait gérer les erreurs de paiement', async ({ page }) => {
    await loginVendor(page);
    await page.goto(`${BASE_URL}/dashboard/vendor?tab=payments`);
    
    // Simuler une erreur de connexion Stripe
    await page.route('**/api/stripe/balance', route => route.abort());
    
    // Rafraîchir la page
    await page.reload();
    
    // Vérifier le message d'erreur
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/erreur|impossible/i);
  });

  test('devrait gérer les conflits de calendrier', async ({ page }) => {
    await loginVendor(page);
    await page.goto(`${BASE_URL}/dashboard/vendor?tab=calendar`);
    
    // Essayer de créer un événement sur une date déjà réservée
    const bookedDate = await page.locator('[data-testid="event-confirmed"]').first();
    
    if (await bookedDate.count() > 0) {
      await bookedDate.click();
      
      // Essayer de bloquer cette date
      await page.click('[data-testid="block-date-action"]');
      
      // Vérifier le message d'erreur
      await expect(page.locator('[data-testid="conflict-warning"]')).toContainText('conflit');
    }
  });
});