/**
 * OverviewTab - Vue d'ensemble pour les invités
 * Message de bienvenue, compte à rebours, actions rapides
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { formatDate } from '../../../utils/format';
import { CountdownTimer } from '../../common/CountdownTimer';

export default function OverviewTab({ invite, wedding, onRsvpUpdate }) {
  const { supabase } = useSupabase();
  const [schedule, setSchedule] = useState([]);
  const [quickInfo, setQuickInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, [wedding.id]);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      // Charger le planning principal
      const { data: scheduleData } = await supabase
        .from('wedding_schedule')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('is_public', true)
        .order('start_time');
      
      setSchedule(scheduleData || []);
      
      // Charger les infos rapides
      const { data: venueData } = await supabase
        .from('wedding_venues')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('is_main', true)
        .single();
      
      setQuickInfo({
        venue: venueData,
        guestCount: wedding.guest_count || 0,
        hasAccommodation: wedding.accommodation_provided,
        hasTransport: wedding.transport_provided,
        dressCode: wedding.dress_code
      });
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRsvp = async (status) => {
    try {
      const { error } = await supabase
        .from('invites')
        .update({
          rsvp_status: status,
          rsvp_date: new Date(),
          updated_at: new Date()
        })
        .eq('id', invite.id);
      
      if (error) throw error;
      
      onRsvpUpdate(status);
      alert(status === 'confirmed' ? 'Présence confirmée !' : 'Absence enregistrée');
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Message de bienvenue */}
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <h2 className="text-3xl font-elegant mb-4">
          Bienvenue {invite.guest_name} !
        </h2>
        {wedding.welcome_message ? (
          <div 
            className="prose prose-lg mx-auto text-gray-700"
            dangerouslySetInnerHTML={{ __html: wedding.welcome_message }}
          />
        ) : (
          <p className="text-lg text-gray-700">
            Nous sommes ravis de vous compter parmi nos invités pour célébrer notre union.
            Cette page contient toutes les informations dont vous aurez besoin pour notre grand jour.
          </p>
        )}
      </div>

      {/* Compte à rebours */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h3 className="text-2xl font-semibold text-center mb-6">
          Le grand jour approche !
        </h3>
        <CountdownTimer targetDate={wedding.date} />
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSVP rapide */}
        {!invite.rsvp_status && (
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="font-semibold mb-4">Confirmez votre présence</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickRsvp('confirmed')}
                className="w-full btn btn-success"
              >
                <i className="fas fa-check mr-2" />
                Je serai présent(e)
              </button>
              <button
                onClick={() => handleQuickRsvp('declined')}
                className="w-full btn btn-secondary"
              >
                <i className="fas fa-times mr-2" />
                Je ne pourrai pas venir
              </button>
            </div>
          </div>
        )}

        {/* Lieu */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold mb-4">
            <i className="fas fa-map-marker-alt text-pink-500 mr-2" />
            Lieu de la cérémonie
          </h4>
          {quickInfo.venue && (
            <>
              <p className="font-medium">{quickInfo.venue.name}</p>
              <p className="text-sm text-gray-600">{quickInfo.venue.address}</p>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(quickInfo.venue.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
              >
                Voir sur la carte →
              </a>
            </>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold mb-4">
            <i className="fas fa-phone text-pink-500 mr-2" />
            Contact
          </h4>
          <p className="text-sm text-gray-600 mb-2">
            Des questions ? Contactez-nous :
          </p>
          {wedding.contact_email && (
            <a
              href={`mailto:${wedding.contact_email}`}
              className="text-blue-600 hover:text-blue-700 text-sm block"
            >
              {wedding.contact_email}
            </a>
          )}
          {wedding.contact_phone && (
            <a
              href={`tel:${wedding.contact_phone}`}
              className="text-blue-600 hover:text-blue-700 text-sm block mt-1"
            >
              {wedding.contact_phone}
            </a>
          )}
        </div>

        {/* Infos pratiques */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold mb-4">
            <i className="fas fa-info-circle text-pink-500 mr-2" />
            Infos pratiques
          </h4>
          <div className="space-y-2 text-sm">
            {quickInfo.dressCode && (
              <p>
                <span className="font-medium">Dress code :</span> {quickInfo.dressCode}
              </p>
            )}
            {quickInfo.hasAccommodation && (
              <p className="text-green-600">
                <i className="fas fa-bed mr-1" />
                Hébergement disponible
              </p>
            )}
            {quickInfo.hasTransport && (
              <p className="text-green-600">
                <i className="fas fa-bus mr-1" />
                Transport organisé
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Planning de la journée */}
      {schedule.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-6">
            <i className="fas fa-calendar-alt text-pink-500 mr-2" />
            Programme de la journée
          </h3>
          <div className="space-y-4">
            {schedule.map((event) => (
              <div key={event.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-20 text-right">
                  <p className="font-semibold text-pink-600">
                    {new Date(event.start_time).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-3 h-3 bg-pink-500 rounded-full mt-1" />
                </div>
                <div className="flex-grow">
                  <h4 className="font-semibold">{event.title}</h4>
                  {event.description && (
                    <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                  )}
                  {event.location && event.location !== quickInfo.venue?.name && (
                    <p className="text-gray-500 text-sm mt-1">
                      <i className="fas fa-map-marker-alt mr-1" />
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carte d'accès rapide */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Accès rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="?tab=rsvp"
            className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <i className="fas fa-check-circle text-3xl text-green-500 mb-2" />
            <p className="font-medium">RSVP</p>
          </a>
          <a
            href="?tab=event-info"
            className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <i className="fas fa-info-circle text-3xl text-blue-500 mb-2" />
            <p className="font-medium">Informations</p>
          </a>
          <a
            href="?tab=photos"
            className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <i className="fas fa-camera text-3xl text-purple-500 mb-2" />
            <p className="font-medium">Photos</p>
          </a>
          <a
            href="?tab=registry"
            className="text-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
          >
            <i className="fas fa-gift text-3xl text-pink-500 mb-2" />
            <p className="font-medium">Liste de mariage</p>
          </a>
        </div>
      </div>

      {/* Widget météo (si proche de la date) */}
      {new Date(wedding.date) - new Date() < 7 * 24 * 60 * 60 * 1000 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            <i className="fas fa-cloud-sun text-blue-500 mr-2" />
            Prévisions météo
          </h3>
          <p className="text-gray-600">
            Les prévisions météo seront disponibles 7 jours avant l'événement.
          </p>
        </div>
      )}
    </div>
  );
}