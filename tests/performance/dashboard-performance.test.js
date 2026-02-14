/**
 * Tests de performance pour le Dashboard Customer
 * Mesure l'impact des optimisations lazy loading
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import CustomerDashboardOptimized from '../../src/components/dashboards/CustomerDashboardOptimized';
import { PerformanceMonitor } from '../../src/utils/performance';

// Mock des dépendances
jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user_123', name: 'Test User' }
  })
}));

jest.mock('../../src/hooks/useWedding', () => ({
  useWedding: () => ({
    wedding: {
      id: 'wedding_123',
      name: 'Test Wedding',
      date: '2024-08-15'
    },
    loading: false
  })
}));

// Mock Intersection Observer
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe(element) {
    // Simuler l'intersection immédiate
    setTimeout(() => {
      this.callback([{ isIntersecting: true, target: element }]);
    }, 100);
  }
  
  disconnect() {}
  unobserve() {}
};

describe('Dashboard Performance Tests', () => {
  let performanceMonitor;

  beforeEach(() => {
    performanceMonitor = new PerformanceMonitor('Dashboard');
    
    // Mock performance API
    global.performance.mark = jest.fn();
    global.performance.measure = jest.fn();
    
    // Reset modules pour avoir des imports frais
    jest.resetModules();
  });

  afterEach(() => {
    performanceMonitor.log();
  });

  describe('Temps de chargement initial', () => {
    it('devrait charger le dashboard en moins de 100ms', async () => {
      performanceMonitor.mark('render-start');
      
      const { container } = render(<CustomerDashboardOptimized />);
      
      performanceMonitor.mark('render-end');
      const renderTime = performanceMonitor.measure('initial-render', 'render-start', 'render-end');
      
      expect(renderTime).toBeLessThan(100);
      expect(container.querySelector('.animate-fadeIn')).toBeTruthy();
    });

    it('devrait afficher un skeleton loader pendant le chargement', async () => {
      render(<CustomerDashboardOptimized />);
      
      // Vérifier que le skeleton est affiché
      const skeletons = screen.getAllByTestId(/skeleton|loading|placeholder/i);
      expect(skeletons.length).toBeGreaterThan(0);
      
      // Attendre que le contenu soit chargé
      await waitFor(() => {
        expect(screen.queryByTestId(/skeleton|loading/i)).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Lazy loading des tabs', () => {
    it('devrait charger uniquement le tab actif initialement', async () => {
      const importSpy = jest.spyOn(global, 'import');
      
      render(<CustomerDashboardOptimized />);
      
      // Seul Overview devrait être importé
      await waitFor(() => {
        const overviewImports = importSpy.mock.calls.filter(
          call => call[0].includes('Overview')
        );
        expect(overviewImports.length).toBe(1);
      });
      
      // Les autres tabs ne devraient pas être chargés
      const otherTabImports = importSpy.mock.calls.filter(
        call => call[0].includes('GuestsTab') || 
                call[0].includes('BudgetTab') ||
                call[0].includes('TasksTab')
      );
      expect(otherTabImports.length).toBe(0);
    });

    it('devrait précharger les tabs adjacents', async () => {
      const { container } = render(<CustomerDashboardOptimized />);
      
      // Cliquer sur le tab Guests
      const guestsTab = screen.getByRole('tab', { name: /invités/i });
      
      performanceMonitor.mark('tab-switch-start');
      fireEvent.click(guestsTab);
      performanceMonitor.mark('tab-switch-end');
      
      const switchTime = performanceMonitor.measure('tab-switch', 'tab-switch-start', 'tab-switch-end');
      
      // Le changement de tab devrait être rapide
      expect(switchTime).toBeLessThan(50);
      
      // Vérifier que le contenu du tab est chargé
      await waitFor(() => {
        expect(screen.getByText(/gestion des invités/i)).toBeInTheDocument();
      });
    });

    it('devrait précharger au survol', async () => {
      // Mock du hook usePreload avant le test
      const mockPreload = jest.fn();
      jest.doMock('../../src/components/optimizations/LazyLoad', () => ({
        ...jest.requireActual('../../src/components/optimizations/LazyLoad'),
        usePreload: () => ({ preload: mockPreload })
      }));
      
      render(<CustomerDashboardOptimized />);
      
      // Survoler un tab
      const budgetTab = screen.getByRole('tab', { name: /budget/i });
      fireEvent.mouseEnter(budgetTab);
      
      // Vérifier que le préchargement est déclenché
      expect(mockPreload).toHaveBeenCalled();
    });
  });

  describe('Optimisation des rendus', () => {
    it('devrait utiliser la mémorisation pour éviter les re-rendus', async () => {
      // Créer un spy pour compter les rendus
      const renderSpy = jest.fn();
      
      // Mock du composant Overview avec le spy
      jest.doMock('../../src/components/dashboards/customer/Overview', () => {
        return function Overview() {
          renderSpy();
          return <div>Overview Content</div>;
        };
      });
      
      const { rerender } = render(<CustomerDashboardOptimized />);
      
      // Re-render sans changement de props
      rerender(<CustomerDashboardOptimized />);
      rerender(<CustomerDashboardOptimized />);
      
      // Le composant ne devrait être rendu qu'une fois grâce à la mémorisation
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('devrait batching les mises à jour', async () => {
      render(<CustomerDashboardOptimized />);
      
      // Simuler plusieurs mises à jour rapides
      performanceMonitor.mark('updates-start');
      
      act(() => {
        // Plusieurs changements d'état simulés
        for (let i = 0; i < 10; i++) {
          fireEvent.click(screen.getByRole('tab', { name: /invités/i }));
          fireEvent.click(screen.getByRole('tab', { name: /overview/i }));
        }
      });
      
      performanceMonitor.mark('updates-end');
      const updateTime = performanceMonitor.measure('batch-updates', 'updates-start', 'updates-end');
      
      // Les mises à jour devraient être batchées efficacement
      expect(updateTime).toBeLessThan(200);
    });
  });

  describe('Performance réseau', () => {
    it('devrait dédupliquer les requêtes', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      
      render(<CustomerDashboardOptimized />);
      
      // Simuler plusieurs appels simultanés
      await Promise.all([
        act(async () => fireEvent.click(screen.getByRole('tab', { name: /invités/i }))),
        act(async () => fireEvent.click(screen.getByRole('tab', { name: /invités/i }))),
        act(async () => fireEvent.click(screen.getByRole('tab', { name: /invités/i })))
      ]);
      
      // Une seule requête devrait être faite
      const guestRequests = fetchSpy.mock.calls.filter(
        call => call[0].includes('/api/guests')
      );
      expect(guestRequests.length).toBe(1);
    });
  });

  describe('Métriques de performance', () => {
    it('devrait mesurer et reporter les performances', async () => {
      const metrics = {
        FCP: 0, // First Contentful Paint
        LCP: 0, // Largest Contentful Paint
        FID: 0, // First Input Delay
        TTI: 0  // Time to Interactive
      };
      
      // Observer les métriques
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            metrics.FCP = entry.startTime;
          } else if (entry.name === 'largest-contentful-paint') {
            metrics.LCP = entry.startTime;
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      
      render(<CustomerDashboardOptimized />);
      
      // Attendre que le contenu soit chargé
      await waitFor(() => {
        expect(screen.getByText(/overview/i)).toBeInTheDocument();
      });
      
      // Simuler une interaction
      const startInteraction = performance.now();
      fireEvent.click(screen.getByRole('tab', { name: /invités/i }));
      metrics.FID = performance.now() - startInteraction;
      
      // Time to Interactive
      metrics.TTI = performance.now();
      
      // Vérifier les seuils de performance
      expect(metrics.FCP).toBeLessThan(1000);  // < 1s
      expect(metrics.LCP).toBeLessThan(2500);  // < 2.5s
      expect(metrics.FID).toBeLessThan(100);   // < 100ms
      expect(metrics.TTI).toBeLessThan(3500);  // < 3.5s
    });
  });

  describe('Optimisation mémoire', () => {
    it('devrait nettoyer les composants non utilisés', async () => {
      const { unmount } = render(<CustomerDashboardOptimized />);
      
      // Créer des références pour vérifier le nettoyage
      const refs = new WeakMap();
      const component = { id: 'test-component' };
      refs.set(component, true);
      
      // Naviguer entre plusieurs tabs
      for (let i = 0; i < 5; i++) {
        fireEvent.click(screen.getByRole('tab', { name: /invités/i }));
        fireEvent.click(screen.getByRole('tab', { name: /budget/i }));
        fireEvent.click(screen.getByRole('tab', { name: /tâches/i }));
      }
      
      // Démonter le composant
      unmount();
      
      // Forcer le garbage collection (si disponible)
      if (global.gc) {
        global.gc();
      }
      
      // Les références devraient être nettoyées
      expect(refs.has(component)).toBe(false);
    });
  });

  describe('Stress test', () => {
    it('devrait gérer de nombreux changements rapides de tabs', async () => {
      render(<CustomerDashboardOptimized />);
      
      const tabs = ['overview', 'invités', 'budget', 'tâches', 'vendeurs'];
      const iterations = 50;
      
      performanceMonitor.mark('stress-test-start');
      
      // Changer rapidement de tabs
      for (let i = 0; i < iterations; i++) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        const tabElement = screen.getByRole('tab', { name: new RegExp(randomTab, 'i') });
        
        act(() => {
          fireEvent.click(tabElement);
        });
      }
      
      performanceMonitor.mark('stress-test-end');
      const stressTestTime = performanceMonitor.measure('stress-test', 'stress-test-start', 'stress-test-end');
      
      // Le temps moyen par changement de tab
      const avgTimePerSwitch = stressTestTime / iterations;
      expect(avgTimePerSwitch).toBeLessThan(10); // < 10ms par changement
      
      // L'interface devrait toujours répondre
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });
});

// Tests de benchmark comparatifs
describe('Benchmark: Optimized vs Non-Optimized', () => {
  it('devrait montrer une amélioration significative des performances', async () => {
    const results = {
      optimized: { renderTime: 0, memoryUsage: 0 },
      nonOptimized: { renderTime: 0, memoryUsage: 0 }
    };
    
    // Mesurer la version optimisée
    const startOptimized = performance.now();
    const { unmount: unmountOptimized } = render(<CustomerDashboardOptimized />);
    results.optimized.renderTime = performance.now() - startOptimized;
    results.optimized.memoryUsage = performance.memory?.usedJSHeapSize || 0;
    unmountOptimized();
    
    // Simuler une version non-optimisée (chargement de tous les composants)
    const startNonOptimized = performance.now();
    // Charger tous les composants d'un coup
    await Promise.all([
      import('../../src/components/dashboards/customer/Overview'),
      import('../../src/components/dashboards/customer/GuestsTab'),
      import('../../src/components/dashboards/customer/BudgetTab'),
      import('../../src/components/dashboards/customer/TasksTab'),
      import('../../src/components/dashboards/customer/VendorsTab')
    ]);
    results.nonOptimized.renderTime = performance.now() - startNonOptimized;
    
    // La version optimisée devrait être au moins 50% plus rapide
    const improvement = (results.nonOptimized.renderTime - results.optimized.renderTime) / results.nonOptimized.renderTime;
    expect(improvement).toBeGreaterThan(0.5);
    
    console.log('Performance Benchmark Results:', {
      optimized: `${results.optimized.renderTime.toFixed(2)}ms`,
      nonOptimized: `${results.nonOptimized.renderTime.toFixed(2)}ms`,
      improvement: `${(improvement * 100).toFixed(1)}%`
    });
  });
});