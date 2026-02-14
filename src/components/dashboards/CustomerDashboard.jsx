/**
 * Dashboard Customer (Couples mariés)
 * Interface principale pour la gestion du mariage
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGuests } from '../../hooks/useGuests';
import { useBudget } from '../../hooks/useBudget';
import { useTaskmasterIntegration } from '../../hooks/useTaskmasterIntegration';
import { useVendors } from '../../hooks/useVendors';
import { useSupabase } from '../../hooks/useSupabase';
import { 
  Calendar, Users, DollarSign, CheckCircle, 
  MessageSquare, Camera, BarChart3, Sparkles,
  Clock, AlertCircle, TrendingUp, Heart, Plus,
  FileText, Phone, Mail, CreditCard
} from 'lucide-react';

const CustomerDashboard = () => {
  const { user, wedding } = useAuth();
  const { supabase } = useSupabase();
  
  // Hooks pour les données temps réel
  const { guests, stats: guestStats, loading: guestsLoading, actions: guestActions } = useGuests(wedding?.id);
  const { overview: budgetOverview, categories: budgetCategories, loading: budgetLoading, actions: budgetActions } = useBudget(wedding?.id);
  const { tasks, metrics: taskMetrics, aiSuggestions, loading: tasksLoading, actions: taskActions } = useTaskmasterIntegration(wedding?.id);
  const { vendors, stats: vendorStats, loading: vendorsLoading, actions: vendorActions } = useVendors(wedding?.id);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState('');
  const [stats, setStats] = useState({
    daysUntilWedding: 0,
    confirmedGuests: 0,
    totalGuests: 0,
    budgetUsed: 0,
    totalBudget: 0,
    tasksCompleted: 0,
    totalTasks: 0,
    photosUploaded: 0
  });

  // Calculer les statistiques à partir des hooks temps réel
  useEffect(() => {
    if (wedding?.id) {
      const weddingDate = new Date(wedding.event_date);
      const today = new Date();
      const daysUntilWedding = Math.ceil((weddingDate - today) / (1000 * 60 * 60 * 24));
      
      setStats({
        daysUntilWedding,
        confirmedGuests: guestStats?.confirmed || 0,
        totalGuests: guestStats?.total || 0,
        budgetUsed: budgetOverview?.spent || 0,
        totalBudget: budgetOverview?.total || 0,
        tasksCompleted: taskMetrics?.tasksCompleted || 0,
        totalTasks: taskMetrics?.tasksCreated || 0,
        photosUploaded: 0 // À implémenter
      });
    }
  }, [wedding, guestStats, budgetOverview, taskMetrics]);

  // Obtenir les tâches urgentes depuis Taskmaster avec IA
  const getUrgentTasks = () => {
    return tasks
      .filter(t => t.priority === 'urgent' || t.aiPriority > 80)
      .slice(0, 5);
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Compte à rebours */}
      <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <Heart className="h-8 w-8 opacity-80" />
          <span className="text-sm font-medium">Jour J</span>
        </div>
        <div className="text-3xl font-bold mb-1">
          {stats.daysUntilWedding} jours
        </div>
        <div className="text-sm opacity-90">
          {new Date(wedding.event_date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Invités */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <Users className="h-8 w-8 text-blue-500" />
          <span className="text-sm text-gray-500">Invités</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {stats.confirmedGuests}/{stats.totalGuests}
        </div>
        <div className="flex items-center text-sm">
          <span className="text-green-600 font-medium">
            {Math.round((stats.confirmedGuests / stats.totalGuests) * 100)}%
          </span>
          <span className="text-gray-500 ml-1">confirmés</span>
        </div>
      </div>

      {/* Budget */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <DollarSign className="h-8 w-8 text-green-500" />
          <span className="text-sm text-gray-500">Budget</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {(stats.budgetUsed / 1000).toFixed(1)}k€
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(stats.budgetUsed / stats.totalBudget) * 100}%` }}
          />
        </div>
        <div className="text-sm text-gray-500 mt-2">
          sur {(stats.totalBudget / 1000).toFixed(1)}k€
        </div>
      </div>

      {/* Tâches */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <CheckCircle className="h-8 w-8 text-purple-500" />
          <span className="text-sm text-gray-500">Tâches</span>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">
          {stats.tasksCompleted}/{stats.totalTasks}
        </div>
        <div className="flex items-center text-sm">
          <TrendingUp className="h-4 w-4 text-purple-600 mr-1" />
          <span className="text-purple-600 font-medium">
            {Math.round((stats.tasksCompleted / stats.totalTasks) * 100)}%
          </span>
          <span className="text-gray-500 ml-1">complétées</span>
        </div>
      </div>
    </div>
  );

  const renderUrgentTasks = () => (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
          Tâches Urgentes
        </h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Voir toutes →
        </button>
      </div>
      
      <div className="space-y-3">
        {getUrgentTasks().map(task => (
          <div key={task.id} className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
              task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
            }`} />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{task.title}</h4>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <Clock className="h-3 w-3 mr-1" />
                <span>Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}</span>
                {task.aiPriority > 80 && (
                  <span className="ml-3 flex items-center text-purple-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    IA: {task.aiPriority}%
                  </span>
                )}
              </div>
            </div>
            <button className="ml-3 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Commencer
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  // Tab Guests - Gestion Complète des Invités avec données temps réel
  const renderGuestsTab = () => {
    // Filtrer les invités selon les critères
    const filteredGuests = guestActions.filterGuests(guestSearch, guestStatusFilter);
    
    return (
      <div className="space-y-6">
        {/* Header avec statistiques invités temps réel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-green-600">{guestStats?.confirmed || 0}</div>
            <div className="text-sm text-green-700">Confirmés</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-yellow-600">{guestStats?.pending || 0}</div>
            <div className="text-sm text-yellow-700">En Attente</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-red-600">{guestStats?.declined || 0}</div>
            <div className="text-sm text-red-700">Déclinés</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="text-2xl font-bold text-blue-600">{guestStats?.total || 0}</div>
            <div className="text-sm text-blue-700">Total</div>
          </div>
        </div>

        {/* Actions rapides invités */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => guestActions.sendInvitations()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
              disabled={guestsLoading}
            >
              <Mail className="h-4 w-4" />
              <span>Envoyer Invitations</span>
            </button>
            <button 
              onClick={() => {/* TODO: Ouvrir modal d'ajout */}}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter Invité</span>
            </button>
            <button 
              onClick={() => guestActions.exportGuestList('csv')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Exporter Liste</span>
            </button>
          </div>
        </div>

        {/* Liste des invités avec recherche et filtre */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <h3 className="text-lg font-semibold">Liste des Invités</h3>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
              <input
                type="text"
                placeholder="Rechercher un invité..."
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select 
                value={guestStatusFilter}
                onChange={(e) => setGuestStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="confirmed">Confirmés</option>
                <option value="pending">En attente</option>
                <option value="declined">Déclinés</option>
              </select>
            </div>
          </div>

        {/* Table responsive des invités */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2">Nom</th>
                <th className="text-left py-3 px-2">Email</th>
                <th className="text-left py-3 px-2">Statut</th>
                <th className="text-left py-3 px-2">Accompagnants</th>
                <th className="text-left py-3 px-2 hidden md:table-cell">Régime</th>
                <th className="text-left py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guestsLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Chargement des invités...
                  </td>
                </tr>
              ) : filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Aucun invité trouvé
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">
                      {`${guest.first_name} ${guest.last_name}`}
                    </td>
                    <td className="py-3 px-2 text-gray-600">{guest.email}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        guest.rsvp_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        guest.rsvp_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guest.rsvp_status === 'confirmed' ? 'Confirmé' :
                         guest.rsvp_status === 'pending' ? 'En attente' : 'Décliné'}
                      </span>
                    </td>
                    <td className="py-3 px-2">{guest.plus_one_allowed ? 'Oui' : 'Non'}</td>
                    <td className="py-3 px-2 hidden md:table-cell">
                      {guest.dietary_restrictions || 'Aucune'}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {/* TODO: Ouvrir modal d'édition */}}
                          className="text-blue-600 hover:text-blue-800"
                          title="Modifier"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => guestActions.deleteGuest(guest.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-gray-500">
              Affichage de {filteredGuests.length} invité(s) sur {guestStats?.total || 0} total
            </div>
            <div className="text-sm text-gray-400">
              {guestSearch || guestStatusFilter ? 'Filtré' : 'Tous les invités'}
            </div>
          </div>
        </div>

        {/* Plan de table (aperçu) */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Plan de Table</h3>
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-400 mb-4">🪑</div>
            <p className="text-gray-500">Fonctionnalité de plan de table interactive</p>
            <p className="text-sm text-gray-400 mt-2">Glissez-déposez vos invités sur les tables</p>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-4 hover:bg-blue-600 transition-colors">
              Organiser les Tables
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tab Budget - Tracker Interactif avec données temps réel
  const renderBudgetTab = () => {
    if (budgetLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Chargement du budget...</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Vue d'ensemble du budget temps réel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-800">
                {(budgetOverview?.total || 0).toLocaleString()}€
              </div>
              <div className="text-gray-500">Budget Total</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {(budgetOverview?.spent || 0).toLocaleString()}€
              </div>
              <div className="text-gray-500">Dépensé</div>
              <div className="text-sm text-red-600 mt-1">
                {(budgetOverview?.percentageSpent || 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {(budgetOverview?.remaining || 0).toLocaleString()}€
              </div>
              <div className="text-gray-500">Restant</div>
              <div className="text-sm text-green-600 mt-1">
                {(100 - (budgetOverview?.percentageSpent || 0)).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Graphique en anneau du budget */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition du Budget</h3>
          <div className="flex flex-col md:flex-row items-center">
            {/* Graphique circulaire simulé */}
            <div className="relative w-48 h-48 mb-6 md:mb-0 md:mr-8">
              <div className="w-48 h-48 rounded-full border-8 border-gray-200 relative">
                <div 
                  className="absolute inset-0 rounded-full border-8 border-red-500 transform -rotate-90"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + ((budgetOverview?.percentageSpent || 0) * 0.5)}% 0%, 100% 100%, 0% 100%)`
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(budgetOverview?.percentageSpent || 0).toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">Utilisé</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Légende */}
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-sm">Dépensé ({(budgetOverview?.spent || 0).toLocaleString()}€)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-200 rounded mr-2"></div>
                  <span className="text-sm">Restant ({(budgetOverview?.remaining || 0).toLocaleString()}€)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Détail par catégorie */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Budget par Catégorie</h3>
            <button 
              onClick={() => {/* TODO: Ouvrir modal d'ajout */}}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Ajouter Dépense</span>
            </button>
          </div>

          <div className="space-y-4">
            {budgetCategories?.map((category, index) => {
              const percentageUsed = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
              const colorClasses = {
                blue: 'bg-blue-500',
                green: 'bg-green-500',
                purple: 'bg-purple-500',
                yellow: 'bg-yellow-500',
                pink: 'bg-pink-500',
                indigo: 'bg-indigo-500',
                red: 'bg-red-500',
                gray: 'bg-gray-500'
              };

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{category.name}</h4>
                    <div className="text-sm text-gray-500">
                      {category.spent.toLocaleString()}€ / {category.budgeted.toLocaleString()}€
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${colorClasses[category.color]}`}
                      style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className={`font-medium ${percentageUsed > 90 ? 'text-red-600' : percentageUsed > 75 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {percentageUsed.toFixed(1)}% utilisé
                    </span>
                    <span className="text-gray-500">
                      Restant: {category.remaining.toLocaleString()}€
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-2 mt-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">📝 Modifier</button>
                    <button className="text-green-600 hover:text-green-800 text-sm">➕ Ajouter dépense</button>
                    <button className="text-gray-600 hover:text-gray-800 text-sm">📋 Voir détails</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transactions récentes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Transactions Récentes</h3>
          <div className="space-y-3">
            {[
              { date: '2024-06-25', description: 'Acompte traiteur', amount: -2000, category: 'Traiteur' },
              { date: '2024-06-20', description: 'Décoration florale', amount: -850, category: 'Décoration' },
              { date: '2024-06-18', description: 'Réservation salle', amount: -3500, category: 'Réception' },
              { date: '2024-06-15', description: 'DJ confirmation', amount: -500, category: 'Musique/DJ' }
            ].map((transaction, index) => (
              <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-gray-500">{transaction.category} • {transaction.date}</div>
                </div>
                <div className={`font-semibold ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {transaction.amount < 0 ? '-' : '+'}{Math.abs(transaction.amount).toLocaleString()}€
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm">
            Voir toutes les transactions →
          </button>
        </div>

        {/* Alertes budget */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <h4 className="font-medium text-yellow-800">Alertes Budget</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Catégorie "Traiteur" proche de la limite (97% utilisé)</li>
                <li>• Catégorie "Musique/DJ" proche de la limite (90% utilisé)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab Tasks - Liste Détaillée avec Taskmaster IA
  const renderTasksTab = () => {
    // Données des tâches avec intégration Taskmaster (à remplacer par données réelles)
    const tasksData = {
      overview: {
        total: 47,
        completed: 23,
        inProgress: 12,
        pending: 8,
        overdue: 4
      },
      categories: [
        {
          name: 'Administration',
          icon: '📋',
          tasks: [
            { id: 1, title: 'Réserver la mairie', status: 'completed', priority: 'high', dueDate: '2024-05-15', assignee: 'Couple' },
            { id: 2, title: 'Obtenir certificat médical', status: 'completed', priority: 'medium', dueDate: '2024-06-01', assignee: 'Couple' },
            { id: 3, title: 'Publier les bans', status: 'inProgress', priority: 'high', dueDate: '2024-07-01', assignee: 'Mairie' }
          ]
        },
        {
          name: 'Réception',
          icon: '🏛️',
          tasks: [
            { id: 4, title: 'Réserver lieu de réception', status: 'completed', priority: 'high', dueDate: '2024-04-01', assignee: 'Couple' },
            { id: 5, title: 'Finaliser menu', status: 'inProgress', priority: 'high', dueDate: '2024-07-15', assignee: 'Traiteur' },
            { id: 6, title: 'Test dégustation', status: 'pending', priority: 'medium', dueDate: '2024-07-20', assignee: 'Couple' }
          ]
        },
        {
          name: 'Décoration',
          icon: '🌸',
          tasks: [
            { id: 7, title: 'Choisir thème déco', status: 'completed', priority: 'medium', dueDate: '2024-05-01', assignee: 'Couple' },
            { id: 8, title: 'Commander fleurs', status: 'overdue', priority: 'high', dueDate: '2024-06-20', assignee: 'Fleuriste' },
            { id: 9, title: 'Éclairage ambiance', status: 'pending', priority: 'low', dueDate: '2024-08-01', assignee: 'Décorateur' }
          ]
        },
        {
          name: 'Jour J',
          icon: '💒',
          tasks: [
            { id: 10, title: 'Timeline détaillée', status: 'inProgress', priority: 'high', dueDate: '2024-08-15', assignee: 'Wedding Planner' },
            { id: 11, title: 'Plan de table final', status: 'pending', priority: 'medium', dueDate: '2024-08-20', assignee: 'Couple' },
            { id: 12, title: 'Répétition générale', status: 'pending', priority: 'high', dueDate: '2024-08-29', assignee: 'Tous' }
          ]
        }
      ]
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed': return 'bg-green-100 text-green-800';
        case 'inProgress': return 'bg-blue-100 text-blue-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'overdue': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'completed': return 'Terminé';
        case 'inProgress': return 'En cours';
        case 'pending': return 'En attente';
        case 'overdue': return 'En retard';
        default: return 'Inconnu';
      }
    };

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high': return 'text-red-600';
        case 'medium': return 'text-yellow-600';
        case 'low': return 'text-green-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="space-y-6">
        {/* Vue d'ensemble des tâches */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="text-2xl font-bold text-gray-800">{tasksData.overview.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-lg p-4">
            <div className="text-2xl font-bold text-green-600">{tasksData.overview.completed}</div>
            <div className="text-sm text-green-700">Terminées</div>
          </div>
          <div className="bg-blue-50 rounded-xl shadow-lg p-4">
            <div className="text-2xl font-bold text-blue-600">{tasksData.overview.inProgress}</div>
            <div className="text-sm text-blue-700">En cours</div>
          </div>
          <div className="bg-yellow-50 rounded-xl shadow-lg p-4">
            <div className="text-2xl font-bold text-yellow-600">{tasksData.overview.pending}</div>
            <div className="text-sm text-yellow-700">En attente</div>
          </div>
          <div className="bg-red-50 rounded-xl shadow-lg p-4">
            <div className="text-2xl font-bold text-red-600">{tasksData.overview.overdue}</div>
            <div className="text-sm text-red-700">En retard</div>
          </div>
        </div>

        {/* Actions rapides tâches */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors">
              ➕ Nouvelle Tâche
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors">
              🤖 Suggestions IA
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors">
              📊 Rapport Avancement
            </button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg transition-colors">
              ⏰ Échéances Urgentes
            </button>
          </div>
        </div>

        {/* Filtres et vue */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
            <h3 className="text-lg font-semibold">Gestion des Tâches</h3>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-3">
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Toutes les catégories</option>
                <option value="administration">Administration</option>
                <option value="reception">Réception</option>
                <option value="decoration">Décoration</option>
                <option value="jourj">Jour J</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="inProgress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="overdue">En retard</option>
              </select>
              <div className="flex space-x-2">
                <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">📋 Liste</button>
                <button className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">📅 Calendrier</button>
              </div>
            </div>
          </div>

          {/* Tâches par catégorie */}
          <div className="space-y-6">
            {tasksData.categories.map((category, categoryIndex) => (
              <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium flex items-center">
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {category.tasks.length}
                    </span>
                  </h4>
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    ➕ Ajouter tâche
                  </button>
                </div>

                <div className="space-y-3">
                  {category.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          checked={task.status === 'completed'}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          onChange={() => {}}
                        />
                        <div className="flex-1">
                          <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            Assigné à: {task.assignee} • Échéance: {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Priorité */}
                        <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                        </span>
                        
                        {/* Statut */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                        
                        {/* Actions */}
                        <div className="flex space-x-1">
                          <button className="text-blue-600 hover:text-blue-800">✏️</button>
                          <button className="text-red-600 hover:text-red-800">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions Taskmaster IA */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg p-6 border border-purple-200">
          <div className="flex items-start">
            <div className="text-purple-600 mr-3">🤖</div>
            <div className="flex-1">
              <h4 className="font-medium text-purple-800 mb-2">Suggestions Taskmaster IA</h4>
              <div className="space-y-2 text-sm text-purple-700">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  <span>Il est recommandé de commander les fleurs cette semaine (échéance dépassée)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  <span>Prévoir un créneau pour la répétition générale dans votre agenda</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                  <span>Rappel: Confirmer le nombre final d'invités au traiteur</span>
                </div>
              </div>
              <button className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm">
                Voir toutes les suggestions
              </button>
            </div>
          </div>
        </div>

        {/* Timeline du mariage */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Timeline du Mariage</h3>
          <div className="relative">
            {/* Ligne de temps */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            <div className="space-y-6">
              {[
                { phase: '6 mois avant', tasks: 'Réservations principales', status: 'completed' },
                { phase: '4 mois avant', tasks: 'Prestataires et déco', status: 'completed' },
                { phase: '2 mois avant', tasks: 'Finalisation détails', status: 'inProgress' },
                { phase: '1 mois avant', tasks: 'Confirmations finales', status: 'pending' },
                { phase: '1 semaine avant', tasks: 'Préparatifs ultimes', status: 'pending' },
                { phase: 'Jour J', tasks: 'Célébration !', status: 'pending' }
              ].map((milestone, index) => (
                <div key={index} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold relative z-10 ${
                    milestone.status === 'completed' ? 'bg-green-500' :
                    milestone.status === 'inProgress' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {milestone.status === 'completed' ? '✓' : index + 1}
                  </div>
                  <div className="ml-4">
                    <div className="font-medium">{milestone.phase}</div>
                    <div className="text-sm text-gray-500">{milestone.tasks}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tab Vendors - Gestion des Fournisseurs
  const renderVendorsTab = () => {
    // Données des fournisseurs (à remplacer par données réelles)
    const vendorsData = {
      categories: [
        {
          name: 'Restauration',
          icon: '🍽️',
          vendors: [
            {
              id: 1,
              name: 'Traiteur Délices',
              type: 'Traiteur',
              status: 'confirmed',
              rating: 4.8,
              price: '€€€',
              contact: 'chef@delices.fr',
              phone: '01 23 45 67 89',
              notes: 'Menu dégustation prévu le 20/07',
              contract: true,
              payment: { deposit: 2000, total: 6000, paid: 2000 }
            },
            {
              id: 2,
              name: 'Pâtisserie Royale',
              type: 'Pâtissier',
              status: 'confirmed',
              rating: 4.9,
              price: '€€',
              contact: 'contact@royale.fr',
              phone: '01 23 45 67 90',
              notes: 'Pièce montée 3 étages',
              contract: true,
              payment: { deposit: 200, total: 800, paid: 200 }
            }
          ]
        },
        {
          name: 'Divertissement',
          icon: '🎵',
          vendors: [
            {
              id: 3,
              name: 'DJ Mix Events',
              type: 'DJ/Musique',
              status: 'confirmed',
              rating: 4.7,
              price: '€€',
              contact: 'dj@mixevents.fr',
              phone: '01 23 45 67 91',
              notes: 'Playlist personnalisée + éclairage',
              contract: true,
              payment: { deposit: 500, total: 1800, paid: 500 }
            },
            {
              id: 4,
              name: 'Photo Memories',
              type: 'Photographe',
              status: 'pending',
              rating: 4.6,
              price: '€€€',
              contact: 'info@memories.fr',
              phone: '01 23 45 67 92',
              notes: 'Séance engagement + mariage',
              contract: false,
              payment: { deposit: 0, total: 2500, paid: 0 }
            }
          ]
        },
        {
          name: 'Décoration',
          icon: '💐',
          vendors: [
            {
              id: 5,
              name: 'Fleurs & Co',
              type: 'Fleuriste',
              status: 'quote',
              rating: 4.5,
              price: '€€',
              contact: 'fleurs@co.fr',
              phone: '01 23 45 67 93',
              notes: 'Devis en attente pour centre de table',
              contract: false,
              payment: { deposit: 0, total: 1200, paid: 0 }
            },
            {
              id: 6,
              name: 'Déco Dreams',
              type: 'Décorateur',
              status: 'researching',
              rating: 0,
              price: '€€€',
              contact: '',
              phone: '',
              notes: 'Recommandé par le lieu de réception',
              contract: false,
              payment: { deposit: 0, total: 0, paid: 0 }
            }
          ]
        },
        {
          name: 'Services',
          icon: '🚗',
          vendors: [
            {
              id: 7,
              name: 'Luxury Cars',
              type: 'Transport',
              status: 'researching',
              rating: 4.3,
              price: '€€',
              contact: 'info@luxury.fr',
              phone: '01 23 45 67 94',
              notes: 'Voiture vintage pour les mariés',
              contract: false,
              payment: { deposit: 0, total: 600, paid: 0 }
            }
          ]
        }
      ]
    };

    const getStatusInfo = (status) => {
      switch (status) {
        case 'confirmed': return { label: 'Confirmé', color: 'bg-green-100 text-green-800' };
        case 'pending': return { label: 'En cours', color: 'bg-yellow-100 text-yellow-800' };
        case 'quote': return { label: 'Devis', color: 'bg-blue-100 text-blue-800' };
        case 'researching': return { label: 'Recherche', color: 'bg-gray-100 text-gray-800' };
        default: return { label: 'Inconnu', color: 'bg-gray-100 text-gray-800' };
      }
    };

    const totalBudget = vendorsData.categories.reduce((total, category) => 
      total + category.vendors.reduce((catTotal, vendor) => catTotal + vendor.payment.total, 0), 0
    );

    const totalPaid = vendorsData.categories.reduce((total, category) => 
      total + category.vendors.reduce((catTotal, vendor) => catTotal + vendor.payment.paid, 0), 0
    );

    return (
      <div className="space-y-6">
        {/* Vue d'ensemble des fournisseurs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">
                {vendorsData.categories.reduce((total, cat) => total + cat.vendors.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Fournisseurs</div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {vendorsData.categories.reduce((total, cat) => 
                  total + cat.vendors.filter(v => v.status === 'confirmed').length, 0
                )}
              </div>
              <div className="text-sm text-green-700">Confirmés</div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalBudget.toLocaleString()}€</div>
              <div className="text-sm text-blue-700">Budget Total</div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl shadow-lg p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalPaid.toLocaleString()}€</div>
              <div className="text-sm text-purple-700">Payé</div>
            </div>
          </div>
        </div>

        {/* Actions rapides fournisseurs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Actions Rapides</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-colors">
              ➕ Ajouter Fournisseur
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg transition-colors">
              📋 Comparer Devis
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg transition-colors">
              💰 Suivi Paiements
            </button>
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-lg transition-colors">
              📞 Contacter Tous
            </button>
          </div>
        </div>

        {/* Fournisseurs par catégorie */}
        <div className="space-y-6">
          {vendorsData.categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center">
                  <span className="mr-2">{category.icon}</span>
                  {category.name}
                  <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {category.vendors.length}
                  </span>
                </h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm">
                  ➕ Ajouter dans cette catégorie
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {category.vendors.map((vendor) => {
                  const statusInfo = getStatusInfo(vendor.status);
                  const paymentProgress = vendor.payment.total > 0 ? 
                    (vendor.payment.paid / vendor.payment.total) * 100 : 0;

                  return (
                    <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                      {/* Header du fournisseur */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-lg">{vendor.name}</h4>
                          <p className="text-sm text-gray-600">{vendor.type}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Informations de base */}
                      <div className="space-y-2 mb-4">
                        {vendor.rating > 0 && (
                          <div className="flex items-center text-sm">
                            <span className="text-yellow-500">⭐</span>
                            <span className="ml-1">{vendor.rating}/5</span>
                            <span className="ml-2 text-gray-500">{vendor.price}</span>
                          </div>
                        )}
                        
                        {vendor.contact && (
                          <div className="text-sm text-gray-600">
                            📧 {vendor.contact}
                          </div>
                        )}
                        
                        {vendor.phone && (
                          <div className="text-sm text-gray-600">
                            📞 {vendor.phone}
                          </div>
                        )}
                        
                        {vendor.notes && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            💡 {vendor.notes}
                          </div>
                        )}
                      </div>

                      {/* Informations contractuelles et paiement */}
                      {vendor.payment.total > 0 && (
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span>Budget: {vendor.payment.total.toLocaleString()}€</span>
                            <span>Payé: {vendor.payment.paid.toLocaleString()}€</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${paymentProgress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {paymentProgress.toFixed(0)}% payé
                            {vendor.payment.paid < vendor.payment.total && (
                              <span className="text-orange-600 ml-2">
                                (Reste: {(vendor.payment.total - vendor.payment.paid).toLocaleString()}€)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Status du contrat */}
                      <div className="flex items-center justify-between text-sm mb-4">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${vendor.contract ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span>{vendor.contract ? 'Contrat signé' : 'Contrat en attente'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 pt-3 border-t border-gray-100">
                        <button className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded text-sm hover:bg-blue-100 transition-colors">
                          👁️ Voir Détails
                        </button>
                        <button className="flex-1 bg-green-50 text-green-600 py-2 px-3 rounded text-sm hover:bg-green-100 transition-colors">
                          📞 Contacter
                        </button>
                        <button className="bg-gray-50 text-gray-600 py-2 px-3 rounded text-sm hover:bg-gray-100 transition-colors">
                          ✏️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bouton d'ajout si catégorie vide */}
              {category.vendors.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-gray-400 mb-2">{category.icon}</div>
                  <p className="text-gray-500 mb-4">Aucun fournisseur dans cette catégorie</p>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    ➕ Ajouter le premier fournisseur
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recommandations et suggestions */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border border-blue-200">
          <div className="flex items-start">
            <div className="text-blue-600 mr-3">💡</div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-800 mb-2">Recommandations</h4>
              <div className="space-y-2 text-sm text-blue-700">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span>Il manque encore un photographe confirmé pour votre mariage</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span>Pensez à demander les devis finaux pour la décoration</span>
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  <span>Budget restant: {(totalBudget - totalPaid).toLocaleString()}€ à régler</span>
                </div>
              </div>
              <button className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                Voir tous les conseils
              </button>
            </div>
          </div>
        </div>

        {/* Timeline des paiements */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Planning des Paiements</h3>
          <div className="space-y-4">
            {[
              { date: '2024-07-01', vendor: 'Traiteur Délices', amount: 2000, status: 'paid', type: 'Acompte' },
              { date: '2024-07-15', vendor: 'DJ Mix Events', amount: 1300, status: 'upcoming', type: 'Solde' },
              { date: '2024-08-01', vendor: 'Photo Memories', amount: 1250, status: 'upcoming', type: 'Acompte' },
              { date: '2024-08-15', vendor: 'Fleurs & Co', amount: 1200, status: 'pending', type: 'Total' },
              { date: '2024-08-30', vendor: 'Traiteur Délices', amount: 4000, status: 'upcoming', type: 'Solde' }
            ].map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <div className="font-medium">{payment.vendor}</div>
                  <div className="text-sm text-gray-500">
                    {payment.type} • {new Date(payment.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{payment.amount.toLocaleString()}€</div>
                  <div className={`text-xs ${
                    payment.status === 'paid' ? 'text-green-600' :
                    payment.status === 'upcoming' ? 'text-blue-600' : 'text-yellow-600'
                  }`}>
                    {payment.status === 'paid' ? 'Payé' :
                     payment.status === 'upcoming' ? 'À venir' : 'En attente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderQuickActions = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <button className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center">
        <Users className="h-8 w-8 text-blue-500 mb-2" />
        <span className="text-sm font-medium text-gray-700">Gérer invités</span>
      </button>
      
      <button className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center">
        <MessageSquare className="h-8 w-8 text-green-500 mb-2" />
        <span className="text-sm font-medium text-gray-700">Messages</span>
      </button>
      
      <button className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center">
        <Camera className="h-8 w-8 text-purple-500 mb-2" />
        <span className="text-sm font-medium text-gray-700">Photos</span>
      </button>
      
      <button className="p-4 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col items-center">
        <BarChart3 className="h-8 w-8 text-orange-500 mb-2" />
        <span className="text-sm font-medium text-gray-700">Statistiques</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bonjour {user?.name} 👋
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Votre mariage avec {wedding?.partner_name}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Bell className="h-6 w-6" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex space-x-8 border-t -mb-px">
            {['overview', 'guests', 'budget', 'tasks', 'vendors'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <>
            {renderOverview()}
            {renderUrgentTasks()}
            {renderQuickActions()}
          </>
        )}
        
        {/* Tab Guests - Gestion des Invités */}
        {activeTab === 'guests' && renderGuestsTab()}
        
        {/* Tab Budget - Tracker Interactif */}
        {activeTab === 'budget' && renderBudgetTab()}
        
        {/* Tab Tasks - Liste Détaillée */}
        {activeTab === 'tasks' && renderTasksTab()}
        
        {/* Tab Vendors - Gestion Fournisseurs */}
        {activeTab === 'vendors' && renderVendorsTab()}
        
        {/* Tabs non implémentées (fallback) */}
        {!['overview', 'guests', 'budget', 'tasks', 'vendors'].includes(activeTab) && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-gray-500">Section {activeTab} en cours de développement...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;