/**
 * RSVPTab - Système RSVP avancé pour les invités
 * Gestion des présences, régimes alimentaires, accompagnants
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { formatDate } from '../../../utils/format';

export default function RSVPTab({ invite, wedding, onRsvpUpdate }) {
  const { supabase } = useSupabase();
  
  const [formData, setFormData] = useState({
    attendance: invite.rsvp_status || '',
    guest_count: invite.guest_count || 1,
    plus_one_name: invite.plus_one_name || '',
    dietary_restrictions: invite.dietary_restrictions || [],
    meal_choice: invite.meal_choice || '',
    attending_events: invite.attending_events || [],
    accommodation_needed: invite.accommodation_needed || false,
    transport_needed: invite.transport_needed || false,
    special_requests: invite.special_requests || '',
    children_count: invite.children_count || 0,
    children_info: invite.children_info || []
  });
  
  const [events, setEvents] = useState([]);
  const [mealOptions, setMealOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Options de régimes alimentaires
  const dietaryOptions = [
    { value: 'vegetarian', label: 'Végétarien', icon: '🥗' },
    { value: 'vegan', label: 'Végétalien', icon: '🌱' },
    { value: 'gluten_free', label: 'Sans gluten', icon: '🌾' },
    { value: 'halal', label: 'Halal', icon: '🕌' },
    { value: 'kosher', label: 'Casher', icon: '✡️' },
    { value: 'allergies', label: 'Allergies (préciser)', icon: '⚠️' },
    { value: 'other', label: 'Autre (préciser)', icon: '📝' }
  ];

  useEffect(() => {
    loadRsvpData();
  }, [wedding.id]);

  const loadRsvpData = async () => {
    try {
      setLoading(true);
      
      // Charger les événements du mariage
      const { data: eventsData } = await supabase
        .from('wedding_events')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('requires_rsvp', true)
        .order('start_time');
      
      setEvents(eventsData || []);
      
      // Charger les options de repas
      const { data: mealsData } = await supabase
        .from('meal_options')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('active', true);
      
      setMealOptions(mealsData || []);
    } catch (error) {
      console.error('Error loading RSVP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.attendance) {
      alert('Veuillez indiquer votre présence');
      return;
    }
    
    try {
      setSaving(true);
      
      // Préparer les données
      const rsvpData = {
        rsvp_status: formData.attendance,
        rsvp_date: new Date(),
        guest_count: formData.attendance === 'confirmed' ? formData.guest_count : 0,
        plus_one_name: formData.plus_one_name,
        dietary_restrictions: formData.dietary_restrictions,
        meal_choice: formData.meal_choice,
        attending_events: formData.attendance === 'confirmed' ? formData.attending_events : [],
        accommodation_needed: formData.accommodation_needed,
        transport_needed: formData.transport_needed,
        special_requests: formData.special_requests,
        children_count: formData.children_count,
        children_info: formData.children_info,
        updated_at: new Date()
      };
      
      // Mettre à jour l'invitation
      const { error } = await supabase
        .from('invites')
        .update(rsvpData)
        .eq('id', invite.id);
      
      if (error) throw error;
      
      // Enregistrer les détails des événements
      if (formData.attendance === 'confirmed' && formData.attending_events.length > 0) {
        const eventRsvps = formData.attending_events.map(eventId => ({
          invite_id: invite.id,
          event_id: eventId,
          guest_count: formData.guest_count,
          created_at: new Date()
        }));
        
        await supabase
          .from('event_rsvps')
          .upsert(eventRsvps, { onConflict: 'invite_id,event_id' });
      }
      
      onRsvpUpdate(formData.attendance);
      setShowConfirmation(true);
      
      // Envoyer une notification aux mariés
      await supabase
        .from('notifications')
        .insert({
          wedding_id: wedding.id,
          type: 'rsvp_update',
          title: `RSVP mis à jour`,
          message: `${invite.guest_name} a ${formData.attendance === 'confirmed' ? 'confirmé sa présence' : 'décliné l\'invitation'}`,
          data: { invite_id: invite.id }
        });
      
    } catch (error) {
      console.error('Error saving RSVP:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDietaryChange = (value) => {
    setFormData(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(value)
        ? prev.dietary_restrictions.filter(d => d !== value)
        : [...prev.dietary_restrictions, value]
    }));
  };

  const handleEventToggle = (eventId) => {
    setFormData(prev => ({
      ...prev,
      attending_events: prev.attending_events.includes(eventId)
        ? prev.attending_events.filter(e => e !== eventId)
        : [...prev.attending_events, eventId]
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children_count: prev.children_count + 1,
      children_info: [...prev.children_info, { name: '', age: '', meal_needed: true }]
    }));
  };

  const updateChild = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      children_info: prev.children_info.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const removeChild = (index) => {
    setFormData(prev => ({
      ...prev,
      children_count: prev.children_count - 1,
      children_info: prev.children_info.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
          <i className="fas fa-check text-4xl text-green-600" />
        </div>
        <h2 className="text-3xl font-semibold mb-4">Merci pour votre réponse !</h2>
        <p className="text-lg text-gray-700 mb-8">
          {formData.attendance === 'confirmed'
            ? 'Nous avons hâte de célébrer avec vous !'
            : 'Nous regrettons que vous ne puissiez pas être présent(e).'}
        </p>
        <button
          onClick={() => setShowConfirmation(false)}
          className="btn btn-primary"
        >
          Modifier ma réponse
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold mb-6">Confirmez votre présence</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Présence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Serez-vous présent(e) ?
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="attendance"
                  value="confirmed"
                  checked={formData.attendance === 'confirmed'}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendance: e.target.value }))}
                  className="mr-3"
                />
                <div className="flex-grow">
                  <p className="font-medium">Oui, je serai présent(e)</p>
                  <p className="text-sm text-gray-600">J'ai hâte de célébrer avec vous !</p>
                </div>
                <i className="fas fa-check-circle text-2xl text-green-500" />
              </label>
              
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="attendance"
                  value="declined"
                  checked={formData.attendance === 'declined'}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendance: e.target.value }))}
                  className="mr-3"
                />
                <div className="flex-grow">
                  <p className="font-medium">Non, je ne pourrai pas venir</p>
                  <p className="text-sm text-gray-600">Je serai avec vous par la pensée</p>
                </div>
                <i className="fas fa-times-circle text-2xl text-red-500" />
              </label>
            </div>
          </div>

          {formData.attendance === 'confirmed' && (
            <>
              {/* Nombre d'invités */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de personnes
                </label>
                <select
                  value={formData.guest_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_count: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="1">1 personne (moi uniquement)</option>
                  <option value="2">2 personnes</option>
                  {invite.max_guests > 2 && (
                    <>
                      <option value="3">3 personnes</option>
                      <option value="4">4 personnes</option>
                    </>
                  )}
                </select>
              </div>

              {/* Nom de l'accompagnant */}
              {formData.guest_count > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de votre accompagnant(e)
                  </label>
                  <input
                    type="text"
                    value={formData.plus_one_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, plus_one_name: e.target.value }))}
                    placeholder="Prénom et nom"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              )}

              {/* Événements */}
              {events.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    À quels événements participerez-vous ?
                  </label>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <label key={event.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.attending_events.includes(event.id)}
                          onChange={() => handleEventToggle(event.id)}
                          className="mr-3"
                        />
                        <div className="flex-grow">
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(event.start_time, 'full')} • {event.location}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Choix du repas */}
              {mealOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Choix du menu
                  </label>
                  <div className="space-y-2">
                    {mealOptions.map((meal) => (
                      <label key={meal.id} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="meal"
                          value={meal.id}
                          checked={formData.meal_choice === meal.id}
                          onChange={(e) => setFormData(prev => ({ ...prev, meal_choice: e.target.value }))}
                          className="mt-1 mr-3"
                        />
                        <div>
                          <p className="font-medium">{meal.name}</p>
                          <p className="text-sm text-gray-600">{meal.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Régimes alimentaires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Régimes alimentaires ou allergies
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dietaryOptions.map((option) => (
                    <label key={option.value} className="flex items-center p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.dietary_restrictions.includes(option.value)}
                        onChange={() => handleDietaryChange(option.value)}
                        className="mr-2"
                      />
                      <span className="mr-2">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Enfants */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Enfants
                  </label>
                  <button
                    type="button"
                    onClick={addChild}
                    className="text-sm text-pink-600 hover:text-pink-700"
                  >
                    <i className="fas fa-plus mr-1" />
                    Ajouter un enfant
                  </button>
                </div>
                
                {formData.children_info.map((child, index) => (
                  <div key={index} className="p-4 border rounded-lg mb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-grow space-y-2">
                        <input
                          type="text"
                          value={child.name}
                          onChange={(e) => updateChild(index, 'name', e.target.value)}
                          placeholder="Prénom de l'enfant"
                          className="w-full px-3 py-1 border rounded"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={child.age}
                            onChange={(e) => updateChild(index, 'age', e.target.value)}
                            placeholder="Âge"
                            className="w-20 px-3 py-1 border rounded"
                            min="0"
                            max="18"
                          />
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={child.meal_needed}
                              onChange={(e) => updateChild(index, 'meal_needed', e.target.checked)}
                              className="mr-2"
                            />
                            <span className="text-sm">Repas nécessaire</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChild(index)}
                        className="ml-2 text-red-600 hover:text-red-700"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Services additionnels */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Services
                </label>
                
                {wedding.accommodation_provided && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.accommodation_needed}
                      onChange={(e) => setFormData(prev => ({ ...prev, accommodation_needed: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">J'aurais besoin d'un hébergement</span>
                  </label>
                )}
                
                {wedding.transport_provided && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.transport_needed}
                      onChange={(e) => setFormData(prev => ({ ...prev, transport_needed: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">J'utiliserai le transport organisé</span>
                  </label>
                )}
              </div>

              {/* Demandes spéciales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demandes particulières ou commentaires
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                  rows="3"
                  placeholder="Faites-nous part de vos besoins spécifiques..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </>
          )}

          {/* Boutons */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="submit"
              disabled={saving || !formData.attendance}
              className="btn btn-primary"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2" />
                  Confirmer ma réponse
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Informations complémentaires */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold mb-3">Informations importantes</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <i className="fas fa-info-circle text-pink-500 mt-0.5 mr-2" />
            <span>Merci de confirmer votre présence avant le {formatDate(wedding.rsvp_deadline)}.</span>
          </li>
          <li className="flex items-start">
            <i className="fas fa-utensils text-pink-500 mt-0.5 mr-2" />
            <span>N'oubliez pas d'indiquer vos restrictions alimentaires pour que nous puissions adapter le menu.</span>
          </li>
          <li className="flex items-start">
            <i className="fas fa-child text-pink-500 mt-0.5 mr-2" />
            <span>Les enfants sont les bienvenus ! Merci de nous indiquer leur présence et leur âge.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}