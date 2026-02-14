/**
 * Composant LazyLoad pour optimisation performance
 * Charge les composants uniquement quand nécessaire
 */

import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';

/**
 * Wrapper pour lazy loading avec intersection observer
 */
export const LazyLoad = ({ 
  component,
  fallback = <LoadingPlaceholder />,
  threshold = 0.1,
  rootMargin = '50px',
  ...props 
}) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold,
    rootMargin,
    freezeOnceVisible: true
  });

  useEffect(() => {
    if (isIntersecting && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [isIntersecting, shouldLoad]);

  const Component = shouldLoad ? lazy(component) : null;

  return (
    <div ref={containerRef} style={{ minHeight: '200px' }}>
      {shouldLoad ? (
        <Suspense fallback={fallback}>
          <Component {...props} />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
};

/**
 * HOC pour lazy loading de composants
 */
export const withLazyLoad = (importFunc, options = {}) => {
  const LazyComponent = lazy(importFunc);
  
  return (props) => (
    <Suspense fallback={options.fallback || <LoadingPlaceholder />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Hook pour préchargement de composants
 */
export const usePreload = () => {
  const preloadedComponents = useRef(new Set());

  const preload = async (componentImport) => {
    if (!preloadedComponents.current.has(componentImport)) {
      preloadedComponents.current.add(componentImport);
      await componentImport();
    }
  };

  return { preload };
};

/**
 * Composant de chargement par défaut
 */
export const LoadingPlaceholder = ({ height = 200, showSpinner = true }) => (
  <div 
    className="flex items-center justify-center bg-gray-100 rounded-lg animate-pulse"
    style={{ height: `${height}px` }}
  >
    {showSpinner && (
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-gray-500">Chargement...</p>
      </div>
    )}
  </div>
);

/**
 * Skeleton loader pour différents types de contenu
 */
export const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6"></div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20"></div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4"></div>
            </div>
            <div className="divide-y">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex space-x-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        );
      
      case 'chart':
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          </div>
        );
      
      default:
        return <div className="h-32 bg-gray-200 rounded animate-pulse"></div>;
    }
  };

  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

/**
 * Composant pour lazy loading d'images
 */
export const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = '/images/placeholder.jpg',
  onLoad,
  onError 
}) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  const { isIntersecting } = useIntersectionObserver(imgRef, {
    threshold: 0,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (isIntersecting && !imageLoaded && !error) {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setImageSrc(src);
        setImageLoaded(true);
        onLoad?.();
      };
      
      img.onerror = () => {
        setError(true);
        onError?.();
      };
    }
  }, [isIntersecting, src, imageLoaded, error, onLoad, onError]);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      <img
        src={imageSrc}
        alt={alt}
        className={`
          transition-opacity duration-300
          ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          ${className}
        `}
      />
      {!imageLoaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <span className="text-gray-400">Erreur de chargement</span>
        </div>
      )}
    </div>
  );
};

/**
 * Provider pour gérer le lazy loading global
 */
export const LazyLoadProvider = ({ children, options = {} }) => {
  const [loadedComponents, setLoadedComponents] = useState(new Set());

  const markAsLoaded = (componentName) => {
    setLoadedComponents(prev => new Set([...prev, componentName]));
  };

  const isLoaded = (componentName) => {
    return loadedComponents.has(componentName);
  };

  const value = {
    markAsLoaded,
    isLoaded,
    options
  };

  return (
    <LazyLoadContext.Provider value={value}>
      {children}
    </LazyLoadContext.Provider>
  );
};

const LazyLoadContext = React.createContext({});

export const useLazyLoadContext = () => {
  const context = React.useContext(LazyLoadContext);
  if (!context) {
    throw new Error('useLazyLoadContext must be used within LazyLoadProvider');
  }
  return context;
};

/**
 * Utilitaire pour diviser le code par route
 */
export const lazyLoadRoute = (importFunc) => {
  return lazy(() => 
    importFunc().then(module => ({
      default: module.default
    }))
  );
};

/**
 * Batch lazy loader pour charger plusieurs composants
 */
export class BatchLazyLoader {
  constructor() {
    this.queue = [];
    this.loading = false;
  }

  add(importFunc) {
    this.queue.push(importFunc);
    if (!this.loading) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.loading = false;
      return;
    }

    this.loading = true;
    const batch = this.queue.splice(0, 3); // Charger 3 à la fois

    try {
      await Promise.all(batch.map(func => func()));
    } catch (error) {
      console.error('Batch loading error:', error);
    }

    // Continuer avec le reste
    setTimeout(() => this.processQueue(), 100);
  }
}

export const batchLoader = new BatchLazyLoader();