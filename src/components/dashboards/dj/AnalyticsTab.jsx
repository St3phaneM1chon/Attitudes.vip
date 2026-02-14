/**
 * AnalyticsTab - Analytics temps réel pour le DJ
 * Graphiques, métriques et insights sur la soirée
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function AnalyticsTab({ weddingId, stats }) {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    energyTimeline: [],
    genreDistribution: [],
    bpmProgression: [],
    peakMoments: [],
    guestActivity: [],
    popularArtists: []
  });
  const [timeRange, setTimeRange] = useState('all'); // all, last-hour, last-30min

  useEffect(() => {
    if (weddingId) {
      loadAnalytics();
    }
  }, [weddingId, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Charger l'historique d'énergie
      const { data: energyData } = await supabase
        .from('dj_energy_tracking')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('timestamp');
      
      // Appliquer le filtre temporel
      const filteredEnergyData = filterByTimeRange(energyData || []);
      
      // Formater pour le graphique
      const energyTimeline = filteredEnergyData.map(point => ({
        time: new Date(point.timestamp).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        energy: point.energy_level,
        dancefloor: point.dancefloor_percentage
      }));
      
      // Charger la distribution des genres
      const { data: playedSongs } = await supabase
        .from('dj_playlists')
        .select('genre')
        .eq('wedding_id', weddingId)
        .eq('played', true);
      
      const genreCounts = {};
      playedSongs?.forEach(song => {
        if (song.genre) {
          genreCounts[song.genre] = (genreCounts[song.genre] || 0) + 1;
        }
      });
      
      const genreDistribution = Object.entries(genreCounts).map(([genre, count]) => ({
        name: genre,
        value: count,
        percentage: Math.round((count / playedSongs.length) * 100)
      }));
      
      // Progression BPM
      const { data: bpmData } = await supabase
        .from('dj_playlists')
        .select('bpm, played_at')
        .eq('wedding_id', weddingId)
        .eq('played', true)
        .order('played_at');
      
      const bpmProgression = bpmData?.map(song => ({
        time: new Date(song.played_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        bpm: song.bpm
      })) || [];
      
      // Moments de pointe
      const peakMoments = filteredEnergyData
        .filter(point => point.energy_level >= 80)
        .map(point => ({
          time: new Date(point.timestamp).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          energy: point.energy_level,
          song: point.current_song
        }));
      
      // Activité des invités
      const { data: activityData } = await supabase
        .from('guest_activity')
        .select('activity_type, count')
        .eq('wedding_id', weddingId);
      
      const guestActivity = [
        { name: 'Votes', value: stats.totalVotes },
        { name: 'Demandes', value: stats.totalRequests },
        { name: 'Photos', value: activityData?.find(a => a.activity_type === 'photo')?.count || 0 },
        { name: 'Messages', value: activityData?.find(a => a.activity_type === 'message')?.count || 0 }
      ];
      
      // Artistes populaires
      const { data: artistData } = await supabase
        .from('dj_playlists')
        .select('artist')
        .eq('wedding_id', weddingId)
        .eq('played', true);
      
      const artistCounts = {};
      artistData?.forEach(song => {
        if (song.artist) {
          artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
        }
      });
      
      const popularArtists = Object.entries(artistCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([artist, count]) => ({
          artist,
          songs: count
        }));
      
      setAnalytics({
        energyTimeline,
        genreDistribution,
        bpmProgression,
        peakMoments,
        guestActivity,
        popularArtists
      });
      
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByTimeRange = (data) => {
    if (timeRange === 'all') return data;
    
    const now = new Date();
    const cutoff = new Date();
    
    if (timeRange === 'last-hour') {
      cutoff.setHours(cutoff.getHours() - 1);
    } else if (timeRange === 'last-30min') {
      cutoff.setMinutes(cutoff.getMinutes() - 30);
    }
    
    return data.filter(item => new Date(item.timestamp || item.created_at) >= cutoff);
  };

  const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Analytics en temps réel</h3>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border rounded px-3 py-1"
          >
            <option value="all">Toute la soirée</option>
            <option value="last-hour">Dernière heure</option>
            <option value="last-30min">30 dernières minutes</option>
          </select>
        </div>
      </div>

      {/* Graphique d'énergie */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Évolution de l'énergie</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.energyTimeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="energy" 
              stroke="#8b5cf6" 
              name="Énergie"
              strokeWidth={2}
            />
            <Line 
              type="monotone" 
              dataKey="dancefloor" 
              stroke="#ec4899" 
              name="% Dancefloor"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribution des genres */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition des genres</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.genreDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.genreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Activité des invités */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Engagement des invités</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.guestActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progression BPM */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Progression du tempo (BPM)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={analytics.bpmProgression}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={[60, 140]} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="bpm" 
              stroke="#f59e0b" 
              name="BPM"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moments de pointe */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            <i className="fas fa-fire text-orange-500 mr-2" />
            Moments de pointe
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {analytics.peakMoments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucun moment de pointe enregistré</p>
            ) : (
              analytics.peakMoments.map((moment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium">{moment.time}</p>
                    {moment.song && (
                      <p className="text-sm text-gray-600">{moment.song}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{moment.energy}%</p>
                    <p className="text-xs text-gray-500">Énergie</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top artistes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            <i className="fas fa-star text-yellow-500 mr-2" />
            Artistes les plus joués
          </h3>
          <div className="space-y-2">
            {analytics.popularArtists.map((item, index) => (
              <div key={item.artist} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-bold text-gray-500 mr-3">#{index + 1}</span>
                  <span className="font-medium">{item.artist}</span>
                </div>
                <span className="text-sm text-gray-600">{item.songs} titres</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          <i className="fas fa-lightbulb text-yellow-500 mr-2" />
          Insights de la soirée
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Meilleur moment</p>
            <p className="font-medium">
              {analytics.peakMoments[0]?.time || 'En attente'} - 
              {analytics.peakMoments[0]?.energy || 0}% d'énergie
            </p>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Genre préféré</p>
            <p className="font-medium">
              {analytics.genreDistribution[0]?.name || 'N/A'} 
              ({analytics.genreDistribution[0]?.percentage || 0}%)
            </p>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600">BPM moyen</p>
            <p className="font-medium">{stats.averageBPM} BPM</p>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Taux d'engagement</p>
            <p className="font-medium">
              {Math.round((stats.uniqueVoters / 100) * 100)}% des invités
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}