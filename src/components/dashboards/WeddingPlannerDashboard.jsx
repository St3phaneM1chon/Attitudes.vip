/**
 * WeddingPlannerDashboard - Dashboard pour les wedding planners
 * Gestion complète des mariages, vendors et timeline
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
import { useNotifications } from '../../hooks/useNotifications';
import { 
  Calendar, Users, TrendingUp, Clock, CheckCircle,
  AlertCircle, DollarSign, FileText, MessageSquare,
  Settings, BarChart3, Target, Briefcase, Heart,
  MapPin, Phone, Mail, Star, ChevronRight, Plus,
  Filter, Download, Upload, Search, UserPlus,
  CalendarDays, ListTodo, Palette, Camera, Music,
  Utensils, Cake, Car, Flower2
} from 'lucide-react';

const WeddingPlannerDashboard = () => {
  const { user } = useAuth();
  const { isConnected, emit, on } = useWebSocket();
  const { showNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showNewWeddingModal, setShowNewWeddingModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [selectedWedding, setSelectedWedding] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  
  // État des données
  const [stats, setStats] = useState({
    totalWeddings: 0,
    activeWeddings: 0,
    upcomingWeddings: 0,
    completedWeddings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageRating: 0,
    vendorNetwork: 0
  });
  
  const [weddings, setWeddings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [tasks, setTasks] = useState([]);
  
  // Charger les données
  useEffect(() => {
    fetchDashboardData();
    
    // WebSocket listeners
    const unsubscribeNewBooking = on('planner:new_wedding', handleNewWedding);
    const unsubscribeUpdate = on('planner:wedding_update', handleWeddingUpdate);
    const unsubscribeVendor = on('planner:vendor_update', handleVendorUpdate);
    
    return () => {
      unsubscribeNewBooking();
      unsubscribeUpdate();
      unsubscribeVendor();
    };
  }, []);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Données simulées
      setStats({
        totalWeddings: 47,
        activeWeddings: 12,
        upcomingWeddings: 8,
        completedWeddings: 27,
        totalRevenue: 285000,
        monthlyRevenue: 42000,
        averageRating: 4.9,
        vendorNetwork: 156
      });
      
      setWeddings([
        {
          id: 1,
          couple: 'Marie & Jean Dupont',
          date: '2024-07-15',
          venue: 'Château de Versailles',
          guests: 150,
          budget: 45000,
          spent: 28000,
          status: 'planning',
          completion: 65,
          nextTask: 'Finaliser le menu',
          vendors: {
            confirmed: 5,
            pending: 2,
            total: 8
          }
        },
        {
          id: 2,
          couple: 'Sophie & Pierre Martin',
          date: '2024-08-20',
          venue: 'Domaine du Lac',
          guests: 200,
          budget: 60000,
          spent: 15000,
          status: 'planning',
          completion: 35,
          nextTask: 'Choisir le photographe',
          vendors: {
            confirmed: 3,
            pending: 4,
            total: 9
          }
        },
        {
          id: 3,
          couple: 'Emma & Lucas Bernard',
          date: '2024-06-10',
          venue: 'Villa Rose',
          guests: 100,
          budget: 35000,
          spent: 32000,
          status: 'finalizing',
          completion: 90,
          nextTask: 'Plan de table final',
          vendors: {
            confirmed: 7,
            pending: 0,
            total: 7
          }
        }
      ]);
      
      setVendors([
        { id: 1, name: 'DJ Pro Events', type: 'dj', rating: 4.8, bookings: 12, status: 'active' },
        { id: 2, name: 'Photo Magic', type: 'photographer', rating: 4.9, bookings: 8, status: 'active' },
        { id: 3, name: 'Fleurs de Paris', type: 'florist', rating: 4.7, bookings: 15, status: 'active' },
        { id: 4, name: 'Delice Traiteur', type: 'caterer', rating: 4.9, bookings: 10, status: 'active' },
        { id: 5, name: 'Sweet Cakes', type: 'baker', rating: 5.0, bookings: 6, status: 'active' }
      ]);
      
      setTasks([
        { id: 1, wedding: 'Marie & Jean', task: 'Finaliser le menu', dueDate: '2024-05-20', priority: 'high', status: 'pending' },
        { id: 2, wedding: 'Sophie & Pierre', task: 'Choisir photographe', dueDate: '2024-05-25', priority: 'high', status: 'pending' },
        { id: 3, wedding: 'Emma & Lucas', task: 'Plan de table', dueDate: '2024-05-15', priority: 'medium', status: 'in_progress' },
        { id: 4, wedding: 'Marie & Jean', task: 'Réserver transport', dueDate: '2024-06-01', priority: 'medium', status: 'pending' }
      ]);
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      showNotification('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };
  
  // Gestionnaires WebSocket
  const handleNewWedding = (wedding) => {
    setWeddings(prev => [wedding, ...prev]);
    setStats(prev => ({
      ...prev,
      totalWeddings: prev.totalWeddings + 1,
      activeWeddings: prev.activeWeddings + 1
    }));
    showNotification('success', `Nouveau mariage ajouté: ${wedding.couple}`);
  };
  
  const handleWeddingUpdate = (update) => {
    setWeddings(prev => prev.map(w => 
      w.id === update.id ? { ...w, ...update } : w
    ));
  };
  
  const handleVendorUpdate = (update) => {
    setVendors(prev => prev.map(v => 
      v.id === update.id ? { ...v, ...update } : v
    ));
  };
  
  // Configuration sidebar
  const getSidebarItems = () => [
    { label: 'Vue d\'ensemble', href: '#overview', icon: BarChart3, active: activeTab === 'overview' },
    { label: 'Mariages', href: '#weddings', icon: Heart, active: activeTab === 'weddings', badge: stats.activeWeddings },
    { label: 'Vendors', href: '#vendors', icon: Briefcase, active: activeTab === 'vendors', badge: vendors.length },
    { label: 'Planning', href: '#timeline', icon: CalendarDays, active: activeTab === 'timeline' },
    { label: 'Tâches', href: '#tasks', icon: ListTodo, active: activeTab === 'tasks', badge: tasks.filter(t => t.status === 'pending').length },
    { label: 'Finances', href: '#finances', icon: DollarSign, active: activeTab === 'finances' },
    { label: 'Analytics', href: '#analytics', icon: BarChart3, active: activeTab === 'analytics' },
    { label: 'Paramètres', href: '#settings', icon: Settings, active: activeTab === 'settings' }
  ];
  
  // Colonnes tables
  const weddingColumns = [
    {
      header: 'Couple',
      accessor: 'couple',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.venue}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: 'date',
      sortable: true,
      render: (value) => (
        <div>
          <div className="font-medium">{new Date(value).toLocaleDateString('fr-FR')}</div>
          <div className="text-sm text-gray-500">
            Dans {Math.ceil((new Date(value) - new Date()) / (1000 * 60 * 60 * 24))} jours
          </div>
        </div>
      )
    },
    {
      header: 'Progression',
      accessor: 'completion',
      render: (value, row) => (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>{value}%</span>
            <span className="text-gray-500">{row.nextTask}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      )
    },
    {
      header: 'Budget',
      accessor: 'budget',
      render: (value, row) => {
        const percentage = (row.spent / value) * 100;
        const isOverBudget = percentage > 100;
        return (
          <div>
            <div className="font-medium">
              {row.spent.toLocaleString()}€ / {value.toLocaleString()}€
            </div>
            <div className="text-sm text-gray-500">
              {percentage.toFixed(0)}% utilisé
              {isOverBudget && <span className="text-red-600 ml-1">(Dépassement)</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: 'Vendors',
      accessor: 'vendors',
      render: (value) => (
        <div className="flex items-center space-x-2">
          <div className="text-sm">
            <span className="font-medium text-green-600">{value.confirmed}</span>
            <span className="text-gray-400"> / </span>
            <span className="text-gray-600">{value.total}</span>
          </div>
          {value.pending > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
              {value.pending} en attente
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex space-x-2">
          <Button
            size="small"
            variant="ghost"
            onClick={() => setSelectedWedding(row)}
          >
            Gérer
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
  
  const vendorColumns = [
    {
      header: 'Vendor',
      accessor: 'name',
      sortable: true,
      render: (value, row) => {
        const icons = {
          dj: Music,
          photographer: Camera,
          caterer: Utensils,
          baker: Cake,
          florist: Flower2,
          venue: MapPin,
          transport: Car
        };
        const Icon = icons[row.type] || Briefcase;
        
        return (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Icon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">{value}</div>
              <div className="text-sm text-gray-500 capitalize">{row.type}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Note',
      accessor: 'rating',
      sortable: true,
      render: (value) => (
        <div className="flex items-center space-x-1">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      header: 'Réservations',
      accessor: 'bookings',
      sortable: true,
      render: (value) => (
        <div>
          <span className="font-medium">{value}</span>
          <span className="text-sm text-gray-500 ml-1">cette année</span>
        </div>
      )
    },
    {
      header: 'Statut',
      accessor: 'status',
      render: (value) => {
        const statusConfig = {
          active: { label: 'Actif', color: 'bg-green-100 text-green-800' },
          inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-800' },
          pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' }
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
      header: 'Actions',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex space-x-2">
          <Button
            size="small"
            variant="ghost"
            onClick={() => setSelectedVendor(row)}
          >
            Détails
          </Button>
          <Button
            size="small"
            variant="ghost"
            icon={Phone}
            onClick={() => handleContactVendor(row)}
          />
        </div>
      )
    }
  ];
  
  const handleContactCouple = (wedding) => {
    console.log('Contact couple:', wedding);
  };
  
  const handleContactVendor = (vendor) => {
    console.log('Contact vendor:', vendor);
  };
  
  const renderOverview = () => {
    const overviewStats = [
      {
        title: 'Mariages actifs',
        value: stats.activeWeddings,
        subtitle: `${stats.totalWeddings} au total`,
        icon: Heart,
        trend: 'up',
        trendValue: '+2',
        color: 'pink'
      },
      {
        title: 'Revenus mensuels',
        value: `${(stats.monthlyRevenue / 1000).toFixed(0)}k€`,
        subtitle: `${(stats.totalRevenue / 1000).toFixed(0)}k€ au total`,
        icon: DollarSign,
        trend: 'up',
        trendValue: '+15%',
        color: 'green'
      },
      {
        title: 'Réseau vendors',
        value: stats.vendorNetwork,
        subtitle: 'Partenaires actifs',
        icon: Briefcase,
        color: 'purple'
      },
      {
        title: 'Note moyenne',
        value: stats.averageRating.toFixed(1),
        subtitle: 'Sur 5.0',
        icon: Star,
        color: 'yellow'
      }
    ];
    
    return (
      <div className="space-y-6">
        <StatGroup stats={overviewStats} />
        
        {/* Mariages à venir */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Prochains mariages</h3>
            <Button 
              variant="primary"
              size="small"
              icon={Plus}
              onClick={() => setShowNewWeddingModal(true)}
            >
              Nouveau mariage
            </Button>
          </div>
          
          <div className="space-y-4">
            {weddings.slice(0, 3).map(wedding => (
              <div key={wedding.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{wedding.couple}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(wedding.date).toLocaleDateString('fr-FR')} • {wedding.venue}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{wedding.completion}% complété</p>
                    <p className="text-xs text-gray-500">{wedding.guests} invités</p>
                  </div>
                  <Button
                    size="small"
                    variant="outline"
                    icon={ChevronRight}
                    onClick={() => setSelectedWedding(wedding)}
                  >
                    Gérer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tâches urgentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              Tâches urgentes
            </h3>
            <div className="space-y-3">
              {tasks.filter(t => t.priority === 'high').slice(0, 4).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{task.task}</p>
                    <p className="text-xs text-gray-600">{task.wedding} • {task.dueDate}</p>
                  </div>
                  <Button size="small" variant="ghost">
                    Terminer
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top vendors</h3>
            <div className="space-y-3">
              {vendors.slice(0, 4).map(vendor => {
                const icons = {
                  dj: Music,
                  photographer: Camera,
                  caterer: Utensils,
                  baker: Cake,
                  florist: Flower2
                };
                const Icon = icons[vendor.type] || Briefcase;
                
                return (
                  <div key={vendor.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-sm">{vendor.name}</p>
                        <p className="text-xs text-gray-500">{vendor.bookings} réservations</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{vendor.rating}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderWeddings = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des mariages</h2>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={Filter}
          >
            Filtrer
          </Button>
          <Button
            variant="outline"
            icon={Download}
          >
            Exporter
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setShowNewWeddingModal(true)}
          >
            Nouveau mariage
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="En planification"
          value={weddings.filter(w => w.status === 'planning').length}
          icon={Calendar}
          color="blue"
          size="small"
        />
        <StatCard
          title="En finalisation"
          value={weddings.filter(w => w.status === 'finalizing').length}
          icon={Clock}
          color="yellow"
          size="small"
        />
        <StatCard
          title="Ce mois"
          value="3"
          icon={CalendarDays}
          color="purple"
          size="small"
        />
        <StatCard
          title="Complétés"
          value={stats.completedWeddings}
          icon={CheckCircle}
          color="green"
          size="small"
        />
      </div>
      
      <DataTable
        columns={weddingColumns}
        data={weddings}
        loading={loading}
      />
    </div>
  );
  
  const renderVendors = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Réseau de vendors</h2>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            icon={Search}
          >
            Rechercher
          </Button>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setShowVendorModal(true)}
          >
            Ajouter vendor
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          { type: 'dj', icon: Music, count: 23, color: 'purple' },
          { type: 'photographer', icon: Camera, count: 18, color: 'blue' },
          { type: 'caterer', icon: Utensils, count: 15, color: 'orange' },
          { type: 'baker', icon: Cake, count: 12, color: 'pink' },
          { type: 'florist', icon: Flower2, count: 20, color: 'green' },
          { type: 'venue', icon: MapPin, count: 35, color: 'red' },
          { type: 'transport', icon: Car, count: 10, color: 'gray' }
        ].map(cat => (
          <div key={cat.type} className={`bg-${cat.color}-50 rounded-lg p-4 text-center cursor-pointer hover:bg-${cat.color}-100 transition`}>
            <cat.icon className={`h-8 w-8 text-${cat.color}-600 mx-auto mb-2`} />
            <p className="text-sm font-medium capitalize">{cat.type}</p>
            <p className={`text-lg font-bold text-${cat.color}-700`}>{cat.count}</p>
          </div>
        ))}
      </div>
      
      <DataTable
        columns={vendorColumns}
        data={vendors}
        loading={loading}
      />
    </div>
  );
  
  return (
    <DashboardLayout
      title="Dashboard Wedding Planner"
      subtitle={`Bienvenue ${user?.name}`}
      sidebarItems={getSidebarItems()}
      showSearch={true}
      showNotifications={true}
      breadcrumbs={[
        { label: 'Wedding Planner', href: '/dashboard/wedding-planner' },
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
        {activeTab === 'weddings' && renderWeddings()}
        {activeTab === 'vendors' && renderVendors()}
        
        {/* Placeholder pour les autres onglets */}
        {!['overview', 'weddings', 'vendors'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>
      
      {/* Modal nouveau mariage */}
      <Modal
        isOpen={showNewWeddingModal}
        onClose={() => setShowNewWeddingModal(false)}
        title="Nouveau mariage"
        size="large"
        footer={
          <ModalFooter
            onCancel={() => setShowNewWeddingModal(false)}
            onConfirm={() => {
              // Créer le mariage
              setShowNewWeddingModal(false);
            }}
            confirmText="Créer le mariage"
          />
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom marié(e) 1"
              placeholder="Marie"
              required
            />
            <Input
              label="Prénom marié(e) 2"
              placeholder="Jean"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date du mariage"
              type="date"
              required
            />
            <Input
              label="Nombre d'invités"
              type="number"
              placeholder="150"
              required
            />
          </div>
          
          <Input
            label="Lieu de réception"
            placeholder="Château de Versailles"
            icon={MapPin}
            required
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget total"
              type="number"
              placeholder="50000"
              icon={DollarSign}
              suffix="€"
              required
            />
            <Select
              label="Type de cérémonie"
              options={[
                { value: 'religious', label: 'Religieuse' },
                { value: 'civil', label: 'Civile' },
                { value: 'secular', label: 'Laïque' },
                { value: 'mixed', label: 'Mixte' }
              ]}
            />
          </div>
          
          <TextArea
            label="Notes initiales"
            placeholder="Préférences, thème, contraintes..."
            rows={3}
          />
        </div>
      </Modal>
      
      {/* Modal détails mariage */}
      {selectedWedding && (
        <Modal
          isOpen={!!selectedWedding}
          onClose={() => setSelectedWedding(null)}
          title={`Mariage ${selectedWedding.couple}`}
          size="xlarge"
        >
          <div className="space-y-6">
            {/* En-tête avec progression */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedWedding.couple}</h3>
                  <p className="mt-2">
                    {new Date(selectedWedding.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="mt-1">{selectedWedding.venue}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{selectedWedding.completion}%</div>
                  <div className="text-sm opacity-90">Progression</div>
                </div>
              </div>
            </div>
            
            {/* Actions rapides */}
            <div className="grid grid-cols-4 gap-4">
              <Button variant="outline" icon={Calendar} fullWidth>
                Planning
              </Button>
              <Button variant="outline" icon={Users} fullWidth>
                Invités
              </Button>
              <Button variant="outline" icon={DollarSign} fullWidth>
                Budget
              </Button>
              <Button variant="outline" icon={MessageSquare} fullWidth>
                Messages
              </Button>
            </div>
            
            {/* Détails */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Informations générales</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Invités</dt>
                    <dd className="font-medium">{selectedWedding.guests}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Budget</dt>
                    <dd className="font-medium">{selectedWedding.budget.toLocaleString()}€</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Dépensé</dt>
                    <dd className="font-medium">{selectedWedding.spent.toLocaleString()}€</dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Vendors</h4>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Confirmés</dt>
                    <dd className="font-medium text-green-600">{selectedWedding.vendors.confirmed}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">En attente</dt>
                    <dd className="font-medium text-yellow-600">{selectedWedding.vendors.pending}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Total prévu</dt>
                    <dd className="font-medium">{selectedWedding.vendors.total}</dd>
                  </div>
                </dl>
              </div>
            </div>
            
            {/* Prochaine tâche */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Prochaine étape</h4>
              <p className="text-yellow-700">{selectedWedding.nextTask}</p>
              <Button
                size="small"
                variant="primary"
                className="mt-3"
              >
                Marquer comme terminé
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
};

export default WeddingPlannerDashboard;