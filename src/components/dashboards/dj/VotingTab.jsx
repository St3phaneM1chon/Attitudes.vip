/**
 * VotingTab - Système de votes et requests des invités
 * Gestion des demandes musicales avec votes en temps réel
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { formatTime } from '../../../utils/format';

export default function VotingTab({ weddingId }) {
  const { supabase } = useSupabase();
  const { subscribe, send } = useWebSocket();
  
  const [requests, setRequests] = useState([]);
  const [topVoted, setTopVoted] = useState([]);
  const [recentVotes, setRecentVotes] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalVotes: 0,
    uniqueVoters: 0,
    acceptanceRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, accepted, rejected, all

  useEffect(() => {
    if (weddingId) {
      loadVotingData();
      setupRealtimeSubscriptions();
    }
  }, [weddingId, filter]);

  const loadVotingData = async () => {
    try {
      setLoading(true);
      
      // Charger les requests selon le filtre
      let query = supabase
        .from('music_requests')
        .select(`
          *,
          guest:guests(name, table_number),
          votes:song_votes(
            id,
            guest:guests(name)
          )
        `)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data: requestsData } = await query;
      setRequests(requestsData || []);
      
      // Charger les chansons les plus votées
      const { data: topVotedData } = await supabase
        .from('song_votes')
        .select(`
          song_id,
          song_title,
          artist,
          count
        `)
        .eq('wedding_id', weddingId)
        .order('count', { ascending: false })
        .limit(10);
      
      // Grouper et compter les votes
      const voteCounts = {};
      topVotedData?.forEach(vote => {
        const key = `${vote.song_title}-${vote.artist}`;
        if (!voteCounts[key]) {
          voteCounts[key] = {
            song_title: vote.song_title,
            artist: vote.artist,
            votes: 0
          };
        }
        voteCounts[key].votes++;
      });
      
      setTopVoted(Object.values(voteCounts).sort((a, b) => b.votes - a.votes));
      
      // Charger les votes récents
      const { data: recentVotesData } = await supabase
        .from('song_votes')
        .select(`
          *,
          guest:guests(name)
        `)
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      setRecentVotes(recentVotesData || []);
      
      // Calculer les statistiques
      calculateStats(requestsData || [], topVotedData || []);
      
    } catch (error) {
      console.error('Error loading voting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requestsData, votesData) => {
    const totalRequests = requestsData.length;
    const totalVotes = votesData.length;
    const uniqueVoters = [...new Set(votesData.map(v => v.guest_id))].length;
    const acceptedRequests = requestsData.filter(r => r.status === 'accepted').length;
    const acceptanceRate = totalRequests > 0 ? Math.round((acceptedRequests / totalRequests) * 100) : 0;
    
    setStats({
      totalRequests,
      totalVotes,
      uniqueVoters,
      acceptanceRate
    });
  };

  const setupRealtimeSubscriptions = () => {
    const unsubscribe = subscribe(`wedding:${weddingId}:music_voting`, (message) => {
      switch (message.type) {
        case 'new_request':
          handleNewRequest(message.data);
          break;
        case 'new_vote':
          handleNewVote(message.data);
          break;
        case 'request_status_updated':
          handleRequestStatusUpdate(message.data);
          break;
      }
    });
    
    return () => unsubscribe();
  };

  const handleNewRequest = (request) => {
    setRequests(prev => [request, ...prev]);
    setStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
  };

  const handleNewVote = (vote) => {
    // Mettre à jour les votes sur la request
    setRequests(prev => prev.map(req => {
      if (req.song_title === vote.song_title && req.artist === vote.artist) {
        return { ...req, votes: [...(req.votes || []), vote] };
      }
      return req;
    }));
    
    // Ajouter aux votes récents
    setRecentVotes(prev => [vote, ...prev].slice(0, 20));
    setStats(prev => ({ ...prev, totalVotes: prev.totalVotes + 1 }));
  };

  const handleRequestStatusUpdate = ({ requestId, status }) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId ? { ...req, status } : req
    ));
    
    if (status === 'accepted') {
      setStats(prev => ({
        ...prev,
        acceptanceRate: Math.round(((prev.acceptedRequests + 1) / prev.totalRequests) * 100)
      }));
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      await supabase
        .from('music_requests')
        .update({ 
          status,
          processed_at: new Date(),
          processed_by: 'dj'
        })
        .eq('id', requestId);
      
      // Notifier via WebSocket
      send({
        type: 'request_status_updated',
        data: { requestId, status }
      });
      
      // Si accepté, ajouter à la playlist
      if (status === 'accepted') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          await addToPlaylist(request);
        }
      }
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  const addToPlaylist = async (request) => {
    try {
      // Vérifier si la chanson existe dans la bibliothèque
      const { data: songData } = await supabase
        .from('songs_library')
        .select('*')
        .eq('title', request.song_title)
        .eq('artist', request.artist)
        .single();
      
      if (songData) {
        // Ajouter à la playlist DJ
        await supabase
          .from('dj_playlists')
          .insert({
            wedding_id: weddingId,
            song_id: songData.id,
            title: songData.title,
            artist: songData.artist,
            duration: songData.duration,
            bpm: songData.bpm,
            energy: songData.energy,
            added_by: 'request',
            request_id: request.id,
            status: 'queued'
          });
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
    }
  };

  const getVotePercentage = (votes) => {
    if (stats.totalVotes === 0) return 0;
    return Math.round((votes / stats.totalVotes) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Demandes totales</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalRequests}</p>
            </div>
            <i className="fas fa-music text-3xl text-gray-300" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Votes totaux</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalVotes}</p>
            </div>
            <i className="fas fa-vote-yea text-3xl text-gray-300" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Votants uniques</p>
              <p className="text-3xl font-bold text-green-600">{stats.uniqueVoters}</p>
            </div>
            <i className="fas fa-users text-3xl text-gray-300" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Taux d'acceptation</p>
              <p className="text-3xl font-bold text-pink-600">{stats.acceptanceRate}%</p>
            </div>
            <i className="fas fa-percentage text-3xl text-gray-300" />
          </div>
        </div>
      </div>

      {/* Top des chansons votées */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 des chansons les plus demandées</h3>
        <div className="space-y-3">
          {topVoted.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun vote pour le moment</p>
          ) : (
            topVoted.map((song, index) => (
              <div key={`${song.song_title}-${song.artist}`} className="flex items-center">
                <span className={`text-2xl font-bold mr-4 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-400' :
                  index === 2 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  #{index + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium">{song.song_title}</p>
                      <p className="text-sm text-gray-600">{song.artist}</p>
                    </div>
                    <span className="text-sm text-gray-500">{song.votes} votes</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${getVotePercentage(song.votes)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Demandes en attente */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Demandes musicales</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="pending">En attente</option>
              <option value="accepted">Acceptées</option>
              <option value="rejected">Refusées</option>
              <option value="all">Toutes</option>
            </select>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {requests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune demande</p>
            ) : (
              requests.map(request => (
                <div key={request.id} className={`p-4 rounded-lg border ${
                  request.status === 'accepted' ? 'bg-green-50 border-green-200' :
                  request.status === 'rejected' ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{request.song_title}</p>
                      <p className="text-sm text-gray-600">{request.artist}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <span>Par {request.guest?.name}</span>
                        {request.guest?.table_number && (
                          <span className="mx-2">•</span>
                        )}
                        {request.guest?.table_number && (
                          <span>Table {request.guest.table_number}</span>
                        )}
                        <span className="mx-2">•</span>
                        <span>{formatTime(request.created_at)}</span>
                      </div>
                      {request.votes?.length > 0 && (
                        <div className="mt-2 flex items-center">
                          <i className="fas fa-thumbs-up text-blue-500 mr-1" />
                          <span className="text-sm text-blue-600">{request.votes.length} votes</span>
                        </div>
                      )}
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => updateRequestStatus(request.id, 'accepted')}
                          className="p-2 text-green-600 hover:bg-green-100 rounded"
                          title="Accepter"
                        >
                          <i className="fas fa-check" />
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                          className="p-2 text-red-600 hover:bg-red-100 rounded"
                          title="Refuser"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    )}
                    
                    {request.status !== 'pending' && (
                      <span className={`text-sm px-2 py-1 rounded ${
                        request.status === 'accepted' ? 'bg-green-200 text-green-700' :
                        'bg-red-200 text-red-700'
                      }`}>
                        {request.status === 'accepted' ? 'Acceptée' : 'Refusée'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Votes récents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Votes récents</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentVotes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucun vote récent</p>
            ) : (
              recentVotes.map((vote, index) => (
                <div key={vote.id || index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center">
                    <i className="fas fa-thumbs-up text-blue-500 mr-3" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{vote.guest?.name}</span>
                        {' a voté pour '}
                        <span className="font-medium">{vote.song_title}</span>
                      </p>
                      <p className="text-xs text-gray-500">{formatTime(vote.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}