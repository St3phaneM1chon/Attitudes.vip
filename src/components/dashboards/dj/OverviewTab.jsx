/**
 * OverviewTab - Vue d'ensemble pour le Dashboard DJ
 * Statistiques, événement en cours, actions rapides
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { formatDate, formatTime } from '../../../utils/format';

export default function OverviewTab({ djProfile, currentWedding, stats }) {
  const { supabase } = useSupabase();
  const [currentEvent, setCurrentEvent] = useState(null);
  const [nextEvent, setNextEvent] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentWedding) {
      loadOverviewData();
    }
  }, [currentWedding?.id]);

  const loadOverviewData = async () => {
    try {
      setLoading(true);
      
      // Charger le planning de la soirée
      const now = new Date();
      const { data: events } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('wedding_id', currentWedding.id)
        .eq('category', 'music')
        .order('start_time');
      
      if (events) {
        // Événement en cours
        const current = events.find(e => {
          const start = new Date(e.start_time);
          const end = new Date(e.end_time);
          return now >= start && now <= end;
        });
        setCurrentEvent(current);
        
        // Prochain événement
        const next = events.find(e => new Date(e.start_time) > now);
        setNextEvent(next);
      }
      
      // Charger l'activité récente
      const { data: activity } = await supabase
        .from('dj_activity_log')
        .select('*')
        .eq('wedding_id', currentWedding.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setRecentActivity(activity || []);
    } catch (error) {
      console.error('Error loading overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEnergyColor = (energy) => {
    if (energy >= 80) return 'text-green-600';
    if (energy >= 60) return 'text-yellow-600';
    if (energy >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSatisfactionIcon = (satisfaction) => {
    if (satisfaction >= 90) return '😍';
    if (satisfaction >= 75) return '😊';
    if (satisfaction >= 50) return '😐';
    return '😟';
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
    <div className="space-y-6">
      {/* Carte de bienvenue */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Bonjour {djProfile?.user?.name} ! 🎵
            </h2>
            <p className="text-purple-100">
              Prêt à faire danser {currentWedding.couple_names} et leurs invités ?
            </p>
            <div className="mt-4 flex items-center space-x-4">
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <i className="fas fa-map-marker-alt mr-2" />
                {currentWedding.venue}
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <i className="fas fa-users mr-2" />
                ~{currentWedding.guest_count || 100} invités
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl mb-2">{getSatisfactionIcon(stats.guestSatisfaction)}</div>
            <p className="text-sm">Satisfaction: {stats.guestSatisfaction}%</p>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Énergie Dancefloor</p>
              <p className={`text-3xl font-bold ${getEnergyColor(stats.currentEnergy)}`}>
                {stats.currentEnergy}%
              </p>
            </div>
            <i className="fas fa-fire text-3xl text-gray-300" />
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                stats.currentEnergy >= 80 ? 'bg-green-500' :
                stats.currentEnergy >= 60 ? 'bg-yellow-500' :
                stats.currentEnergy >= 40 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${stats.currentEnergy}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Chansons jouées</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.playedSongs}/{stats.totalSongs}
              </p>
            </div>
            <i className="fas fa-music text-3xl text-gray-300" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {Math.round((stats.playedSongs / stats.totalSongs) * 100)}% de la playlist
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Chansons votées</p>
              <p className="text-3xl font-bold text-blue-600">{stats.votedSongs}</p>
            </div>
            <i className="fas fa-vote-yea text-3xl text-gray-300" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Par les invités</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">BPM Moyen</p>
              <p className="text-3xl font-bold text-pink-600">{stats.averageBPM}</p>
            </div>
            <i className="fas fa-heartbeat text-3xl text-gray-300" />
          </div>
          <p className="text-xs text-gray-500 mt-2">Tempo actuel</p>
        </div>
      </div>

      {/* Timeline actuelle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Événement en cours */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <i className="fas fa-play-circle text-green-500 mr-2" />
            En cours
          </h3>
          {currentEvent ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-lg">{currentEvent.title}</p>
                <p className="text-gray-600">{currentEvent.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Depuis {formatTime(currentEvent.start_time)}
                </span>
                <span className="text-gray-500">
                  Fin prévue : {formatTime(currentEvent.end_time)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${currentEvent.progress || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Aucun événement musical en cours</p>
          )}
        </div>

        {/* Prochain événement */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <i className="fas fa-clock text-blue-500 mr-2" />
            À venir
          </h3>
          {nextEvent ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-lg">{nextEvent.title}</p>
                <p className="text-gray-600">{nextEvent.description}</p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Début : {formatTime(nextEvent.start_time)}
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Dans {Math.round((new Date(nextEvent.start_time) - new Date()) / 60000)} min
                </span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Aucun événement planifié</p>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
            <i className="fas fa-microphone text-2xl mb-2" />
            <p className="text-sm font-medium">Annonce micro</p>
          </button>
          
          <button className="p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
            <i className="fas fa-birthday-cake text-2xl mb-2" />
            <p className="text-sm font-medium">Moment gâteau</p>
          </button>
          
          <button className="p-4 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200 transition-colors">
            <i className="fas fa-heart text-2xl mb-2" />
            <p className="text-sm font-medium">Slow time</p>
          </button>
          
          <button className="p-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
            <i className="fas fa-camera text-2xl mb-2" />
            <p className="text-sm font-medium">Photo groupe</p>
          </button>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité récente</p>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={activity.id || index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center">
                  <i className={`fas fa-${activity.icon || 'music'} text-gray-400 mr-3`} />
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-gray-500">{formatTime(activity.created_at)}</p>
                  </div>
                </div>
                {activity.value && (
                  <span className="text-sm text-gray-600">{activity.value}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}