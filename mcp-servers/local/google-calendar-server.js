const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Configuration Google Calendar simulée
const calendarConfig = {
  clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
};

// Base de données simulée
const calendars = [];
const events = [];
const reminders = [];

app.use(express.json({ limit: '10mb' }));

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'google-calendar-mcp',
    configured: !!(calendarConfig.clientId && calendarConfig.clientSecret),
    capabilities: ['events', 'calendars', 'reminders', 'availability']
  });
});

// MCP Protocol endpoint principal
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;
  let result = {};
  
  try {
    switch(method) {
      // Création d'événement (mariage, réunion vendors, etc.)
      case 'events.create':
        const event = {
          id: 'evt_' + Math.random().toString(36).substr(2, 9),
          calendarId: params.calendarId || 'primary',
          summary: params.summary,
          description: params.description,
          location: params.location,
          start: params.start,
          end: params.end,
          attendees: params.attendees || [],
          reminders: params.reminders || {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 }, // 24h avant
              { method: 'popup', minutes: 60 }     // 1h avant
            ]
          },
          colorId: params.colorId || '1',
          visibility: params.visibility || 'default',
          status: 'confirmed',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        };
        events.push(event);
        result = event;
        console.log('Événement créé:', event.summary);
        break;
        
      // Mise à jour d'événement
      case 'events.update':
        const eventIndex = events.findIndex(e => e.id === params.eventId);
        if (eventIndex >= 0) {
          events[eventIndex] = { ...events[eventIndex], ...params.updates, updated: new Date().toISOString() };
          result = events[eventIndex];
        } else {
          result = { error: 'Event not found' };
        }
        break;
        
      // Liste des événements
      case 'events.list':
        const filteredEvents = events.filter(e => {
          if (params.calendarId && e.calendarId !== params.calendarId) return false;
          if (params.timeMin && new Date(e.start.dateTime || e.start.date) < new Date(params.timeMin)) return false;
          if (params.timeMax && new Date(e.start.dateTime || e.start.date) > new Date(params.timeMax)) return false;
          return true;
        });
        result = {
          kind: 'calendar#events',
          items: filteredEvents,
          summary: params.calendarId || 'primary',
          timeZone: 'Europe/Paris'
        };
        break;
        
      // Vérification de disponibilité
      case 'freebusy.query':
        const busySlots = events
          .filter(e => params.items.some(item => item.id === e.calendarId))
          .map(e => ({
            start: e.start.dateTime || e.start.date,
            end: e.end.dateTime || e.end.date
          }));
        result = {
          kind: 'calendar#freeBusy',
          timeMin: params.timeMin,
          timeMax: params.timeMax,
          calendars: params.items.reduce((acc, item) => {
            acc[item.id] = { busy: busySlots };
            return acc;
          }, {})
        };
        break;
        
      // Création de calendrier (par couple, vendor, etc.)
      case 'calendars.insert':
        const calendar = {
          id: 'cal_' + Math.random().toString(36).substr(2, 9),
          summary: params.summary,
          description: params.description,
          timeZone: params.timeZone || 'Europe/Paris',
          colorId: params.colorId,
          backgroundColor: params.backgroundColor || '#9FE1E7',
          foregroundColor: params.foregroundColor || '#000000',
          selected: true,
          accessRole: 'owner',
          created: new Date().toISOString()
        };
        calendars.push(calendar);
        result = calendar;
        break;
        
      // Envoi d'invitations
      case 'events.sendInvites':
        const inviteEvent = events.find(e => e.id === params.eventId);
        if (inviteEvent) {
          result = {
            eventId: params.eventId,
            sent: inviteEvent.attendees.length,
            attendees: inviteEvent.attendees.map(a => ({
              ...a,
              responseStatus: 'needsAction',
              inviteSent: true
            }))
          };
        }
        break;
        
      // Ajout de rappels personnalisés
      case 'reminders.create':
        const reminder = {
          id: 'rem_' + Math.random().toString(36).substr(2, 9),
          eventId: params.eventId,
          method: params.method || 'email',
          minutes: params.minutes,
          message: params.message,
          created: new Date().toISOString()
        };
        reminders.push(reminder);
        result = reminder;
        break;
        
      // Timeline du mariage
      case 'wedding.timeline':
        const weddingEvents = [
          { time: '09:00', title: 'Préparation mariée', duration: 120 },
          { time: '11:00', title: 'Préparation marié', duration: 90 },
          { time: '14:00', title: 'Photos couple', duration: 60 },
          { time: '15:30', title: 'Cérémonie', duration: 45 },
          { time: '16:30', title: 'Cocktail', duration: 90 },
          { time: '19:00', title: 'Dîner', duration: 180 },
          { time: '22:00', title: 'Soirée dansante', duration: 240 }
        ];
        result = {
          date: params.date,
          timeline: weddingEvents,
          totalDuration: '15 heures'
        };
        break;
        
      // Configuration
      case 'config.info':
        result = {
          configured: !!(calendarConfig.clientId && calendarConfig.clientSecret),
          calendarsCount: calendars.length,
          eventsCount: events.length,
          features: ['events', 'calendars', 'reminders', 'freebusy', 'timeline']
        };
        break;
        
      default:
        result = { error: `Unknown method: ${method}` };
    }
    
    res.json({ 
      jsonrpc: '2.0', 
      result,
      id: id || 1 
    });
    
  } catch (error) {
    res.json({ 
      jsonrpc: '2.0', 
      error: {
        code: -32603,
        message: error.message
      },
      id: id || 1 
    });
  }
});

// Webhook endpoint pour les notifications
app.post('/webhooks/calendar', (req, res) => {
  console.log('Webhook Calendar reçu:', req.body);
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Google Calendar MCP Server listening on port ${port}`);
});