/**
 * VendorDashboard - Interface complète pour les fournisseurs
 * Gestion des mariages, contrats, paiements et analytics
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useVendor } from '../../hooks/useVendor';
import { TabPanel } from '../common/TabPanel';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PerformanceMonitor } from '../../utils/performance';

// Lazy loading des composants
const OverviewTab = lazy(() => import('./vendor/OverviewTab'));
const BookingsTab = lazy(() => import('./vendor/BookingsTab'));
const ContractsTab = lazy(() => import('./vendor/ContractsTab'));
const PaymentsTab = lazy(() => import('./vendor/PaymentsTab'));
const CalendarTab = lazy(() => import('./vendor/CalendarTab'));
const MessagesTab = lazy(() => import('./vendor/MessagesTab'));
const AnalyticsTab = lazy(() => import('./vendor/AnalyticsTab'));
const SettingsTab = lazy(() => import('./vendor/SettingsTab'));

// Configuration des tabs
const VENDOR_TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: 'dashboard' },
  { id: 'bookings', label: 'Réservations', icon: 'calendar-check' },
  { id: 'contracts', label: 'Contrats', icon: 'file-contract' },
  { id: 'payments', label: 'Paiements', icon: 'credit-card' },
  { id: 'calendar', label: 'Calendrier', icon: 'calendar' },
  { id: 'messages', label: 'Messages', icon: 'envelope' },
  { id: 'analytics', label: 'Analytics', icon: 'chart-line' },
  { id: 'settings', label: 'Paramètres', icon: 'cog' }
];

export default function VendorDashboard() {
  const { user } = useAuth();
  const { vendor, loading: vendorLoading } = useVendor();
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const performanceMonitor = new PerformanceMonitor('VendorDashboard');

  // Charger le tab depuis l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && VENDOR_TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Mettre à jour l'URL lors du changement de tab
  const handleTabChange = (tabId) => {
    performanceMonitor.mark('tab-change-start');
    setActiveTab(tabId);
    
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
    
    performanceMonitor.mark('tab-change-end');
    performanceMonitor.measure('tab-change', 'tab-change-start', 'tab-change-end');
  };

  // Précharger les tabs adjacents
  useEffect(() => {
    const currentIndex = VENDOR_TABS.findIndex(t => t.id === activeTab);
    const preloadTabs = [
      VENDOR_TABS[currentIndex - 1]?.id,
      VENDOR_TABS[currentIndex + 1]?.id
    ].filter(Boolean);

    preloadTabs.forEach(tabId => {
      switch (tabId) {
        case 'bookings':
          import('./vendor/BookingsTab');
          break;
        case 'contracts':
          import('./vendor/ContractsTab');
          break;
        case 'payments':
          import('./vendor/PaymentsTab');
          break;
        case 'analytics':
          import('./vendor/AnalyticsTab');
          break;
      }
    });
  }, [activeTab]);

  // Rendu du contenu du tab actif
  const renderTabContent = () => {
    const tabComponents = {
      overview: OverviewTab,
      bookings: BookingsTab,
      contracts: ContractsTab,
      payments: PaymentsTab,
      calendar: CalendarTab,
      messages: MessagesTab,
      analytics: AnalyticsTab,
      settings: SettingsTab
    };

    const Component = tabComponents[activeTab];
    
    return (
      <ErrorBoundary fallback={<div>Une erreur est survenue</div>}>
        <Suspense fallback={<LoadingSpinner />}>
          <Component vendor={vendor} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  if (vendorLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Profil fournisseur non trouvé
          </h2>
          <p className="text-gray-600 mb-8">
            Veuillez compléter votre inscription en tant que fournisseur
          </p>
          <a
            href="/vendor/onboarding"
            className="btn btn-primary"
          >
            Compléter l'inscription
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b" data-testid="vendor-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              {vendor.logo && (
                <img
                  src={vendor.logo}
                  alt={vendor.businessName}
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {vendor.businessName}
                </h1>
                <p className="text-sm text-gray-600">
                  {vendor.category} • {vendor.location}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Status en ligne */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  vendor.isAvailable ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-600">
                  {vendor.isAvailable ? 'Disponible' : 'Indisponible'}
                </span>
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Notifications"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
              </div>
              
              {/* Menu profil */}
              <div className="relative">
                <button
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Menu profil"
                >
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={user.name}
                    className="h-8 w-8 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto" role="tablist">
            {VENDOR_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  whitespace-nowrap transition-colors
                  ${activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                onClick={() => handleTabChange(tab.id)}
              >
                <i className={`fas fa-${tab.icon}`} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          data-testid="vendor-content"
        >
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}