/**
 * TimelineEvent - Composant d'événement individuel dans la timeline
 * Affichage avec progress, actions rapides, checklist
 */

import React, { useState, memo } from 'react';
import { formatTime, formatDuration } from '../../utils/format';

export const TimelineEvent = memo(function TimelineEvent({
  event,
  isExpanded,
  onToggleExpand,
  onStatusUpdate,
  onReportDelay,
  userRole,
  viewScale
}) {
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayForm, setDelayForm] = useState({
    minutes: 15,
    reason: '',
    cascadeDelay: false
  });
  
  // Calculer la position et hauteur basées sur l'échelle
  const getEventStyle = () => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHours = start.getHours() + start.getMinutes() / 60;
    const duration = (end - start) / (1000 * 60 * 60); // en heures
    
    const pixelsPerHour = viewScale === 'hours' ? 120 : 60;
    const top = startHours * pixelsPerHour;
    const height = Math.max(duration * pixelsPerHour, 40); // min 40px
    
    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '40px'
    };
  };
  
  // Déterminer la couleur selon le statut
  const getStatusColor = () => {
    switch (event.status) {
      case 'completed':
        return 'bg-green-100 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 border-blue-300 animate-pulse';
      case 'delayed':
        return 'bg-red-100 border-red-300';
      case 'not_started':
        return event.isUpcoming ? 'bg-gray-100 border-gray-300' : 'bg-yellow-100 border-yellow-300';
      default:
        return 'bg-white border-gray-200';
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    if (window.confirm(`Marquer "${event.title}" comme ${getStatusLabel(newStatus)} ?`)) {
      await onStatusUpdate(event.id, newStatus);
    }
  };
  
  const handleDelaySubmit = async (e) => {
    e.preventDefault();
    await onReportDelay(
      event.id,
      delayForm.minutes,
      delayForm.reason,
      delayForm.cascadeDelay
    );
    setShowDelayModal(false);
    setDelayForm({ minutes: 15, reason: '', cascadeDelay: false });
  };
  
  const getStatusLabel = (status) => {
    const labels = {
      'not_started': 'Non commencé',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'delayed': 'Retardé'
    };
    return labels[status] || status;
  };
  
  const canEditStatus = () => {
    return userRole === 'coordinator' || 
           userRole === 'cio' || 
           (userRole === 'vendor' && event.assigned_vendor?.id === currentUserId);
  };

  return (
    <>
      <div
        className={`absolute left-4 right-4 rounded-lg border-2 shadow-sm transition-all ${getStatusColor()}`}
        style={getEventStyle()}
      >
        <div className="p-3 h-full flex flex-col">
          {/* En-tête */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-grow">
              <h4 className="font-semibold text-sm line-clamp-1">{event.title}</h4>
              <p className="text-xs text-gray-600">
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </p>
            </div>
            
            <button
              onClick={onToggleExpand}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} />
            </button>
          </div>
          
          {/* Barre de progression */}
          {event.status === 'in_progress' && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${event.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{event.progress}% complété</p>
            </div>
          )}
          
          {/* Vendor assigné */}
          {event.assigned_vendor && (
            <div className="flex items-center text-xs text-gray-600 mb-2">
              <i className="fas fa-user-tie mr-1" />
              <span>{event.assigned_vendor.business_name}</span>
            </div>
          )}
          
          {/* Statut et retard */}
          <div className="flex items-center justify-between text-xs">
            <span className={`px-2 py-1 rounded-full ${
              event.status === 'delayed' ? 'bg-red-200 text-red-700' : 'bg-gray-200 text-gray-700'
            }`}>
              {getStatusLabel(event.status)}
              {event.delay_minutes > 0 && ` (-${event.delay_minutes}min)`}
            </span>
            
            {/* Actions rapides */}
            {canEditStatus() && !isExpanded && (
              <div className="flex gap-1">
                {event.status === 'not_started' && (
                  <button
                    onClick={() => handleStatusChange('in_progress')}
                    className="p-1 hover:bg-green-200 rounded"
                    title="Démarrer"
                  >
                    <i className="fas fa-play text-green-600" />
                  </button>
                )}
                {event.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange('completed')}
                    className="p-1 hover:bg-blue-200 rounded"
                    title="Terminer"
                  >
                    <i className="fas fa-check text-blue-600" />
                  </button>
                )}
                {(event.status === 'not_started' || event.status === 'in_progress') && (
                  <button
                    onClick={() => setShowDelayModal(true)}
                    className="p-1 hover:bg-red-200 rounded"
                    title="Signaler un retard"
                  >
                    <i className="fas fa-clock text-red-600" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Contenu étendu */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t space-y-3">
              {/* Description */}
              {event.description && (
                <p className="text-sm text-gray-700">{event.description}</p>
              )}
              
              {/* Checklist */}
              {event.checklist && event.checklist.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-gray-700 mb-1">Checklist</h5>
                  <div className="space-y-1">
                    {event.checklist.map((item) => (
                      <label key={item.id} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => onChecklistUpdate(event.id, item.id, !item.completed)}
                          className="mr-2"
                          disabled={!canEditStatus()}
                        />
                        <span className={item.completed ? 'line-through text-gray-400' : ''}>
                          {item.task}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Coordinateur */}
              {event.coordinator && (
                <div className="flex items-center text-xs text-gray-600">
                  <img
                    src={event.coordinator.avatar_url}
                    alt={event.coordinator.name}
                    className="w-5 h-5 rounded-full mr-2"
                  />
                  <span>Coordonné par {event.coordinator.name}</span>
                </div>
              )}
              
              {/* Actions étendues */}
              {canEditStatus() && (
                <div className="flex gap-2 pt-2">
                  {event.status === 'not_started' && (
                    <button
                      onClick={() => handleStatusChange('in_progress')}
                      className="btn btn-sm btn-success"
                    >
                      <i className="fas fa-play mr-1" />
                      Démarrer
                    </button>
                  )}
                  {event.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      className="btn btn-sm btn-primary"
                    >
                      <i className="fas fa-check mr-1" />
                      Terminer
                    </button>
                  )}
                  <button
                    onClick={() => setShowDelayModal(true)}
                    className="btn btn-sm btn-secondary"
                  >
                    <i className="fas fa-clock mr-1" />
                    Retard
                  </button>
                </div>
              )}
              
              {/* Raison du retard */}
              {event.delay_reason && (
                <div className="bg-red-50 p-2 rounded text-xs">
                  <p className="font-semibold text-red-700">Raison du retard :</p>
                  <p className="text-red-600">{event.delay_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Modal de retard */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Signaler un retard</h3>
            
            <form onSubmit={handleDelaySubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Durée du retard (minutes)
                </label>
                <input
                  type="number"
                  value={delayForm.minutes}
                  onChange={(e) => setDelayForm(prev => ({ ...prev, minutes: parseInt(e.target.value) }))}
                  min="5"
                  step="5"
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Raison du retard
                </label>
                <textarea
                  value={delayForm.reason}
                  onChange={(e) => setDelayForm(prev => ({ ...prev, reason: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Expliquez brièvement la raison..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={delayForm.cascadeDelay}
                    onChange={(e) => setDelayForm(prev => ({ ...prev, cascadeDelay: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Décaler automatiquement les événements suivants
                  </span>
                </label>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDelayModal(false)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                >
                  <i className="fas fa-exclamation-triangle mr-2" />
                  Signaler le retard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});