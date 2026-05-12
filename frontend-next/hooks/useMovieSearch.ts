'use client'

import { useState, useEffect, useCallback } from 'react'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  genres?: string[]
  year?: number
  rating?: number
  overview?: string
}

interface UseMovieSearchResult {
  results: Movie[]
  loading: boolean
  error: string | null
  total: number
  search: (query: string) => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
}

export function useMovieSearch(initialQuery?: string): UseMovieSearchResult {
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState<Movie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setResults([])
      setTotal(0)
      return
    }
    setQuery(q)
    setLoading(true)
    setError(null)
    setPage(1)
    try {
      const res = await fetch(`/api/v1/movies/search?q=${encodeURIComponent(q)}&limit=20`)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      setResults(data.results || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (loading || !query) return
    const nextPage = page + 1
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/movies/search?q=${encodeURIComponent(query)}&page=${nextPage}&limit=20`)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      setResults((prev) => [...prev, ...(data.results || [])])
      setPage(nextPage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [query, page, loading])

  useEffect(() => {
    if (initialQuery) {
      search(initialQuery)
    }
  }, [initialQuery, search])

  return {
    results,
    loading,
    error,
    total,
    search,
    loadMore,
    hasMore: results.length < total,
  }
}
