/**
 * InviteDashboard - Interface complète pour les invités
 * RSVP, informations, photos, messages et plus
 */

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useInvite } from '../../hooks/useInvite';
import { useWebSocket } from '../../hooks/useWebSocketOptimized';
import { TabPanel } from '../common/TabPanel';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';

// Lazy loading des composants
const OverviewTab = lazy(() => import('./invite/OverviewTab'));
const RSVPTab = lazy(() => import('./invite/RSVPTab'));
const EventInfoTab = lazy(() => import('./invite/EventInfoTab'));
const GuestListTab = lazy(() => import('./invite/GuestListTab'));
const PhotosTab = lazy(() => import('./invite/PhotosTab'));
const GiftRegistryTab = lazy(() => import('./invite/GiftRegistryTab'));
const MessagesTab = lazy(() => import('./invite/MessagesTab'));
const TravelTab = lazy(() => import('./invite/TravelTab'));

// Configuration des tabs
const INVITE_TABS = [
  { id: 'overview', label: 'Accueil', icon: 'home' },
  { id: 'rsvp', label: 'RSVP', icon: 'check-circle' },
  { id: 'event-info', label: 'Informations', icon: 'info-circle' },
  { id: 'guests', label: 'Invités', icon: 'users' },
  { id: 'photos', label: 'Photos', icon: 'camera' },
  { id: 'registry', label: 'Liste de mariage', icon: 'gift' },
  { id: 'messages', label: 'Messages', icon: 'comment' },
  { id: 'travel', label: 'Voyage', icon: 'plane' }
];

export default function InviteDashboard() {
  const { user } = useAuth();
  const { invite, wedding, loading: inviteLoading } = useInvite();
  const { subscribe } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [rsvpStatus, setRsvpStatus] = useState(null);

  // Charger le tab depuis l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && INVITE_TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, []);

  // Charger le statut RSVP
  useEffect(() => {
    if (invite) {
      setRsvpStatus(invite.rsvp_status);
    }
  }, [invite]);

  // S'abonner aux mises à jour temps réel
  useEffect(() => {
    if (!wedding?.id) return;
    
    const unsubscribe = subscribe(`wedding:${wedding.id}:updates`, (message) => {
      switch (message.type) {
        case 'schedule_update':
          // Mettre à jour le planning
          break;
        case 'new_photo':
          // Notifier nouvelle photo
          setNotifications(prev => [...prev, {
            type: 'photo',
            message: 'Nouvelle photo ajoutée à la galerie'
          }]);
          break;
        case 'message':
          // Nouveau message
          setNotifications(prev => [...prev, {
            type: 'message',
            message: `Nouveau message de ${message.data.sender}`
          }]);
          break;
      }
    });
    
    return () => unsubscribe();
  }, [wedding?.id]);

  // Mettre à jour l'URL lors du changement de tab
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
  };

  // Rendu du contenu du tab actif
  const renderTabContent = () => {
    const tabComponents = {
      overview: OverviewTab,
      rsvp: RSVPTab,
      'event-info': EventInfoTab,
      guests: GuestListTab,
      photos: PhotosTab,
      registry: GiftRegistryTab,
      messages: MessagesTab,
      travel: TravelTab
    };

    const Component = tabComponents[activeTab];
    
    return (
      <ErrorBoundary fallback={<div>Une erreur est survenue</div>}>
        <Suspense fallback={<LoadingSpinner />}>
          <Component 
            invite={invite} 
            wedding={wedding}
            onRsvpUpdate={setRsvpStatus}
          />
        </Suspense>
      </ErrorBoundary>
    );
  };

  if (inviteLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Invitation non trouvée
          </h2>
          <p className="text-gray-600 mb-8">
            Veuillez vérifier votre lien d'invitation ou contacter les mariés.
          </p>
          <a href="/" className="btn btn-primary">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // Calculer le nombre de jours restants
  const daysUntilWedding = Math.ceil(
    (new Date(wedding.date) - new Date()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header avec image de fond */}
      <header className="relative h-64 md:h-80 overflow-hidden">
        {wedding.cover_image ? (
          <img
            src={wedding.cover_image}
            alt={wedding.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-pink-400 to-purple-500" />
        )}
        
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h1 className="text-4xl md:text-5xl font-elegant mb-4">
            {wedding.bride_name} & {wedding.groom_name}
          </h1>
          <p className="text-xl md:text-2xl">
            {new Date(wedding.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {daysUntilWedding > 0 && (
            <p className="mt-4 text-lg bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              J-{daysUntilWedding} 💍
            </p>
          )}
        </div>
        
        {/* Statut RSVP */}
        <div className="absolute top-4 right-4">
          {rsvpStatus && (
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              rsvpStatus === 'confirmed' ? 'bg-green-500 text-white' :
              rsvpStatus === 'declined' ? 'bg-red-500 text-white' :
              'bg-yellow-500 text-white'
            }`}>
              {rsvpStatus === 'confirmed' ? '✓ Présence confirmée' :
               rsvpStatus === 'declined' ? '✗ Absence confirmée' :
               '? En attente de réponse'}
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-10 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8" role="tablist">
            {INVITE_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                  whitespace-nowrap transition-colors
                  ${activeTab === tab.id 
                    ? 'border-pink-500 text-pink-600' 
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

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 relative">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-info-circle text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  {notifications[notifications.length - 1].message}
                </p>
              </div>
              <button
                onClick={() => setNotifications([])}
                className="ml-auto pl-3"
              >
                <i className="fas fa-times text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {renderTabContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">
              Créé avec 💕 sur{' '}
              <a href="https://attitudes.vip" className="text-pink-600 hover:text-pink-700">
                Attitudes.vip
              </a>
            </p>
            {wedding.hashtag && (
              <p className="mt-2 text-lg text-gray-700">
                #{wedding.hashtag}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}