/**
 * Dashboard DJ - Interface tablette horizontale
 * Optimisé pour utilisation pendant l'événement
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSupabase } from '../../hooks/useSupabase';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Play, Pause, SkipForward, SkipBack, Mic, MicOff,
  Music, Users, MessageSquare, Camera, Clock,
  Volume2, Heart, ThumbsUp, Star, AlertCircle,
  Monitor, Smartphone, Wifi, WifiOff, Battery, X, Bell
} from 'lucide-react';

const DJDashboard = () => {
  const { user, wedding } = useAuth();
  const { supabase } = useSupabase();
  const { socket, connected } = useWebSocket();
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [eventSchedule, setEventSchedule] = useState([]);
  const [musicRequests, setMusicRequests] = useState([]);
  const [micRequests, setMicRequests] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [photoStream, setPhotoStream] = useState([]);
  const [gameResults, setGameResults] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  
  // État de lecture
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [volume, setVolume] = useState(75);
  
  // Refs pour auto-scroll
  const requestsRef = useRef(null);
  const photosRef = useRef(null);

  useEffect(() => {
    // Mettre à jour l'heure toutes les secondes
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Charger les données initiales
    if (wedding?.id) {
      loadEventData();
      subscribeToRealtime();
    }
    
    // Garder l'écran allumé
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(console.error);
    }
    
    return () => {
      clearInterval(timer);
    };
  }, [wedding?.id]);

  const loadEventData = async () => {
    // Charger le planning de la journée
    const { data: schedule } = await supabase
      .from('event_schedule')
      .select('*')
      .eq('wedding_id', wedding.id)
      .order('start_time', { ascending: true });
    
    setEventSchedule(schedule || []);
    
    // Déterminer l'activité actuelle
    const now = new Date();
    const current = schedule?.find(item => {
      const start = new Date(item.start_time);
      const end = new Date(item.end_time);
      return now >= start && now <= end;
    });
    setCurrentActivity(current);
    
    // Charger les demandes musicales
    const { data: requests } = await supabase
      .from('music_requests')
      .select('*, guests(name)')
      .eq('wedding_id', wedding.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    setMusicRequests(requests || []);
  };

  const subscribeToRealtime = () => {
    // WebSocket pour les demandes en temps réel
    socket.on('music_request', (request) => {
      setMusicRequests(prev => [request, ...prev]);
      // Auto-scroll vers la nouvelle demande
      requestsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    socket.on('mic_request', (request) => {
      setMicRequests(prev => [request, ...prev]);
      // Notification sonore
      playNotificationSound();
    });
    
    socket.on('new_photo', (photo) => {
      setPhotoStream(prev => [photo, ...prev].slice(0, 20)); // Garder max 20 photos
    });
    
    socket.on('game_update', (update) => {
      setGameResults(prev => ({ ...prev, [update.game_id]: update.results }));
    });
  };

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch(console.error);
  };

  const handleMusicRequest = async (requestId, action) => {
    if (action === 'accept') {
      // Ajouter à la playlist
      await supabase
        .from('music_requests')
        .update({ status: 'accepted', played_at: null })
        .eq('id', requestId);
    } else {
      // Rejeter la demande
      await supabase
        .from('music_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
    }
    
    // Retirer de la liste
    setMusicRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const handleMicRequest = async (request, approved) => {
    socket.emit('mic_response', {
      request_id: request.id,
      approved,
      dj_message: approved ? 'Vous avez la parole !' : 'Désolé, pas maintenant'
    });
    
    setMicRequests(prev => prev.filter(r => r.id !== request.id));
  };

  const makeAnnouncement = (message) => {
    socket.emit('dj_announcement', {
      wedding_id: wedding.id,
      message,
      timestamp: new Date()
    });
    
    setAnnouncements(prev => [{
      message,
      time: new Date(),
      id: Date.now()
    }, ...prev]);
  };

  const renderHeader = () => (
    <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <h1 className="text-xl font-bold flex items-center">
          <Music className="h-6 w-6 mr-2" />
          DJ Dashboard
        </h1>
        
        <div className="flex items-center space-x-4 text-sm">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            {currentTime.toLocaleTimeString('fr-FR')}
          </span>
          
          <span className="flex items-center">
            {connected ? (
              <>
                <Wifi className="h-4 w-4 mr-1 text-green-400" />
                <span className="text-green-400">En ligne</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 mr-1 text-red-400" />
                <span className="text-red-400">Hors ligne</span>
              </>
            )}
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="text-sm">
          {wedding?.couple_names} - {new Date(wedding?.event_date).toLocaleDateString('fr-FR')}
        </div>
        
        <button 
          onClick={() => document.documentElement.requestFullscreen()}
          className="p-2 hover:bg-gray-800 rounded"
        >
          <Monitor className="h-5 w-5" />
        </button>
      </div>
    </div>
  );

  const renderNowPlaying = () => (
    <div className="bg-gray-800 text-white p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center">
          <Volume2 className="h-5 w-5 mr-2" />
          En cours
        </h3>
        
        {currentActivity && (
          <span className="text-sm bg-blue-600 px-3 py-1 rounded-full">
            {currentActivity.name}
          </span>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex space-x-2">
          <button className="p-2 hover:bg-gray-700 rounded">
            <SkipBack className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <button className="p-2 hover:bg-gray-700 rounded">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1">
          <div className="text-lg font-medium">
            {currentTrack?.title || "Sélectionnez une musique"}
          </div>
          <div className="text-sm text-gray-400">
            {currentTrack?.artist || "—"}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h3 className="font-semibold mb-3 flex items-center">
        <Clock className="h-5 w-5 mr-2" />
        Programme
      </h3>
      
      <div className="space-y-2 overflow-y-auto max-h-64">
        {eventSchedule.map((item, index) => {
          const isPast = new Date(item.end_time) < new Date();
          const isCurrent = currentActivity?.id === item.id;
          
          return (
            <div 
              key={item.id}
              className={`p-3 rounded-lg transition-colors ${
                isCurrent ? 'bg-blue-100 border-2 border-blue-500' :
                isPast ? 'bg-gray-100 opacity-50' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(item.start_time).toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                {item.music_playlist && (
                  <Music className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMusicRequests = () => (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center">
          <Music className="h-5 w-5 mr-2" />
          Demandes musicales
          {musicRequests.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {musicRequests.length}
            </span>
          )}
        </h3>
      </div>
      
      <div ref={requestsRef} className="space-y-2 overflow-y-auto max-h-64">
        {musicRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune demande</p>
        ) : (
          musicRequests.map(request => (
            <div key={request.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{request.song_title}</div>
                  <div className="text-sm text-gray-500">
                    {request.artist} • Demandé par {request.guests?.name}
                  </div>
                </div>
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => handleMusicRequest(request.id, 'accept')}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMusicRequest(request.id, 'reject')}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderMicRequests = () => (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3 flex items-center">
        <Mic className="h-5 w-5 mr-2" />
        Demandes micro
        {micRequests.length > 0 && (
          <AlertCircle className="ml-2 h-5 w-5 text-orange-500 animate-pulse" />
        )}
      </h3>
      
      <div className="space-y-2">
        {micRequests.map(request => (
          <div key={request.id} className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
            <div className="font-medium">{request.guest_name}</div>
            <div className="text-sm text-gray-600">{request.purpose}</div>
            <div className="flex space-x-2 mt-2">
              <button
                onClick={() => handleMicRequest(request, true)}
                className="flex-1 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Autoriser
              </button>
              <button
                onClick={() => handleMicRequest(request, false)}
                className="flex-1 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Refuser
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPhotoStream = () => (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3 flex items-center">
        <Camera className="h-5 w-5 mr-2" />
        Photos en direct
      </h3>
      
      <div ref={photosRef} className="flex space-x-2 overflow-x-auto pb-2">
        {photoStream.map((photo, index) => (
          <div key={photo.id || index} className="flex-shrink-0">
            <img 
              src={photo.thumbnail_url} 
              alt=""
              className="w-20 h-20 object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Actions rapides</h3>
      
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => makeAnnouncement("C'est l'heure du gâteau !")}
          className="p-3 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
        >
          Annonce gâteau
        </button>
        
        <button 
          onClick={() => makeAnnouncement("Première danse dans 5 minutes")}
          className="p-3 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium"
        >
          Première danse
        </button>
        
        <button 
          onClick={() => makeAnnouncement("Photo de groupe !")}
          className="p-3 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
        >
          Photo groupe
        </button>
        
        <button className="p-3 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium">
          Message custom
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {renderHeader()}
      
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 h-full">
          {/* Colonne gauche */}
          <div className="col-span-3 space-y-4">
            {renderSchedule()}
            {renderQuickActions()}
          </div>
          
          {/* Colonne centrale */}
          <div className="col-span-6 space-y-4">
            {renderNowPlaying()}
            
            <div className="grid grid-cols-2 gap-4 flex-1">
              {renderMusicRequests()}
              {renderMicRequests()}
            </div>
          </div>
          
          {/* Colonne droite */}
          <div className="col-span-3 space-y-4">
            {renderPhotoStream()}
            
            {/* Résultats des jeux */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Star className="h-5 w-5 mr-2" />
                Résultats jeux
              </h3>
              
              {Object.entries(gameResults).map(([gameId, results]) => (
                <div key={gameId} className="mb-2">
                  <div className="text-sm font-medium">{results.name}</div>
                  <div className="text-xs text-gray-500">
                    Gagnant: {results.winner} ({results.score} points)
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DJDashboard;