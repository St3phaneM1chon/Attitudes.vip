import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const EmergencyButton = ({ weddingId }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleEmergencyMessage = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      // TODO: Implement emergency broadcast API call
      const response = await fetch('/api/emergency/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          weddingId,
          message,
          priority: 'urgent'
        })
      });

      if (response.ok) {
        setMessage('');
        setIsOpen(false);
        // Show success notification
      }
    } catch (error) {
      console.error('Emergency broadcast error:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating Emergency Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-red-500 text-white p-4 rounded-full shadow-lg hover:bg-red-600 transition-colors duration-200 pulse-animation"
        aria-label={t('dashboard.emergency.button')}
      >
        <span className="text-2xl">🚨</span>
      </button>

      {/* Emergency Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              {t('dashboard.emergency.title')}
            </h2>
            
            <p className="text-gray-600 mb-4">
              {t('dashboard.emergency.description')}
            </p>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('dashboard.emergency.placeholder')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows="4"
              disabled={sending}
            />

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={sending}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleEmergencyMessage}
                disabled={!message.trim() || sending}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? t('common.sending') : t('dashboard.emergency.send')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 20px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
      `}</style>
    </>
  );
};

export default EmergencyButton;