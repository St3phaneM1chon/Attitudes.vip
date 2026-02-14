import React from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { fr, en, es, ar } from 'date-fns/locale';

const DashboardHeader = ({ weddingData, activeView, onViewChange }) => {
  const { t, i18n } = useTranslation();
  
  const locales = { fr, en, es, ar };
  const currentLocale = locales[i18n.language] || fr;

  const navigationItems = [
    { id: 'overview', label: t('dashboard.nav.overview'), icon: '🏠' },
    { id: 'tasks', label: t('dashboard.nav.tasks'), icon: '✓' },
    { id: 'budget', label: t('dashboard.nav.budget'), icon: '💰' },
    { id: 'guests', label: t('dashboard.nav.guests'), icon: '👥' },
    { id: 'vendors', label: t('dashboard.nav.vendors'), icon: '🤝' },
  ];

  return (
    <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        {/* Top Section with Wedding Info */}
        <div className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {weddingData?.partner1Name} & {weddingData?.partner2Name}
              </h1>
              <p className="text-orange-100 mt-1">
                {weddingData?.weddingDate && format(
                  new Date(weddingData.weddingDate),
                  'EEEE d MMMM yyyy',
                  { locale: currentLocale }
                )}
              </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <p className="text-3xl font-bold">
                {weddingData?.daysUntilWedding || 0}
              </p>
              <p className="text-orange-100 text-sm">
                {t('dashboard.daysRemaining')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex overflow-x-auto pb-2 -mb-px">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                flex items-center px-4 py-2 mr-2 rounded-t-lg transition-colors
                whitespace-nowrap
                ${activeView === item.id 
                  ? 'bg-white text-orange-600 font-semibold' 
                  : 'text-white hover:bg-orange-500'
                }
              `}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};

export default DashboardHeader;