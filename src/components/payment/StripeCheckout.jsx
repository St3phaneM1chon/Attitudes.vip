import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useTranslation } from 'react-i18next';

// Initialiser Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const StripeCheckout = ({ vendorId, vendorName, amount, weddingId, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;

      // Créer la session de checkout
      const response = await fetch('/api/v1/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          weddingId,
          vendorId,
          amount,
          description: `Paiement pour ${vendorName}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();

      // Rediriger vers Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {t('payment.checkout.title')}
      </h3>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">{t('payment.checkout.vendor')}</span>
          <span className="font-medium">{vendorName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t('payment.checkout.amount')}</span>
          <span className="font-bold text-lg">
            {new Intl.NumberFormat(t('locale'), {
              style: 'currency',
              currency: 'EUR'
            }).format(amount)}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
              {t('common.processing')}
            </span>
          ) : (
            t('payment.checkout.pay')
          )}
        </button>
        
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {t('common.cancel')}
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 text-center">
        {t('payment.checkout.secure')} 
        <img src="/icons/stripe.svg" alt="Stripe" className="inline-block h-4 ml-2" />
      </p>
    </div>
  );
};

export default StripeCheckout;