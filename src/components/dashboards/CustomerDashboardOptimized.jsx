/**
 * Dashboard Customer Optimisé avec Lazy Loading
 * Version haute performance avec chargement progressif
 */

import React, { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWedding } from '../../hooks/useWedding';
import { 
  LazyLoad, 
  SkeletonLoader, 
  LoadingPlaceholder,
  usePreload,
  batchLoader
} from '../optimizations/LazyLoad';

// Lazy load des composants du dashboard
const Overview = lazy(() => import('./customer/Overview'));
const GuestsTab = lazy(() => import('./customer/GuestsTab'));
const BudgetTab = lazy(() => import('./customer/BudgetTab'));
const TasksTab = lazy(() => import('./customer/TasksTab'));
const VendorsTab = lazy(() => import('./customer/VendorsTab'));
const TimelineTab = lazy(() => import('./customer/TimelineTab'));
const PhotosTab = lazy(() => import('./customer/PhotosTab'));
const MusicTab = lazy(() => import('./customer/MusicTab'));

// Composants légers chargés immédiatement
import DashboardHeader from './customer/DashboardHeader';
import TabNavigation from './customer/TabNavigation';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Mapping des tabs avec leurs imports
const TAB_COMPONENTS = {
  overview: {
    component: Overview,
    preload: () => import('./customer/Overview'),
    skeleton: <SkeletonLoader type="card" count={4} />
  },
  guests: {
    component: GuestsTab,
    preload: () => import('./customer/GuestsTab'),
    skeleton: <SkeletonLoader type="table" />
  },
  budget: {
    component: BudgetTab,
    preload: () => import('./customer/BudgetTab'),
    skeleton: <SkeletonLoader type="chart" />
  },
  tasks: {
    component: TasksTab,
    preload: () => import('./customer/TasksTab'),
    skeleton: <SkeletonLoader type="list" count={5} />
  },
  vendors: {
    component: VendorsTab,
    preload: () => import('./customer/VendorsTab'),
    skeleton: <SkeletonLoader type="card" count={3} />
  },
  timeline: {
    component: TimelineTab,
    preload: () => import('./customer/TimelineTab'),
    skeleton: <SkeletonLoader type="list" count={4} />
  },
  photos: {
    component: PhotosTab,
    preload: () => import('./customer/PhotosTab'),
    skeleton: <div className="grid grid-cols-3 gap-4">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  },
  music: {
    component: MusicTab,
    preload: () => import('./customer/MusicTab'),
    skeleton: <SkeletonLoader type="list" count={6} />
  }
};

const CustomerDashboardOptimized = () => {
  const { user } = useAuth();
  const { wedding, loading: weddingLoading } = useWedding();
  const [activeTab, setActiveTab] = useState('overview');
  const [loadedTabs, setLoadedTabs] = useState(new Set(['overview']));
  const { preload } = usePreload();

  // Précharger les tabs adjacents
  useEffect(() => {
    const tabKeys = Object.keys(TAB_COMPONENTS);
    const currentIndex = tabKeys.indexOf(activeTab);
    
    // Précharger le tab suivant et précédent
    const preloadTabs = [
      tabKeys[currentIndex - 1],
      tabKeys[currentIndex + 1]
    ].filter(Boolean);

    preloadTabs.forEach(tab => {
      if (!loadedTabs.has(tab)) {
        batchLoader.add(() => TAB_COMPONENTS[tab].preload());
      }
    });
  }, [activeTab, loadedTabs]);

  // Gérer le changement de tab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setLoadedTabs(prev => new Set([...prev, newTab]));
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'dashboard_tab_view', {
        tab_name: newTab,
        user_id: user?.id
      });
    }
  };

  // Mémoriser le composant actif
  const ActiveComponent = useMemo(() => {
    return TAB_COMPONENTS[activeTab].component;
  }, [activeTab]);

  // Précharger les ressources critiques au hover
  const handleTabHover = (tab) => {
    if (!loadedTabs.has(tab)) {
      preload(TAB_COMPONENTS[tab].preload);
    }
  };

  if (weddingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingPlaceholder height={400} />
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Aucun mariage en cours
          </h2>
          <p className="text-gray-600 mb-8">
            Créez votre premier mariage pour commencer
          </p>
          <button className="btn btn-primary">
            Créer mon mariage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Toujours visible */}
      <DashboardHeader wedding={wedding} user={user} />

      {/* Navigation - Toujours visible */}
      <div className="sticky top-0 z-40 bg-white shadow-sm">
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onTabHover={handleTabHover}
          wedding={wedding}
        />
      </div>

      {/* Contenu principal avec lazy loading */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary
          fallback={
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h3 className="text-red-800 font-semibold mb-2">
                Une erreur est survenue
              </h3>
              <p className="text-red-600">
                Impossible de charger cette section. Veuillez réessayer.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 btn btn-secondary"
              >
                Recharger la page
              </button>
            </div>
          }
        >
          <Suspense fallback={TAB_COMPONENTS[activeTab].skeleton}>
            <div className="animate-fadeIn">
              <ActiveComponent 
                wedding={wedding} 
                user={user}
                isActive={true}
              />
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Préchargement invisible des prochains tabs */}
      <div className="hidden">
        {Object.entries(TAB_COMPONENTS).map(([tab, config]) => {
          // Précharger uniquement les tabs adjacents
          const tabKeys = Object.keys(TAB_COMPONENTS);
          const currentIndex = tabKeys.indexOf(activeTab);
          const tabIndex = tabKeys.indexOf(tab);
          const isAdjacent = Math.abs(currentIndex - tabIndex) === 1;

          if (isAdjacent && !loadedTabs.has(tab)) {
            return (
              <LazyLoad
                key={tab}
                component={config.preload}
                threshold={0}
                rootMargin="1000px"
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

// Wrapper avec optimisations supplémentaires
const CustomerDashboardWithOptimizations = () => {
  // Préchargement des fonts critiques
  useEffect(() => {
    if ('fonts' in document) {
      Promise.all([
        document.fonts.load('400 1em Inter'),
        document.fonts.load('600 1em Inter'),
        document.fonts.load('700 1em Inter')
      ]).catch(() => {
        // Ignorer les erreurs de fonts
      });
    }
  }, []);

  // Préconnexion aux domaines critiques
  useEffect(() => {
    const links = [
      { rel: 'preconnect', href: 'https://api.attitudes.vip' },
      { rel: 'preconnect', href: 'https://cdn.attitudes.vip' },
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' }
    ];

    links.forEach(({ rel, href }) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      document.head.appendChild(link);
    });
  }, []);

  return <CustomerDashboardOptimized />;
};

export default CustomerDashboardWithOptimizations;

// Export des méthodes de préchargement pour le routeur
export const preloadDashboard = () => {
  // Précharger les composants critiques
  return Promise.all([
    import('./customer/Overview'),
    import('./customer/DashboardHeader'),
    import('./customer/TabNavigation')
  ]);
};

// Styles d'animation
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;