/**
 * PlaylistTab - Gestion de la playlist collaborative
 * Ajout, organisation, lecture des chansons
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function PlaylistTab({ weddingId, djId }) {
  const { supabase } = useSupabase();
  const { send, subscribe } = useWebSocket();
  
  const [playlist, setPlaylist] = useState([]);
  const [queue, setQueue] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Filtres et tri
  const [filter, setFilter] = useState('all'); // all, played, unplayed, requests
  const [sortBy, setSortBy] = useState('order'); // order, bpm, energy, votes

  useEffect(() => {
    if (weddingId) {
      loadPlaylist();
      setupRealtimeSubscriptions();
    }
  }, [weddingId]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      
      // Charger la playlist complète
      const { data: playlistData } = await supabase
        .from('dj_playlists')
        .select(`
          *,
          votes:song_votes(count),
          requests:music_requests(guest_name)
        `)
        .eq('wedding_id', weddingId)
        .order('play_order');
      
      setPlaylist(playlistData || []);
      
      // Identifier la chanson en cours
      const playing = playlistData?.find(s => s.status === 'playing');
      setNowPlaying(playing);
      
      // Créer la queue des prochaines chansons
      const upcomingQueue = playlistData
        ?.filter(s => s.status === 'queued' || (!s.played && s.status !== 'playing'))
        .slice(0, 10);
      setQueue(upcomingQueue || []);
      
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const unsubscribe = subscribe(`wedding:${weddingId}:playlist`, (message) => {
      switch (message.type) {
        case 'song_added':
          handleSongAdded(message.data);
          break;
        case 'song_playing':
          handleSongPlaying(message.data);
          break;
        case 'song_completed':
          handleSongCompleted(message.data);
          break;
        case 'playlist_reordered':
          handlePlaylistReordered(message.data);
          break;
      }
    });
    
    return () => unsubscribe();
  };

  const handleSongAdded = (song) => {
    setPlaylist(prev => [...prev, song]);
    if (!song.played) {
      setQueue(prev => [...prev, song].slice(0, 10));
    }
  };

  const handleSongPlaying = (song) => {
    setNowPlaying(song);
    setPlaylist(prev => prev.map(s => ({
      ...s,
      status: s.id === song.id ? 'playing' : s.status === 'playing' ? 'queued' : s.status
    })));
    setQueue(prev => prev.filter(s => s.id !== song.id));
  };

  const handleSongCompleted = (songId) => {
    setPlaylist(prev => prev.map(s => 
      s.id === songId ? { ...s, played: true, status: 'completed' } : s
    ));
    if (nowPlaying?.id === songId) {
      setNowPlaying(null);
    }
  };

  const handlePlaylistReordered = (newOrder) => {
    setPlaylist(newOrder);
  };

  const searchSongs = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      
      // Recherche dans la base de données de chansons
      const { data } = await supabase
        .from('songs_library')
        .select('*')
        .or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`)
        .limit(20);
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching songs:', error);
    } finally {
      setSearching(false);
    }
  };

  const addSongToPlaylist = async (song) => {
    try {
      const newSong = {
        wedding_id: weddingId,
        song_id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        bpm: song.bpm,
        energy: song.energy,
        genre: song.genre,
        play_order: playlist.length,
        added_by: djId,
        status: 'queued'
      };
      
      const { data, error } = await supabase
        .from('dj_playlists')
        .insert(newSong)
        .select()
        .single();
      
      if (error) throw error;
      
      // Notifier via WebSocket
      send({
        type: 'song_added',
        data: data
      });
      
      // Réinitialiser la recherche
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding song:', error);
    }
  };

  const playSong = async (song) => {
    try {
      // Mettre à jour le statut
      await supabase
        .from('dj_playlists')
        .update({
          status: 'playing',
          played_at: new Date()
        })
        .eq('id', song.id);
      
      // Si une chanson était en cours, la marquer comme terminée
      if (nowPlaying) {
        await supabase
          .from('dj_playlists')
          .update({
            status: 'completed',
            played: true
          })
          .eq('id', nowPlaying.id);
      }
      
      // Notifier via WebSocket
      send({
        type: 'song_playing',
        data: song
      });
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  const stopCurrentSong = async () => {
    if (!nowPlaying) return;
    
    try {
      await supabase
        .from('dj_playlists')
        .update({
          status: 'completed',
          played: true
        })
        .eq('id', nowPlaying.id);
      
      send({
        type: 'song_completed',
        data: nowPlaying.id
      });
    } catch (error) {
      console.error('Error stopping song:', error);
    }
  };

  const removeSongFromPlaylist = async (songId) => {
    try {
      await supabase
        .from('dj_playlists')
        .delete()
        .eq('id', songId);
      
      setPlaylist(prev => prev.filter(s => s.id !== songId));
      setQueue(prev => prev.filter(s => s.id !== songId));
    } catch (error) {
      console.error('Error removing song:', error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Mettre à jour l'ordre
    const updates = items.map((item, index) => ({
      id: item.id,
      play_order: index
    }));
    
    setPlaylist(items);
    
    try {
      // Batch update
      for (const update of updates) {
        await supabase
          .from('dj_playlists')
          .update({ play_order: update.play_order })
          .eq('id', update.id);
      }
      
      send({
        type: 'playlist_reordered',
        data: items
      });
    } catch (error) {
      console.error('Error reordering playlist:', error);
      loadPlaylist(); // Recharger en cas d'erreur
    }
  };

  const getFilteredPlaylist = () => {
    let filtered = [...playlist];
    
    // Appliquer le filtre
    switch (filter) {
      case 'played':
        filtered = filtered.filter(s => s.played);
        break;
      case 'unplayed':
        filtered = filtered.filter(s => !s.played);
        break;
      case 'requests':
        filtered = filtered.filter(s => s.requests?.length > 0);
        break;
    }
    
    // Appliquer le tri
    switch (sortBy) {
      case 'bpm':
        filtered.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
        break;
      case 'energy':
        filtered.sort((a, b) => (b.energy || 0) - (a.energy || 0));
        break;
      case 'votes':
        filtered.sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0));
        break;
      default:
        filtered.sort((a, b) => a.play_order - b.play_order);
    }
    
    return filtered;
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
      {/* Lecteur actuel */}
      {nowPlaying && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-75">En cours de lecture</p>
              <h3 className="text-2xl font-bold">{nowPlaying.title}</h3>
              <p className="text-lg opacity-90">{nowPlaying.artist}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={stopCurrentSong}
                className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              >
                <i className="fas fa-stop text-2xl" />
              </button>
              <button className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <i className="fas fa-forward text-2xl" />
              </button>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white h-2 rounded-full" style={{ width: '45%' }} />
            </div>
            <div className="flex justify-between text-sm mt-1 opacity-75">
              <span>1:45</span>
              <span>{nowPlaying.duration || '3:30'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recherche et ajout */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Ajouter des chansons</h3>
        
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchSongs()}
            placeholder="Rechercher par titre ou artiste..."
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={searchSongs}
            disabled={searching}
            className="btn btn-primary"
          >
            {searching ? (
              <i className="fas fa-spinner fa-spin" />
            ) : (
              <i className="fas fa-search" />
            )}
          </button>
        </div>
        
        {/* Résultats de recherche */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map((song) => (
              <div key={song.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <div>
                  <p className="font-medium">{song.title}</p>
                  <p className="text-sm text-gray-600">{song.artist}</p>
                </div>
                <button
                  onClick={() => addSongToPlaylist(song)}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <i className="fas fa-plus-circle text-xl" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Queue des prochaines */}
      {queue.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">File d'attente</h3>
          <div className="space-y-2">
            {queue.map((song, index) => (
              <div key={song.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-3">{index + 1}</span>
                  <div>
                    <p className="font-medium">{song.title}</p>
                    <p className="text-sm text-gray-600">{song.artist}</p>
                  </div>
                </div>
                <button
                  onClick={() => playSong(song)}
                  className="text-green-600 hover:text-green-700"
                >
                  <i className="fas fa-play-circle text-xl" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlist complète */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Playlist ({playlist.length} chansons)
          </h3>
          
          <div className="flex items-center space-x-3">
            {/* Filtres */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="all">Toutes</option>
              <option value="unplayed">Non jouées</option>
              <option value="played">Jouées</option>
              <option value="requests">Demandées</option>
            </select>
            
            {/* Tri */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="order">Ordre</option>
              <option value="bpm">BPM</option>
              <option value="energy">Énergie</option>
              <option value="votes">Votes</option>
            </select>
          </div>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="playlist">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 max-h-96 overflow-y-auto"
              >
                {getFilteredPlaylist().map((song, index) => (
                  <Draggable key={song.id} draggableId={song.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          song.played ? 'bg-gray-100 opacity-60' :
                          song.status === 'playing' ? 'bg-purple-100 border-2 border-purple-500' :
                          'bg-gray-50 hover:bg-gray-100'
                        } ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                      >
                        <div className="flex items-center flex-1">
                          <i className="fas fa-grip-vertical text-gray-400 mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">{song.title}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{song.artist}</span>
                              {song.bpm && <span>{song.bpm} BPM</span>}
                              {song.energy && (
                                <span className="flex items-center">
                                  <i className="fas fa-fire text-orange-500 mr-1" />
                                  {song.energy}%
                                </span>
                              )}
                              {song.votes?.length > 0 && (
                                <span className="flex items-center">
                                  <i className="fas fa-thumbs-up text-blue-500 mr-1" />
                                  {song.votes.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {!song.played && song.status !== 'playing' && (
                            <button
                              onClick={() => playSong(song)}
                              className="p-2 text-green-600 hover:bg-green-100 rounded"
                            >
                              <i className="fas fa-play" />
                            </button>
                          )}
                          {song.played && (
                            <span className="text-green-600">
                              <i className="fas fa-check-circle" />
                            </span>
                          )}
                          <button
                            onClick={() => removeSongFromPlaylist(song.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}