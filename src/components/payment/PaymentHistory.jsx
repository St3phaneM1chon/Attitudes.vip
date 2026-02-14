import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, en, es, ar } from 'date-fns/locale';

const PaymentHistory = ({ weddingId }) => {
  const { t, i18n } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  const locales = { fr, en, es, ar };
  const currentLocale = locales[i18n.language] || fr;

  useEffect(() => {
    fetchPaymentHistory();
  }, [weddingId]);

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`/api/v1/payments/history/${weddingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat(t('locale'), {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getFilteredPayments = () => {
    if (filter === 'all') return payments;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (filter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return payments;
    }

    return payments.filter(payment => 
      new Date(payment.paid_at) >= filterDate
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: t('payment.status.paid') },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('payment.status.pending') },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: t('payment.status.failed') },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', label: t('payment.status.refunded') }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const filteredPayments = getFilteredPayments();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('payment.history.title')}
        </h2>
        
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">{t('payment.history.filter.all')}</option>
            <option value="week">{t('payment.history.filter.week')}</option>
            <option value="month">{t('payment.history.filter.month')}</option>
            <option value="year">{t('payment.history.filter.year')}</option>
          </select>
          
          <button
            onClick={fetchPaymentHistory}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {t('payment.history.noPayments')}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                  {t('payment.history.date')}
                </th>
                <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">
                  {t('payment.history.vendor')}
                </th>
                <th className="text-right py-3 px-2 text-sm font-medium text-gray-700">
                  {t('payment.history.amount')}
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">
                  {t('payment.history.status')}
                </th>
                <th className="text-center py-3 px-2 text-sm font-medium text-gray-700">
                  {t('payment.history.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 text-sm text-gray-600">
                    {format(new Date(payment.paid_at), 'dd MMM yyyy', { locale: currentLocale })}
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {payment.vendor_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t(`vendors.categories.${payment.vendor_category}`)}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <p className="text-sm font-semibold text-gray-800">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      className="text-orange-600 hover:text-orange-700 text-sm"
                      onClick={() => window.open(`/payments/receipt/${payment.id}`, '_blank')}
                    >
                      {t('payment.history.receipt')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" className="py-3 px-2 text-sm font-semibold text-gray-700">
                  {t('payment.history.total')}
                </td>
                <td className="py-3 px-2 text-right text-lg font-bold text-gray-800">
                  {formatCurrency(
                    filteredPayments.reduce((sum, p) => sum + p.amount, 0)
                  )}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentHistory;