/**
 * PaymentsTab - Gestion des paiements pour les vendors
 * Suivi des paiements, factures et statistiques financières
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { useStripe } from '../../../hooks/useStripe';
import { formatCurrency, formatDate } from '../../../utils/format';
import { PaymentDetailsModal } from '../../payments/PaymentDetailsModal';
import { InvoiceGenerator } from '../../payments/InvoiceGenerator';
import { Chart } from '../../common/Chart';

export default function PaymentsTab({ vendor }) {
  const { supabase } = useSupabase();
  const { subscribe } = useWebSocket();
  const { createPayout, getBalance } = useStripe();
  
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  
  // Statistiques
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    availableBalance: 0,
    nextPayout: null,
    monthlyRevenue: []
  });
  
  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    period: 'all',
    search: '',
    minAmount: '',
    maxAmount: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 20;

  useEffect(() => {
    loadPayments();
    loadFinancialStats();
    
    // S'abonner aux mises à jour temps réel
    const unsubscribe = subscribe(`vendor:${vendor.id}:payments`, (message) => {
      if (message.type === 'payment_received') {
        handleNewPayment(message.data);
      } else if (message.type === 'payment_updated') {
        updatePayment(message.data);
      }
    });
    
    return () => unsubscribe();
  }, [vendor.id]);

  useEffect(() => {
    applyFilters();
  }, [payments, filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          contract:contracts(
            id,
            contract_number,
            wedding:weddings(name, date),
            customer:customers(
              user:users(name, email)
            )
          ),
          invoices:invoices(
            id,
            invoice_number,
            file_url
          )
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialStats = async () => {
    try {
      // Charger le solde disponible depuis Stripe
      const balance = await getBalance(vendor.stripe_account_id);
      
      // Calculer les statistiques
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, status, created_at')
        .eq('vendor_id', vendor.id);
      
      const stats = {
        totalRevenue: 0,
        pendingPayments: 0,
        completedPayments: 0,
        availableBalance: balance.available[0]?.amount || 0,
        nextPayout: balance.pending[0]?.arrival_date || null
      };
      
      paymentsData?.forEach(payment => {
        if (payment.status === 'completed') {
          stats.totalRevenue += payment.amount;
          stats.completedPayments += payment.amount;
        } else if (payment.status === 'pending') {
          stats.pendingPayments += payment.amount;
        }
      });
      
      // Calculer les revenus mensuels pour le graphique
      const monthlyRevenue = await calculateMonthlyRevenue(paymentsData);
      stats.monthlyRevenue = monthlyRevenue;
      
      setStats(stats);
    } catch (error) {
      console.error('Error loading financial stats:', error);
    }
  };

  const calculateMonthlyRevenue = async (paymentsData) => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      };
    }).reverse();
    
    const revenueByMonth = last12Months.map(({ year, month, label }) => {
      const monthPayments = paymentsData?.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getFullYear() === year && 
               paymentDate.getMonth() === month &&
               p.status === 'completed';
      }) || [];
      
      const total = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return { month: label, revenue: total };
    });
    
    return revenueByMonth;
  };

  const applyFilters = () => {
    let filtered = [...payments];
    
    // Filtre par statut
    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }
    
    // Filtre par période
    if (filters.period !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(p => new Date(p.created_at) >= startDate);
    }
    
    // Filtre par recherche
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.contract?.wedding?.name.toLowerCase().includes(search) ||
        p.contract?.customer?.user?.name.toLowerCase().includes(search) ||
        p.payment_reference?.toLowerCase().includes(search)
      );
    }
    
    // Filtre par montant
    if (filters.minAmount) {
      filtered = filtered.filter(p => p.amount >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(p => p.amount <= parseFloat(filters.maxAmount));
    }
    
    setFilteredPayments(filtered);
    setCurrentPage(1);
  };

  const handleNewPayment = (paymentData) => {
    setPayments(prev => [paymentData, ...prev]);
    loadFinancialStats(); // Recharger les stats
  };

  const updatePayment = (paymentData) => {
    setPayments(prev => 
      prev.map(p => p.id === paymentData.id ? { ...p, ...paymentData } : p)
    );
  };

  const requestPayout = async () => {
    try {
      if (stats.availableBalance <= 0) {
        alert('Aucun montant disponible pour le paiement');
        return;
      }
      
      const payout = await createPayout({
        amount: stats.availableBalance,
        currency: 'eur',
        description: `Paiement ${vendor.businessName} - ${new Date().toLocaleDateString()}`
      });
      
      alert('Demande de paiement envoyée avec succès');
      loadFinancialStats();
    } catch (error) {
      console.error('Error requesting payout:', error);
      alert('Erreur lors de la demande de paiement');
    }
  };

  const exportPayments = () => {
    // Exporter en CSV
    const csv = [
      ['Date', 'Client', 'Mariage', 'Montant', 'Statut', 'Référence'],
      ...filteredPayments.map(p => [
        formatDate(p.created_at),
        p.contract?.customer?.user?.name || '',
        p.contract?.wedding?.name || '',
        p.amount,
        p.status,
        p.payment_reference || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paiements-${vendor.businessName}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'clock' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'spinner' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'check-circle' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: 'times-circle' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'undo' }
    };
    
    const style = styles[status] || styles.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <i className={`fas fa-${style.icon} mr-1 ${status === 'processing' ? 'animate-spin' : ''}`} />
        {status}
      </span>
    );
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      card: 'credit-card',
      bank_transfer: 'university',
      cash: 'money-bill',
      check: 'money-check',
      paypal: 'paypal',
      stripe: 'stripe'
    };
    
    return icons[method] || 'credit-card';
  };

  // Pagination
  const indexOfLastPayment = currentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = filteredPayments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
        <div className="bg-gray-200 h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques financières */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenus totaux</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </p>
            </div>
            <i className="fas fa-chart-line text-3xl text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">
                {formatCurrency(stats.pendingPayments)}
              </p>
            </div>
            <i className="fas fa-hourglass-half text-3xl text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Solde disponible</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.availableBalance / 100)}
              </p>
            </div>
            <i className="fas fa-wallet text-3xl text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Prochain paiement</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.nextPayout ? formatDate(stats.nextPayout) : 'N/A'}
              </p>
            </div>
            <button
              onClick={requestPayout}
              className="btn btn-sm btn-primary"
              disabled={stats.availableBalance <= 0}
            >
              Demander
            </button>
          </div>
        </div>
      </div>

      {/* Graphique des revenus */}
      {stats.monthlyRevenue.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
          <Chart
            type="bar"
            data={{
              labels: stats.monthlyRevenue.map(r => r.month),
              datasets: [{
                label: 'Revenus (€)',
                data: stats.monthlyRevenue.map(r => r.revenue),
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1
              }]
            }}
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
            height={250}
          />
        </div>
      )}

      {/* Filtres et actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            {/* Recherche */}
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Filtre statut */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="processing">En cours</option>
              <option value="completed">Complétés</option>
              <option value="failed">Échoués</option>
              <option value="refunded">Remboursés</option>
            </select>
            
            {/* Filtre période */}
            <select
              value={filters.period}
              onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les périodes</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            
            {/* Filtre montant */}
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min €"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                className="w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max €"
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                className="w-24 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowInvoiceGenerator(true)}
              className="btn btn-secondary"
            >
              <i className="fas fa-file-invoice mr-2" />
              Créer facture
            </button>
            <button
              onClick={exportPayments}
              className="btn btn-secondary"
            >
              <i className="fas fa-download mr-2" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Liste des paiements */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client / Mariage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Méthode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facture
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(payment.created_at)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.contract?.customer?.user?.name || 'Client direct'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.contract?.wedding?.name || payment.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </div>
                    {payment.fee && (
                      <div className="text-xs text-gray-500">
                        Frais: {formatCurrency(payment.fee)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <i className={`fab fa-${getPaymentMethodIcon(payment.payment_method)} text-gray-400 mr-2`} />
                      <span className="text-sm text-gray-900">
                        {payment.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.invoices?.[0] ? (
                      <a
                        href={payment.invoices[0].file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        <i className="fas fa-file-pdf mr-1" />
                        {payment.invoices[0].invoice_number}
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowInvoiceGenerator(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 text-sm"
                      >
                        <i className="fas fa-plus mr-1" />
                        Créer
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentPayments.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-money-check-alt text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun paiement trouvé</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{indexOfFirstPayment + 1}</span> à{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastPayment, filteredPayments.length)}
                  </span>{' '}
                  sur <span className="font-medium">{filteredPayments.length}</span> résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <i className="fas fa-chevron-left" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <i className="fas fa-chevron-right" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal détails paiement */}
      {selectedPayment && !showInvoiceGenerator && (
        <PaymentDetailsModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onGenerateInvoice={() => setShowInvoiceGenerator(true)}
        />
      )}

      {/* Modal générateur de facture */}
      {showInvoiceGenerator && (
        <InvoiceGenerator
          vendor={vendor}
          payment={selectedPayment}
          onGenerated={(invoice) => {
            // Mettre à jour le paiement avec la facture
            if (selectedPayment) {
              updatePayment({
                ...selectedPayment,
                invoices: [invoice]
              });
            }
            setShowInvoiceGenerator(false);
            setSelectedPayment(null);
          }}
          onClose={() => {
            setShowInvoiceGenerator(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}