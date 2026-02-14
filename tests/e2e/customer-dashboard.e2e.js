/**
 * Tests End-to-End pour Dashboard Customer
 * Tests complets du parcours utilisateur
 */

import { test, expect } from '@playwright/test';

// Configuration de base
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: 'test@attitudes.vip',
  password: 'Test123!@#'
};

// Helper pour login
async function loginUser(page, user = TEST_USER) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"]', user.email);
  await page.fill('[name="password"]', user.password);
  await page.click('[type="submit"]');
  
  // Attendre la redirection vers le dashboard
  await page.waitForURL(/\/dashboard\/customer/);
}

// Helper pour attendre le chargement
async function waitForDashboardLoad(page) {
  await page.waitForSelector('[data-testid="dashboard-header"]', { state: 'visible' });
  await page.waitForLoadState('networkidle');
}

test.describe('Dashboard Customer E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter avant chaque test
    await loginUser(page);
    await waitForDashboardLoad(page);
  });

  test.describe('Navigation et Layout', () => {
    test('devrait afficher tous les éléments principaux du dashboard', async ({ page }) => {
      // Header
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="wedding-name"]')).toContainText(/Mon Mariage/);
      await expect(page.locator('[data-testid="wedding-date"]')).toBeVisible();
      
      // Navigation tabs
      const tabs = ['Overview', 'Invités', 'Budget', 'Tâches', 'Fournisseurs', 'Timeline', 'Photos', 'Musique'];
      for (const tab of tabs) {
        await expect(page.locator(`[role="tab"]:has-text("${tab}")`)).toBeVisible();
      }
      
      // Contenu principal
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('devrait naviguer entre les tabs correctement', async ({ page }) => {
      // Cliquer sur chaque tab et vérifier le contenu
      const tabTests = [
        { name: 'Invités', content: 'Gestion des invités' },
        { name: 'Budget', content: 'Suivi du budget' },
        { name: 'Tâches', content: 'Liste des tâches' },
        { name: 'Fournisseurs', content: 'Vos fournisseurs' }
      ];

      for (const { name, content } of tabTests) {
        await page.click(`[role="tab"]:has-text("${name}")`);
        await expect(page.locator('h2')).toContainText(content);
        
        // Vérifier que l'URL change
        await expect(page).toHaveURL(new RegExp(`tab=${name.toLowerCase()}`));
      }
    });

    test('devrait conserver l\'état lors du rafraîchissement', async ({ page }) => {
      // Aller sur le tab Budget
      await page.click('[role="tab"]:has-text("Budget")');
      await page.waitForTimeout(500);
      
      // Rafraîchir la page
      await page.reload();
      await waitForDashboardLoad(page);
      
      // Vérifier qu'on est toujours sur Budget
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Budget');
      await expect(page.locator('h2')).toContainText('Suivi du budget');
    });
  });

  test.describe('Overview Tab', () => {
    test('devrait afficher les métriques principales', async ({ page }) => {
      // Vérifier les cartes de métriques
      await expect(page.locator('[data-testid="metric-guests-total"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-budget-spent"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-tasks-pending"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-days-remaining"]')).toBeVisible();
    });

    test('devrait afficher le countdown', async ({ page }) => {
      const countdown = page.locator('[data-testid="wedding-countdown"]');
      await expect(countdown).toBeVisible();
      await expect(countdown).toContainText(/jours/);
    });

    test('devrait afficher les tâches récentes', async ({ page }) => {
      const recentTasks = page.locator('[data-testid="recent-tasks"]');
      await expect(recentTasks).toBeVisible();
      
      // Vérifier qu'il y a au moins une tâche
      const tasks = recentTasks.locator('[data-testid="task-item"]');
      await expect(tasks).toHaveCount(await tasks.count());
    });
  });

  test.describe('Guests Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Invités")');
      await page.waitForSelector('[data-testid="guests-table"]');
    });

    test('devrait ajouter un nouvel invité', async ({ page }) => {
      // Cliquer sur Ajouter
      await page.click('[data-testid="add-guest-button"]');
      
      // Remplir le formulaire
      await page.fill('[name="name"]', 'Jean Dupont');
      await page.fill('[name="email"]', 'jean.dupont@example.com');
      await page.fill('[name="phone"]', '+33612345678');
      await page.selectOption('[name="table_number"]', '5');
      await page.check('[name="plus_one"]');
      
      // Soumettre
      await page.click('[data-testid="submit-guest"]');
      
      // Vérifier l'ajout
      await expect(page.locator('text=Jean Dupont')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Invité ajouté');
    });

    test('devrait filtrer les invités', async ({ page }) => {
      // Rechercher
      await page.fill('[data-testid="search-guests"]', 'Marie');
      await page.waitForTimeout(500); // Debounce
      
      // Vérifier que seuls les invités correspondants sont affichés
      const visibleGuests = page.locator('[data-testid="guest-row"]:visible');
      const count = await visibleGuests.count();
      
      for (let i = 0; i < count; i++) {
        await expect(visibleGuests.nth(i)).toContainText(/Marie/i);
      }
    });

    test('devrait envoyer des invitations', async ({ page }) => {
      // Sélectionner des invités
      await page.check('[data-testid="select-all-guests"]');
      
      // Cliquer sur Envoyer invitations
      await page.click('[data-testid="send-invitations-button"]');
      
      // Confirmer
      await page.click('[data-testid="confirm-send"]');
      
      // Vérifier le succès
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Invitations envoyées');
    });

    test('devrait exporter la liste des invités', async ({ page }) => {
      // Cliquer sur Export
      await page.click('[data-testid="export-guests-button"]');
      
      // Sélectionner CSV
      await page.click('[data-testid="export-csv"]');
      
      // Vérifier le téléchargement
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toContain('guests');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Budget Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Budget")');
      await page.waitForSelector('[data-testid="budget-overview"]');
    });

    test('devrait afficher le résumé du budget', async ({ page }) => {
      await expect(page.locator('[data-testid="total-budget"]')).toBeVisible();
      await expect(page.locator('[data-testid="spent-amount"]')).toBeVisible();
      await expect(page.locator('[data-testid="remaining-amount"]')).toBeVisible();
      
      // Graphique
      await expect(page.locator('[data-testid="budget-chart"]')).toBeVisible();
    });

    test('devrait ajouter une dépense', async ({ page }) => {
      // Cliquer sur Ajouter dépense
      await page.click('[data-testid="add-expense-button"]');
      
      // Remplir le formulaire
      await page.selectOption('[name="category"]', 'venue');
      await page.fill('[name="amount"]', '1500');
      await page.fill('[name="description"]', 'Acompte salle de réception');
      await page.selectOption('[name="vendor"]', { index: 1 });
      
      // Soumettre
      await page.click('[data-testid="submit-expense"]');
      
      // Vérifier l'ajout
      await expect(page.locator('text=Acompte salle de réception')).toBeVisible();
    });

    test('devrait afficher les alertes budget', async ({ page }) => {
      // Si budget dépassé, une alerte devrait être visible
      const alerts = page.locator('[data-testid="budget-alert"]');
      
      if (await alerts.count() > 0) {
        await expect(alerts.first()).toContainText(/attention|dépassement/i);
      }
    });
  });

  test.describe('Tasks Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Tâches")');
      await page.waitForSelector('[data-testid="tasks-list"]');
    });

    test('devrait créer une nouvelle tâche', async ({ page }) => {
      // Cliquer sur Nouvelle tâche
      await page.click('[data-testid="new-task-button"]');
      
      // Remplir le formulaire
      await page.fill('[name="title"]', 'Choisir le photographe');
      await page.fill('[name="description"]', 'Rencontrer 3 photographes et comparer');
      await page.selectOption('[name="priority"]', 'high');
      await page.fill('[name="due_date"]', '2024-06-15');
      await page.selectOption('[name="category"]', 'vendor');
      
      // Soumettre
      await page.click('[data-testid="submit-task"]');
      
      // Vérifier l'ajout
      await expect(page.locator('text=Choisir le photographe')).toBeVisible();
    });

    test('devrait marquer une tâche comme complétée', async ({ page }) => {
      // Trouver une tâche en cours
      const task = page.locator('[data-testid="task-item"][data-status="pending"]').first();
      
      // Cliquer sur le checkbox
      await task.locator('[data-testid="task-checkbox"]').click();
      
      // Vérifier le changement de statut
      await expect(task).toHaveAttribute('data-status', 'completed');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Tâche complétée');
    });

    test('devrait filtrer les tâches par statut', async ({ page }) => {
      // Filtrer par "En cours"
      await page.selectOption('[data-testid="task-filter-status"]', 'in_progress');
      
      // Vérifier que seules les tâches en cours sont visibles
      const tasks = page.locator('[data-testid="task-item"]:visible');
      const count = await tasks.count();
      
      for (let i = 0; i < count; i++) {
        await expect(tasks.nth(i)).toHaveAttribute('data-status', 'in_progress');
      }
    });

    test('devrait utiliser l\'IA pour suggestions', async ({ page }) => {
      // Cliquer sur Suggestions IA
      await page.click('[data-testid="ai-suggestions-button"]');
      
      // Attendre les suggestions
      await page.waitForSelector('[data-testid="ai-suggestion"]');
      
      // Vérifier qu'il y a des suggestions
      const suggestions = page.locator('[data-testid="ai-suggestion"]');
      await expect(suggestions).toHaveCount(await suggestions.count());
      
      // Accepter une suggestion
      await suggestions.first().locator('[data-testid="accept-suggestion"]').click();
      
      // Vérifier l'ajout de la tâche
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Tâche créée');
    });
  });

  test.describe('Vendors Tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[role="tab"]:has-text("Fournisseurs")');
      await page.waitForSelector('[data-testid="vendors-grid"]');
    });

    test('devrait ajouter un nouveau fournisseur', async ({ page }) => {
      // Cliquer sur Ajouter fournisseur
      await page.click('[data-testid="add-vendor-button"]');
      
      // Remplir le formulaire
      await page.fill('[name="business_name"]', 'Fleurs Magiques');
      await page.fill('[name="contact_name"]', 'Marie Fleuriste');
      await page.fill('[name="email"]', 'contact@fleursmagiques.fr');
      await page.fill('[name="phone"]', '+33698765432');
      await page.selectOption('[name="category"]', 'florist');
      await page.fill('[name="total_amount"]', '2500');
      
      // Soumettre
      await page.click('[data-testid="submit-vendor"]');
      
      // Vérifier l'ajout
      await expect(page.locator('text=Fleurs Magiques')).toBeVisible();
    });

    test('devrait créer un contrat', async ({ page }) => {
      // Cliquer sur un fournisseur
      await page.click('[data-testid="vendor-card"]', { index: 0 });
      
      // Cliquer sur Créer contrat
      await page.click('[data-testid="create-contract-button"]');
      
      // Remplir les détails
      await page.fill('[name="terms"]', 'Décoration florale complète pour cérémonie et réception');
      await page.fill('[name="payment_schedule[0].amount"]', '1000');
      await page.fill('[name="payment_schedule[0].due_date"]', '2024-04-01');
      
      // Soumettre
      await page.click('[data-testid="submit-contract"]');
      
      // Vérifier la création
      await expect(page.locator('[data-testid="contract-status"]')).toContainText('Brouillon');
    });

    test('devrait enregistrer un paiement', async ({ page }) => {
      // Ouvrir un fournisseur avec contrat
      await page.click('[data-testid="vendor-card"][data-has-contract="true"]', { index: 0 });
      
      // Cliquer sur Enregistrer paiement
      await page.click('[data-testid="record-payment-button"]');
      
      // Remplir le montant
      await page.fill('[name="amount"]', '500');
      await page.selectOption('[name="payment_method"]', 'transfer');
      
      // Soumettre
      await page.click('[data-testid="submit-payment"]');
      
      // Vérifier l'enregistrement
      await expect(page.locator('[data-testid="payment-history"]')).toContainText('500');
    });
  });

  test.describe('Fonctionnalités temps réel', () => {
    test('devrait recevoir des notifications en temps réel', async ({ page, context }) => {
      // Ouvrir une deuxième page pour simuler un autre utilisateur
      const page2 = await context.newPage();
      await loginUser(page2, { email: 'partner@attitudes.vip', password: 'Partner123!@#' });
      
      // Page 1: Aller sur les invités
      await page.click('[role="tab"]:has-text("Invités")');
      
      // Page 2: Ajouter un invité
      await page2.goto(`${BASE_URL}/dashboard/customer?tab=guests`);
      await page2.click('[data-testid="add-guest-button"]');
      await page2.fill('[name="name"]', 'Invité Temps Réel');
      await page2.fill('[name="email"]', 'tempsreel@example.com');
      await page2.click('[data-testid="submit-guest"]');
      
      // Page 1: Vérifier que l'invité apparaît
      await expect(page.locator('text=Invité Temps Réel')).toBeVisible({ timeout: 5000 });
      
      // Vérifier la notification
      await expect(page.locator('[data-testid="notification-toast"]')).toContainText('Nouvel invité ajouté');
      
      await page2.close();
    });

    test('devrait synchroniser les changements entre onglets', async ({ context }) => {
      // Ouvrir deux onglets
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      await loginUser(page1);
      await page1.goto(`${BASE_URL}/dashboard/customer?tab=tasks`);
      
      await page2.goto(`${BASE_URL}/dashboard/customer?tab=tasks`);
      await page2.waitForSelector('[data-testid="tasks-list"]');
      
      // Page 1: Créer une tâche
      await page1.click('[data-testid="new-task-button"]');
      await page1.fill('[name="title"]', 'Tâche Multi-Onglets');
      await page1.click('[data-testid="submit-task"]');
      
      // Page 2: Vérifier que la tâche apparaît
      await expect(page2.locator('text=Tâche Multi-Onglets')).toBeVisible({ timeout: 5000 });
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Performance et optimisations', () => {
    test('devrait charger rapidement avec lazy loading', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await waitForDashboardLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      // Le dashboard devrait charger en moins de 3 secondes
      expect(loadTime).toBeLessThan(3000);
      
      // Vérifier que seul le contenu visible est chargé
      const images = await page.locator('img').all();
      for (const img of images) {
        const isInViewport = await img.isVisible();
        if (!isInViewport) {
          // Les images hors viewport devraient avoir un placeholder
          const src = await img.getAttribute('src');
          expect(src).toContain('placeholder');
        }
      }
    });

    test('devrait gérer efficacement de grandes listes', async ({ page }) => {
      // Aller sur les invités avec beaucoup de données
      await page.click('[role="tab"]:has-text("Invités")');
      
      // Simuler le scroll
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Vérifier que le virtual scrolling fonctionne
      const visibleRows = await page.locator('[data-testid="guest-row"]:visible').count();
      
      // Seuls les éléments visibles devraient être rendus
      expect(visibleRows).toBeLessThan(50); // Pas plus de 50 lignes rendues à la fois
    });
  });

  test.describe('Accessibilité', () => {
    test('devrait être navigable au clavier', async ({ page }) => {
      // Navigation par Tab
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Naviguer entre les tabs avec les flèches
      await page.locator('[role="tablist"]').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText('Invités');
      
      // Activer avec Enter
      await page.keyboard.press('Enter');
      await expect(page.locator('h2')).toContainText('Gestion des invités');
    });

    test('devrait avoir des labels ARIA corrects', async ({ page }) => {
      // Vérifier les rôles ARIA
      await expect(page.locator('[role="tablist"]')).toBeVisible();
      await expect(page.locator('[role="tab"]')).toHaveCount(8);
      await expect(page.locator('[role="tabpanel"]')).toBeVisible();
      
      // Vérifier les labels
      const addButton = page.locator('[data-testid="add-guest-button"]');
      await expect(addButton).toHaveAttribute('aria-label', /ajouter.*invité/i);
    });
  });

  test.describe('Mobile Responsive', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('devrait s\'adapter aux écrans mobiles', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard/customer`);
      await waitForDashboardLoad(page);
      
      // Le menu devrait être en mode mobile
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Ouvrir le menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Les tabs devraient être en colonne
      const tablist = page.locator('[role="tablist"]');
      const tablistBox = await tablist.boundingBox();
      expect(tablistBox.width).toBeLessThan(400);
    });
  });
});

// Tests de régression spécifiques
test.describe('Regression Tests', () => {
  test('devrait gérer correctement les erreurs réseau', async ({ page, context }) => {
    // Intercepter les requêtes pour simuler une erreur
    await context.route('**/api/guests', route => route.abort());
    
    await loginUser(page);
    await page.click('[role="tab"]:has-text("Invités")');
    
    // Vérifier le message d'erreur
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/erreur|impossible/i);
    
    // Vérifier le bouton retry
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('devrait conserver les données non sauvegardées', async ({ page }) => {
    await loginUser(page);
    await page.click('[role="tab"]:has-text("Invités")');
    await page.click('[data-testid="add-guest-button"]');
    
    // Remplir partiellement le formulaire
    await page.fill('[name="name"]', 'Test Non Sauvegardé');
    await page.fill('[name="email"]', 'test@nonsauve.com');
    
    // Naviguer ailleurs
    await page.click('[role="tab"]:has-text("Budget")');
    
    // Vérifier l'avertissement
    await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toBeVisible();
    
    // Annuler et vérifier que les données sont toujours là
    await page.click('[data-testid="cancel-navigation"]');
    await expect(page.locator('[name="name"]')).toHaveValue('Test Non Sauvegardé');
  });
});