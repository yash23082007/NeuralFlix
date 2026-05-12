'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Sparkles, RefreshCw } from 'lucide-react'
import NeuralMatchScore from '@/components/NeuralMatchScore'
import TasteDNA from '@/components/TasteDNA'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  genres?: string[]
  rating?: number
  match_score?: number
  year?: number
}

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary']
const MOODS = ['Exciting', 'Chill', 'Thoughtful', 'Funny', 'Intense', 'Romantic']

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const [recommendations, setRecommendations] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [streaming, setStreaming] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'popularity' | 'year'>('score')
  const [tasteProfile, setTasteProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const userId = searchParams.get('user_id') || '1'

  useEffect(() => {
    async function fetchTasteProfile() {
      try {
        const res = await fetch('/api/recommendations/user/' + userId + '?top_k=1')
        if (res.ok) {
          const data = await res.json()
          if (data.profile) setTasteProfile(data.profile)
        }
      } catch { /* ignore */ }
      setProfileLoading(false)
    }
    fetchTasteProfile()
  }, [userId])

  const fetchRecommendations = useCallback(async (pageNum: number, append = false) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ top_k: '20', page: String(pageNum) })
      if (selectedGenres.length) params.set('genres', selectedGenres.join(','))
      if (selectedMood) params.set('mood', selectedMood)
      params.set('sort', sortBy)

      const recsRes = await fetch('/api/recommendations/user/' + userId + '?' + params)
      if (recsRes.ok) {
        const recsData = await recsRes.json()
        const movies = (recsData.recommendations || []).map((m: any) => ({
          ...m,
          match_score: m.score ? Math.round(m.score * 100) : 85,
        }))
        if (append) {
          setRecommendations((prev) => [...prev, ...movies])
        } else {
          setRecommendations(movies)
        }
        setHasMore(movies.length === 20)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [userId, selectedGenres, selectedMood, sortBy])

  useEffect(() => { fetchRecommendations(1) }, [fetchRecommendations])

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loading])

  useEffect(() => {
    if (page > 1) fetchRecommendations(page, true)
  }, [page, fetchRecommendations])

  useEffect(() => {
    if (!userId) return
    let ws: WebSocket | null = null
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      ws = new WebSocket(protocol + '//' + window.location.host + '/ws/recommendations/' + userId)
      ws.onopen = () => setStreaming(true)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'recommendations_update' && msg.data) {
            setRecommendations(msg.data.slice(0, 20).map((m: any) => ({
              ...m, match_score: m.score ? Math.round(m.score * 100) : 85,
            })))
          }
        } catch { /* ignore */ }
      }
      ws.onclose = () => setStreaming(false)
    } catch { /* ignore */ }
    return () => { ws?.close(); setStreaming(false) }
  }, [userId])

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] display-font flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-[var(--accent-primary)]" />
              Your Recommendations
            </h1>
            <p className="text-[var(--text-secondary)] mt-1">Curated by our hybrid neural engine</p>
          </div>
          {streaming && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Filters</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 mb-2">Genres</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button key={genre} onClick={() => toggleGenre(genre)}
                    className={'px-3 py-1.5 text-xs rounded-full border transition-all ' + (selectedGenres.includes(genre) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-gray-600 border-gray-200 hover:border-indigo-400')}>
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-2">Mood</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => (
                    <button key={mood} onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                      className={'px-3 py-1.5 text-xs rounded-full border transition-all ' + (selectedMood === mood ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-gray-600 border-gray-200')}>
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Sort By</p>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 text-xs rounded-full border border-gray-200 bg-transparent text-gray-600">
                  <option value="score">Match Score</option>
                  <option value="popularity">Popularity</option>
                  <option value="year">Release Year</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] display-font mb-4">Your Taste DNA</h2>
          <TasteDNA profile={tasteProfile} loading={profileLoading} />
        </div>

        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Top Picks for You
            </h2>
            <button onClick={() => { setPage(1); fetchRecommendations(1) }}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-violet-600 transition-colors">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
          {loading && recommendations.length === 0 ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {recommendations.slice(0, 20).map((movie) => (
                <div key={movie.tmdb_id} className="relative group cursor-pointer"
                  onClick={() => { window.location.href = '/movie/' + movie.tmdb_id }}>
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 relative">
                    {movie.poster_url ? (
                      <img src={movie.poster_url} alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{movie.title?.[0]}</div>
                    )}
                    <div className="absolute top-2 right-2">
                      <NeuralMatchScore score={movie.match_score || 85} size="sm" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{movie.title}</p>
                    <p className="text-xs text-gray-400">{movie.year && movie.year}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
          {loading && recommendations.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
