/**
 * ClientDashboard - Dashboard marque blanche pour les clients entreprise
 * Interface personnalisable avec branding client
 */

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../core/Layout/DashboardLayout';
import StatCard, { StatGroup } from '../core/Stats/StatCard';
import DataTable from '../core/Tables/DataTable';
import Modal, { ModalFooter } from '../core/Feedback/Modal';
import Input from '../core/Forms/Input';
import Select from '../core/Forms/Select';
import Button from '../core/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotifications } from '../../hooks/useNotifications';
import { 
  Building2, Users, Heart, TrendingUp, Calendar,
  FileText, Settings, BarChart3, Palette, Globe,
  Shield, CreditCard, Download, Upload, Mail,
  Phone, MapPin, Star, ChevronRight, Plus,
  Eye, EyeOff, Copy, Check, Edit3, Save
} from 'lucide-react';

const ClientDashboard = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const { showNotification } = useNotifications();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [editingBranding, setEditingBranding] = useState(false);
  
  // Configuration client
  const [clientConfig, setClientConfig] = useState({
    company: 'Wedding Pro Agency',
    logo: '/logos/client-default.png',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    domain: 'weddings.pro',
    whiteLabel: true,
    features: {
      vendorManagement: true,
      analytics: true,
      customBranding: true,
      apiAccess: true,
      multiLanguage: true
    }
  });
  
  // Statistiques
  const [stats, setStats] = useState({
    totalWeddings: 234,
    activeWeddings: 47,
    totalVendors: 156,
    activeVendors: 89,
    totalRevenue: 1240000,
    monthlyRevenue: 185000,
    commission: 124000,
    satisfaction: 4.8
  });
  
  // Données
  const [weddings, setWeddings] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [customDomains, setCustomDomains] = useState([
    { domain: 'weddings.pro', status: 'active', ssl: true },
    { domain: 'mariages.pro', status: 'active', ssl: true },
    { domain: 'app.weddingagency.com', status: 'pending', ssl: false }
  ]);
  
  useEffect(() => {
    fetchClientData();
  }, []);
  
  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // Données simulées
      setWeddings([
        {
          id: 1,
          couple: 'Marie & Jean',
          date: '2024-07-15',
          vendors: 8,
          status: 'active',
          revenue: 12500
        },
        {
          id: 2,
          couple: 'Sophie & Pierre',
          date: '2024-08-20',
          vendors: 6,
          status: 'planning',
          revenue: 8900
        }
      ]);
      
      setVendors([
        { id: 1, name: 'Elite DJ', type: 'DJ', weddings: 23, rating: 4.9, commission: 2300 },
        { id: 2, name: 'Photo Masters', type: 'Photographe', weddings: 18, rating: 4.8, commission: 3600 },
        { id: 3, name: 'Deluxe Catering', type: 'Traiteur', weddings: 15, rating: 4.9, commission: 4500 }
      ]);
      
    } catch (error) {
      console.error('Erreur chargement données client:', error);
      showNotification('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };
  
  const getSidebarItems = () => [
    { label: 'Vue d\'ensemble', href: '#overview', icon: BarChart3, active: activeTab === 'overview' },
    { label: 'Mariages', href: '#weddings', icon: Heart, active: activeTab === 'weddings', badge: stats.activeWeddings },
    { label: 'Vendors', href: '#vendors', icon: Users, active: activeTab === 'vendors', badge: stats.activeVendors },
    { label: 'Finances', href: '#finances', icon: CreditCard, active: activeTab === 'finances' },
    { label: 'Branding', href: '#branding', icon: Palette, active: activeTab === 'branding' },
    { label: 'Domaines', href: '#domains', icon: Globe, active: activeTab === 'domains' },
    { label: 'API & Intégrations', href: '#api', icon: Building2, active: activeTab === 'api' },
    { label: 'Paramètres', href: '#settings', icon: Settings, active: activeTab === 'settings' }
  ];
  
  const renderOverview = () => {
    const mainStats = [
      {
        title: 'Mariages actifs',
        value: stats.activeWeddings,
        subtitle: `${stats.totalWeddings} au total`,
        icon: Heart,
        trend: 'up',
        trendValue: '+12%',
        color: 'pink'
      },
      {
        title: 'Vendors actifs',
        value: stats.activeVendors,
        subtitle: `${stats.totalVendors} au total`,
        icon: Users,
        trend: 'up',
        trendValue: '+8%',
        color: 'purple'
      },
      {
        title: 'Revenus mensuels',
        value: `${(stats.monthlyRevenue / 1000).toFixed(0)}k€`,
        subtitle: `Commission: ${(stats.commission / 1000).toFixed(0)}k€`,
        icon: TrendingUp,
        trend: 'up',
        trendValue: '+15%',
        color: 'green'
      },
      {
        title: 'Satisfaction',
        value: stats.satisfaction.toFixed(1),
        subtitle: 'Note moyenne',
        icon: Star,
        color: 'yellow'
      }
    ];
    
    return (
      <div className="space-y-6">
        <StatGroup stats={mainStats} />
        
        {/* Aperçu marque blanche */}
        <div 
          className="bg-gradient-to-r rounded-lg p-6 text-white"
          style={{
            backgroundImage: `linear-gradient(to right, ${clientConfig.primaryColor}, ${clientConfig.secondaryColor})`
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">{clientConfig.company}</h3>
              <p className="opacity-90">Votre plateforme de mariage en marque blanche</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{clientConfig.domain}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm">SSL actif</span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              className="text-white border-white hover:bg-white hover:text-gray-900"
              icon={Eye}
              onClick={() => window.open(`https://${clientConfig.domain}`, '_blank')}
            >
              Voir le site
            </Button>
          </div>
        </div>
        
        {/* Activité récente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Derniers mariages</h3>
            <div className="space-y-3">
              {weddings.slice(0, 5).map(wedding => (
                <div key={wedding.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{wedding.couple}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(wedding.date).toLocaleDateString('fr-FR')} • {wedding.vendors} vendors
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{wedding.revenue.toLocaleString()}€</p>
                    <p className="text-xs text-gray-500">{wedding.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top vendors</h3>
            <div className="space-y-3">
              {vendors.slice(0, 5).map(vendor => (
                <div key={vendor.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="text-sm text-gray-500">
                      {vendor.type} • {vendor.weddings} mariages
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{vendor.rating}</span>
                    </div>
                    <p className="text-xs text-gray-500">+{vendor.commission.toLocaleString()}€</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  const renderBranding = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Personnalisation de la marque</h2>
        <Button
          variant={editingBranding ? 'primary' : 'outline'}
          icon={editingBranding ? Save : Edit3}
          onClick={() => {
            if (editingBranding) {
              // Sauvegarder
              showNotification('success', 'Branding mis à jour');
            }
            setEditingBranding(!editingBranding);
          }}
        >
          {editingBranding ? 'Sauvegarder' : 'Éditer'}
        </Button>
      </div>
      
      {/* Aperçu en temps réel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Aperçu en temps réel</h3>
        <div 
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: clientConfig.primaryColor }}
        >
          {/* Header */}
          <div 
            className="p-4 text-white"
            style={{ backgroundColor: clientConfig.primaryColor }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                  <Building2 className="h-6 w-6" style={{ color: clientConfig.primaryColor }} />
                </div>
                <span className="text-xl font-bold">{clientConfig.company}</span>
              </div>
              <nav className="flex space-x-6">
                <a href="#" className="hover:opacity-80">Accueil</a>
                <a href="#" className="hover:opacity-80">Vendors</a>
                <a href="#" className="hover:opacity-80">Contact</a>
              </nav>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-8 bg-gray-50">
            <h1 className="text-3xl font-bold mb-4" style={{ color: clientConfig.primaryColor }}>
              Organisez votre mariage de rêve
            </h1>
            <p className="text-gray-600 mb-6">
              Trouvez les meilleurs vendors pour votre grand jour
            </p>
            <Button
              style={{
                backgroundColor: clientConfig.secondaryColor,
                borderColor: clientConfig.secondaryColor
              }}
              className="text-white"
            >
              Commencer
            </Button>
          </div>
        </div>
      </div>
      
      {/* Paramètres de personnalisation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Identité de marque</h3>
          <div className="space-y-4">
            <Input
              label="Nom de l'entreprise"
              value={clientConfig.company}
              onChange={(e) => setClientConfig(prev => ({ ...prev, company: e.target.value }))}
              disabled={!editingBranding}
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-gray-400" />
                </div>
                <Button
                  variant="outline"
                  icon={Upload}
                  disabled={!editingBranding}
                >
                  Changer le logo
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur principale
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={clientConfig.primaryColor}
                    onChange={(e) => setClientConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    disabled={!editingBranding}
                    className="h-10 w-20 border rounded cursor-pointer"
                  />
                  <Input
                    value={clientConfig.primaryColor}
                    onChange={(e) => setClientConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    disabled={!editingBranding}
                    className="flex-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur secondaire
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={clientConfig.secondaryColor}
                    onChange={(e) => setClientConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    disabled={!editingBranding}
                    className="h-10 w-20 border rounded cursor-pointer"
                  />
                  <Input
                    value={clientConfig.secondaryColor}
                    onChange={(e) => setClientConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    disabled={!editingBranding}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Fonctionnalités activées</h3>
          <div className="space-y-3">
            {Object.entries(clientConfig.features).map(([key, enabled]) => {
              const labels = {
                vendorManagement: 'Gestion des vendors',
                analytics: 'Analytics avancés',
                customBranding: 'Personnalisation complète',
                apiAccess: 'Accès API',
                multiLanguage: 'Multi-langues'
              };
              
              return (
                <label key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded cursor-pointer">
                  <span className="text-gray-700">{labels[key]}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setClientConfig(prev => ({
                      ...prev,
                      features: { ...prev.features, [key]: e.target.checked }
                    }))}
                    disabled={!editingBranding}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderDomains = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gestion des domaines</h2>
        <Button
          variant="primary"
          icon={Plus}
        >
          Ajouter un domaine
        </Button>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          <Shield className="inline h-4 w-4 mr-1" />
          Tous vos domaines sont protégés par SSL et redirigent automatiquement vers HTTPS.
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Domaine
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SSL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customDomains.map(domain => (
              <tr key={domain.domain}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{domain.domain}</div>
                      <div className="text-sm text-gray-500">https://{domain.domain}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    domain.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {domain.status === 'active' ? 'Actif' : 'En attente'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {domain.ssl ? (
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm">Actif</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-yellow-600">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="text-sm">Configuration...</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    size="small"
                    variant="ghost"
                  >
                    Gérer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  return (
    <DashboardLayout
      title="Dashboard Client"
      subtitle={clientConfig.company}
      sidebarItems={getSidebarItems()}
      showSearch={true}
      showNotifications={true}
      breadcrumbs={[
        { label: 'Client', href: '/dashboard/client' },
        { label: activeTab === 'overview' ? 'Vue d\'ensemble' : activeTab }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bandeau marque blanche */}
        {clientConfig.whiteLabel && (
          <div className="mb-4 flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-purple-800">
                <strong>Marque blanche activée</strong> - Votre marque est utilisée sur toute la plateforme
              </span>
            </div>
            <Button
              size="small"
              variant="ghost"
              className="text-purple-600"
              onClick={() => setActiveTab('branding')}
            >
              Personnaliser
            </Button>
          </div>
        )}
        
        {/* Contenu selon l'onglet */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'branding' && renderBranding()}
        {activeTab === 'domains' && renderDomains()}
        
        {/* Placeholder pour les autres onglets */}
        {!['overview', 'branding', 'domains'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ClientDashboard;