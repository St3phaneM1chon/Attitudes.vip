/**
 * Hook pour Intersection Observer API
 * Détecte quand un élément entre dans le viewport
 */

import { useState, useEffect, useRef } from 'react'

export function useIntersectionObserver (
  elementRef,
  {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false
  } = {}
) {
  const [entry, setEntry] = useState()
  const [isIntersecting, setIsIntersecting] = useState(false)
  const frozen = useRef(false)

  const updateEntry = ([entry]) => {
    setEntry(entry)
    setIsIntersecting(entry.isIntersecting)

    if (entry.isIntersecting && freezeOnceVisible) {
      frozen.current = true
    }
  }

  useEffect(() => {
    const node = elementRef?.current
    const hasIOSupport = !!window.IntersectionObserver

    if (!hasIOSupport || frozen.current || !node) {
      return
    }

    const observerParams = { threshold, root, rootMargin }
    const observer = new IntersectionObserver(updateEntry, observerParams)

    observer.observe(node)

    return () => observer.disconnect()
  }, [elementRef, threshold, root, rootMargin, frozen])

  return { entry, isIntersecting }
}
