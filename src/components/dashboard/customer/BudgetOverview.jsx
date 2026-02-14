import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentHistory from '../../payment/PaymentHistory';
import PaymentMetrics from '../../payment/PaymentMetrics';

const BudgetOverview = ({ budget, expenses, detailed = false, weddingId }) => {
  const { t } = useTranslation();
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  
  const totalBudget = budget?.total || 0;
  const totalSpent = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const remaining = totalBudget - totalSpent;
  const percentageUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const getBudgetStatus = () => {
    if (percentageUsed > 90) return { color: 'text-red-600', bg: 'bg-red-100', label: t('dashboard.budget.overBudget') };
    if (percentageUsed > 75) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: t('dashboard.budget.nearLimit') };
    return { color: 'text-green-600', bg: 'bg-green-100', label: t('dashboard.budget.onTrack') };
  };

  const status = getBudgetStatus();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(t('locale'), {
      style: 'currency',
      currency: budget?.currency || 'EUR'
    }).format(amount);
  };

  const categoryBreakdown = detailed && expenses ? 
    expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {}) : {};

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.budget.title')}
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Budget Summary */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">{t('dashboard.budget.total')}</span>
          <span className="font-semibold">{formatCurrency(totalBudget)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t('dashboard.budget.spent')}</span>
          <span className="font-semibold text-orange-600">{formatCurrency(totalSpent)}</span>
        </div>
        <div className="flex justify-between border-t pt-4">
          <span className="text-gray-600">{t('dashboard.budget.remaining')}</span>
          <span className={`font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{t('dashboard.budget.usage')}</span>
          <span>{Math.round(percentageUsed)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              percentageUsed > 90 ? 'bg-red-500' : 
              percentageUsed > 75 ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Category Breakdown (Detailed View) */}
      {detailed && Object.keys(categoryBreakdown).length > 0 && (
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-700 mb-3">
            {t('dashboard.budget.breakdown')}
          </h3>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">
                    {t(`dashboard.budget.categories.${category}`)}
                  </span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-2">
                      {formatCurrency(amount)}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({Math.round((amount / totalBudget) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Expenses (Detailed View) */}
      {detailed && expenses && expenses.length > 0 && (
        <div className="border-t pt-4 mt-4">
          <h3 className="font-semibold text-gray-700 mb-3">
            {t('dashboard.budget.recentExpenses')}
          </h3>
          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{expense.description}</span>
                <span className="font-medium">{formatCurrency(expense.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Actions (Detailed View) */}
      {detailed && (
        <div className="border-t pt-4 mt-4 flex gap-2">
          <button
            onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            {showPaymentHistory ? t('dashboard.budget.hideHistory') : t('dashboard.budget.viewHistory')}
          </button>
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="flex-1 px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-sm font-medium"
          >
            {showMetrics ? t('dashboard.budget.hideMetrics') : t('dashboard.budget.viewMetrics')}
          </button>
        </div>
      )}
    </div>

    {/* Payment History Modal/Section */}
    {showPaymentHistory && detailed && weddingId && (
      <div className="mt-6">
        <PaymentHistory weddingId={weddingId} />
      </div>
    )}

    {/* Payment Metrics Modal/Section */}
    {showMetrics && detailed && weddingId && (
      <div className="mt-6">
        <PaymentMetrics weddingId={weddingId} />
      </div>
    )}
  </>;
};

export default BudgetOverview;