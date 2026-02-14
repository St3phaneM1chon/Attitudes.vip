/**
 * Dashboard Customer Complet - Interface couples mariés
 * Vue d'ensemble, planification, budget, invités, vendors
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '../core/Layout/DashboardLayout';
import { StatCard } from '../core/Stats/StatCard';
import { DataTable } from '../core/Tables/DataTable';
import { Modal } from '../core/Feedback/Modal';
import { Button } from '../core/Button/Button';
import { Input } from '../core/Forms/Input';
import { Select } from '../core/Forms/Select';
import { CountdownTimer } from '../common/CountdownTimer';
import { InteractiveTimeline } from '../timeline/InteractiveTimeline';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useNotifications } from '../../hooks/useNotifications';
import { useStripe } from '../../hooks/useStripe';

const CustomerDashboardComplete = () => {
  // États du dashboard
  const [wedding, setWedding] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [tasks, setTasks] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [guests, setGuests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Modales
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Hooks
  const { sendMessage, lastMessage } = useWebSocket('/ws/wedding');
  const { addNotification } = useNotifications();
  const { createPaymentIntent, confirmPayment } = useStripe();

  // Charger les données
  useEffect(() => {
    loadDashboardData();
  }, []);

  // WebSocket updates
  useEffect(() => {
    if (lastMessage) {
      handleRealTimeUpdate(lastMessage);
    }
  }, [lastMessage]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [weddingRes, statsRes, tasksRes, vendorsRes, guestsRes, paymentsRes] = await Promise.all([
        fetch('/api/v1/weddings/current'),
        fetch('/api/v1/weddings/current/stats'),
        fetch('/api/v1/weddings/current/tasks'),
        fetch('/api/v1/weddings/current/vendors'),
        fetch('/api/v1/weddings/current/guests'),
        fetch('/api/v1/weddings/current/payments')
      ]);

      const weddingData = await weddingRes.json();
      const statsData = await statsRes.json();
      const tasksData = await tasksRes.json();
      const vendorsData = await vendorsRes.json();
      const guestsData = await guestsRes.json();
      const paymentsData = await paymentsRes.json();

      setWedding(weddingData.data);
      setStats(statsData.data);
      setTasks(tasksData.data);
      setVendors(vendorsData.data);
      setGuests(guestsData.data);
      setPayments(paymentsData.data);

      // Générer timeline
      generateTimeline(weddingData.data, tasksData.data, vendorsData.data);
      
    } catch (error) {
      addNotification('Erreur lors du chargement des données', 'error');
      console.error('Dashboard loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeline = (weddingData, tasksData, vendorsData) => {
    const events = [];

    // Ajouter la date du mariage
    if (weddingData?.wedding_date) {
      events.push({
        id: 'wedding-day',
        title: 'Jour J - Mariage',
        date: weddingData.wedding_date,
        type: 'wedding',
        status: 'confirmed',
        description: `Mariage de ${weddingData.partner_name}`,
        color: '#FF6B6B'
      });
    }

    // Ajouter les tâches importantes
    tasksData?.forEach(task => {
      if (task.due_date && task.priority === 'high') {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          date: task.due_date,
          type: 'task',
          status: task.status,
          description: task.description,
          color: '#4ECDC4'
        });
      }
    });

    // Ajouter les rendez-vous vendors
    vendorsData?.forEach(vendor => {
      if (vendor.bookings) {
        vendor.bookings.forEach(booking => {
          if (booking.service_date) {
            events.push({
              id: `vendor-${vendor.id}-${booking.id}`,
              title: `RDV ${vendor.name}`,
              date: booking.service_date,
              type: 'vendor',
              status: booking.status,
              description: `${vendor.vendor_type} - ${vendor.name}`,
              color: '#45B7D1'
            });
          }
        });
      }
    });

    setTimeline(events.sort((a, b) => new Date(a.date) - new Date(b.date)));
  };

  const handleRealTimeUpdate = (message) => {
    const data = JSON.parse(message.data);
    
    switch (data.type) {
      case 'task_updated':
        setTasks(prev => prev.map(task => 
          task.id === data.taskId ? { ...task, ...data.updates } : task
        ));
        break;
      case 'payment_received':
        addNotification('Paiement reçu avec succès!', 'success');
        loadDashboardData();
        break;
      case 'vendor_confirmed':
        addNotification(`${data.vendorName} a confirmé votre réservation`, 'success');
        loadDashboardData();
        break;
      default:
        break;
    }
  };

  // Calculer les métriques
  const metrics = useMemo(() => {
    if (!stats) return {};

    const daysUntilWedding = wedding?.wedding_date 
      ? Math.ceil((new Date(wedding.wedding_date) - new Date()) / (1000 * 60 * 60 * 24))
      : 0;

    const budgetUsedPercentage = wedding?.budget 
      ? Math.round((stats.total_paid / wedding.budget) * 100)
      : 0;

    const completionPercentage = stats.total_tasks 
      ? Math.round((stats.tasks_completed / stats.total_tasks) * 100)
      : 0;

    const rsvpPercentage = stats.confirmed_guests 
      ? Math.round(((stats.rsvp_confirmed + stats.rsvp_declined) / stats.confirmed_guests) * 100)
      : 0;

    return {
      daysUntilWedding,
      budgetUsedPercentage,
      completionPercentage,
      rsvpPercentage
    };
  }, [wedding, stats]);

  // Actions
  const handleTaskComplete = async (taskId) => {
    try {
      await fetch(`/api/v1/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'completed' } : task
      ));

      addNotification('Tâche marquée comme terminée', 'success');
    } catch (error) {
      addNotification('Erreur lors de la mise à jour', 'error');
    }
  };

  const handleInviteGuests = async (guestData) => {
    try {
      await fetch('/api/v1/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData)
      });

      setShowGuestModal(false);
      loadDashboardData();
      addNotification('Invité ajouté avec succès', 'success');
    } catch (error) {
      addNotification('Erreur lors de l\'ajout', 'error');
    }
  };

  const handlePayment = async (paymentData) => {
    try {
      const intent = await createPaymentIntent(paymentData);
      await confirmPayment(intent.client_secret);
      
      setShowPaymentModal(false);
      addNotification('Paiement effectué avec succès', 'success');
      loadDashboardData();
    } catch (error) {
      addNotification('Erreur lors du paiement', 'error');
    }
  };

  // Configuration navigation
  const sidebarItems = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'planning', label: 'Planification', icon: '📅' },
    { id: 'budget', label: 'Budget', icon: '💰' },
    { id: 'guests', label: 'Invités', icon: '👥' },
    { id: 'vendors', label: 'Prestataires', icon: '🤝' },
    { id: 'timeline', label: 'Timeline', icon: '⏰' }
  ];

  if (loading) {
    return (
      <DashboardLayout title="Mon Mariage" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={`Mariage de ${wedding?.partner_name || 'Mon Mariage'}`}
      sidebarItems={sidebarItems}
      showSearch={false}
    >
      <div className="space-y-6">
        {/* En-tête avec compte à rebours */}
        {wedding?.wedding_date && (
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {wedding.partner_name}
                </h2>
                <p className="text-pink-100">
                  {new Date(wedding.wedding_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                {wedding.venue_name && (
                  <p className="text-pink-100 mt-1">📍 {wedding.venue_name}</p>
                )}
              </div>
              <div className="text-center">
                <CountdownTimer targetDate={wedding.wedding_date} />
              </div>
            </div>
          </div>
        )}

        {/* Métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Jours restants"
            value={metrics.daysUntilWedding}
            icon="⏰"
            color="blue"
            subtitle="jusqu'au jour J"
          />
          <StatCard
            title="Budget utilisé"
            value={`${metrics.budgetUsedPercentage}%`}
            icon="💰"
            color={metrics.budgetUsedPercentage > 80 ? 'red' : 'green'}
            subtitle={`${stats.total_paid}€ / ${wedding?.budget}€`}
          />
          <StatCard
            title="Planification"
            value={`${metrics.completionPercentage}%`}
            icon="✅"
            color={metrics.completionPercentage > 70 ? 'green' : 'yellow'}
            subtitle={`${stats.tasks_completed}/${stats.total_tasks} tâches`}
          />
          <StatCard
            title="Confirmations"
            value={`${metrics.rsvpPercentage}%`}
            icon="👥"
            color={metrics.rsvpPercentage > 80 ? 'green' : 'yellow'}
            subtitle={`${stats.rsvp_confirmed} confirmés`}
          />
        </div>

        {/* Contenu par onglet */}
        {activeTab === 'overview' && (
          <OverviewTab 
            wedding={wedding}
            stats={stats}
            tasks={tasks}
            vendors={vendors}
            onTaskComplete={handleTaskComplete}
          />
        )}

        {activeTab === 'planning' && (
          <PlanningTab 
            tasks={tasks}
            onTaskUpdate={handleTaskComplete}
            onAddTask={() => setShowTaskModal(true)}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab 
            wedding={wedding}
            payments={payments}
            stats={stats}
            onMakePayment={() => setShowPaymentModal(true)}
          />
        )}

        {activeTab === 'guests' && (
          <GuestsTab 
            guests={guests}
            stats={stats}
            onAddGuest={() => setShowGuestModal(true)}
          />
        )}

        {activeTab === 'vendors' && (
          <VendorsTab 
            vendors={vendors}
            onVendorAction={(action, vendor) => console.log(action, vendor)}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab 
            timeline={timeline}
            wedding={wedding}
          />
        )}
      </div>

      {/* Modales */}
      <TaskModal 
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        task={selectedTask}
        onSave={(taskData) => {
          console.log('Save task:', taskData);
          setShowTaskModal(false);
        }}
      />

      <GuestModal 
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSave={handleInviteGuests}
      />

      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        vendors={vendors}
        onPayment={handlePayment}
      />
    </DashboardLayout>
  );
};

// Composants d'onglets
const OverviewTab = ({ wedding, stats, tasks, vendors, onTaskComplete }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Tâches urgentes */}
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Tâches urgentes</h3>
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
          {tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length} en attente
        </span>
      </div>
      <div className="space-y-3">
        {tasks
          .filter(t => t.priority === 'high' && t.status !== 'completed')
          .slice(0, 5)
          .map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex-1">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-gray-600">
                  Échéance: {new Date(task.due_date).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTaskComplete(task.id)}
              >
                Terminer
              </Button>
            </div>
          ))
        }
      </div>
    </div>

    {/* Prestataires récents */}
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Prestataires</h3>
      <div className="space-y-3">
        {vendors.slice(0, 5).map(vendor => (
          <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <div>
              <p className="font-medium">{vendor.name}</p>
              <p className="text-sm text-gray-600">{vendor.vendor_type}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${
              vendor.status === 'booked' ? 'bg-green-100 text-green-800' :
              vendor.status === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {vendor.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PlanningTab = ({ tasks, onTaskUpdate, onAddTask }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b flex justify-between items-center">
      <h3 className="text-lg font-semibold">Planning des tâches</h3>
      <Button onClick={onAddTask}>Ajouter une tâche</Button>
    </div>
    <DataTable
      data={tasks}
      columns={[
        {
          key: 'title',
          label: 'Tâche',
          render: (value, row) => (
            <div>
              <p className="font-medium">{value}</p>
              <p className="text-sm text-gray-600">{row.description}</p>
            </div>
          )
        },
        {
          key: 'due_date',
          label: 'Échéance',
          render: (value) => new Date(value).toLocaleDateString()
        },
        {
          key: 'priority',
          label: 'Priorité',
          render: (value) => (
            <span className={`px-2 py-1 rounded text-xs ${
              value === 'high' ? 'bg-red-100 text-red-800' :
              value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {value}
            </span>
          )
        },
        {
          key: 'status',
          label: 'Statut',
          render: (value) => (
            <span className={`px-2 py-1 rounded text-xs ${
              value === 'completed' ? 'bg-green-100 text-green-800' :
              value === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {value}
            </span>
          )
        }
      ]}
    />
  </div>
);

const BudgetTab = ({ wedding, payments, stats, onMakePayment }) => (
  <div className="space-y-6">
    {/* Résumé budget */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-medium text-gray-600">Budget total</h4>
        <p className="text-2xl font-bold text-gray-900">{wedding?.budget}€</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-medium text-gray-600">Dépensé</h4>
        <p className="text-2xl font-bold text-red-600">{stats.total_paid}€</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-sm font-medium text-gray-600">Restant</h4>
        <p className="text-2xl font-bold text-green-600">{wedding?.budget - stats.total_paid}€</p>
      </div>
    </div>

    {/* Historique paiements */}
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Historique des paiements</h3>
        <Button onClick={onMakePayment}>Effectuer un paiement</Button>
      </div>
      <DataTable
        data={payments}
        columns={[
          { key: 'vendor_name', label: 'Prestataire' },
          { 
            key: 'amount', 
            label: 'Montant',
            render: (value) => `${value}€`
          },
          { key: 'payment_type', label: 'Type' },
          { 
            key: 'status', 
            label: 'Statut',
            render: (value) => (
              <span className={`px-2 py-1 rounded text-xs ${
                value === 'succeeded' ? 'bg-green-100 text-green-800' :
                value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {value}
              </span>
            )
          },
          { 
            key: 'created_at', 
            label: 'Date',
            render: (value) => new Date(value).toLocaleDateString()
          }
        ]}
      />
    </div>
  </div>
);

const GuestsTab = ({ guests, stats, onAddGuest }) => (
  <div className="space-y-6">
    {/* Stats invités */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <StatCard title="Total invités" value={stats.confirmed_guests} icon="👥" />
      <StatCard title="Confirmés" value={stats.rsvp_confirmed} icon="✅" color="green" />
      <StatCard title="Déclinés" value={stats.rsvp_declined} icon="❌" color="red" />
      <StatCard title="En attente" value={stats.rsvp_pending} icon="⏳" color="yellow" />
    </div>

    {/* Liste invités */}
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-lg font-semibold">Liste des invités</h3>
        <Button onClick={onAddGuest}>Ajouter un invité</Button>
      </div>
      <DataTable
        data={guests}
        columns={[
          { 
            key: 'name',
            label: 'Nom',
            render: (_, row) => `${row.first_name} ${row.last_name}`
          },
          { key: 'email', label: 'Email' },
          { 
            key: 'rsvp_status', 
            label: 'RSVP',
            render: (value) => (
              <span className={`px-2 py-1 rounded text-xs ${
                value === 'confirmed' ? 'bg-green-100 text-green-800' :
                value === 'declined' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {value}
              </span>
            )
          },
          { 
            key: 'plus_one', 
            label: 'Accompagnant',
            render: (value) => value ? '✅' : '❌'
          }
        ]}
      />
    </div>
  </div>
);

const VendorsTab = ({ vendors, onVendorAction }) => (
  <div className="bg-white rounded-lg shadow">
    <div className="p-6 border-b">
      <h3 className="text-lg font-semibold">Mes prestataires</h3>
    </div>
    <DataTable
      data={vendors}
      columns={[
        { key: 'name', label: 'Nom' },
        { key: 'vendor_type', label: 'Type' },
        { key: 'email', label: 'Email' },
        { 
          key: 'pricing', 
          label: 'Prix',
          render: (value) => value ? `${value}€` : '-'
        },
        { 
          key: 'status', 
          label: 'Statut',
          render: (value) => (
            <span className={`px-2 py-1 rounded text-xs ${
              value === 'booked' ? 'bg-green-100 text-green-800' :
              value === 'quoted' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {value}
            </span>
          )
        }
      ]}
    />
  </div>
);

const TimelineTab = ({ timeline, wedding }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <h3 className="text-lg font-semibold mb-6">Timeline de votre mariage</h3>
    <InteractiveTimeline 
      events={timeline}
      weddingDate={wedding?.wedding_date}
    />
  </div>
);

// Modales
const TaskModal = ({ isOpen, onClose, task, onSave }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle tâche">
    <div className="space-y-4">
      <Input label="Titre" placeholder="Titre de la tâche" />
      <Input label="Description" placeholder="Description" multiline />
      <Input type="date" label="Date d'échéance" />
      <Select 
        label="Priorité"
        options={[
          { value: 'low', label: 'Faible' },
          { value: 'medium', label: 'Moyenne' },
          { value: 'high', label: 'Haute' }
        ]}
      />
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave({})}>Sauvegarder</Button>
      </div>
    </div>
  </Modal>
);

const GuestModal = ({ isOpen, onClose, onSave }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un invité">
    <div className="space-y-4">
      <Input label="Prénom" placeholder="Prénom" />
      <Input label="Nom" placeholder="Nom de famille" />
      <Input label="Email" placeholder="email@exemple.com" />
      <Input label="Téléphone" placeholder="+33..." />
      <Select 
        label="Accompagnant autorisé"
        options={[
          { value: false, label: 'Non' },
          { value: true, label: 'Oui' }
        ]}
      />
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => onSave({})}>Inviter</Button>
      </div>
    </div>
  </Modal>
);

const PaymentModal = ({ isOpen, onClose, vendors, onPayment }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Effectuer un paiement">
    <div className="space-y-4">
      <Select 
        label="Prestataire"
        options={vendors.map(v => ({ value: v.id, label: v.name }))}
      />
      <Select 
        label="Type de paiement"
        options={[
          { value: 'deposit', label: 'Acompte' },
          { value: 'balance', label: 'Solde' },
          { value: 'full', label: 'Paiement complet' }
        ]}
      />
      <Input label="Montant" placeholder="€" type="number" />
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button onClick={() => onPayment({})}>Payer</Button>
      </div>
    </div>
  </Modal>
);

export default CustomerDashboardComplete;