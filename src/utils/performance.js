/**
 * Utilitaires pour optimisation des performances
 * Mémorisation, debouncing, throttling, etc.
 */

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Hook pour debounce d'une valeur
 */
export function useDebounce (value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook pour throttle d'une fonction
 */
export function useThrottle (callback, delay = 300) {
  const lastRun = useRef(Date.now())
  const timeoutRef = useRef()

  return useCallback((...args) => {
    const now = Date.now()
    const timeSinceLastRun = now - lastRun.current

    if (timeSinceLastRun >= delay) {
      lastRun.current = now
      callback(...args)
    } else {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now()
        callback(...args)
      }, delay - timeSinceLastRun)
    }
  }, [callback, delay])
}

/**
 * Hook pour mémorisation profonde
 */
export function useDeepMemo (factory, deps) {
  const ref = useRef()

  if (!ref.current || !deepEqual(deps, ref.current.deps)) {
    ref.current = {
      deps,
      value: factory()
    }
  }

  return ref.current.value
}

/**
 * Comparaison profonde d'objets
 */
function deepEqual (a, b) {
  if (a === b) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
      return false
    }
  }

  return true
}

/**
 * Mémorisation de fonction avec cache LRU
 */
export function memoizeWithLRU (fn, maxSize = 10) {
  const cache = new Map()

  return (...args) => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      const value = cache.get(key)
      // Déplacer en tête (LRU)
      cache.delete(key)
      cache.set(key, value)
      return value
    }

    const result = fn(...args)
    cache.set(key, result)

    // Limiter la taille du cache
    if (cache.size > maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    return result
  }
}

/**
 * Gestionnaire de requêtes avec déduplication
 */
export class RequestDeduplicator {
  constructor () {
    this.pending = new Map()
  }

  async execute (key, requestFn) {
    // Si une requête est en cours, retourner la promesse existante
    if (this.pending.has(key)) {
      return this.pending.get(key)
    }

    // Créer une nouvelle promesse
    const promise = requestFn().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }
}

/**
 * Hook pour gérer le virtual scrolling
 */
export function useVirtualScroll ({
  items,
  itemHeight,
  containerHeight,
  overscan = 3
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return { startIndex, endIndex }
  }, [scrollTop, items.length, itemHeight, containerHeight, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e) => setScrollTop(e.target.scrollTop)
  }
}

/**
 * Batch processor pour regrouper les opérations
 */
export class BatchProcessor {
  constructor (processFn, options = {}) {
    this.processFn = processFn
    this.delay = options.delay || 50
    this.maxBatchSize = options.maxBatchSize || 100
    this.queue = []
    this.timeoutId = null
  }

  add (item) {
    this.queue.push(item)

    if (this.queue.length >= this.maxBatchSize) {
      this.flush()
    } else if (!this.timeoutId) {
      this.timeoutId = setTimeout(() => this.flush(), this.delay)
    }
  }

  flush () {
    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.maxBatchSize)
    this.processFn(batch)

    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    // Continuer s'il reste des éléments
    if (this.queue.length > 0) {
      this.timeoutId = setTimeout(() => this.flush(), 0)
    }
  }
}

/**
 * Hook pour optimisation du rendu avec RAF
 */
export function useAnimationFrame (callback) {
  const requestRef = useRef()
  const previousTimeRef = useRef()

  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current
      callback(deltaTime)
    }
    previousTimeRef.current = time
    requestRef.current = requestAnimationFrame(animate)
  }, [callback])

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate)
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [animate])
}

/**
 * Mesure de performance
 */
export class PerformanceMonitor {
  constructor (name) {
    this.name = name
    this.marks = new Map()
    this.measures = []
  }

  mark (label) {
    this.marks.set(label, performance.now())
  }

  measure (label, startMark, endMark) {
    const start = this.marks.get(startMark)
    const end = endMark ? this.marks.get(endMark) : performance.now()

    if (start) {
      const duration = end - start
      this.measures.push({ label, duration })

      if (window.performance && window.performance.measure) {
        try {
          window.performance.measure(
            `${this.name}-${label}`,
            startMark,
            endMark
          )
        } catch (e) {
          // Ignorer les erreurs de performance API
        }
      }

      return duration
    }

    return 0
  }

  getReport () {
    return {
      name: this.name,
      measures: this.measures,
      totalTime: this.measures.reduce((sum, m) => sum + m.duration, 0)
    }
  }

  log () {
    const report = this.getReport()
    console.group(`⚡ Performance: ${report.name}`)
    report.measures.forEach(({ label, duration }) => {
      console.log(`${label}: ${duration.toFixed(2)}ms`)
    })
    console.log(`Total: ${report.totalTime.toFixed(2)}ms`)
    console.groupEnd()
  }
}

/**
 * Hook pour lazy loading d'images avec placeholder
 */
export function useLazyImage (src, placeholder) {
  const [imageSrc, setImageSrc] = useState(placeholder || '')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const img = new Image()
    img.src = src

    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
    }

    img.onerror = () => {
      setIsLoading(false)
    }

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src])

  return { imageSrc, isLoading }
}

/**
 * Optimiseur de liste pour React
 */
export function optimizeListRendering (items, keyExtractor) {
  return items.map((item, index) => ({
    ...item,
    _key: keyExtractor ? keyExtractor(item, index) : index,
    _index: index
  }))
}

/**
 * Cache de calculs coûteux
 */
export class ComputationCache {
  constructor (computer, options = {}) {
    this.computer = computer
    this.cache = new Map()
    this.maxAge = options.maxAge || 60000 // 1 minute par défaut
  }

  compute (key, ...args) {
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.value
    }

    const value = this.computer(...args)
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    return value
  }

  invalidate (key) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }
}
