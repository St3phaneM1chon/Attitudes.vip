/**
 * CollaborativeGallery - Galerie photo/vidéo collaborative
 * Partage, commentaires, téléchargements avec gestion des droits
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '../../hooks/useSupabase';
import { useWebSocket } from '../../hooks/useWebSocketOptimized';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { mediaService } from '../../services/media/MediaService';
import { MediaUploader } from './MediaUploader';
import { MediaViewer } from './MediaViewer';
import { AlbumManager } from './AlbumManager';
import { formatDate, formatFileSize } from '../../utils/format';

export function CollaborativeGallery({ weddingId, userId, userRole }) {
  const { supabase } = useSupabase();
  const { subscribe, send } = useWebSocket();
  
  // État
  const [media, setMedia] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // grid, list, timeline
  
  // Filtres et tri
  const [filters, setFilters] = useState({
    type: 'all', // all, image, video
    uploadedBy: 'all',
    dateRange: 'all',
    tags: [],
    onlyFavorites: false
  });
  
  const [sortBy, setSortBy] = useState('date_desc');
  
  // Sélection multiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Upload
  const [showUploader, setShowUploader] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // Pagination infinie
  const { data: paginatedMedia, loadMore, hasMore, isLoadingMore } = useInfiniteScroll({
    queryFn: async ({ pageParam = 0 }) => {
      return mediaService.searchMedia(weddingId, {
        ...filters,
        offset: pageParam,
        limit: 20,
        orderBy: sortBy.split('_')[0],
        order: sortBy.split('_')[1]
      });
    },
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((acc, page) => acc + page.media.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    }
  });

  useEffect(() => {
    loadInitialData();
    setupRealtimeSubscriptions();
    
    return () => {
      // Cleanup
    };
  }, [weddingId]);

  useEffect(() => {
    // Mettre à jour la liste des médias lors de la pagination
    if (paginatedMedia) {
      const allMedia = paginatedMedia.pages.flatMap(page => page.media);
      setMedia(allMedia);
    }
  }, [paginatedMedia]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Charger les albums
      const { data: albumsData } = await supabase
        .from('media_albums')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false });
      
      setAlbums(albumsData || []);
    } catch (error) {
      console.error('Error loading gallery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // S'abonner aux mises à jour de médias
    const unsubscribeMedia = subscribe(`wedding:${weddingId}:media`, (message) => {
      switch (message.type) {
        case 'media_uploaded':
          handleNewMedia(message.data);
          break;
        case 'media_deleted':
          handleMediaDeleted(message.data);
          break;
        case 'media_updated':
          handleMediaUpdated(message.data);
          break;
      }
    });
    
    // S'abonner aux mises à jour d'albums
    const unsubscribeAlbums = subscribe(`wedding:${weddingId}:albums`, (message) => {
      switch (message.type) {
        case 'album_created':
          setAlbums(prev => [message.data, ...prev]);
          break;
        case 'album_updated':
          setAlbums(prev => prev.map(a => a.id === message.data.id ? message.data : a));
          break;
        case 'album_deleted':
          setAlbums(prev => prev.filter(a => a.id !== message.data.id));
          break;
      }
    });
    
    return () => {
      unsubscribeMedia();
      unsubscribeAlbums();
    };
  };

  const handleNewMedia = (newMedia) => {
    setMedia(prev => [newMedia, ...prev]);
  };

  const handleMediaDeleted = (deletedMedia) => {
    setMedia(prev => prev.filter(m => m.id !== deletedMedia.id));
    if (selectedMedia?.id === deletedMedia.id) {
      setSelectedMedia(null);
    }
  };

  const handleMediaUpdated = (updatedMedia) => {
    setMedia(prev => prev.map(m => m.id === updatedMedia.id ? updatedMedia : m));
    if (selectedMedia?.id === updatedMedia.id) {
      setSelectedMedia(updatedMedia);
    }
  };

  const handleUpload = async (files) => {
    try {
      setUploading(true);
      setShowUploader(false);
      
      const results = await mediaService.uploadMultiple(files, {
        weddingId,
        uploadedBy: userId,
        albumId: selectedAlbum?.id,
        onProgress: setUploadProgress
      });
      
      // Notifier les autres utilisateurs
      send({
        type: 'media_batch_uploaded',
        data: {
          weddingId,
          count: results.filter(r => r.success).length
        }
      });
      
      // Afficher les résultats
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      alert(`Upload terminé: ${successful} réussi(s), ${failed} échoué(s)`);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (mediaIds) => {
    if (!confirm(`Supprimer ${mediaIds.length} média(s) ?`)) return;
    
    try {
      for (const mediaId of mediaIds) {
        await supabase
          .from('media')
          .update({ deleted_at: new Date() })
          .eq('id', mediaId);
        
        handleMediaDeleted({ id: mediaId });
      }
      
      setSelectedItems(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDownload = async (mediaItems) => {
    for (const media of mediaItems) {
      const url = media.variants?.original?.url || media.url;
      const link = document.createElement('a');
      link.href = url;
      link.download = media.file_name;
      link.click();
    }
  };

  const handleShare = async (mediaIds) => {
    try {
      const shareData = await mediaService.shareMedia(mediaIds[0], {
        type: 'link',
        sharedBy: userId,
        permissions: ['view', 'download'],
        expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 jours
      });
      
      // Copier le lien
      await navigator.clipboard.writeText(shareData.shareUrl);
      alert('Lien de partage copié !');
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const toggleFavorite = async (media) => {
    try {
      const isFavorite = media.favorites?.includes(userId);
      
      const newFavorites = isFavorite
        ? media.favorites.filter(id => id !== userId)
        : [...(media.favorites || []), userId];
      
      await supabase
        .from('media')
        .update({ favorites: newFavorites })
        .eq('id', media.id);
      
      handleMediaUpdated({ ...media, favorites: newFavorites });
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const toggleSelection = (mediaId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mediaId)) {
        newSet.delete(mediaId);
      } else {
        newSet.add(mediaId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedItems(new Set(media.map(m => m.id)));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const getSelectedMedia = () => {
    return media.filter(m => selectedItems.has(m.id));
  };

  const canUserDelete = (media) => {
    return userRole === 'admin' || media.uploaded_by === userId;
  };

  const renderMediaGrid = () => {
    if (media.length === 0) {
      return (
        <div className="text-center py-12">
          <i className="fas fa-images text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500">Aucun média dans cette galerie</p>
          <button
            onClick={() => setShowUploader(true)}
            className="btn btn-primary mt-4"
          >
            <i className="fas fa-upload mr-2" />
            Ajouter des photos/vidéos
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className={`relative group cursor-pointer ${
              selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => {
              if (selectionMode) {
                toggleSelection(item.id);
              } else {
                setSelectedMedia(item);
              }
            }}
          >
            {/* Miniature */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {item.media_type === 'image' ? (
                <img
                  src={item.variants?.small?.url || item.url}
                  alt={item.file_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={item.thumbnail_url}
                    alt={item.file_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-play-circle text-white text-4xl opacity-80" />
                  </div>
                </div>
              )}
            </div>
            
            {/* Overlay d'informations */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-sm">
                <p className="truncate">{item.file_name}</p>
                <p className="text-xs opacity-80">
                  {formatDate(item.created_at, 'short')}
                </p>
              </div>
              
              {/* Actions rapides */}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item);
                  }}
                  className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30"
                >
                  <i className={`${
                    item.favorites?.includes(userId) ? 'fas' : 'far'
                  } fa-heart text-white`} />
                </button>
                
                {canUserDelete(item) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete([item.id]);
                    }}
                    className="p-2 bg-white/20 backdrop-blur rounded-full hover:bg-white/30"
                  >
                    <i className="fas fa-trash text-white" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Checkbox de sélection */}
            {selectionMode && (
              <div className="absolute top-2 left-2">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => {}}
                  className="w-5 h-5"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            {/* Badge de statut */}
            {item.status === 'processing' && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                <i className="fas fa-spinner fa-spin mr-1" />
                Traitement...
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMediaList = () => {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectionMode && (
                <th className="px-6 py-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === media.length}
                    onChange={() => selectedItems.size === media.length ? clearSelection() : selectAll()}
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Aperçu
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Taille
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ajouté par
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {media.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {selectionMode && (
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="w-16 h-16 rounded overflow-hidden">
                    {item.media_type === 'image' ? (
                      <img
                        src={item.variants?.thumbnail?.url || item.url}
                        alt={item.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="relative w-full h-full bg-gray-100">
                        <img
                          src={item.thumbnail_url}
                          alt={item.file_name}
                          className="w-full h-full object-cover"
                        />
                        <i className="fas fa-play-circle absolute inset-0 m-auto text-white" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setSelectedMedia(item)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {item.file_name}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    item.media_type === 'image' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    <i className={`fas fa-${item.media_type === 'image' ? 'image' : 'video'} mr-1`} />
                    {item.media_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatFileSize(item.file_size)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <img
                      src={item.uploaded_by_user?.avatar_url || '/default-avatar.png'}
                      alt={item.uploaded_by_user?.name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                    <span className="text-sm text-gray-900">
                      {item.uploaded_by_user?.name}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => toggleFavorite(item)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <i className={`${
                        item.favorites?.includes(userId) ? 'fas' : 'far'
                      } fa-heart`} />
                    </button>
                    <button
                      onClick={() => handleDownload([item])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fas fa-download" />
                    </button>
                    {canUserDelete(item) && (
                      <button
                        onClick={() => handleDelete([item.id])}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Galerie collaborative</h2>
            <span className="text-sm text-gray-600">
              {media.length} média{media.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Sélecteur de vue */}
            <div className="btn-group">
              <button
                onClick={() => setViewMode('grid')}
                className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                title="Vue grille"
              >
                <i className="fas fa-th" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                title="Vue liste"
              >
                <i className="fas fa-list" />
              </button>
            </div>
            
            {/* Actions */}
            {selectedItems.size > 0 ? (
              <>
                <span className="text-sm text-gray-600">
                  {selectedItems.size} sélectionné{selectedItems.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => handleDownload(getSelectedMedia())}
                  className="btn btn-sm btn-secondary"
                >
                  <i className="fas fa-download mr-2" />
                  Télécharger
                </button>
                <button
                  onClick={() => handleShare(Array.from(selectedItems))}
                  className="btn btn-sm btn-secondary"
                >
                  <i className="fas fa-share mr-2" />
                  Partager
                </button>
                {getSelectedMedia().every(m => canUserDelete(m)) && (
                  <button
                    onClick={() => handleDelete(Array.from(selectedItems))}
                    className="btn btn-sm btn-danger"
                  >
                    <i className="fas fa-trash mr-2" />
                    Supprimer
                  </button>
                )}
                <button
                  onClick={clearSelection}
                  className="btn btn-sm btn-secondary"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSelectionMode(!selectionMode)}
                  className={`btn btn-sm ${selectionMode ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <i className="fas fa-check-square mr-2" />
                  Sélection
                </button>
                <button
                  onClick={() => setShowUploader(true)}
                  className="btn btn-sm btn-primary"
                >
                  <i className="fas fa-upload mr-2" />
                  Ajouter
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Filtres */}
        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="image">Photos</option>
            <option value="video">Vidéos</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="created_at_desc">Plus récents</option>
            <option value="created_at_asc">Plus anciens</option>
            <option value="file_name_asc">Nom A-Z</option>
            <option value="file_size_desc">Taille décroissante</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.onlyFavorites}
              onChange={(e) => setFilters(prev => ({ ...prev, onlyFavorites: e.target.checked }))}
            />
            Favoris uniquement
          </label>
        </div>
      </div>

      {/* Progress d'upload */}
      {uploading && uploadProgress && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Upload en cours...</span>
            <span className="text-sm">{uploadProgress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium mb-3">Albums</h3>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedAlbum(null)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                !selectedAlbum ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Tous les médias
            </button>
            {albums.map(album => (
              <button
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap ${
                  selectedAlbum?.id === album.id ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {album.name} ({album.media_count})
              </button>
            ))}
            <button
              onClick={() => {/* Ouvrir modal création album */}}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <i className="fas fa-plus" />
            </button>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div>
        {viewMode === 'grid' ? renderMediaGrid() : renderMediaList()}
        
        {/* Bouton charger plus */}
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="btn btn-secondary"
            >
              {isLoadingMore ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2" />
                  Chargement...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2" />
                  Charger plus
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUploader && (
        <MediaUploader
          weddingId={weddingId}
          albumId={selectedAlbum?.id}
          onUpload={handleUpload}
          onClose={() => setShowUploader(false)}
        />
      )}

      {selectedMedia && (
        <MediaViewer
          media={selectedMedia}
          allMedia={media}
          userId={userId}
          onClose={() => setSelectedMedia(null)}
          onNext={(next) => setSelectedMedia(next)}
          onPrevious={(prev) => setSelectedMedia(prev)}
          onFavorite={toggleFavorite}
          onDelete={canUserDelete(selectedMedia) ? () => handleDelete([selectedMedia.id]) : null}
          onDownload={() => handleDownload([selectedMedia])}
        />
      )}
    </div>
  );
}