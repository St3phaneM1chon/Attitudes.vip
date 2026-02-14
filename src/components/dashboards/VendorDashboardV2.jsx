/**
 * VendorDashboardV2 - Dashboard générique pour tous les types de vendors
 * Adaptable selon le type : DJ, Photographe, Traiteur, etc.
 */

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../core/Layout/DashboardLayout';
import StatCard, { StatGroup } from '../core/Stats/StatCard';
import DataTable from '../core/Tables/DataTable';
import Modal, { ModalFooter } from '../core/Feedback/Modal';
import Input, { TextArea } from '../core/Forms/Input';
import Select from '../core/Forms/Select';
import Button from '../core/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useStripe } from '../../hooks/useStripe';
import { 
  Calendar, DollarSign, CheckCircle, Clock, Users,
  FileText, MessageSquare, Camera, Music, Utensils,
  Cake, MapPin, Star, TrendingUp, AlertCircle,
  Download, Upload, Phone, Mail, CreditCard,
  Package, Truck, Settings, BarChart3
} from 'lucide-react';

// Configuration des types de vendors
const VENDOR_CONFIGS = {
  'vendor:dj': {
    title: 'Dashboard DJ',
    icon: Music,
    color: 'purple',
    features: ['playlist', 'equipment', 'requests', 'schedule'],
    stats: ['events', 'songs', 'requests', 'rating']
  },
  'vendor:photographer': {
    title: 'Dashboard Photographe',
    icon: Camera,
    color: 'green',
    features: ['gallery', 'albums', 'editing', 'delivery'],
    stats: ['shoots', 'photos', 'albums', 'rating']
  },
  'vendor:caterer': {
    title: 'Dashboard Traiteur',
    icon: Utensils,
    color: 'orange',
    features: ['menus', 'orders', 'inventory', 'allergies'],
    stats: ['events', 'meals', 'orders', 'rating']
  },
  'vendor:baker': {
    title: 'Dashboard Pâtissier',
    icon: Cake,
    color: 'pink',
    features: ['catalog', 'orders', 'custom', 'delivery'],
    stats: ['orders', 'cakes', 'custom', 'rating']
  },
  'vendor:venue': {
    title: 'Dashboard Location',
    icon: MapPin,
    color: 'blue',
    features: ['availability', 'bookings', 'setup', 'services'],
    stats: ['bookings', 'availability', 'services', 'rating']
  },
  'wedding:planner': {
    title: 'Dashboard Wedding Planner',
    icon: Users,
    color: 'purple',
    features: ['planning', 'vendors', 'timeline', 'budget'],
    stats: ['weddings', 'vendors', 'tasks', 'budget']
  }
};

const VendorDashboardV2 = () => {
  const { user } = useAuth();
  const { isConnected, emit, on } = useWebSocket();
  const { createPaymentIntent, confirmPayment } = useStripe();
  
  const vendorType = user?.role || 'vendor:dj';
  const config = VENDOR_CONFIGS[vendorType] || VENDOR_CONFIGS['vendor:dj'];
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // État des données
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    totalReviews: 0,
    responseTime: '2h'
  });
  
  const [events, setEvents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [calendar, setCalendar] = useState([]);

  // Charger les données
  useEffect(() => {
    fetchVendorData();
    
    // Écouter les mises à jour temps réel
    const unsubscribeNewBooking = on('vendor:new_booking', handleNewBooking);
    const unsubscribePayment = on('vendor:payment_received', handlePaymentReceived);
    const unsubscribeMessage = on('vendor:new_message', handleNewMessage);
    
    return () => {
      unsubscribeNewBooking();
      unsubscribePayment();
      unsubscribeMessage();
    };
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      
      // Simuler un appel API
      // const response = await fetch('/api/vendor/dashboard');
      // const data = await response.json();
      
      // Données simulées
      setStats({
        totalEvents: 24,
        upcomingEvents: 8,
        completedEvents: 16,
        totalRevenue: 45600,
        monthlyRevenue: 8900,
        averageRating: 4.8,
        totalReviews: 67,
        responseTime: '2h'
      });

      setEvents([
        {
          id: 1,
          couple: 'Marie & Jean',
          date: '2024-07-15',
          time: '18:00',
          venue: 'Château de Versailles',
          status: 'confirmed',
          payment: 'partial',
          amount: 2500,
          paid: 1000,
          notes: 'Cérémonie extérieure si beau temps'
        },
        {
          id: 2,
          couple: 'Sophie & Pierre',
          date: '2024-08-20',
          time: '16:00',
          venue: 'Domaine du Lac',
          status: 'pending',
          payment: 'pending',
          amount: 3000,
          paid: 0,
          notes: 'En attente de confirmation finale'
        },
        {
          id: 3,
          couple: 'Emma & Lucas',
          date: '2024-09-10',
          time: '14:00',
          venue: 'Villa Rose',
          status: 'confirmed',
          payment: 'paid',
          amount: 2800,
          paid: 2800,
          notes: 'Menu végétarien pour 20 personnes'
        }
      ]);

      setContracts([
        { id: 1, eventId: 1, status: 'signed', signedDate: '2024-05-01' },
        { id: 2, eventId: 2, status: 'sent', sentDate: '2024-06-15' },
        { id: 3, eventId: 3, status: 'signed', signedDate: '2024-04-20' }
      ]);

      setPayments([
        { id: 1, eventId: 1, amount: 1000, date: '2024-05-15', method: 'stripe', status: 'completed' },
        { id: 2, eventId: 3, amount: 2800, date: '2024-04-25', method: 'bank', status: 'completed' }
      ]);

    } catch (error) {
      console.error('Erreur chargement données vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires d'événements temps réel
  const handleNewBooking = (booking) => {
    setEvents(prev => [booking, ...prev]);
    setStats(prev => ({
      ...prev,
      upcomingEvents: prev.upcomingEvents + 1,
      totalEvents: prev.totalEvents + 1
    }));
  };

  const handlePaymentReceived = (payment) => {
    setPayments(prev => [payment, ...prev]);
    setStats(prev => ({
      ...prev,
      monthlyRevenue: prev.monthlyRevenue + payment.amount,
      totalRevenue: prev.totalRevenue + payment.amount
    }));
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [message, ...prev]);
  };

  // Configuration de la sidebar selon le type de vendor
  const getSidebarItems = () => {
    const baseItems = [
      { label: 'Vue d\'ensemble', href: '#overview', icon: BarChart3, active: activeTab === 'overview' },
      { label: 'Événements', href: '#events', icon: Calendar, active: activeTab === 'events', badge: stats.upcomingEvents },
      { label: 'Contrats', href: '#contracts', icon: FileText, active: activeTab === 'contracts' },
      { label: 'Paiements', href: '#payments', icon: DollarSign, active: activeTab === 'payments' },
      { label: 'Messages', href: '#messages', icon: MessageSquare, active: activeTab === 'messages', badge: messages.length }
    ];

    // Ajouter des items spécifiques selon le type
    if (vendorType === 'vendor:dj') {
      baseItems.push(
        { label: 'Playlist', href: '#playlist', icon: Music, active: activeTab === 'playlist' },
        { label: 'Équipement', href: '#equipment', icon: Package, active: activeTab === 'equipment' }
      );
    } else if (vendorType === 'vendor:photographer') {
      baseItems.push(
        { label: 'Galeries', href: '#galleries', icon: Camera, active: activeTab === 'galleries' },
        { label: 'Livraisons', href: '#delivery', icon: Truck, active: activeTab === 'delivery' }
      );
    } else if (vendorType === 'vendor:caterer') {
      baseItems.push(
        { label: 'Menus', href: '#menus', icon: Utensils, active: activeTab === 'menus' },
        { label: 'Commandes', href: '#orders', icon: Package, active: activeTab === 'orders' }
      );
    }

    baseItems.push(
      { label: 'Paramètres', href: '#settings', icon: Settings, active: activeTab === 'settings' }
    );

    return baseItems;
  };

  // Colonnes de la table des événements
  const eventColumns = [
    {
      header: 'Couple',
      accessor: 'couple',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.venue}</div>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium">{new Date(value).toLocaleDateString('fr-FR')}</div>
          <div className="text-sm text-gray-500">{row.time}</div>
        </div>
      )
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value) => {
        const statusConfig = {
          confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-800' },
          pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
          cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
        };
        
        const config = statusConfig[value] || statusConfig.pending;
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        );
      }
    },
    {
      header: 'Paiement',
      accessor: 'payment',
      render: (value, row) => {
        const percentage = row.amount > 0 ? (row.paid / row.amount) * 100 : 0;
        const statusText = value === 'paid' ? 'Payé' : value === 'partial' ? 'Partiel' : 'En attente';
        const statusColor = value === 'paid' ? 'text-green-600' : value === 'partial' ? 'text-yellow-600' : 'text-gray-600';
        
        return (
          <div>
            <div className={`text-sm font-medium ${statusColor}`}>{statusText}</div>
            <div className="text-xs text-gray-500">
              {row.paid.toLocaleString()}€ / {row.amount.toLocaleString()}€
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className={`h-1 rounded-full ${
                  percentage === 100 ? 'bg-green-500' : percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex space-x-2">
          <Button
            size="small"
            variant="ghost"
            onClick={() => setSelectedEvent(row)}
          >
            Voir
          </Button>
          <Button
            size="small"
            variant="ghost"
            icon={MessageSquare}
            onClick={() => handleContactCouple(row)}
          />
        </div>
      )
    }
  ];

  const handleContactCouple = (event) => {
    // Ouvrir chat ou composer message
    console.log('Contact couple:', event);
  };

  const renderOverview = () => {
    const overviewStats = [
      {
        title: 'Événements à venir',
        value: stats.upcomingEvents,
        subtitle: `${stats.totalEvents} au total`,
        icon: Calendar,
        trend: 'up',
        trendValue: '+3',
        color: 'blue'
      },
      {
        title: 'Revenus du mois',
        value: `${(stats.monthlyRevenue / 1000).toFixed(1)}k€`,
        subtitle: `${(stats.totalRevenue / 1000).toFixed(0)}k€ au total`,
        icon: DollarSign,
        trend: 'up',
        trendValue: '+12%',
        color: 'green'
      },
      {
        title: 'Note moyenne',
        value: stats.averageRating.toFixed(1),
        subtitle: `${stats.totalReviews} avis`,
        icon: Star,
        color: 'yellow'
      },
      {
        title: 'Temps de réponse',
        value: stats.responseTime,
        subtitle: 'En moyenne',
        icon: Clock,
        color: 'purple'
      }
    ];

    return (
      <div className="space-y-6">
        <StatGroup stats={overviewStats} />

        {/* Prochains événements */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Prochains Événements</h3>
            <Button 
              variant="primary"
              size="small"
              onClick={() => setActiveTab('events')}
            >
              Voir tous
            </Button>
          </div>
          
          <div className="space-y-4">
            {events.filter(e => e.status === 'confirmed').slice(0, 3).map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div>
                  <h4 className="font-medium">{event.couple}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString('fr-FR')} • {event.venue}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    event.payment === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.payment === 'paid' ? 'Payé' : 'Paiement partiel'}
                  </span>
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

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            icon={Calendar}
            fullWidth
            onClick={() => setShowNewEventModal(true)}
          >
            Nouvelle Réservation
          </Button>
          <Button
            variant="outline"
            icon={FileText}
            fullWidth
            onClick={() => setActiveTab('contracts')}
          >
            Gérer Contrats
          </Button>
          <Button
            variant="outline"
            icon={DollarSign}
            fullWidth
            onClick={() => setActiveTab('payments')}
          >
            Voir Paiements
          </Button>
        </div>

        {/* Graphique revenus (placeholder) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Évolution des Revenus</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
            <p className="text-gray-500">Graphique des revenus mensuels</p>
          </div>
        </div>
      </div>
    );
  };

  const renderEvents = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Mes Événements</h2>
        <Button
          variant="primary"
          icon={Calendar}
          onClick={() => setShowNewEventModal(true)}
        >
          Nouvelle Réservation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="À venir"
          value={stats.upcomingEvents}
          icon={Calendar}
          color="blue"
          size="small"
        />
        <StatCard
          title="Ce mois"
          value="3"
          icon={Clock}
          color="purple"
          size="small"
        />
        <StatCard
          title="Confirmés"
          value="6"
          icon={CheckCircle}
          color="green"
          size="small"
        />
        <StatCard
          title="En attente"
          value="2"
          icon={AlertCircle}
          color="yellow"
          size="small"
        />
      </div>

      <DataTable
        columns={eventColumns}
        data={events}
        loading={loading}
      />
    </div>
  );

  const renderContracts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des Contrats</h2>
        <Button
          variant="primary"
          icon={FileText}
        >
          Nouveau Contrat
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contrats en attente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">En Attente de Signature</h3>
          <div className="space-y-3">
            {contracts.filter(c => c.status === 'sent').map(contract => {
              const event = events.find(e => e.id === contract.eventId);
              return (
                <div key={contract.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{event?.couple}</h4>
                      <p className="text-sm text-gray-500">
                        Envoyé le {new Date(contract.sentDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button size="small" variant="outline">
                      Relancer
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modèles de contrats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Modèles de Contrats</h3>
          <div className="space-y-2">
            <Button variant="ghost" icon={FileText} fullWidth className="justify-start">
              Contrat Standard {vendorType.split(':')[1]}
            </Button>
            <Button variant="ghost" icon={FileText} fullWidth className="justify-start">
              Contrat Premium
            </Button>
            <Button variant="ghost" icon={FileText} fullWidth className="justify-start">
              Conditions Générales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayments = () => {
    const totalPending = events.reduce((sum, event) => {
      return sum + (event.amount - event.paid);
    }, 0);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Gestion des Paiements</h2>
          <Button
            variant="primary"
            icon={CreditCard}
          >
            Demander Paiement
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="À recevoir"
            value={`${(totalPending / 1000).toFixed(1)}k€`}
            icon={Clock}
            color="yellow"
            size="small"
          />
          <StatCard
            title="Reçus ce mois"
            value={`${(stats.monthlyRevenue / 1000).toFixed(1)}k€`}
            icon={CheckCircle}
            color="green"
            size="small"
          />
          <StatCard
            title="Total annuel"
            value={`${(stats.totalRevenue / 1000).toFixed(0)}k€`}
            icon={TrendingUp}
            color="blue"
            size="small"
          />
        </div>

        {/* Intégration Stripe */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-blue-900">Paiements sécurisés avec Stripe</h4>
              <p className="text-sm text-blue-700 mt-1">
                Acceptez les paiements par carte bancaire directement depuis votre dashboard
              </p>
              <Button
                size="small"
                variant="primary"
                className="mt-2"
                onClick={() => console.log('Configurer Stripe')}
              >
                Configurer Stripe
              </Button>
            </div>
          </div>
        </div>

        {/* Liste des paiements récents */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Paiements Récents</h3>
          </div>
          <div className="divide-y">
            {payments.map(payment => {
              const event = events.find(e => e.id === payment.eventId);
              return (
                <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{event?.couple}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(payment.date).toLocaleDateString('fr-FR')} • {payment.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +{payment.amount.toLocaleString()}€
                    </p>
                    <p className="text-xs text-gray-500">{payment.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout
      title={config.title}
      subtitle={`Bienvenue ${user?.name}`}
      sidebarItems={getSidebarItems()}
      showSearch={true}
      showNotifications={true}
      breadcrumbs={[
        { label: 'Vendor', href: '/dashboard/vendor' },
        { label: activeTab === 'overview' ? 'Vue d\'ensemble' : activeTab }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Indicateur de connexion */}
        <div className={`mb-4 flex items-center space-x-2 text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`} />
          <span>{isConnected ? 'Connecté' : 'Déconnecté'} • Temps réel actif</span>
        </div>

        {/* Contenu selon l'onglet */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'contracts' && renderContracts()}
        {activeTab === 'payments' && renderPayments()}
        
        {/* Placeholder pour les autres onglets */}
        {!['overview', 'events', 'contracts', 'payments'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>

      {/* Modal nouvelle réservation */}
      <Modal
        isOpen={showNewEventModal}
        onClose={() => setShowNewEventModal(false)}
        title="Nouvelle Réservation"
        size="large"
        footer={
          <ModalFooter
            onCancel={() => setShowNewEventModal(false)}
            onConfirm={() => {
              // Créer la réservation
              setShowNewEventModal(false);
            }}
            confirmText="Créer la réservation"
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nom du couple"
              placeholder="Ex: Marie & Jean"
              required
            />
            <Input
              label="Date de l'événement"
              type="date"
              required
            />
          </div>
          
          <Input
            label="Lieu"
            placeholder="Nom et adresse du lieu"
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Heure"
              type="time"
              required
            />
            <Input
              label="Nombre d'invités"
              type="number"
              placeholder="150"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant total"
              type="number"
              placeholder="2500"
              icon={DollarSign}
              required
            />
            <Select
              label="Type de service"
              options={[
                { value: 'standard', label: 'Service Standard' },
                { value: 'premium', label: 'Service Premium' },
                { value: 'custom', label: 'Sur mesure' }
              ]}
            />
          </div>
          
          <TextArea
            label="Notes"
            placeholder="Informations supplémentaires..."
            rows={3}
          />
        </div>
      </Modal>

      {/* Modal détails événement */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Événement - ${selectedEvent.couple}`}
          size="large"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Date</label>
                <p className="font-medium">
                  {new Date(selectedEvent.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Heure</label>
                <p className="font-medium">{selectedEvent.time}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Lieu</label>
                <p className="font-medium">{selectedEvent.venue}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Statut</label>
                <p className="font-medium">{selectedEvent.status}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">Notes</label>
              <p className="mt-1">{selectedEvent.notes}</p>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Actions</h4>
              <div className="flex space-x-2">
                <Button icon={MessageSquare}>Contacter</Button>
                <Button icon={FileText} variant="outline">Contrat</Button>
                <Button icon={CreditCard} variant="outline">Paiement</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default VendorDashboardV2;