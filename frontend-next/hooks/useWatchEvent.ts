'use client'

import { useState, useCallback } from 'react'
import { authFetch } from '../lib/auth'

interface WatchEventPayload {
  movie_id: string | number
  metadata?: Record<string, unknown>
}

interface RatingPayload {
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
      const res = await authFetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ movie_id: Number(payload.movie_id), event: 'watch' }]),
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
      const res = await authFetch(`/api/v1/users/me/ratings/${payload.movie_id}?rating=${payload.rating}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await authFetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
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
      const res = await authFetch('/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ movie_id: Number(movieId), event: 'click', context: page }]),
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
