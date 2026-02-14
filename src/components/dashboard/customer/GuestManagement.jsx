import React from 'react';
import { useTranslation } from 'react-i18next';

const GuestManagement = ({ guests = [], capacity, detailed = false }) => {
  const { t } = useTranslation();
  
  const totalGuests = guests.length;
  const confirmedGuests = guests.filter(g => g.status === 'confirmed').length;
  const pendingGuests = guests.filter(g => g.status === 'pending').length;
  const declinedGuests = guests.filter(g => g.status === 'declined').length;
  
  const attendanceRate = totalGuests > 0 ? (confirmedGuests / totalGuests) * 100 : 0;
  const capacityUsage = capacity ? (confirmedGuests / capacity) * 100 : 0;

  const getMealPreferences = () => {
    const preferences = {};
    guests.forEach(guest => {
      if (guest.mealPreference) {
        preferences[guest.mealPreference] = (preferences[guest.mealPreference] || 0) + 1;
      }
    });
    return preferences;
  };

  const getTableAssignments = () => {
    const tables = {};
    guests.forEach(guest => {
      if (guest.tableNumber) {
        tables[guest.tableNumber] = (tables[guest.tableNumber] || 0) + 1;
      }
    });
    return tables;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t('dashboard.guests.title')}
      </h2>

      {/* Guest Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-800">{totalGuests}</p>
          <p className="text-sm text-gray-600">{t('dashboard.guests.total')}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-600">{confirmedGuests}</p>
          <p className="text-sm text-gray-600">{t('dashboard.guests.confirmed')}</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('dashboard.guests.pending')}</span>
          <span className="text-sm font-medium text-yellow-600">{pendingGuests}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{t('dashboard.guests.declined')}</span>
          <span className="text-sm font-medium text-red-600">{declinedGuests}</span>
        </div>
      </div>

      {/* Capacity Warning */}
      {capacity && capacityUsage > 90 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ {t('dashboard.guests.capacityWarning', { 
              confirmed: confirmedGuests, 
              capacity: capacity 
            })}
          </p>
        </div>
      )}

      {/* Attendance Rate */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>{t('dashboard.guests.responseRate')}</span>
          <span>{Math.round(attendanceRate)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </div>

      {/* Detailed View */}
      {detailed && (
        <>
          {/* Meal Preferences */}
          {Object.keys(getMealPreferences()).length > 0 && (
            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {t('dashboard.guests.mealPreferences')}
              </h3>
              <div className="space-y-2">
                {Object.entries(getMealPreferences()).map(([preference, count]) => (
                  <div key={preference} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {t(`dashboard.guests.meals.${preference}`)}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Assignments */}
          {Object.keys(getTableAssignments()).length > 0 && (
            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                {t('dashboard.guests.tableAssignments')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(getTableAssignments())
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([table, count]) => (
                    <div key={table} className="bg-gray-50 rounded p-2 text-center">
                      <p className="text-xs text-gray-500">
                        {t('dashboard.guests.table')} {table}
                      </p>
                      <p className="font-semibold">{count}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Recent Responses */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-700 mb-3">
              {t('dashboard.guests.recentResponses')}
            </h3>
            <div className="space-y-2">
              {guests
                .filter(g => g.respondedAt)
                .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt))
                .slice(0, 5)
                .map((guest) => (
                  <div key={guest.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{guest.name}</span>
                    <span className={`font-medium ${
                      guest.status === 'confirmed' ? 'text-green-600' : 
                      guest.status === 'declined' ? 'text-red-600' : 
                      'text-yellow-600'
                    }`}>
                      {t(`dashboard.guests.status.${guest.status}`)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GuestManagement;