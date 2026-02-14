import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentModal from '../../payment/PaymentModal';

const VendorList = ({ vendors = [], detailed = false, onVendorSelect, weddingId }) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [paymentModalVendor, setPaymentModalVendor] = useState(null);

  const categories = ['all', ...new Set(vendors.map(v => v.category))];
  
  const filteredVendors = selectedCategory === 'all' 
    ? vendors 
    : vendors.filter(v => v.category === selectedCategory);

  const getStatusBadge = (status) => {
    const statusConfig = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      contacted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '📞' },
      declined: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <span className="mr-1">{config.icon}</span>
        {t(`dashboard.vendors.status.${status}`)}
      </span>
    );
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat(t('locale'), {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">
          {t('dashboard.vendors.title')}
        </h2>
        {vendors.length > 0 && (
          <span className="text-sm text-gray-500">
            {vendors.filter(v => v.status === 'confirmed').length} / {vendors.length} {t('dashboard.vendors.confirmed')}
          </span>
        )}
      </div>

      {/* Category Filter */}
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? t('common.all') : t(`dashboard.vendors.categories.${category}`)}
            </button>
          ))}
        </div>
      )}

      {/* Vendor List */}
      {filteredVendors.length === 0 ? (
        <p className="text-center text-gray-500 py-8">
          {t('dashboard.vendors.noVendors')}
        </p>
      ) : (
        <div className="space-y-4">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className={`border rounded-lg p-4 ${
                detailed ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
              }`}
              onClick={() => detailed && onVendorSelect && onVendorSelect(vendor)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{vendor.name}</h3>
                  <p className="text-sm text-gray-600">
                    {t(`dashboard.vendors.categories.${vendor.category}`)}
                  </p>
                </div>
                {getStatusBadge(vendor.status)}
              </div>

              {/* Contact Info */}
              <div className="text-sm text-gray-600 space-y-1 mb-2">
                {vendor.phone && (
                  <div className="flex items-center">
                    <span className="mr-2">📱</span>
                    <a href={`tel:${vendor.phone}`} className="hover:text-orange-600">
                      {vendor.phone}
                    </a>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center">
                    <span className="mr-2">✉️</span>
                    <a href={`mailto:${vendor.email}`} className="hover:text-orange-600">
                      {vendor.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Price and Payment Status */}
              <div className="flex justify-between items-center text-sm">
                {vendor.price && (
                  <span className="font-medium">
                    {formatCurrency(vendor.price)}
                  </span>
                )}
                {vendor.paymentStatus && (
                  <span className={`text-xs ${
                    vendor.paymentStatus === 'paid' ? 'text-green-600' :
                    vendor.paymentStatus === 'partial' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {t(`dashboard.vendors.payment.${vendor.paymentStatus}`)}
                  </span>
                )}
              </div>

              {/* Detailed View Additional Info */}
              {detailed && (
                <div className="mt-3 pt-3 border-t">
                  {vendor.notes && (
                    <p className="text-sm text-gray-600 mb-2">{vendor.notes}</p>
                  )}
                  {vendor.contractStatus && (
                    <div className="flex items-center text-sm">
                      <span className="mr-2">📄</span>
                      <span className={
                        vendor.contractStatus === 'signed' ? 'text-green-600' : 'text-yellow-600'
                      }>
                        {t(`dashboard.vendors.contract.${vendor.contractStatus}`)}
                      </span>
                    </div>
                  )}
                  {vendor.rating && (
                    <div className="flex items-center text-sm mt-1">
                      <span className="mr-2">⭐</span>
                      <span>{vendor.rating}/5</span>
                    </div>
                  )}
                  
                  {/* Payment Button */}
                  {vendor.price && vendor.paymentStatus !== 'paid' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentModalVendor(vendor);
                      }}
                      className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg text-sm font-medium hover:from-orange-700 hover:to-red-700 transition-colors"
                    >
                      💳 {t('dashboard.vendors.makePayment')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Vendor Button */}
      {!detailed && (
        <button className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-600 hover:text-orange-600 transition-colors">
          + {t('dashboard.vendors.addVendor')}
        </button>
      )}
    </div>

    {/* Payment Modal */}
    <PaymentModal
      isOpen={!!paymentModalVendor}
      onClose={() => setPaymentModalVendor(null)}
      vendor={paymentModalVendor}
      weddingId={weddingId}
      onPaymentSuccess={() => {
        setPaymentModalVendor(null);
        // Refresh vendor list or show success message
        window.location.reload();
      }}
    />
  </>
  );
};

export default VendorList;