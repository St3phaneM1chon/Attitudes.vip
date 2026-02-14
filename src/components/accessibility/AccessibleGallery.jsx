/**
 * Accessible Photo Gallery Component
 * Wedding photo gallery with keyboard navigation and screen reader support
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';
import AccessibleButton from './AccessibleButton';

const AccessibleGallery = ({
  photos = [],
  albums = [],
  onPhotoSelect,
  onAlbumChange,
  allowDownload = true,
  allowFullscreen = true,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentAlbum, setCurrentAlbum] = useState(albums[0] || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const galleryRef = useRef(null);
  const slideshowInterval = useRef(null);
  const { announce, settings, manageFocus } = useAccessibility();

  // Filter photos by album
  const displayPhotos = currentAlbum
    ? photos.filter(p => p.albumId === currentAlbum.id)
    : photos;

  // Current photo
  const currentPhoto = displayPhotos[currentIndex];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!galleryRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'Home':
          e.preventDefault();
          navigateToPhoto(0);
          break;
        case 'End':
          e.preventDefault();
          navigateToPhoto(displayPhotos.length - 1);
          break;
        case 'Enter':
        case ' ':
          if (e.target.classList.contains('thumbnail')) {
            e.preventDefault();
            const index = parseInt(e.target.dataset.index);
            navigateToPhoto(index);
          }
          break;
        case 'f':
        case 'F':
          if (allowFullscreen) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 's':
        case 'S':
          e.preventDefault();
          toggleSlideshow();
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            exitFullscreen();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, displayPhotos.length, isFullscreen]);

  // Slideshow
  useEffect(() => {
    if (isSlideshow) {
      slideshowInterval.current = setInterval(() => {
        navigateNext();
      }, 3000);
    } else {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
      }
    }

    return () => {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
      }
    };
  }, [isSlideshow, currentIndex]);

  // Navigation functions
  const navigateNext = () => {
    const nextIndex = (currentIndex + 1) % displayPhotos.length;
    navigateToPhoto(nextIndex);
  };

  const navigatePrevious = () => {
    const prevIndex = currentIndex === 0 ? displayPhotos.length - 1 : currentIndex - 1;
    navigateToPhoto(prevIndex);
  };

  const navigateToPhoto = (index) => {
    setCurrentIndex(index);
    const photo = displayPhotos[index];
    announce(`Photo ${index + 1} of ${displayPhotos.length}: ${photo.caption || 'No caption'}`, 'polite');
    
    if (onPhotoSelect) {
      onPhotoSelect(photo);
    }
  };

  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      enterFullscreen();
    } else {
      exitFullscreen();
    }
  };

  const enterFullscreen = () => {
    if (galleryRef.current.requestFullscreen) {
      galleryRef.current.requestFullscreen();
    } else if (galleryRef.current.webkitRequestFullscreen) {
      galleryRef.current.webkitRequestFullscreen();
    }
    setIsFullscreen(true);
    announce('Entered fullscreen mode. Press Escape to exit.');
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
    setIsFullscreen(false);
    announce('Exited fullscreen mode');
  };

  // Slideshow control
  const toggleSlideshow = () => {
    setIsSlideshow(!isSlideshow);
    announce(isSlideshow ? 'Slideshow stopped' : 'Slideshow started');
  };

  // Album change
  const handleAlbumChange = (album) => {
    setCurrentAlbum(album);
    setCurrentIndex(0);
    announce(`Switched to album: ${album.name}`);
    
    if (onAlbumChange) {
      onAlbumChange(album);
    }
  };

  // Download photo
  const downloadPhoto = (photo) => {
    const link = document.createElement('a');
    link.href = photo.fullUrl;
    link.download = photo.filename || `photo-${photo.id}.jpg`;
    link.click();
    announce(`Downloading ${photo.caption || 'photo'}`);
  };

  return (
    <div
      ref={galleryRef}
      className={`accessible-gallery ${className} ${isFullscreen ? 'fullscreen' : ''}`}
      role="region"
      aria-label="Photo gallery"
    >
      {/* Album selector */}
      {albums.length > 1 && (
        <div className="album-selector mb-4">
          <label htmlFor="album-select" className="block text-sm font-medium mb-2">
            Select Album:
          </label>
          <select
            id="album-select"
            value={currentAlbum?.id || ''}
            onChange={(e) => {
              const album = albums.find(a => a.id === e.target.value);
              handleAlbumChange(album);
            }}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            {albums.map(album => (
              <option key={album.id} value={album.id}>
                {album.name} ({album.photoCount} photos)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main photo display */}
      <div className="main-photo-container relative bg-black rounded-lg overflow-hidden">
        {currentPhoto && (
          <>
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
              className="w-full h-auto max-h-[600px] object-contain"
            />
            
            {/* Photo caption */}
            {currentPhoto.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-4">
                <p className="text-center">{currentPhoto.caption}</p>
              </div>
            )}

            {/* Navigation overlay */}
            <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
              <AccessibleButton
                variant="ghost"
                size="large"
                onClick={navigatePrevious}
                ariaLabel="Previous photo"
                className="pointer-events-auto bg-black bg-opacity-50 text-white hover:bg-opacity-75"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </AccessibleButton>
              
              <AccessibleButton
                variant="ghost"
                size="large"
                onClick={navigateNext}
                ariaLabel="Next photo"
                className="pointer-events-auto bg-black bg-opacity-50 text-white hover:bg-opacity-75"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </AccessibleButton>
            </div>
          </>
        )}
      </div>

      {/* Photo counter */}
      <div className="photo-counter text-center mt-4 text-sm text-gray-600" aria-live="polite">
        Photo {currentIndex + 1} of {displayPhotos.length}
      </div>

      {/* Control buttons */}
      <div className="controls flex justify-center gap-3 mt-4">
        <AccessibleButton
          variant="secondary"
          size="small"
          onClick={toggleSlideshow}
          ariaPressed={isSlideshow}
          ariaLabel={isSlideshow ? 'Stop slideshow' : 'Start slideshow'}
        >
          {isSlideshow ? 'Stop Slideshow' : 'Start Slideshow'}
        </AccessibleButton>
        
        {allowFullscreen && (
          <AccessibleButton
            variant="secondary"
            size="small"
            onClick={toggleFullscreen}
            ariaPressed={isFullscreen}
            ariaLabel={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            shortcutKey="f"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </AccessibleButton>
        )}
        
        {allowDownload && currentPhoto && (
          <AccessibleButton
            variant="secondary"
            size="small"
            onClick={() => downloadPhoto(currentPhoto)}
            ariaLabel={`Download ${currentPhoto.caption || 'photo'}`}
          >
            Download
          </AccessibleButton>
        )}
      </div>

      {/* Thumbnail grid */}
      <div className="thumbnail-grid mt-6">
        <h3 className="text-lg font-semibold mb-3">All Photos</h3>
        <div
          className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"
          role="list"
          aria-label="Photo thumbnails"
        >
          {displayPhotos.map((photo, index) => (
            <button
              key={photo.id}
              data-index={index}
              onClick={() => navigateToPhoto(index)}
              className={`
                thumbnail relative aspect-square overflow-hidden rounded
                ${index === currentIndex ? 'ring-2 ring-blue-500' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              aria-label={`Photo ${index + 1}: ${photo.caption || 'No caption'}`}
              aria-pressed={index === currentIndex}
            >
              <img
                src={photo.thumbnailUrl || photo.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="sr-only" aria-label="Keyboard shortcuts">
        <p>Use arrow keys to navigate photos</p>
        <p>Press F for fullscreen</p>
        <p>Press S to start or stop slideshow</p>
        <p>Press Home to go to first photo</p>
        <p>Press End to go to last photo</p>
      </div>

      {/* Hidden live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {currentPhoto && `Now showing: ${currentPhoto.caption || `Photo ${currentIndex + 1}`}`}
      </div>
    </div>
  );
};

export default AccessibleGallery;