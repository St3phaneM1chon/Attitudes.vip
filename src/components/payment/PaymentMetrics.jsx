import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const PaymentMetrics = ({ weddingId }) => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentMetrics();
  }, [weddingId]);

  const fetchPaymentMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/payments/metrics/${weddingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching payment metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(t('locale'), {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Préparer les données pour le graphique
  const chartData = metrics.byCategory?.map(cat => ({
    name: t(`vendors.categories.${cat.category}`),
    value: cat.total_amount,
    count: cat.payment_count
  })) || [];

  const COLORS = ['#F97316', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        {t('payment.metrics.title')}
      </h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium mb-1">
            {t('payment.metrics.totalPaid')}
          </p>
          <p className="text-2xl font-bold text-blue-800">
            {formatCurrency(metrics.total_paid)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium mb-1">
            {t('payment.metrics.totalPayments')}
          </p>
          <p className="text-2xl font-bold text-green-800">
            {metrics.total_payments || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium mb-1">
            {t('payment.metrics.averagePayment')}
          </p>
          <p className="text-2xl font-bold text-purple-800">
            {formatCurrency(metrics.average_payment)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <p className="text-sm text-orange-600 font-medium mb-1">
            {t('payment.metrics.vendorsPaid')}
          </p>
          <p className="text-2xl font-bold text-orange-800">
            {metrics.vendors_paid || 0}
          </p>
        </div>
      </div>

      {/* Payment Distribution Chart */}
      {chartData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            {t('payment.metrics.distribution')}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div>
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          {t('payment.metrics.byCategory')}
        </h3>
        <div className="space-y-3">
          {metrics.byCategory?.map((category, index) => (
            <div key={category.category} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {t(`vendors.categories.${category.category}`)}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({category.payment_count} {t('payment.metrics.payments')})
                </span>
              </div>
              <span className="font-semibold text-gray-800">
                {formatCurrency(category.total_amount)}
              </span>
            </div>
          )) || (
            <p className="text-center text-gray-500">
              {t('payment.metrics.noData')}
            </p>
          )}
        </div>
      </div>

      {/* Payment Timeline */}
      {metrics.first_payment && metrics.last_payment && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">{t('payment.metrics.firstPayment')}: </span>
              {new Date(metrics.first_payment).toLocaleDateString(t('locale'))}
            </div>
            <div>
              <span className="font-medium">{t('payment.metrics.lastPayment')}: </span>
              {new Date(metrics.last_payment).toLocaleDateString(t('locale'))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMetrics;