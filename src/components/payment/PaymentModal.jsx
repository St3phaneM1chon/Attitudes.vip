import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StripeCheckout from './StripeCheckout';

const PaymentModal = ({ isOpen, onClose, vendor, weddingId, onPaymentSuccess }) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('deposit');
  const [showCheckout, setShowCheckout] = useState(false);

  if (!isOpen || !vendor) return null;

  const paymentTypes = {
    deposit: { label: t('payment.types.deposit'), percentage: 0.3 },
    partial: { label: t('payment.types.partial'), percentage: 0.5 },
    full: { label: t('payment.types.full'), percentage: 1 }
  };

  const calculateAmount = (type) => {
    if (!vendor.price) return 0;
    return vendor.price * paymentTypes[type].percentage;
  };

  const handlePaymentTypeChange = (type) => {
    setPaymentType(type);
    setAmount(calculateAmount(type).toString());
  };

  const handleProceedToPayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    onPaymentSuccess && onPaymentSuccess();
    onClose();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(t('locale'), {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        {!showCheckout ? (
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {t('payment.modal.title')}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Vendor Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800">{vendor.name}</h3>
              <p className="text-sm text-gray-600">
                {t(`vendors.categories.${vendor.category}`)}
              </p>
              {vendor.price && (
                <p className="text-lg font-bold text-gray-800 mt-2">
                  {t('payment.modal.totalPrice')}: {formatCurrency(vendor.price)}
                </p>
              )}
            </div>

            {/* Payment Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('payment.modal.selectType')}
              </label>
              <div className="space-y-2">
                {Object.entries(paymentTypes).map(([type, config]) => (
                  <label
                    key={type}
                    className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value={type}
                      checked={paymentType === type}
                      onChange={() => handlePaymentTypeChange(type)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-medium">{config.label}</span>
                      {vendor.price && (
                        <span className="ml-2 text-gray-600">
                          ({formatCurrency(calculateAmount(type))})
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Amount */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('payment.modal.customAmount')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">€</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Payment Method Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                💳 {t('payment.modal.securePayment')}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleProceedToPayment}
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('payment.modal.proceed')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <StripeCheckout
              vendorId={vendor.id}
              vendorName={vendor.name}
              amount={parseFloat(amount)}
              weddingId={weddingId}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowCheckout(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;