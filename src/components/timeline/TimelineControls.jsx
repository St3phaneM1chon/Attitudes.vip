/**
 * TimelineControls - Contrôles de la timeline interactive
 * Modes, filtres, échelle, date picker, messaging
 */

import React, { useState } from 'react';
import { formatDate } from '../../utils/format';

export function TimelineControls({
  mode,
  onModeChange,
  selectedDate,
  onDateChange,
  filters,
  onFiltersChange,
  viewScale,
  onViewScaleChange,
  currentEvent,
  nextEvent,
  userRole,
  onSendMessage
}) {
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState('');
  const [messagePriority, setMessagePriority] = useState('normal');
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message, messagePriority);
      setMessage('');
      setShowMessageModal(false);
    }
  };
  
  const handleDateChange = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    onDateChange(newDate);
  };
  
  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  return (
    <>
      <div className="bg-white border-b px-4 py-3">
        {/* Ligne 1 - Mode et navigation date */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            {/* Sélecteur de mode */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => onModeChange('live')}
                className={`px-3 py-1 rounded ${
                  mode === 'live' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-broadcast-tower mr-2" />
                Live
              </button>
              <button
                onClick={() => onModeChange('schedule')}
                className={`px-3 py-1 rounded ${
                  mode === 'schedule' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-calendar mr-2" />
                Planning
              </button>
              <button
                onClick={() => onModeChange('history')}
                className={`px-3 py-1 rounded ${
                  mode === 'history' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <i className="fas fa-history mr-2" />
                Historique
              </button>
            </div>
            
            {/* Navigation date */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDateChange(-1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <i className="fas fa-chevron-left" />
              </button>
              
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => onDateChange(new Date(e.target.value))}
                  className="px-3 py-1 border rounded-lg text-sm"
                />
                {isToday() && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 rounded">
                    Aujourd'hui
                  </span>
                )}
              </div>
              
              <button
                onClick={() => handleDateChange(1)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <i className="fas fa-chevron-right" />
              </button>
              
              {!isToday() && (
                <button
                  onClick={() => onDateChange(new Date())}
                  className="text-sm text-blue-600 hover:text-blue-700 ml-2"
                >
                  Aujourd'hui
                </button>
              )}
            </div>
          </div>
          
          {/* Actions coordinateur */}
          {(userRole === 'coordinator' || userRole === 'cio') && (
            <button
              onClick={() => setShowMessageModal(true)}
              className="btn btn-primary btn-sm"
            >
              <i className="fas fa-bullhorn mr-2" />
              Message à tous
            </button>
          )}
        </div>
        
        {/* Ligne 2 - Filtres et échelle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Filtres */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Afficher :</span>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showCompleted}
                  onChange={(e) => onFiltersChange({ ...filters, showCompleted: e.target.checked })}
                  className="mr-1"
                />
                <span className="text-sm">Terminés</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showUpcoming}
                  onChange={(e) => onFiltersChange({ ...filters, showUpcoming: e.target.checked })}
                  className="mr-1"
                />
                <span className="text-sm">À venir</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.showDelayed}
                  onChange={(e) => onFiltersChange({ ...filters, showDelayed: e.target.checked })}
                  className="mr-1"
                />
                <span className="text-sm text-red-600">Retardés</span>
              </label>
            </div>
            
            {/* Séparateur */}
            <div className="h-6 w-px bg-gray-300" />
            
            {/* Échelle de vue */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Échelle :</span>
              <select
                value={viewScale}
                onChange={(e) => onViewScaleChange(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Heures</option>
                <option value="day">Journée</option>
              </select>
            </div>
          </div>
          
          {/* Statut temps réel */}
          <div className="flex items-center space-x-4 text-sm">
            {currentEvent && (
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
                <span>En cours : {currentEvent.title}</span>
              </div>
            )}
            
            {nextEvent && !currentEvent && (
              <div className="flex items-center text-gray-600">
                <i className="fas fa-clock mr-2" />
                <span>Prochain : {nextEvent.title}</span>
              </div>
            )}
            
            <div className="flex items-center text-gray-500">
              <i className="fas fa-calendar-check mr-2" />
              <span>{filters.categories.length || 'Toutes'} catégories</span>
            </div>
          </div>
        </div>
        
        {/* Ligne 3 - Catégories (si des filtres sont disponibles) */}
        {filters.categories && filters.categories.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Catégories :</span>
              <div className="flex flex-wrap gap-2">
                {['ceremony', 'reception', 'photo', 'music', 'catering', 'other'].map(category => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, category]
                          : filters.categories.filter(c => c !== category);
                        onFiltersChange({ ...filters, categories: newCategories });
                      }}
                      className="mr-1"
                    />
                    <span className="text-sm capitalize">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal message coordinateur */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              <i className="fas fa-bullhorn text-blue-600 mr-2" />
              Envoyer un message à tous
            </h3>
            
            <form onSubmit={handleSendMessage}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Tapez votre message ici..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorité
                </label>
                <select
                  value={messagePriority}
                  onChange={(e) => setMessagePriority(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <i className="fas fa-paper-plane mr-2" />
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}