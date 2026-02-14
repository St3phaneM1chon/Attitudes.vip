/**
 * InviteDashboardV2 - Dashboard optimisé pour les invités
 * Mobile-first avec flow RSVP simplifié
 */

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../core/Layout/DashboardLayout';
import StatCard from '../core/Stats/StatCard';
import Button from '../core/Button/Button';
import Input from '../core/Forms/Input';
import Select from '../core/Forms/Select';
import Modal, { ModalFooter } from '../core/Feedback/Modal';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Calendar, MapPin, Clock, CheckCircle, XCircle,
  Users, Utensils, Music, Camera, Gift, Car,
  MessageSquare, Info, ChevronRight, Heart,
  Phone, Mail, Navigation, Share2, Download
} from 'lucide-react';

const InviteDashboardV2 = () => {
  const { user } = useAuth();
  const { isConnected, emit, on } = useWebSocket();
  
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  
  // État de l'invitation
  const [invitation, setInvitation] = useState({
    id: null,
    weddingId: null,
    couple: 'Marie & Jean',
    date: '2024-07-15',
    time: '16:00',
    venue: {
      name: 'Château de Versailles',
      address: '78000 Versailles, France',
      coordinates: { lat: 48.8049, lng: 2.1204 }
    },
    rsvpStatus: null, // null, 'attending', 'not_attending'
    plusOne: false,
    dietaryRestrictions: '',
    transportNeeded: false,
    tableNumber: null,
    group: 'Famille Mariée'
  });
  
  // Informations du mariage
  const [weddingInfo, setWeddingInfo] = useState({
    theme: 'Romantique Champêtre',
    dressCode: 'Tenue de cocktail - Couleurs pastel bienvenues',
    ceremonyType: 'Religieuse',
    receptionType: 'Dîner assis',
    hasAccommodation: true,
    hasTransport: true,
    hasChildcare: false,
    timeline: [
      { time: '15:30', event: 'Accueil des invités' },
      { time: '16:00', event: 'Cérémonie' },
      { time: '17:00', event: 'Cocktail' },
      { time: '19:00', event: 'Dîner' },
      { time: '22:00', event: 'Soirée dansante' }
    ],
    contacts: [
      { role: 'Mariée', name: 'Marie', phone: '+33 6 12 34 56 78' },
      { role: 'Marié', name: 'Jean', phone: '+33 6 98 76 54 32' },
      { role: 'Wedding Planner', name: 'Sophie', phone: '+33 6 11 22 33 44' }
    ]
  });
  
  // Liste de mariage
  const [giftRegistry, setGiftRegistry] = useState([
    { id: 1, title: 'Voyage de noces', target: 5000, collected: 3200, contributors: 12 },
    { id: 2, title: 'Service de table', price: 450, purchased: false, reserved: false },
    { id: 3, title: 'Robot cuisine', price: 800, purchased: true, purchaser: 'Famille Martin' },
    { id: 4, title: 'Appareil photo', price: 1200, purchased: false, reserved: true }
  ]);
  
  // Photos et messages
  const [photos, setPhotos] = useState([]);
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    fetchInvitationData();
    
    // WebSocket listeners
    const unsubscribeUpdate = on('invite:update', handleInvitationUpdate);
    const unsubscribePhoto = on('wedding:new_photo', handleNewPhoto);
    const unsubscribeMessage = on('wedding:new_message', handleNewMessage);
    
    return () => {
      unsubscribeUpdate();
      unsubscribePhoto();
      unsubscribeMessage();
    };
  }, []);
  
  const fetchInvitationData = async () => {
    try {
      setLoading(true);
      // Simuler un appel API
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erreur chargement invitation:', error);
      setLoading(false);
    }
  };
  
  const handleInvitationUpdate = (update) => {
    setInvitation(prev => ({ ...prev, ...update }));
  };
  
  const handleNewPhoto = (photo) => {
    setPhotos(prev => [photo, ...prev]);
  };
  
  const handleNewMessage = (message) => {
    setMessages(prev => [message, ...prev]);
  };
  
  const handleRSVP = async (attending, details = {}) => {
    try {
      emit('invite:rsvp', {
        invitationId: invitation.id,
        attending,
        ...details
      });
      
      setInvitation(prev => ({
        ...prev,
        rsvpStatus: attending ? 'attending' : 'not_attending',
        ...details
      }));
      
      setShowRSVPModal(false);
    } catch (error) {
      console.error('Erreur RSVP:', error);
    }
  };
  
  const getDaysUntilWedding = () => {
    const weddingDate = new Date(invitation.date);
    const today = new Date();
    const diffTime = weddingDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const renderHome = () => {
    const daysLeft = getDaysUntilWedding();
    const rsvpColor = invitation.rsvpStatus === 'attending' ? 'green' : 
                     invitation.rsvpStatus === 'not_attending' ? 'red' : 'blue';
    const rsvpText = invitation.rsvpStatus === 'attending' ? 'Présence confirmée' :
                    invitation.rsvpStatus === 'not_attending' ? 'Absence confirmée' :
                    'Réponse en attente';
    
    return (
      <div className="space-y-6">
        {/* En-tête avec compte à rebours */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{invitation.couple}</h1>
            <p className="text-lg opacity-90">Vous invitent à célébrer leur mariage</p>
            <div className="mt-6">
              <div className="text-5xl font-bold">{daysLeft}</div>
              <div className="text-sm uppercase tracking-wide opacity-75">jours restants</div>
            </div>
          </div>
        </div>
        
        {/* Statut RSVP */}
        <div className={`bg-${rsvpColor}-50 border border-${rsvpColor}-200 rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {invitation.rsvpStatus === 'attending' ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : invitation.rsvpStatus === 'not_attending' ? (
                <XCircle className="h-6 w-6 text-red-600" />
              ) : (
                <Clock className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <h3 className="font-semibold">{rsvpText}</h3>
                {invitation.rsvpStatus && (
                  <p className="text-sm text-gray-600">
                    {invitation.plusOne ? 'Avec accompagnant' : 'Sans accompagnant'}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={invitation.rsvpStatus ? 'outline' : 'primary'}
              onClick={() => setShowRSVPModal(true)}
            >
              {invitation.rsvpStatus ? 'Modifier' : 'Répondre'}
            </Button>
          </div>
        </div>
        
        {/* Informations essentielles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-1" />
              <div>
                <h4 className="font-semibold">Date & Heure</h4>
                <p className="text-gray-600">
                  {new Date(invitation.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-600">à {invitation.time}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-1" />
              <div className="flex-1">
                <h4 className="font-semibold">Lieu</h4>
                <p className="text-gray-600">{invitation.venue.name}</p>
                <p className="text-sm text-gray-500">{invitation.venue.address}</p>
                <Button
                  size="small"
                  variant="link"
                  icon={Navigation}
                  className="mt-2 -ml-2"
                  onClick={() => {
                    // Ouvrir dans Maps
                    window.open(`https://maps.google.com/?q=${invitation.venue.coordinates.lat},${invitation.venue.coordinates.lng}`);
                  }}
                >
                  Voir l'itinéraire
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            icon={Clock}
            fullWidth
            onClick={() => setActiveSection('timeline')}
            className="text-left justify-start"
          >
            Programme
          </Button>
          <Button
            variant="outline"
            icon={Gift}
            fullWidth
            onClick={() => setActiveSection('gifts')}
            className="text-left justify-start"
          >
            Liste de mariage
          </Button>
          <Button
            variant="outline"
            icon={Camera}
            fullWidth
            onClick={() => setActiveSection('photos')}
            className="text-left justify-start"
          >
            Photos
          </Button>
          <Button
            variant="outline"
            icon={Info}
            fullWidth
            onClick={() => setActiveSection('info')}
            className="text-left justify-start"
          >
            Infos pratiques
          </Button>
        </div>
        
        {/* Aperçu du programme */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Programme de la journée</h3>
          <div className="space-y-3">
            {weddingInfo.timeline.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="text-sm font-medium text-gray-500 w-12">{item.time}</div>
                <div className="flex-1 text-gray-700">{item.event}</div>
              </div>
            ))}
          </div>
          <Button
            variant="link"
            icon={ChevronRight}
            iconPosition="right"
            className="mt-3"
            onClick={() => setActiveSection('timeline')}
          >
            Voir le programme complet
          </Button>
        </div>
      </div>
    );
  };
  
  const renderTimeline = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Programme de la journée</h2>
        <Button
          variant="ghost"
          icon={Download}
          onClick={() => {
            // Télécharger le programme
            console.log('Télécharger programme');
          }}
        >
          Télécharger
        </Button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {weddingInfo.timeline.map((item, index) => (
            <div key={index} className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-purple-600">{item.time}</span>
                </div>
              </div>
              <div className="flex-1 pt-3">
                <h4 className="font-semibold">{item.event}</h4>
                {index === 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Merci d'arriver 15 minutes avant la cérémonie
                  </p>
                )}
                {index < weddingInfo.timeline.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 ml-6 mt-4" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Dress Code</h4>
          <p className="text-blue-700">{weddingInfo.dressCode}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Thème</h4>
          <p className="text-green-700">{weddingInfo.theme}</p>
        </div>
      </div>
    </div>
  );
  
  const renderGifts = () => {
    const totalContributed = giftRegistry
      .filter(g => g.target)
      .reduce((sum, g) => sum + g.collected, 0);
    const totalTarget = giftRegistry
      .filter(g => g.target)
      .reduce((sum, g) => sum + g.target, 0);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Liste de mariage</h2>
          <Button
            variant="ghost"
            icon={Share2}
            onClick={() => {
              // Partager la liste
              console.log('Partager liste');
            }}
          >
            Partager
          </Button>
        </div>
        
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <p className="text-pink-800">
            <Heart className="inline h-4 w-4 mr-1" />
            Votre présence est le plus beau des cadeaux. Cette liste est là pour ceux qui souhaitent contribuer.
          </p>
        </div>
        
        {/* Cagnottes */}
        <div className="space-y-4">
          <h3 className="font-semibold">Cagnottes</h3>
          {giftRegistry.filter(g => g.target).map(gift => {
            const percentage = (gift.collected / gift.target) * 100;
            return (
              <div key={gift.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-medium">{gift.title}</h4>
                  <span className="text-sm text-gray-500">
                    {gift.contributors} contributeurs
                  </span>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Collecté</span>
                    <span className="font-medium">
                      {gift.collected.toLocaleString()}€ / {gift.target.toLocaleString()}€
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
                <Button
                  size="small"
                  variant="primary"
                  fullWidth
                  onClick={() => setShowGiftModal(true)}
                >
                  Contribuer
                </Button>
              </div>
            );
          })}
        </div>
        
        {/* Cadeaux physiques */}
        <div className="space-y-4">
          <h3 className="font-semibold">Cadeaux</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {giftRegistry.filter(g => g.price).map(gift => (
              <div key={gift.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{gift.title}</h4>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {gift.price.toLocaleString()}€
                    </p>
                  </div>
                  {gift.purchased && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Offert
                    </span>
                  )}
                  {gift.reserved && !gift.purchased && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Réservé
                    </span>
                  )}
                </div>
                {!gift.purchased && !gift.reserved && (
                  <Button
                    size="small"
                    variant="outline"
                    fullWidth
                    className="mt-3"
                    onClick={() => setShowGiftModal(true)}
                  >
                    Offrir ce cadeau
                  </Button>
                )}
                {gift.purchased && gift.purchaser && (
                  <p className="text-sm text-gray-500 mt-2">Offert par {gift.purchaser}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const renderInfo = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Informations pratiques</h2>
      
      {/* Contacts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Contacts</h3>
        <div className="space-y-3">
          {weddingInfo.contacts.map((contact, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
              <div>
                <p className="font-medium">{contact.name}</p>
                <p className="text-sm text-gray-500">{contact.role}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="small"
                  variant="ghost"
                  icon={Phone}
                  onClick={() => window.open(`tel:${contact.phone}`)}
                />
                <Button
                  size="small"
                  variant="ghost"
                  icon={MessageSquare}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Services disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${
          weddingInfo.hasAccommodation ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
        }`}>
          <Users className="h-8 w-8 mb-2 text-green-600" />
          <h4 className="font-semibold">Hébergement</h4>
          <p className="text-sm mt-1">
            {weddingInfo.hasAccommodation ? 'Disponible sur demande' : 'Non fourni'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          weddingInfo.hasTransport ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
        }`}>
          <Car className="h-8 w-8 mb-2 text-green-600" />
          <h4 className="font-semibold">Transport</h4>
          <p className="text-sm mt-1">
            {weddingInfo.hasTransport ? 'Navettes prévues' : 'Non fourni'}
          </p>
        </div>
        
        <div className={`p-4 rounded-lg ${
          weddingInfo.hasChildcare ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
        }`}>
          <Heart className="h-8 w-8 mb-2 text-green-600" />
          <h4 className="font-semibold">Garde d'enfants</h4>
          <p className="text-sm mt-1">
            {weddingInfo.hasChildcare ? 'Service disponible' : 'Non fourni'}
          </p>
        </div>
      </div>
      
      {/* Plan d'accès */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Plan d'accès</h3>
        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center mb-4">
          <p className="text-gray-500">Carte interactive</p>
        </div>
        <div className="space-y-2">
          <Button
            variant="primary"
            icon={Navigation}
            fullWidth
            onClick={() => {
              window.open(`https://maps.google.com/?q=${invitation.venue.coordinates.lat},${invitation.venue.coordinates.lng}`);
            }}
          >
            Ouvrir dans Maps
          </Button>
          <Button
            variant="outline"
            icon={Car}
            fullWidth
          >
            Réserver un taxi
          </Button>
        </div>
      </div>
    </div>
  );
  
  const sidebarItems = [
    { label: 'Accueil', href: '#home', icon: Heart, active: activeSection === 'home' },
    { label: 'Programme', href: '#timeline', icon: Clock, active: activeSection === 'timeline' },
    { label: 'Liste de mariage', href: '#gifts', icon: Gift, active: activeSection === 'gifts' },
    { label: 'Photos', href: '#photos', icon: Camera, active: activeSection === 'photos' },
    { label: 'Infos pratiques', href: '#info', icon: Info, active: activeSection === 'info' }
  ];
  
  // Navigation simplifiée pour mobile
  const handleSectionClick = (section) => {
    setActiveSection(section);
    // Scroll to top sur mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <DashboardLayout
      title="Mon Invitation"
      subtitle={invitation.couple}
      sidebarItems={sidebarItems.map(item => ({
        ...item,
        onClick: () => handleSectionClick(item.label.toLowerCase().replace(' ', ''))
      }))}
      showSearch={false}
      showNotifications={true}
      breadcrumbs={[
        { label: 'Invitation', href: '/dashboard/invite' },
        { label: activeSection === 'home' ? 'Accueil' : activeSection }
      ]}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-6">
        {/* Contenu selon la section */}
        {activeSection === 'home' && renderHome()}
        {activeSection === 'timeline' && renderTimeline()}
        {activeSection === 'gifts' && renderGifts()}
        {activeSection === 'info' && renderInfo()}
        
        {/* Section photos placeholder */}
        {activeSection === 'photos' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Les photos seront disponibles après le mariage</p>
          </div>
        )}
      </div>
      
      {/* Navigation mobile en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleSectionClick(item.label.toLowerCase().replace(' ', ''))}
                className={`py-3 px-1 text-center transition-colors ${
                  item.active
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Modal RSVP */}
      <Modal
        isOpen={showRSVPModal}
        onClose={() => setShowRSVPModal(false)}
        title="Confirmer ma présence"
        size="medium"
      >
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold">{invitation.couple}</h3>
            <p className="text-gray-600">
              {new Date(invitation.date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="large"
              fullWidth
              onClick={() => {
                const modal = document.getElementById('rsvp-details');
                modal.classList.remove('hidden');
              }}
              className="border-green-500 text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Je serai là
            </Button>
            <Button
              variant="outline"
              size="large"
              fullWidth
              onClick={() => handleRSVP(false)}
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Je ne pourrai pas
            </Button>
          </div>
          
          {/* Détails RSVP */}
          <div id="rsvp-details" className="hidden space-y-4">
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Quelques détails</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                      checked={invitation.plusOne}
                      onChange={(e) => setInvitation(prev => ({
                        ...prev,
                        plusOne: e.target.checked
                      }))}
                    />
                    <span>Je viendrai accompagné(e)</span>
                  </label>
                </div>
                
                <Input
                  label="Régime alimentaire / Allergies"
                  placeholder="Végétarien, sans gluten, allergies..."
                  value={invitation.dietaryRestrictions}
                  onChange={(e) => setInvitation(prev => ({
                    ...prev,
                    dietaryRestrictions: e.target.value
                  }))}
                />
                
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                      checked={invitation.transportNeeded}
                      onChange={(e) => setInvitation(prev => ({
                        ...prev,
                        transportNeeded: e.target.checked
                      }))}
                    />
                    <span>J'aurai besoin du transport organisé</span>
                  </label>
                </div>
              </div>
              
              <Button
                variant="primary"
                fullWidth
                className="mt-6"
                onClick={() => handleRSVP(true, {
                  plusOne: invitation.plusOne,
                  dietaryRestrictions: invitation.dietaryRestrictions,
                  transportNeeded: invitation.transportNeeded
                })}
              >
                Confirmer ma présence
              </Button>
            </div>
          </div>
        </div>
      </Modal>
      
      {/* Modal Contribution */}
      <Modal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        title="Contribuer à la cagnotte"
        size="small"
        footer={
          <ModalFooter
            onCancel={() => setShowGiftModal(false)}
            onConfirm={() => {
              // Rediriger vers page de paiement
              console.log('Redirection paiement');
              setShowGiftModal(false);
            }}
            confirmText="Continuer vers le paiement"
          />
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Vous allez être redirigé vers notre plateforme de paiement sécurisée.
          </p>
          <Input
            label="Montant de votre contribution"
            type="number"
            placeholder="50"
            icon={Gift}
            suffix="€"
          />
          <Input
            label="Message (optionnel)"
            placeholder="Félicitations aux mariés!"
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default InviteDashboardV2;