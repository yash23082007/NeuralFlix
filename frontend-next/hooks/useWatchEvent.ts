'use client'

import { useState, useCallback } from 'react'

interface WatchEventPayload {
  user_id: string | number
  movie_id: string | number
  metadata?: Record<string, unknown>
}

interface RatingPayload {
  user_id: string | number
  movie_id: string | number
  rating: number
  metadata?: Record<string, unknown>
}

interface UseWatchEventResult {
  trackWatch: (payload: WatchEventPayload) => Promise<boolean>
  trackRating: (payload: RatingPayload) => Promise<boolean>
  trackSearch: (userId: string | number, query: string) => Promise<boolean>
  trackClick: (userId: string | number, movieId: string | number, page: string) => Promise<boolean>
  loading: boolean
  error: string | null
}

export function useWatchEvent(): UseWatchEventResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trackWatch = useCallback(async (payload: WatchEventPayload): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/events/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(payload.user_id),
          item_id: String(payload.movie_id),
          event_type: 'watch',
          metadata: payload.metadata || {},
        }),
      })
      return res.ok
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track watch event')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const trackRating = useCallback(async (payload: RatingPayload): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/events/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(payload.user_id),
          item_id: String(payload.movie_id),
          event_type: 'rating',
          rating: payload.rating,
          metadata: payload.metadata || {},
        }),
      })
      return res.ok
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track rating')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const trackSearch = useCallback(async (userId: string | number, query: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/events/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(userId),
          query,
          event_type: 'search',
        }),
      })
      return res.ok
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track search')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const trackClick = useCallback(async (userId: string | number, movieId: string | number, page: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/events/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(userId),
          item_id: String(movieId),
          event_type: 'click',
          metadata: { page },
        }),
      })
      return res.ok
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track click')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { trackWatch, trackRating, trackSearch, trackClick, loading, error }
}
