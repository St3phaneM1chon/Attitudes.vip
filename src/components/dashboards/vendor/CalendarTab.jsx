/**
 * CalendarTab - Calendrier synchronisé pour les vendors
 * Gestion des disponibilités, réservations et événements
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { Calendar } from '../../calendar/Calendar';
import { EventDetailsModal } from '../../calendar/EventDetailsModal';
import { AvailabilityModal } from '../../calendar/AvailabilityModal';
import { formatDate, formatTime } from '../../../utils/format';

export default function CalendarTab({ vendor }) {
  const { supabase } = useSupabase();
  const { subscribe, send } = useWebSocket();
  
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  
  // Vue calendrier
  const [view, setView] = useState('month'); // month, week, day, list
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filtres
  const [filters, setFilters] = useState({
    showBookings: true,
    showAvailability: true,
    showBlocked: true,
    showTentative: true
  });
  
  // Synchronisation multi-vendors
  const [syncedVendors, setSyncedVendors] = useState([]);
  const [showSyncSettings, setShowSyncSettings] = useState(false);

  useEffect(() => {
    loadCalendarData();
    loadSyncedVendors();
    
    // S'abonner aux mises à jour temps réel
    const unsubscribe = subscribe(`vendor:${vendor.id}:calendar`, (message) => {
      if (message.type === 'event_update') {
        handleEventUpdate(message.data);
      } else if (message.type === 'availability_update') {
        handleAvailabilityUpdate(message.data);
      } else if (message.type === 'sync_update') {
        handleSyncUpdate(message.data);
      }
    });
    
    return () => unsubscribe();
  }, [vendor.id]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      
      // Charger en parallèle
      const [eventsData, availabilityData] = await Promise.all([
        loadEvents(),
        loadAvailability()
      ]);
      
      setEvents(eventsData);
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('vendor_events')
      .select(`
        *,
        booking:bookings(
          id,
          wedding:weddings(name, date, location),
          customer:customers(
            user:users(name, email, phone)
          )
        )
      `)
      .eq('vendor_id', vendor.id)
      .order('start_date');
    
    if (error) throw error;
    
    return data?.map(event => ({
      ...event,
      id: event.id,
      title: event.title || event.booking?.wedding?.name || 'Événement',
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      type: event.event_type,
      status: event.status,
      color: getEventColor(event.event_type, event.status),
      editable: event.event_type !== 'booking' || event.status === 'tentative'
    })) || [];
  };

  const loadAvailability = async () => {
    const { data, error } = await supabase
      .from('vendor_availability')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('date');
    
    if (error) throw error;
    
    return data || [];
  };

  const loadSyncedVendors = async () => {
    const { data, error } = await supabase
      .from('vendor_sync_settings')
      .select(`
        *,
        synced_vendor:vendors(id, business_name, category)
      `)
      .eq('vendor_id', vendor.id)
      .eq('active', true);
    
    if (error) throw error;
    
    setSyncedVendors(data || []);
    
    // Charger les événements des vendors synchronisés
    if (data?.length > 0) {
      loadSyncedEvents(data.map(s => s.synced_vendor_id));
    }
  };

  const loadSyncedEvents = async (vendorIds) => {
    const { data, error } = await supabase
      .from('vendor_events')
      .select('*')
      .in('vendor_id', vendorIds)
      .eq('visibility', 'public');
    
    if (error) throw error;
    
    const syncedEvents = data?.map(event => ({
      ...event,
      id: `synced_${event.id}`,
      title: `[Sync] ${event.title}`,
      start: new Date(event.start_date),
      end: new Date(event.end_date),
      type: 'synced',
      color: '#9CA3AF',
      editable: false,
      opacity: 0.6
    })) || [];
    
    setEvents(prev => {
      const nonSyncedEvents = prev.filter(e => !e.id.toString().startsWith('synced_'));
      return [...nonSyncedEvents, ...syncedEvents];
    });
  };

  const handleEventUpdate = (eventData) => {
    setEvents(prev => {
      const exists = prev.find(e => e.id === eventData.id);
      if (exists) {
        return prev.map(e => e.id === eventData.id ? { ...e, ...eventData } : e);
      } else {
        return [...prev, eventData];
      }
    });
  };

  const handleAvailabilityUpdate = (availabilityData) => {
    setAvailability(prev => {
      const exists = prev.find(a => a.id === availabilityData.id);
      if (exists) {
        return prev.map(a => a.id === availabilityData.id ? { ...a, ...availabilityData } : a);
      } else {
        return [...prev, availabilityData];
      }
    });
  };

  const handleSyncUpdate = (syncData) => {
    if (syncData.action === 'refresh') {
      loadSyncedEvents(syncedVendors.map(s => s.synced_vendor_id));
    }
  };

  const getEventColor = (type, status) => {
    const colors = {
      booking: {
        confirmed: '#10B981',
        tentative: '#F59E0B',
        cancelled: '#EF4444'
      },
      blocked: '#6B7280',
      personal: '#8B5CF6',
      maintenance: '#3B82F6',
      synced: '#9CA3AF'
    };
    
    if (type === 'booking') {
      return colors.booking[status] || colors.booking.tentative;
    }
    
    return colors[type] || '#3B82F6';
  };

  const createEvent = async (eventData) => {
    try {
      const { data, error } = await supabase
        .from('vendor_events')
        .insert({
          vendor_id: vendor.id,
          ...eventData,
          created_by: vendor.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Notifier les autres vendors synchronisés
      send({
        type: 'calendar_update',
        data: {
          action: 'event_created',
          event: data,
          vendor_id: vendor.id
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  const updateEvent = async (eventId, updates) => {
    try {
      const { data, error } = await supabase
        .from('vendor_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();
      
      if (error) throw error;
      
      handleEventUpdate(data);
      
      // Notifier les changements
      send({
        type: 'calendar_update',
        data: {
          action: 'event_updated',
          event: data,
          vendor_id: vendor.id
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      const { error } = await supabase
        .from('vendor_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      setEvents(prev => prev.filter(e => e.id !== eventId));
      
      // Notifier la suppression
      send({
        type: 'calendar_update',
        data: {
          action: 'event_deleted',
          event_id: eventId,
          vendor_id: vendor.id
        }
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  };

  const updateAvailability = async (date, slots) => {
    try {
      const { data, error } = await supabase
        .from('vendor_availability')
        .upsert({
          vendor_id: vendor.id,
          date: date,
          slots: slots,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      handleAvailabilityUpdate(data);
    } catch (error) {
      console.error('Error updating availability:', error);
      throw error;
    }
  };

  const blockDateRange = async (startDate, endDate, reason) => {
    try {
      const { data, error } = await supabase
        .from('vendor_events')
        .insert({
          vendor_id: vendor.id,
          event_type: 'blocked',
          title: reason || 'Indisponible',
          start_date: startDate,
          end_date: endDate,
          all_day: true,
          status: 'confirmed'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      handleEventUpdate(data);
    } catch (error) {
      console.error('Error blocking dates:', error);
      throw error;
    }
  };

  const syncWithVendor = async (vendorId, settings) => {
    try {
      const { data, error } = await supabase
        .from('vendor_sync_settings')
        .upsert({
          vendor_id: vendor.id,
          synced_vendor_id: vendorId,
          ...settings,
          active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Recharger les vendors synchronisés
      loadSyncedVendors();
    } catch (error) {
      console.error('Error syncing with vendor:', error);
      throw error;
    }
  };

  const handleEventClick = (event) => {
    if (!event.id.toString().startsWith('synced_')) {
      setSelectedEvent(event);
    }
  };

  const handleEventDrop = async (event, newStart, newEnd) => {
    if (event.editable) {
      await updateEvent(event.id, {
        start_date: newStart,
        end_date: newEnd
      });
    }
  };

  const handleEventResize = async (event, newStart, newEnd) => {
    if (event.editable) {
      await updateEvent(event.id, {
        start_date: newStart,
        end_date: newEnd
      });
    }
  };

  const handleDateSelect = (start, end) => {
    // Créer un nouvel événement
    const newEvent = {
      title: '',
      start_date: start,
      end_date: end,
      event_type: 'blocked',
      all_day: true
    };
    
    setSelectedEvent(newEvent);
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      if (!filters.showBookings && event.type === 'booking') return false;
      if (!filters.showBlocked && event.type === 'blocked') return false;
      if (!filters.showTentative && event.status === 'tentative') return false;
      if (!filters.showAvailability && event.type === 'available') return false;
      return true;
    });
  };

  const exportCalendar = () => {
    // Exporter en format iCal
    const icalEvents = events.map(event => {
      const start = event.start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const end = event.end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      
      return `BEGIN:VEVENT
UID:${event.id}@attitudes.vip
DTSTART:${start}
DTEND:${end}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}
END:VEVENT`;
    }).join('\n');
    
    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Attitudes.vip//Vendor Calendar//FR
${icalEvents}
END:VCALENDAR`;
    
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendrier-${vendor.businessName}-${new Date().toISOString().split('T')[0]}.ics`;
    a.click();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Navigation calendrier */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn btn-secondary"
            >
              Aujourd'hui
            </button>
            <div className="flex gap-1">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <i className="fas fa-chevron-left" />
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
            <h2 className="text-lg font-semibold">
              {currentDate.toLocaleDateString('fr-FR', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </h2>
          </div>
          
          {/* Vue et actions */}
          <div className="flex items-center gap-2">
            {/* Sélecteur de vue */}
            <div className="btn-group">
              <button
                onClick={() => setView('month')}
                className={`btn btn-sm ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Mois
              </button>
              <button
                onClick={() => setView('week')}
                className={`btn btn-sm ${view === 'week' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Semaine
              </button>
              <button
                onClick={() => setView('day')}
                className={`btn btn-sm ${view === 'day' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Jour
              </button>
              <button
                onClick={() => setView('list')}
                className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
              >
                Liste
              </button>
            </div>
            
            {/* Actions */}
            <button
              onClick={() => setShowAvailabilityModal(true)}
              className="btn btn-secondary"
            >
              <i className="fas fa-clock mr-2" />
              Disponibilités
            </button>
            <button
              onClick={() => setShowSyncSettings(true)}
              className="btn btn-secondary"
            >
              <i className="fas fa-sync mr-2" />
              Synchronisation
            </button>
            <button
              onClick={exportCalendar}
              className="btn btn-secondary"
            >
              <i className="fas fa-download mr-2" />
              Exporter
            </button>
          </div>
        </div>
        
        {/* Filtres */}
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showBookings}
              onChange={(e) => setFilters(prev => ({ ...prev, showBookings: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Réservations</span>
            <span className="ml-2 w-3 h-3 rounded-full bg-green-500" />
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showBlocked}
              onChange={(e) => setFilters(prev => ({ ...prev, showBlocked: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Indisponible</span>
            <span className="ml-2 w-3 h-3 rounded-full bg-gray-500" />
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.showTentative}
              onChange={(e) => setFilters(prev => ({ ...prev, showTentative: e.target.checked }))}
              className="mr-2"
            />
            <span className="text-sm">Provisoire</span>
            <span className="ml-2 w-3 h-3 rounded-full bg-yellow-500" />
          </label>
          
          {syncedVendors.length > 0 && (
            <div className="ml-auto text-sm text-gray-600">
              <i className="fas fa-sync mr-1" />
              {syncedVendors.length} calendrier{syncedVendors.length > 1 ? 's' : ''} synchronisé{syncedVendors.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Calendrier */}
      <div className="bg-white rounded-lg shadow p-4">
        <Calendar
          events={getFilteredEvents()}
          view={view}
          date={currentDate}
          onEventClick={handleEventClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          onSelectSlot={handleDateSelect}
          onNavigate={setCurrentDate}
          style={{ height: 600 }}
        />
      </div>

      {/* Vue liste (si sélectionnée) */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Événements à venir</h3>
          </div>
          <div className="divide-y">
            {getFilteredEvents()
              .filter(e => e.start >= new Date())
              .sort((a, b) => a.start - b.start)
              .slice(0, 20)
              .map(event => (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: event.color }}
                        />
                        <h4 className="font-medium">{event.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(event.start, 'full')} • {formatTime(event.start)} - {formatTime(event.end)}
                      </p>
                      {event.booking && (
                        <p className="text-sm text-gray-500 mt-1">
                          <i className="fas fa-user mr-1" />
                          {event.booking.customer?.user?.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {event.status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          event.status === 'tentative' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal détails événement */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          vendor={vendor}
          onSave={async (eventData) => {
            if (selectedEvent.id) {
              await updateEvent(selectedEvent.id, eventData);
            } else {
              await createEvent(eventData);
            }
            setSelectedEvent(null);
          }}
          onDelete={async () => {
            if (selectedEvent.id && window.confirm('Supprimer cet événement ?')) {
              await deleteEvent(selectedEvent.id);
              setSelectedEvent(null);
            }
          }}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* Modal disponibilités */}
      {showAvailabilityModal && (
        <AvailabilityModal
          vendor={vendor}
          availability={availability}
          onUpdate={updateAvailability}
          onBlockDates={blockDateRange}
          onClose={() => setShowAvailabilityModal(false)}
        />
      )}

      {/* Modal synchronisation */}
      {showSyncSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Synchronisation des calendriers</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                Synchronisez votre calendrier avec d'autres vendors pour éviter les conflits de disponibilité.
              </p>
              
              {/* Liste des vendors synchronisés */}
              <div className="space-y-4 mb-6">
                <h4 className="font-medium">Calendriers synchronisés</h4>
                {syncedVendors.map(sync => (
                  <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{sync.synced_vendor.business_name}</p>
                      <p className="text-sm text-gray-600">{sync.synced_vendor.category}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await supabase
                          .from('vendor_sync_settings')
                          .update({ active: false })
                          .eq('id', sync.id);
                        loadSyncedVendors();
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <i className="fas fa-unlink" />
                    </button>
                  </div>
                ))}
                
                {syncedVendors.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Aucun calendrier synchronisé
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSyncSettings(false)}
                  className="btn btn-secondary"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}