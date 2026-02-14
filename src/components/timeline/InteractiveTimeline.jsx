/**
 * InteractiveTimeline - Timeline interactif temps réel pour le jour du mariage
 * Gestion des événements, notifications et coordination en temps réel
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { useWebSocket } from '../../hooks/useWebSocketOptimized';
import { formatTime, calculateDuration } from '../../utils/format';
import { TimelineEvent } from './TimelineEvent';
import { TimelineControls } from './TimelineControls';
import { CountdownTimer } from '../common/CountdownTimer';

export function InteractiveTimeline({ weddingId, userRole, currentUserId }) {
  const { supabase } = useSupabase();
  const { subscribe, send } = useWebSocket();
  
  // État
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvent, setNextEvent] = useState(null);
  const [timelineMode, setTimelineMode] = useState('live'); // live, schedule, history
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  
  // Références
  const timelineRef = useRef(null);
  const autoScrollRef = useRef(true);
  const updateIntervalRef = useRef(null);
  
  // Filtres et vue
  const [filters, setFilters] = useState({
    showCompleted: true,
    showUpcoming: true,
    showDelayed: true,
    categories: []
  });
  
  const [viewScale, setViewScale] = useState('hours'); // minutes, hours, day
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  useEffect(() => {
    loadTimelineData();
    setupRealtimeSubscriptions();
    startTimeUpdates();
    
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [weddingId, selectedDate]);

  const loadTimelineData = async () => {
    try {
      setLoading(true);
      
      // Charger les événements de la timeline
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data: eventsData, error } = await supabase
        .from('timeline_events')
        .select(`
          *,
          assigned_vendor:vendors(id, business_name, category),
          coordinator:users(id, name, avatar_url),
          checklist:event_checklists(*)
        `)
        .eq('wedding_id', weddingId)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time');
      
      if (error) throw error;
      
      // Enrichir les événements avec des métadonnées
      const enrichedEvents = eventsData.map(event => ({
        ...event,
        duration: calculateDuration(event.start_time, event.end_time),
        isLive: isEventLive(event),
        isPast: new Date(event.end_time) < new Date(),
        isUpcoming: new Date(event.start_time) > new Date(),
        progress: calculateEventProgress(event)
      }));
      
      setEvents(enrichedEvents);
      updateCurrentAndNextEvents(enrichedEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // S'abonner aux mises à jour de la timeline
    const unsubscribe = subscribe(`wedding:${weddingId}:timeline`, (message) => {
      switch (message.type) {
        case 'event_started':
          handleEventStarted(message.data);
          break;
        case 'event_completed':
          handleEventCompleted(message.data);
          break;
        case 'event_delayed':
          handleEventDelayed(message.data);
          break;
        case 'event_updated':
          handleEventUpdated(message.data);
          break;
        case 'checklist_update':
          handleChecklistUpdate(message.data);
          break;
        case 'coordinator_message':
          handleCoordinatorMessage(message.data);
          break;
      }
    });
    
    return () => unsubscribe();
  };

  const startTimeUpdates = () => {
    // Mettre à jour l'heure actuelle et les statuts toutes les 30 secondes
    updateIntervalRef.current = setInterval(() => {
      updateEventStatuses();
      
      if (timelineMode === 'live' && autoScrollRef.current) {
        scrollToCurrentTime();
      }
    }, 30000);
  };

  const isEventLive = (event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return now >= start && now <= end;
  };

  const calculateEventProgress = (event) => {
    if (event.status === 'completed') return 100;
    if (event.status === 'not_started') return 0;
    
    const now = new Date();
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  };

  const updateEventStatuses = () => {
    setEvents(prevEvents => {
      const updated = prevEvents.map(event => ({
        ...event,
        isLive: isEventLive(event),
        isPast: new Date(event.end_time) < new Date(),
        isUpcoming: new Date(event.start_time) > new Date(),
        progress: calculateEventProgress(event)
      }));
      
      updateCurrentAndNextEvents(updated);
      return updated;
    });
  };

  const updateCurrentAndNextEvents = (eventsList) => {
    const now = new Date();
    
    // Trouver l'événement actuel
    const current = eventsList.find(e => isEventLive(e));
    setCurrentEvent(current);
    
    // Trouver le prochain événement
    const upcoming = eventsList
      .filter(e => new Date(e.start_time) > now)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
    setNextEvent(upcoming);
  };

  const handleEventStarted = (eventData) => {
    setEvents(prev => prev.map(e => 
      e.id === eventData.id 
        ? { ...e, status: 'in_progress', actual_start_time: eventData.started_at }
        : e
    ));
    
    // Notification
    if (userRole === 'coordinator' || userRole === 'vendor') {
      showNotification(`${eventData.title} a commencé`, 'info');
    }
  };

  const handleEventCompleted = (eventData) => {
    setEvents(prev => prev.map(e => 
      e.id === eventData.id 
        ? { ...e, status: 'completed', actual_end_time: eventData.completed_at }
        : e
    ));
  };

  const handleEventDelayed = (eventData) => {
    setEvents(prev => prev.map(e => 
      e.id === eventData.id 
        ? { 
            ...e, 
            status: 'delayed',
            delay_minutes: eventData.delay_minutes,
            delay_reason: eventData.reason
          }
        : e
    ));
    
    // Ajuster les événements suivants si nécessaire
    if (eventData.cascade_delay) {
      cascadeDelay(eventData.id, eventData.delay_minutes);
    }
  };

  const handleEventUpdated = (eventData) => {
    setEvents(prev => prev.map(e => 
      e.id === eventData.id ? { ...e, ...eventData } : e
    ));
  };

  const handleChecklistUpdate = ({ eventId, checklistItem }) => {
    setEvents(prev => prev.map(e => {
      if (e.id === eventId) {
        const updatedChecklist = e.checklist.map(item =>
          item.id === checklistItem.id ? checklistItem : item
        );
        return { ...e, checklist: updatedChecklist };
      }
      return e;
    }));
  };

  const handleCoordinatorMessage = (message) => {
    // Afficher le message du coordinateur
    showNotification(message.text, 'message', message.priority);
  };

  const cascadeDelay = (eventId, delayMinutes) => {
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return;
    
    // Décaler tous les événements suivants
    const updatedEvents = [...events];
    for (let i = eventIndex + 1; i < updatedEvents.length; i++) {
      const event = updatedEvents[i];
      const newStartTime = new Date(event.start_time);
      newStartTime.setMinutes(newStartTime.getMinutes() + delayMinutes);
      
      const newEndTime = new Date(event.end_time);
      newEndTime.setMinutes(newEndTime.getMinutes() + delayMinutes);
      
      updatedEvents[i] = {
        ...event,
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
        cascaded_delay: true
      };
    }
    
    setEvents(updatedEvents);
  };

  const scrollToCurrentTime = () => {
    if (!timelineRef.current) return;
    
    const currentTimeElement = timelineRef.current.querySelector('.current-time-marker');
    if (currentTimeElement) {
      currentTimeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleEventExpanded = (eventId) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const updateEventStatus = async (eventId, newStatus) => {
    try {
      const event = events.find(e => e.id === eventId);
      const updateData = {
        status: newStatus,
        updated_at: new Date()
      };
      
      if (newStatus === 'in_progress') {
        updateData.actual_start_time = new Date();
      } else if (newStatus === 'completed') {
        updateData.actual_end_time = new Date();
      }
      
      const { error } = await supabase
        .from('timeline_events')
        .update(updateData)
        .eq('id', eventId);
      
      if (error) throw error;
      
      // Envoyer la mise à jour en temps réel
      send({
        type: `event_${newStatus === 'in_progress' ? 'started' : newStatus}`,
        data: {
          id: eventId,
          ...updateData,
          title: event.title
        }
      });
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  };

  const reportDelay = async (eventId, delayMinutes, reason, cascadeDelay = false) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({
          status: 'delayed',
          delay_minutes: delayMinutes,
          delay_reason: reason,
          updated_at: new Date()
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      // Envoyer la notification de retard
      send({
        type: 'event_delayed',
        data: {
          id: eventId,
          delay_minutes: delayMinutes,
          reason,
          cascade_delay: cascadeDelay
        }
      });
    } catch (error) {
      console.error('Error reporting delay:', error);
    }
  };

  const sendCoordinatorMessage = async (message, priority = 'normal') => {
    try {
      // Envoyer le message à tous les participants
      send({
        type: 'coordinator_message',
        data: {
          text: message,
          priority,
          sender_id: currentUserId,
          timestamp: new Date()
        }
      });
      
      // Enregistrer dans la base
      await supabase
        .from('timeline_messages')
        .insert({
          wedding_id: weddingId,
          sender_id: currentUserId,
          message,
          priority,
          created_at: new Date()
        });
    } catch (error) {
      console.error('Error sending coordinator message:', error);
    }
  };

  const showNotification = (message, type = 'info', priority = 'normal') => {
    // Implémenter le système de notification
    // Peut utiliser un toast, une notification native, etc.
    console.log(`[${type}] ${message}`);
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      if (!filters.showCompleted && event.status === 'completed') return false;
      if (!filters.showUpcoming && event.isUpcoming) return false;
      if (!filters.showDelayed && event.status === 'delayed') return false;
      
      if (filters.categories.length > 0 && !filters.categories.includes(event.category)) {
        return false;
      }
      
      return true;
    });
  };

  const renderTimeScale = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gray-50 border-r">
        {hours.map(hour => (
          <div
            key={hour}
            className="relative border-b"
            style={{ height: viewScale === 'hours' ? '120px' : '60px' }}
          >
            <span className="absolute top-2 left-2 text-sm font-medium text-gray-600">
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderCurrentTimeLine = () => {
    if (timelineMode !== 'live') return null;
    
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const topPosition = (hours * (viewScale === 'hours' ? 120 : 60)) + 
                       (minutes * (viewScale === 'hours' ? 2 : 1));
    
    return (
      <div
        className="current-time-marker absolute left-0 right-0 z-10"
        style={{ top: `${topPosition}px` }}
      >
        <div className="relative">
          <div className="absolute left-20 right-0 h-0.5 bg-red-500" />
          <div className="absolute left-16 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          </div>
          <span className="absolute left-24 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {formatTime(now)}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* En-tête avec contrôles */}
      <TimelineControls
        mode={timelineMode}
        onModeChange={setTimelineMode}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        filters={filters}
        onFiltersChange={setFilters}
        viewScale={viewScale}
        onViewScaleChange={setViewScale}
        currentEvent={currentEvent}
        nextEvent={nextEvent}
        userRole={userRole}
        onSendMessage={sendCoordinatorMessage}
      />

      {/* Timeline principale */}
      <div className="flex-1 relative overflow-auto" ref={timelineRef}>
        <div className="relative min-h-full">
          {/* Échelle de temps */}
          {renderTimeScale()}
          
          {/* Ligne de temps actuelle */}
          {renderCurrentTimeLine()}
          
          {/* Événements */}
          <div className="ml-20 relative">
            {getFilteredEvents().map((event) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isExpanded={expandedEvents.has(event.id)}
                onToggleExpand={() => toggleEventExpanded(event.id)}
                onStatusUpdate={updateEventStatus}
                onReportDelay={reportDelay}
                userRole={userRole}
                viewScale={viewScale}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Barre d'état */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {currentEvent && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2" />
                <span className="text-sm font-medium">
                  En cours : {currentEvent.title}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  ({currentEvent.progress}% complété)
                </span>
              </div>
            )}
            
            {nextEvent && (
              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-clock mr-2" />
                Prochain : {nextEvent.title} dans{' '}
                <CountdownTimer
                  targetDate={nextEvent.start_time}
                  format="minutes"
                  className="ml-1 font-medium"
                />
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                autoScrollRef.current = !autoScrollRef.current;
              }}
              className={`text-sm ${
                autoScrollRef.current ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              <i className="fas fa-arrows-alt-v mr-1" />
              Auto-scroll {autoScrollRef.current ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={scrollToCurrentTime}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              <i className="fas fa-crosshairs mr-1" />
              Maintenant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}