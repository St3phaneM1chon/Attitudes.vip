import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardHeader from './DashboardHeader';
import WeddingProgress from './WeddingProgress';
import QuickActions from './QuickActions';
import VendorList from './VendorList';
import TaskList from './TaskList';
import BudgetOverview from './BudgetOverview';
import GuestManagement from './GuestManagement';
import EmergencyButton from './EmergencyButton';
import useAuth from '../../../hooks/useAuth';
import useWebSocket from '../../../hooks/useWebSocket';
import { getWeddingData } from '../../../services/api/wedding-api';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socket = useWebSocket();
  
  const [weddingData, setWeddingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');

  useEffect(() => {
    loadWeddingData();
    setupRealtimeUpdates();
  }, [user]);

  const loadWeddingData = async () => {
    try {
      setLoading(true);
      const data = await getWeddingData(user.weddingId);
      setWeddingData(data);
    } catch (error) {
      console.error('Error loading wedding data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeUpdates = () => {
    if (socket && user?.weddingId) {
      socket.on(`wedding:${user.weddingId}:update`, (data) => {
        setWeddingData(prev => ({ ...prev, ...data }));
      });

      socket.on('vendor:message', (message) => {
        // Handle vendor messages
        console.log('New vendor message:', message);
      });

      return () => {
        socket.off(`wedding:${user.weddingId}:update`);
        socket.off('vendor:message');
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader 
        weddingData={weddingData}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Emergency Communication Button - Always Visible */}
        <EmergencyButton weddingId={user.weddingId} />

        {/* Main Content Based on Active View */}
        <div className="space-y-6">
          {activeView === 'overview' && (
            <>
              {/* Wedding Progress */}
              <WeddingProgress 
                tasks={weddingData?.tasks || []}
                daysUntilWedding={weddingData?.daysUntilWedding}
              />

              {/* Quick Actions Grid */}
              <QuickActions 
                weddingId={user.weddingId}
                onActionComplete={loadWeddingData}
              />

              {/* Two Column Layout for Desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Budget Overview */}
                <BudgetOverview 
                  budget={weddingData?.budget}
                  expenses={weddingData?.expenses}
                />

                {/* Guest Management Summary */}
                <GuestManagement 
                  guests={weddingData?.guests}
                  capacity={weddingData?.venue?.capacity}
                />
              </div>

              {/* Vendor List */}
              <VendorList 
                vendors={weddingData?.vendors || []}
                onVendorSelect={(vendor) => setActiveView('vendors')}
              />
            </>
          )}

          {activeView === 'tasks' && (
            <TaskList 
              tasks={weddingData?.tasks || []}
              onTaskUpdate={loadWeddingData}
            />
          )}

          {activeView === 'budget' && (
            <BudgetOverview 
              budget={weddingData?.budget}
              expenses={weddingData?.expenses}
              detailed={true}
            />
          )}

          {activeView === 'guests' && (
            <GuestManagement 
              guests={weddingData?.guests}
              capacity={weddingData?.venue?.capacity}
              detailed={true}
            />
          )}

          {activeView === 'vendors' && (
            <VendorList 
              vendors={weddingData?.vendors || []}
              detailed={true}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;