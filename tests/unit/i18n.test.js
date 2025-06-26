const i18n = require('../../src/i18n/loader');
const RegionalContentManager = require('../../src/i18n/utils/regional-content');

describe('i18n - Tests Unitaires', () => {
  beforeEach(() => {
    // Réinitialiser l'état i18n avant chaque test
    i18n.reset();
  });

  describe('Chargement des traductions', () => {
    it('devrait charger les traductions françaises', async () => {
      await i18n.loadLocale('fr');
      
      expect(i18n.t('common.welcome')).toBe('Bienvenue');
      expect(i18n.t('auth.login')).toBe('Se connecter');
      expect(i18n.t('dashboard.title')).toBe('Tableau de bord');
    });

    it('devrait charger les traductions anglaises', async () => {
      await i18n.loadLocale('en');
      
      expect(i18n.t('common.welcome')).toBe('Welcome');
      expect(i18n.t('auth.login')).toBe('Login');
      expect(i18n.t('dashboard.title')).toBe('Dashboard');
    });

    it('devrait charger les traductions espagnoles', async () => {
      await i18n.loadLocale('es');
      
      expect(i18n.t('common.welcome')).toBe('Bienvenido');
      expect(i18n.t('auth.login')).toBe('Iniciar sesión');
      expect(i18n.t('dashboard.title')).toBe('Panel de control');
    });

    it('devrait charger les traductions arabes', async () => {
      await i18n.loadLocale('ar');
      
      expect(i18n.t('common.welcome')).toBe('مرحباً');
      expect(i18n.t('auth.login')).toBe('تسجيل الدخول');
      expect(i18n.t('dashboard.title')).toBe('لوحة التحكم');
    });

    it('devrait charger les traductions créoles', async () => {
      await i18n.loadLocale('ht');
      
      expect(i18n.t('common.welcome')).toBe('Byenvini');
      expect(i18n.t('auth.login')).toBe('Konekte');
      expect(i18n.t('dashboard.title')).toBe('Tablèt');
    });
  });

  describe('Détection automatique de locale', () => {
    it('devrait détecter le français depuis l\'en-tête Accept-Language', () => {
      const headers = {
        'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8'
      };
      
      const detectedLocale = i18n.detectLocale(headers);
      expect(detectedLocale).toBe('fr');
    });

    it('devrait détecter l\'anglais depuis l\'en-tête Accept-Language', () => {
      const headers = {
        'accept-language': 'en-US,en;q=0.9,fr;q=0.8'
      };
      
      const detectedLocale = i18n.detectLocale(headers);
      expect(detectedLocale).toBe('en');
    });

    it('devrait retourner le français par défaut si aucune locale n\'est détectée', () => {
      const headers = {};
      
      const detectedLocale = i18n.detectLocale(headers);
      expect(detectedLocale).toBe('fr');
    });

    it('devrait détecter l\'arabe et configurer RTL', () => {
      const headers = {
        'accept-language': 'ar-SA,ar;q=0.9'
      };
      
      const detectedLocale = i18n.detectLocale(headers);
      expect(detectedLocale).toBe('ar');
      expect(i18n.isRTL()).toBe(true);
    });
  });

  describe('Formatage des dates', () => {
    it('devrait formater les dates en français', async () => {
      await i18n.loadLocale('fr');
      const date = new Date('2024-01-15');
      
      const formattedDate = i18n.formatDate(date);
      expect(formattedDate).toContain('15');
      expect(formattedDate).toContain('janvier');
    });

    it('devrait formater les dates en anglais', async () => {
      await i18n.loadLocale('en');
      const date = new Date('2024-01-15');
      
      const formattedDate = i18n.formatDate(date);
      expect(formattedDate).toContain('15');
      expect(formattedDate).toContain('January');
    });

    it('devrait formater les dates en arabe', async () => {
      await i18n.loadLocale('ar');
      const date = new Date('2024-01-15');
      
      const formattedDate = i18n.formatDate(date);
      expect(formattedDate).toMatch(/[\u0600-\u06FF]/); // Caractères arabes
    });
  });

  describe('Formatage des nombres', () => {
    it('devrait formater les nombres en français', async () => {
      await i18n.loadLocale('fr');
      
      const formattedNumber = i18n.formatNumber(1234.56);
      expect(formattedNumber).toBe('1 234,56');
    });

    it('devrait formater les nombres en anglais', async () => {
      await i18n.loadLocale('en');
      
      const formattedNumber = i18n.formatNumber(1234.56);
      expect(formattedNumber).toBe('1,234.56');
    });

    it('devrait formater les nombres en arabe', async () => {
      await i18n.loadLocale('ar');
      
      const formattedNumber = i18n.formatNumber(1234.56);
      expect(formattedNumber).toMatch(/[\u0600-\u06FF]/); // Caractères arabes
    });
  });

  describe('Formatage des devises', () => {
    it('devrait formater l\'euro en français', async () => {
      await i18n.loadLocale('fr');
      
      const formattedCurrency = i18n.formatCurrency(1234.56, 'EUR');
      expect(formattedCurrency).toContain('1 234,56');
      expect(formattedCurrency).toContain('€');
    });

    it('devrait formater le dollar en anglais', async () => {
      await i18n.loadLocale('en');
      
      const formattedCurrency = i18n.formatCurrency(1234.56, 'USD');
      expect(formattedCurrency).toContain('1,234.56');
      expect(formattedCurrency).toContain('$');
    });

    it('devrait formater le dirham en arabe', async () => {
      await i18n.loadLocale('ar');
      
      const formattedCurrency = i18n.formatCurrency(1234.56, 'MAD');
      expect(formattedCurrency).toMatch(/[\u0600-\u06FF]/); // Caractères arabes
    });
  });

  describe('Gestion des clés manquantes', () => {
    it('devrait retourner la clé si la traduction est manquante', async () => {
      await i18n.loadLocale('fr');
      
      const translation = i18n.t('missing.key');
      expect(translation).toBe('missing.key');
    });

    it('devrait logger un avertissement pour les clés manquantes', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await i18n.loadLocale('fr');
      
      i18n.t('missing.key');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Missing translation key: missing.key')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Interpolation de variables', () => {
    it('devrait interpoler les variables dans les traductions', async () => {
      await i18n.loadLocale('fr');
      
      const translation = i18n.t('auth.welcome_user', { name: 'Marie' });
      expect(translation).toBe('Bienvenue Marie');
    });

    it('devrait gérer les variables manquantes', async () => {
      await i18n.loadLocale('fr');
      
      const translation = i18n.t('auth.welcome_user', {});
      expect(translation).toBe('Bienvenue {{name}}');
    });
  });

  describe('Changement de locale dynamique', () => {
    it('devrait changer de locale et recharger les traductions', async () => {
      await i18n.loadLocale('fr');
      expect(i18n.t('common.welcome')).toBe('Bienvenue');
      
      await i18n.changeLocale('en');
      expect(i18n.t('common.welcome')).toBe('Welcome');
    });

    it('devrait conserver les paramètres de formatage', async () => {
      await i18n.loadLocale('fr');
      await i18n.changeLocale('en');
      
      const formattedNumber = i18n.formatNumber(1234.56);
      expect(formattedNumber).toBe('1,234.56');
    });
  });
});

describe('RegionalContentManager - Tests Unitaires', () => {
  let regionalManager;

  beforeEach(() => {
    regionalManager = new RegionalContentManager();
  });

  describe('Gestion du contenu régional', () => {
    it('devrait retourner le contenu pour la région Europe', () => {
      const content = regionalManager.getRegionalContent('europe');
      
      expect(content).toHaveProperty('colors');
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.colors).toContain('blanc');
    });

    it('devrait retourner le contenu pour la région Moyen-Orient', () => {
      const content = regionalManager.getRegionalContent('middle-east');
      
      expect(content).toHaveProperty('colors');
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.colors).toContain('or');
    });

    it('devrait retourner le contenu pour la région Caraïbes', () => {
      const content = regionalManager.getRegionalContent('caribbean');
      
      expect(content).toHaveProperty('colors');
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.colors).toContain('bleu');
    });

    it('devrait retourner le contenu par défaut pour une région inconnue', () => {
      const content = regionalManager.getRegionalContent('unknown-region');
      
      expect(content).toHaveProperty('colors');
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
    });
  });

  describe('Gestion du contenu religieux', () => {
    it('devrait retourner le contenu pour le christianisme', () => {
      const content = regionalManager.getReligiousContent('christianity');
      
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.ceremonies).toContain('échange des alliances');
    });

    it('devrait retourner le contenu pour l\'islam', () => {
      const content = regionalManager.getReligiousContent('islam');
      
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.ceremonies).toContain('nikah');
    });

    it('devrait retourner le contenu pour le judaïsme', () => {
      const content = regionalManager.getReligiousContent('judaism');
      
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
      expect(content.ceremonies).toContain('ketubah');
    });

    it('devrait retourner le contenu par défaut pour une religion inconnue', () => {
      const content = regionalManager.getReligiousContent('unknown-religion');
      
      expect(content).toHaveProperty('ceremonies');
      expect(content).toHaveProperty('traditions');
    });
  });

  describe('Adaptation du contenu', () => {
    it('devrait adapter le contenu selon la région et la religion', () => {
      const adaptedContent = regionalManager.adaptContent('europe', 'christianity');
      
      expect(adaptedContent).toHaveProperty('colors');
      expect(adaptedContent).toHaveProperty('ceremonies');
      expect(adaptedContent).toHaveProperty('traditions');
      expect(adaptedContent.colors).toContain('blanc');
      expect(adaptedContent.ceremonies).toContain('échange des alliances');
    });

    it('devrait adapter le contenu pour le Moyen-Orient et l\'islam', () => {
      const adaptedContent = regionalManager.adaptContent('middle-east', 'islam');
      
      expect(adaptedContent).toHaveProperty('colors');
      expect(adaptedContent).toHaveProperty('ceremonies');
      expect(adaptedContent).toHaveProperty('traditions');
      expect(adaptedContent.colors).toContain('or');
      expect(adaptedContent.ceremonies).toContain('nikah');
    });
  });

  describe('Suggestions personnalisées', () => {
    it('devrait générer des suggestions basées sur les préférences', () => {
      const preferences = {
        region: 'europe',
        religion: 'christianity',
        budget: 'medium',
        guestCount: 100
      };
      
      const suggestions = regionalManager.getPersonalizedSuggestions(preferences);
      
      expect(suggestions).toHaveProperty('vendors');
      expect(suggestions).toHaveProperty('decorations');
      expect(suggestions).toHaveProperty('timeline');
      expect(Array.isArray(suggestions.vendors)).toBe(true);
    });

    it('devrait adapter les suggestions selon le budget', () => {
      const lowBudgetPrefs = {
        region: 'europe',
        religion: 'christianity',
        budget: 'low',
        guestCount: 50
      };
      
      const highBudgetPrefs = {
        region: 'europe',
        religion: 'christianity',
        budget: 'high',
        guestCount: 200
      };
      
      const lowSuggestions = regionalManager.getPersonalizedSuggestions(lowBudgetPrefs);
      const highSuggestions = regionalManager.getPersonalizedSuggestions(highBudgetPrefs);
      
      expect(lowSuggestions.vendors.length).toBeLessThan(highSuggestions.vendors.length);
    });
  });
}); 