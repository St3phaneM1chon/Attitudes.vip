/**
 * CIODashboard - Dashboard du Chief Information Officer
 * Vue d'ensemble complète du système, analytics et monitoring
 */

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../core/Layout/DashboardLayout';
import StatCard, { StatGroup } from '../core/Stats/StatCard';
import DataTable from '../core/Tables/DataTable';
import Modal from '../core/Feedback/Modal';
import Button from '../core/Button/Button';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  BarChart3, Users, Server, Shield, AlertTriangle,
  TrendingUp, Activity, Database, Cloud, Lock,
  Globe, CreditCard, MessageSquare, Settings,
  Monitor, Cpu, HardDrive, Wifi, Battery,
  Clock, CheckCircle, XCircle, AlertCircle,
  Download, RefreshCw, Eye, Terminal
} from 'lucide-react';

const CIODashboard = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // État du système
  const [systemStats, setSystemStats] = useState({
    uptime: '99.98%',
    responseTime: '142ms',
    activeUsers: 3847,
    totalUsers: 15234,
    requests: '2.4M',
    errors: 47,
    cpu: 45,
    memory: 62,
    storage: 38,
    bandwidth: '847 GB'
  });
  
  const [services, setServices] = useState([
    { name: 'API Gateway', status: 'operational', uptime: '99.99%', latency: '23ms' },
    { name: 'PostgreSQL', status: 'operational', uptime: '99.95%', latency: '5ms' },
    { name: 'Redis Cache', status: 'operational', uptime: '100%', latency: '1ms' },
    { name: 'WebSocket Server', status: 'operational', uptime: '99.97%', latency: '45ms' },
    { name: 'Stripe API', status: 'operational', uptime: '100%', latency: '120ms' },
    { name: 'Twilio SMS', status: 'operational', uptime: '100%', latency: '250ms' },
    { name: 'MCP Services', status: 'operational', uptime: '99.99%', latency: '15ms' },
    { name: 'CDN', status: 'operational', uptime: '100%', latency: '12ms' }
  ]);
  
  const [metrics, setMetrics] = useState({
    revenue: {
      today: 12450,
      week: 87230,
      month: 342000,
      growth: '+15.3%'
    },
    users: {
      new: 234,
      active: 3847,
      churn: 1.2,
      satisfaction: 4.7
    },
    performance: {
      apdex: 0.94,
      errorRate: 0.02,
      throughput: '5.2k rpm',
      p99Latency: '287ms'
    },
    security: {
      threats: 0,
      blocked: 147,
      audits: 12,
      compliance: 98
    }
  });
  
  const [alerts, setAlerts] = useState([
    { id: 1, severity: 'warning', message: 'CPU usage spike on server-3', time: '5 min ago' },
    { id: 2, severity: 'info', message: 'Scheduled maintenance tonight 2-4 AM', time: '1 hour ago' },
    { id: 3, severity: 'error', message: 'Failed login attempts from IP 192.168.1.100', time: '2 hours ago' }
  ]);
  
  useEffect(() => {
    fetchSystemData();
    
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      fetchSystemData();
    }, 30000);
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);
  
  const fetchSystemData = async () => {
    try {
      setLoading(true);
      
      // Simuler des données temps réel
      setSystemStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 20 - 10),
        cpu: Math.min(95, Math.max(20, prev.cpu + Math.random() * 10 - 5)),
        memory: Math.min(90, Math.max(40, prev.memory + Math.random() * 5 - 2.5)),
        errors: Math.max(0, prev.errors + Math.floor(Math.random() * 3 - 1))
      }));
      
    } catch (error) {
      console.error('Erreur chargement données système:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getSidebarItems = () => [
    { label: 'Vue d\'ensemble', href: '#overview', icon: Monitor, active: activeTab === 'overview' },
    { label: 'Performance', href: '#performance', icon: Activity, active: activeTab === 'performance' },
    { label: 'Infrastructure', href: '#infrastructure', icon: Server, active: activeTab === 'infrastructure' },
    { label: 'Sécurité', href: '#security', icon: Shield, active: activeTab === 'security' },
    { label: 'Analytics', href: '#analytics', icon: BarChart3, active: activeTab === 'analytics' },
    { label: 'Logs', href: '#logs', icon: Terminal, active: activeTab === 'logs' },
    { label: 'Alertes', href: '#alerts', icon: AlertTriangle, active: activeTab === 'alerts', badge: alerts.length },
    { label: 'Configuration', href: '#config', icon: Settings, active: activeTab === 'config' }
  ];
  
  const renderOverview = () => {
    const mainStats = [
      {
        title: 'Uptime',
        value: systemStats.uptime,
        subtitle: 'Last 30 days',
        icon: Activity,
        trend: 'stable',
        color: 'green'
      },
      {
        title: 'Utilisateurs actifs',
        value: systemStats.activeUsers.toLocaleString(),
        subtitle: `${systemStats.totalUsers.toLocaleString()} total`,
        icon: Users,
        trend: 'up',
        trendValue: '+12%',
        color: 'blue'
      },
      {
        title: 'Temps de réponse',
        value: systemStats.responseTime,
        subtitle: 'P50 latency',
        icon: Clock,
        trend: 'down',
        trendValue: '-8ms',
        color: 'purple'
      },
      {
        title: 'Erreurs',
        value: systemStats.errors,
        subtitle: 'Last 24h',
        icon: AlertCircle,
        trend: systemStats.errors > 50 ? 'up' : 'stable',
        color: systemStats.errors > 50 ? 'red' : 'yellow'
      }
    ];
    
    return (
      <div className="space-y-6">
        {/* Stats principales */}
        <StatGroup stats={mainStats} />
        
        {/* Status des services */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Services Status</h3>
            <Button
              size="small"
              variant="ghost"
              icon={RefreshCw}
              onClick={fetchSystemData}
            >
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {services.map(service => (
              <div key={service.name} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{service.name}</span>
                  <div className={`w-3 h-3 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500' : 
                    service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Uptime</span>
                    <span className="font-medium">{service.uptime}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Latency</span>
                    <span className="font-medium">{service.latency}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Métriques en temps réel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Utilisation ressources */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ressources</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>CPU</span>
                  <span className="font-medium">{systemStats.cpu}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      systemStats.cpu > 80 ? 'bg-red-500' : 
                      systemStats.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemStats.cpu}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Memory</span>
                  <span className="font-medium">{systemStats.memory}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      systemStats.memory > 80 ? 'bg-red-500' : 
                      systemStats.memory > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${systemStats.memory}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage</span>
                  <span className="font-medium">{systemStats.storage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${systemStats.storage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Revenus */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Revenus</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Aujourd'hui</span>
                <span className="font-semibold">{metrics.revenue.today.toLocaleString()}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cette semaine</span>
                <span className="font-semibold">{metrics.revenue.week.toLocaleString()}€</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Ce mois</span>
                <span className="font-semibold">{metrics.revenue.month.toLocaleString()}€</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">{metrics.revenue.growth}</span>
                  <span className="text-sm text-gray-500">vs mois dernier</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Alertes récentes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Alertes</h3>
              <span className="text-xs text-gray-500">{alerts.length} actives</span>
            </div>
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => {
                const colors = {
                  error: 'text-red-600 bg-red-50',
                  warning: 'text-yellow-600 bg-yellow-50',
                  info: 'text-blue-600 bg-blue-50'
                };
                
                return (
                  <div key={alert.id} className={`p-3 rounded-lg ${colors[alert.severity]}`}>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs mt-1 opacity-75">{alert.time}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button variant="outline" icon={Download} fullWidth>
            Export Rapport
          </Button>
          <Button variant="outline" icon={Shield} fullWidth>
            Scan Sécurité
          </Button>
          <Button variant="outline" icon={Database} fullWidth>
            Backup Database
          </Button>
          <Button variant="outline" icon={RefreshCw} fullWidth>
            Restart Services
          </Button>
        </div>
      </div>
    );
  };
  
  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Apdex Score"
          value={metrics.performance.apdex}
          subtitle="Application Performance Index"
          icon={Activity}
          color="green"
        />
        <StatCard
          title="Error Rate"
          value={`${(metrics.performance.errorRate * 100).toFixed(2)}%`}
          subtitle="Last 24 hours"
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Throughput"
          value={metrics.performance.throughput}
          subtitle="Requests per minute"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="P99 Latency"
          value={metrics.performance.p99Latency}
          subtitle="99th percentile"
          icon={Clock}
          color="purple"
        />
      </div>
      
      {/* Graphique de performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
          <p className="text-gray-500">Graphique des performances</p>
        </div>
      </div>
      
      {/* Top endpoints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Top Endpoints</h3>
          <div className="space-y-2">
            {[
              { endpoint: '/api/auth/login', calls: '45.2k', latency: '127ms' },
              { endpoint: '/api/weddings', calls: '38.7k', latency: '89ms' },
              { endpoint: '/api/vendors/search', calls: '29.1k', latency: '156ms' },
              { endpoint: '/api/payments/process', calls: '12.4k', latency: '342ms' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                <div>
                  <p className="font-mono text-sm">{item.endpoint}</p>
                  <p className="text-xs text-gray-500">{item.calls} calls</p>
                </div>
                <span className="text-sm font-medium">{item.latency}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Database Performance</h3>
          <div className="space-y-3">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Query Performance</span>
                <span className="text-sm text-green-600">Optimal</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Avg Query Time</span>
                  <p className="font-medium">12ms</p>
                </div>
                <div>
                  <span className="text-gray-500">Slow Queries</span>
                  <p className="font-medium">3</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Cache Hit Rate</span>
                <span className="text-sm text-green-600">94.7%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '94.7%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-green-600" />
          <div>
            <h4 className="font-semibold text-green-900">Système Sécurisé</h4>
            <p className="text-sm text-green-700">Aucune menace active détectée</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Menaces bloquées"
          value={metrics.security.blocked}
          subtitle="Last 7 days"
          icon={Shield}
          color="red"
        />
        <StatCard
          title="Audits réussis"
          value={metrics.security.audits}
          subtitle="This month"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Compliance"
          value={`${metrics.security.compliance}%`}
          subtitle="GDPR, PCI-DSS"
          icon={Lock}
          color="blue"
        />
        <StatCard
          title="SSL/TLS"
          value="A+"
          subtitle="Security rating"
          icon={Globe}
          color="green"
        />
      </div>
      
      {/* Activités suspectes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Activités Suspectes</h3>
        <div className="space-y-3">
          {[
            { ip: '192.168.1.100', attempts: 23, action: 'Blocked', time: '10:34 AM' },
            { ip: '10.0.0.55', attempts: 5, action: 'Monitoring', time: '09:12 AM' },
            { ip: '172.16.0.10', attempts: 2, action: 'Allowed', time: '08:45 AM' }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-mono font-medium">{item.ip}</p>
                <p className="text-sm text-gray-500">{item.attempts} failed attempts</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.action === 'Blocked' ? 'bg-red-100 text-red-800' :
                  item.action === 'Monitoring' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.action}
                </span>
                <p className="text-xs text-gray-500 mt-1">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  
  return (
    <DashboardLayout
      title="CIO Dashboard"
      subtitle="Vue d'ensemble du système"
      sidebarItems={getSidebarItems()}
      showSearch={false}
      showNotifications={true}
      breadcrumbs={[
        { label: 'CIO', href: '/dashboard/cio' },
        { label: activeTab === 'overview' ? 'Vue d\'ensemble' : activeTab }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Status bar */}
        <div className="mb-6 flex items-center justify-between p-4 bg-gray-900 text-white rounded-lg">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              } animate-pulse`} />
              <span className="text-sm font-medium">System Status: Operational</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <span>Uptime: {systemStats.uptime}</span>
              <span>•</span>
              <span>Users: {systemStats.activeUsers.toLocaleString()}</span>
              <span>•</span>
              <span>Requests: {systemStats.requests}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Battery className="h-4 w-4" />
            <Wifi className="h-4 w-4" />
            <Database className="h-4 w-4" />
          </div>
        </div>
        
        {/* Contenu selon l'onglet */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'security' && renderSecurity()}
        
        {/* Placeholder pour les autres onglets */}
        {!['overview', 'performance', 'security'].includes(activeTab) && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Terminal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CIODashboard;