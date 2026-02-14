/**
 * OverviewTab - Vue d'ensemble du Dashboard Vendor
 * Métriques, statistiques et actions rapides
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { MetricCard } from '../../common/MetricCard';
import { Chart } from '../../common/Chart';
import { formatCurrency, formatDate } from '../../../utils/format';

export default function OverviewTab({ vendor }) {
  const { supabase } = useSupabase();
  const { subscribe } = useWebSocket();
  
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    activeContracts: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    averageRating: 0,
    responseTime: '0h'
  });
  
  const [recentBookings, setRecentBookings] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [revenueChart, setRevenueChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // S'abonner aux mises à jour temps réel
    const unsubscribe = subscribe(`vendor:${vendor.id}`, (message) => {
      if (message.type === 'metrics_update') {
        setMetrics(prev => ({ ...prev, ...message.data }));
      }
    });
    
    return () => unsubscribe();
  }, [vendor.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Charger toutes les données en parallèle
      const [
        metricsData,
        bookingsData,
        eventsData,
        revenueData
      ] = await Promise.all([
        loadMetrics(),
        loadRecentBookings(),
        loadUpcomingEvents(),
        loadRevenueChart()
      ]);
      
      setMetrics(metricsData);
      setRecentBookings(bookingsData);
      setUpcomingEvents(eventsData);
      setRevenueChart(revenueData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total des réservations
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id);
    
    // Contrats actifs
    const { count: activeContracts } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendor.id)
      .eq('status', 'active');
    
    // Revenus du mois
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('vendor_id', vendor.id)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString());
    
    const monthlyRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    // Paiements en attente
    const { data: pendingPaymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('vendor_id', vendor.id)
      .eq('status', 'pending');
    
    const pendingPayments = pendingPaymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    // Note moyenne
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('vendor_id', vendor.id);
    
    const averageRating = reviews?.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    // Temps de réponse moyen
    const { data: responseData } = await supabase
      .from('vendor_metrics')
      .select('average_response_time')
      .eq('vendor_id', vendor.id)
      .single();
    
    return {
      totalBookings: totalBookings || 0,
      activeContracts: activeContracts || 0,
      monthlyRevenue,
      pendingPayments,
      averageRating: averageRating.toFixed(1),
      responseTime: formatResponseTime(responseData?.average_response_time || 0)
    };
  };

  const loadRecentBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        wedding:weddings(name, date),
        customer:users(name, email)
      `)
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return data || [];
  };

  const loadUpcomingEvents = async () => {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        wedding:weddings(name, date, location)
      `)
      .eq('vendor_id', vendor.id)
      .eq('status', 'confirmed')
      .gte('wedding.date', new Date().toISOString())
      .order('wedding.date')
      .limit(5);
    
    return data || [];
  };

  const loadRevenueChart = async () => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        year: date.getFullYear(),
        month: date.getMonth()
      };
    }).reverse();
    
    const revenueByMonth = await Promise.all(
      last12Months.map(async ({ year, month }) => {
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const { data } = await supabase
          .from('payments')
          .select('amount')
          .eq('vendor_id', vendor.id)
          .eq('status', 'completed')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
        
        const total = data?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        return {
          month: startDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          revenue: total
        };
      })
    );
    
    return {
      labels: revenueByMonth.map(r => r.month),
      datasets: [{
        label: 'Revenus (€)',
        data: revenueByMonth.map(r => r.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        tension: 0.3
      }]
    };
  };

  const formatResponseTime = (minutes) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Réservations totales"
          value={metrics.totalBookings}
          icon="calendar-check"
          trend="+12%"
          trendUp={true}
        />
        
        <MetricCard
          title="Contrats actifs"
          value={metrics.activeContracts}
          icon="file-contract"
          subtitle="En cours"
        />
        
        <MetricCard
          title="Revenus du mois"
          value={formatCurrency(metrics.monthlyRevenue)}
          icon="euro-sign"
          trend="+8%"
          trendUp={true}
        />
        
        <MetricCard
          title="Paiements en attente"
          value={formatCurrency(metrics.pendingPayments)}
          icon="clock"
          subtitle="À recevoir"
        />
        
        <MetricCard
          title="Note moyenne"
          value={metrics.averageRating}
          icon="star"
          subtitle={`${metrics.averageRating}/5`}
        />
        
        <MetricCard
          title="Temps de réponse"
          value={metrics.responseTime}
          icon="reply"
          subtitle="En moyenne"
        />
      </div>

      {/* Graphique des revenus */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
        {revenueChart && (
          <Chart
            type="line"
            data={revenueChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback: (value) => formatCurrency(value)
                  }
                }
              }
            }}
            height={300}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Réservations récentes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Réservations récentes</h3>
          </div>
          <div className="divide-y">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{booking.wedding?.name}</h4>
                    <p className="text-sm text-gray-600">
                      {booking.customer?.name} • {booking.customer?.email}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(booking.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(booking.status)}
                    <p className="text-sm font-medium mt-1">
                      {formatCurrency(booking.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {recentBookings.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Aucune réservation récente
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <a
              href="/dashboard/vendor?tab=bookings"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Voir toutes les réservations →
            </a>
          </div>
        </div>

        {/* Événements à venir */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Événements à venir</h3>
          </div>
          <div className="divide-y">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{event.wedding?.name}</h4>
                    <p className="text-sm text-gray-600">
                      📅 {formatDate(event.wedding?.date, 'full')}
                    </p>
                    <p className="text-sm text-gray-500">
                      📍 {event.wedding?.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">
                      Dans {getDaysUntil(event.wedding?.date)} jours
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {upcomingEvents.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Aucun événement à venir
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <a
              href="/dashboard/vendor?tab=calendar"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Voir le calendrier complet →
            </a>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Actions rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <i className="fas fa-plus-circle text-blue-600 text-xl mb-2" />
            <p className="font-medium">Nouvelle réservation</p>
            <p className="text-sm text-gray-600">Créer manuellement</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <i className="fas fa-file-invoice text-green-600 text-xl mb-2" />
            <p className="font-medium">Créer une facture</p>
            <p className="text-sm text-gray-600">Pour un client</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <i className="fas fa-calendar-plus text-purple-600 text-xl mb-2" />
            <p className="font-medium">Bloquer des dates</p>
            <p className="text-sm text-gray-600">Gérer disponibilités</p>
          </button>
          
          <button className="bg-white p-4 rounded-lg hover:shadow-md transition-shadow text-left">
            <i className="fas fa-chart-bar text-orange-600 text-xl mb-2" />
            <p className="font-medium">Rapport mensuel</p>
            <p className="text-sm text-gray-600">Télécharger PDF</p>
          </button>
        </div>
      </div>
    </div>
  );
}

function getDaysUntil(date) {
  const today = new Date();
  const target = new Date(date);
  const diffTime = target - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}