/**
 * Dashboard Admin - Interface d'administration complète
 * Gestion des utilisateurs, analytics, configuration système
 */

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../core/Layout/DashboardLayout';
import StatCard, { StatGroup } from '../core/Stats/StatCard';
import DataTable from '../core/Tables/DataTable';
import Modal, { ModalFooter } from '../core/Feedback/Modal';
import Input from '../core/Forms/Input';
import Select from '../core/Forms/Select';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  Users, UserCheck, UserX, Calendar, DollarSign, 
  Activity, Server, Database, AlertCircle, Settings,
  TrendingUp, Shield, Globe, BarChart3, FileText,
  Mail, MessageSquare, Clock, CheckCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { isConnected, onlineUsers, broadcastAnnouncement } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalWeddings: 0,
    activeWeddings: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    systemHealth: 'good',
    uptime: '99.9%'
  });

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState({ message: '', priority: 'info' });

  // Charger les données
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simuler un appel API
      // const response = await fetch('/api/admin/dashboard');
      // const data = await response.json();
      
      // Données simulées pour la démo
      setStats({
        totalUsers: 3456,
        activeUsers: 1234,
        totalWeddings: 567,
        activeWeddings: 123,
        totalRevenue: 456789,
        monthlyRevenue: 45678,
        systemHealth: 'good',
        uptime: '99.9%'
      });

      setUsers([
        {
          id: 1,
          name: 'Marie Dupont',
          email: 'marie@example.com',
          role: 'customer',
          status: 'active',
          createdAt: '2024-01-15',
          lastLogin: '2024-06-25',
          weddings: 1
        },
        {
          id: 2,
          name: 'Jean Martin',
          email: 'jean@djpro.com',
          role: 'vendor:dj',
          status: 'active',
          createdAt: '2024-02-20',
          lastLogin: '2024-06-24',
          weddings: 5
        },
        {
          id: 3,
          name: 'Sophie Bernard',
          email: 'sophie@photo.com',
          role: 'vendor:photographer',
          status: 'inactive',
          createdAt: '2024-03-10',
          lastLogin: '2024-05-15',
          weddings: 3
        }
      ]);
    } catch (error) {
      console.error('Erreur chargement données admin:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configuration des tabs de navigation
  const sidebarItems = [
    { label: 'Vue d\'ensemble', href: '#overview', icon: BarChart3, active: activeTab === 'overview' },
    { label: 'Utilisateurs', href: '#users', icon: Users, active: activeTab === 'users', badge: stats.totalUsers },
    { label: 'Mariages', href: '#weddings', icon: Calendar, active: activeTab === 'weddings', badge: stats.activeWeddings },
    { label: 'Finances', href: '#finance', icon: DollarSign, active: activeTab === 'finance' },
    { label: 'Système', href: '#system', icon: Server, active: activeTab === 'system' },
    { label: 'Communications', href: '#communications', icon: MessageSquare, active: activeTab === 'communications' },
    { label: 'Sécurité', href: '#security', icon: Shield, active: activeTab === 'security' },
    { label: 'Configuration', href: '#settings', icon: Settings, active: activeTab === 'settings' }
  ];

  // Gestion des utilisateurs
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleUserStatusChange = async (userId, newStatus) => {
    try {
      // Appel API pour changer le statut
      // await updateUserStatus(userId, newStatus);
      
      // Mise à jour locale
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      ));
    } catch (error) {
      console.error('Erreur changement statut:', error);
    }
  };

  const handleSendAnnouncement = async () => {
    try {
      await broadcastAnnouncement(announcement.message, announcement.priority);
      setShowAnnouncementModal(false);
      setAnnouncement({ message: '', priority: 'info' });
    } catch (error) {
      console.error('Erreur envoi annonce:', error);
    }
  };

  // Configuration des colonnes pour la table des utilisateurs
  const userColumns = [
    {
      header: 'Utilisateur',
      accessor: 'name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      )
    },
    {
      header: 'Rôle',
      accessor: 'role',
      sortable: true,
      render: (value) => {
        const roleLabels = {
          'admin': 'Administrateur',
          'customer': 'Client',
          'vendor:dj': 'DJ',
          'vendor:photographer': 'Photographe',
          'vendor:caterer': 'Traiteur',
          'wedding:planner': 'Wedding Planner'
        };
        
        const roleColors = {
          'admin': 'bg-purple-100 text-purple-800',
          'customer': 'bg-blue-100 text-blue-800',
          'vendor:dj': 'bg-green-100 text-green-800',
          'vendor:photographer': 'bg-yellow-100 text-yellow-800',
          'vendor:caterer': 'bg-orange-100 text-orange-800',
          'wedding:planner': 'bg-pink-100 text-pink-800'
        };

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {roleLabels[value] || value}
          </span>
        );
      }
    },
    {
      header: 'Statut',
      accessor: 'status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value === 'active' ? 'Actif' : 'Inactif'}
        </span>
      )
    },
    {
      header: 'Mariages',
      accessor: 'weddings',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-900">{value}</span>
      )
    },
    {
      header: 'Inscription',
      accessor: 'createdAt',
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      header: 'Dernière connexion',
      accessor: 'lastLogin',
      sortable: true,
      render: (value) => {
        const date = new Date(value);
        const now = new Date();
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffHours < 24) {
          return <span className="text-green-600">Il y a {diffHours}h</span>;
        } else {
          return <span className="text-gray-500">{date.toLocaleDateString('fr-FR')}</span>;
        }
      }
    }
  ];

  const renderOverview = () => {
    const overviewStats = [
      {
        title: 'Utilisateurs Totaux',
        value: stats.totalUsers.toLocaleString(),
        subtitle: `${stats.activeUsers} actifs aujourd'hui`,
        icon: Users,
        trend: 'up',
        trendValue: '+12%',
        color: 'blue'
      },
      {
        title: 'Mariages Actifs',
        value: stats.activeWeddings.toLocaleString(),
        subtitle: `${stats.totalWeddings} au total`,
        icon: Calendar,
        trend: 'up',
        trendValue: '+8%',
        color: 'purple'
      },
      {
        title: 'Revenus Mensuels',
        value: `${(stats.monthlyRevenue / 1000).toFixed(1)}k€`,
        subtitle: `${(stats.totalRevenue / 1000).toFixed(0)}k€ au total`,
        icon: DollarSign,
        trend: 'up',
        trendValue: '+15%',
        color: 'green'
      },
      {
        title: 'Santé Système',
        value: stats.uptime,
        subtitle: stats.systemHealth === 'good' ? 'Tout fonctionne' : 'Problèmes détectés',
        icon: Activity,
        color: stats.systemHealth === 'good' ? 'green' : 'red'
      }
    ];

    return (
      <div className="space-y-6">
        <StatGroup stats={overviewStats} />

        {/* Graphiques et métriques supplémentaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activité récente */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Activité Récente</h3>
            <div className="space-y-3">
              {[
                { type: 'user', action: 'Nouveau utilisateur inscrit', user: 'Emma Wilson', time: 'Il y a 5 min' },
                { type: 'wedding', action: 'Mariage créé', user: 'Jean & Marie', time: 'Il y a 1h' },
                { type: 'payment', action: 'Paiement reçu', user: 'Pierre Durand', time: 'Il y a 2h' },
                { type: 'vendor', action: 'Nouveau fournisseur', user: 'Photo Pro Studio', time: 'Il y a 3h' }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'user' ? 'bg-blue-500' :
                    activity.type === 'wedding' ? 'bg-purple-500' :
                    activity.type === 'payment' ? 'bg-green-500' :
                    'bg-orange-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.user} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Utilisateurs en ligne */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Utilisateurs en Ligne
              <span className="ml-2 text-sm text-gray-500">({onlineUsers.length})</span>
            </h3>
            <div className="space-y-2">
              {onlineUsers.slice(0, 10).map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{user.userName}</span>
                    <span className="text-xs text-gray-500">({user.userRole})</span>
                  </div>
                  <span className="text-xs text-gray-400">Mariage #{user.weddingId}</span>
                </div>
              ))}
              {onlineUsers.length > 10 && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Et {onlineUsers.length - 10} autres...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Alertes système */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h4 className="font-medium text-yellow-800">Alertes Système</h4>
              <ul className="mt-1 text-sm text-yellow-700 space-y-1">
                <li>• Mise à jour de sécurité disponible (v2.3.4)</li>
                <li>• Backup automatique prévu ce soir à 2h00</li>
                <li>• Limite de stockage atteinte à 85%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des Utilisateurs</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + Nouvel Utilisateur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Utilisateurs"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          size="small"
        />
        <StatCard
          title="Actifs Aujourd'hui"
          value={stats.activeUsers}
          icon={UserCheck}
          color="green"
          size="small"
        />
        <StatCard
          title="Nouveaux (30j)"
          value="234"
          icon={TrendingUp}
          color="purple"
          size="small"
        />
        <StatCard
          title="Taux de Rétention"
          value="87%"
          icon={Activity}
          color="orange"
          size="small"
        />
      </div>

      <DataTable
        columns={userColumns}
        data={users}
        onRowClick={handleUserClick}
        loading={loading}
      />
    </div>
  );

  const renderCommunications = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Centre de Communications</h2>
        <button 
          onClick={() => setShowAnnouncementModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nouvelle Annonce
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statistiques communications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Emails envoyés (30j)</span>
              <span className="font-semibold">12,456</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">SMS envoyés (30j)</span>
              <span className="font-semibold">3,789</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Notifications push</span>
              <span className="font-semibold">8,234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taux d'ouverture</span>
              <span className="font-semibold text-green-600">68%</span>
            </div>
          </div>
        </div>

        {/* Annonces récentes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Annonces Récentes</h3>
          <div className="space-y-3">
            {[
              { message: 'Maintenance prévue ce weekend', priority: 'warning', date: '2024-06-25' },
              { message: 'Nouvelle fonctionnalité: Albums photos', priority: 'info', date: '2024-06-20' },
              { message: 'Mise à jour des CGU', priority: 'info', date: '2024-06-15' }
            ].map((announcement, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                <p className="text-sm font-medium">{announcement.message}</p>
                <p className="text-xs text-gray-500">{announcement.date}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemHealth = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Santé du Système</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Services status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Services</h3>
          <div className="space-y-3">
            {[
              { name: 'API Backend', status: 'operational', uptime: '99.9%' },
              { name: 'Base de données', status: 'operational', uptime: '99.99%' },
              { name: 'Redis Cache', status: 'operational', uptime: '100%' },
              { name: 'WebSocket', status: 'operational', uptime: '99.8%' },
              { name: 'Email Service', status: 'degraded', uptime: '95%' },
              { name: 'SMS Service', status: 'operational', uptime: '99.5%' }
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500' :
                    service.status === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm">{service.name}</span>
                </div>
                <span className="text-xs text-gray-500">{service.uptime}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance metrics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>45%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>62%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Disk Usage</span>
                <span>85%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Response times */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Temps de Réponse</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">API Average</span>
              <span className="text-sm font-medium">145ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Database Queries</span>
              <span className="text-sm font-medium">23ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cache Hit Rate</span>
              <span className="text-sm font-medium text-green-600">94%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Error Rate</span>
              <span className="text-sm font-medium text-red-600">0.3%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      title="Administration Attitudes.vip"
      subtitle={`Bienvenue ${user?.name}`}
      sidebarItems={sidebarItems}
      showSearch={true}
      showNotifications={true}
      breadcrumbs={[
        { label: 'Admin', href: '/dashboard/admin' },
        { label: activeTab === 'overview' ? 'Vue d\'ensemble' : activeTab }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Indicateur de connexion WebSocket */}
        <div className={`mb-4 flex items-center space-x-2 text-sm ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`} />
          <span>{isConnected ? 'Connecté' : 'Déconnecté'} au serveur temps réel</span>
        </div>

        {/* Contenu selon l'onglet actif */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'communications' && renderCommunications()}
        {activeTab === 'system' && renderSystemHealth()}
        
        {/* Placeholder pour les autres onglets */}
        {!['overview', 'users', 'communications', 'system'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>

      {/* Modal détails utilisateur */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Détails Utilisateur"
        size="large"
        footer={
          <ModalFooter
            onCancel={() => setShowUserModal(false)}
            onConfirm={() => setShowUserModal(false)}
            confirmText="Fermer"
          />
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Nom</label>
                <p className="font-medium">{selectedUser.name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Rôle</label>
                <p className="font-medium">{selectedUser.role}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Statut</label>
                <Select
                  value={selectedUser.status}
                  onChange={(e) => handleUserStatusChange(selectedUser.id, e.target.value)}
                  options={[
                    { value: 'active', label: 'Actif' },
                    { value: 'inactive', label: 'Inactif' },
                    { value: 'suspended', label: 'Suspendu' }
                  ]}
                  size="small"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Actions</h4>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Envoyer Email
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                  Réinitialiser Mot de Passe
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Supprimer Compte
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal annonce */}
      <Modal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        title="Envoyer une Annonce"
        footer={
          <ModalFooter
            onCancel={() => setShowAnnouncementModal(false)}
            onConfirm={handleSendAnnouncement}
            confirmText="Envoyer"
          />
        }
      >
        <div className="space-y-4">
          <Input
            label="Message"
            value={announcement.message}
            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            placeholder="Entrez votre message..."
            required
          />
          
          <Select
            label="Priorité"
            value={announcement.priority}
            onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}
            options={[
              { value: 'info', label: 'Information' },
              { value: 'warning', label: 'Avertissement' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default AdminDashboard;