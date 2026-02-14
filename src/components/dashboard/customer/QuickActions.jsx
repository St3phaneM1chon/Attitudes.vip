import React from 'react';
import { useTranslation } from 'react-i18next';

const QuickActions = ({ weddingId, onActionComplete }) => {
  const { t } = useTranslation();

  const actions = [
    {
      id: 'add-guest',
      icon: '➕',
      label: t('dashboard.quickActions.addGuest'),
      color: 'bg-blue-500',
      onClick: () => handleAddGuest()
    },
    {
      id: 'message-vendor',
      icon: '💬',
      label: t('dashboard.quickActions.messageVendor'),
      color: 'bg-green-500',
      onClick: () => handleMessageVendor()
    },
    {
      id: 'update-budget',
      icon: '💰',
      label: t('dashboard.quickActions.updateBudget'),
      color: 'bg-purple-500',
      onClick: () => handleUpdateBudget()
    },
    {
      id: 'view-timeline',
      icon: '📅',
      label: t('dashboard.quickActions.viewTimeline'),
      color: 'bg-yellow-500',
      onClick: () => handleViewTimeline()
    },
    {
      id: 'upload-photo',
      icon: '📸',
      label: t('dashboard.quickActions.uploadPhoto'),
      color: 'bg-pink-500',
      onClick: () => handleUploadPhoto()
    },
    {
      id: 'emergency-help',
      icon: '🆘',
      label: t('dashboard.quickActions.emergencyHelp'),
      color: 'bg-red-500',
      onClick: () => handleEmergencyHelp()
    }
  ];

  const handleAddGuest = () => {
    // TODO: Implement add guest modal
    console.log('Add guest');
  };

  const handleMessageVendor = () => {
    // TODO: Implement vendor messaging
    console.log('Message vendor');
  };

  const handleUpdateBudget = () => {
    // TODO: Implement budget update
    console.log('Update budget');
  };

  const handleViewTimeline = () => {
    // TODO: Implement timeline view
    console.log('View timeline');
  };

  const handleUploadPhoto = () => {
    // TODO: Implement photo upload
    console.log('Upload photo');
  };

  const handleEmergencyHelp = () => {
    // TODO: Implement emergency help
    console.log('Emergency help');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t('dashboard.quickActions.title')}
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`
              flex flex-col items-center justify-center p-4 rounded-lg
              text-white ${action.color} hover:opacity-90
              transition-opacity duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500
            `}
          >
            <span className="text-2xl mb-2">{action.icon}</span>
            <span className="text-xs text-center font-medium">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;