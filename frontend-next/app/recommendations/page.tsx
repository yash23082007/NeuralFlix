'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { SlidersHorizontal, Sparkles, RefreshCw, Cpu, Activity, ListFilter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import TasteDNA from '@/components/TasteDNA'
import MovieCard from '@/components/MovieCard'

interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  genres?: string[]
  rating?: number
  rec_score?: number
  popularity_score?: number
  year?: number
  language?: string
  cinema_region?: string
}

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary']
const MOODS = ['Exciting', 'Chill', 'Thoughtful', 'Funny', 'Intense', 'Romantic']
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function RecommendationsContent() {
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
        const res = await fetch(`${API}/api/v1/users/${userId}/profile`)
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

      const recsRes = await fetch(`${API}/api/v1/recommendations/user/${userId}?` + params)
      if (recsRes.ok) {
        const recsData = await recsRes.json()
        const movies = (recsData.recommendations || []).map((m: any) => ({
          ...m,
          rec_score: m.score != null ? m.score : 0.85,
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

  useEffect(() => { setPage(1); fetchRecommendations(1) }, [selectedGenres, selectedMood, sortBy, fetchRecommendations])

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
      const wsUrl = `${protocol}//${API.replace(/^https?:\/\//, '')}/ws/recommendations/${userId}`
      ws = new WebSocket(wsUrl)
      ws.onopen = () => setStreaming(true)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'recommendations_update' && msg.data) {
            setRecommendations(msg.data.slice(0, 20).map((m: any) => ({
              ...m, rec_score: m.score != null ? m.score : 0.85,
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

  // Framer Motion helper
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  }

  return (
    <main className="min-h-screen bg-[#08080a] text-[#e5e2e3] relative overflow-hidden font-sans selection:bg-[#00dce5]/20 selection:text-[#00dce5] pt-28 pb-24 page-enter">
      
      {/* Dynamic Film Grain backdrop */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03] bg-film-grain" />

      {/* Cybernetic telemetry blueprint grid */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle, rgba(0,220,229,0.05) 1px, transparent 1px)",
            backgroundSize: "36px 36px"
          }}
        />
        <div className="absolute top-1/4 left-1/4 h-[700px] w-[700px] rounded-full bg-radial from-[#00dce5]/8 to-transparent blur-3xl animate-pulse" style={{ animationDuration: "10s" }} />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-12 md:px-24">
        
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10 border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-[#00dce5] font-black uppercase">
              <Cpu className="h-3.5 w-3.5 animate-pulse" />
              NEURAL CURATION ARCHIVES
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[#00dce5]" />
              Personalized Recommendations
            </h1>
            <p className="text-xs text-[#b9caca] mt-1">
              High-fidelity match coordinates calculated by our hybrid neural engine matrix.
            </p>
          </div>
          
          <AnimatePresence>
            {streaming && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#00dce5]/10 border border-[#00dce5]/20 rounded-full"
              >
                <span className="w-2 h-2 bg-[#00dce5] rounded-full animate-ping" />
                <span className="text-[9px] font-mono text-[#00dce5] font-bold uppercase tracking-wider">LIVE TELEMETRY</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Taste DNA Section */}
        <section className="mb-10">
          <TasteDNA profile={tasteProfile} loading={profileLoading} />
        </section>

        {/* Re-skinned Filter Panel (Bento Style) */}
        <div className="bg-[#0c0c10]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md mb-10 relative">
          <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-[#00dce5]/40" />
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
            <ListFilter className="w-4 h-4 text-[#00dce5]" />
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-white">
              Tuning Filters console
            </span>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[9px] font-mono uppercase text-[#70707f] tracking-widest mb-3">GENRE COORDINATES</p>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => {
                  const active = selectedGenres.includes(genre)
                  return (
                    <button 
                      key={genre} 
                      onClick={() => toggleGenre(genre)}
                      className={`px-3 py-1.5 text-xs rounded-xl border font-mono uppercase tracking-wider transition-all cursor-pointer ${
                        active 
                          ? 'bg-[#00dce5] text-[#002021] border-[#00dce5] font-bold shadow-[0_0_15px_rgba(0,220,229,0.3)]' 
                          : 'bg-transparent text-[#b9caca] border-white/5 hover:border-[#00dce5]/30'
                      }`}
                    >
                      {genre}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <p className="text-[9px] font-mono uppercase text-[#70707f] tracking-widest mb-3">EMOTIONAL BIAS</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((mood) => {
                    const active = selectedMood === mood
                    return (
                      <button 
                        key={mood} 
                        onClick={() => setSelectedMood(active ? null : mood)}
                        className={`px-3 py-1.5 text-xs rounded-xl border font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          active 
                            ? 'bg-[#fface8] text-black border-[#fface8] font-bold shadow-[0_0_15px_rgba(255,172,232,0.3)]' 
                            : 'bg-transparent text-[#b9caca] border-white/5 hover:border-[#fface8]/30'
                        }`}
                      >
                        {mood}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-mono uppercase text-[#70707f] tracking-widest mb-3">RERANK ALGORITHM</p>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full max-w-xs px-4 py-2 text-xs rounded-xl border border-white/5 bg-[#08080a] text-white font-mono uppercase tracking-wider focus:outline-none focus:border-[#00dce5] transition-colors"
                >
                  <option value="score">Neural Match Score</option>
                  <option value="popularity">Popularity Index</option>
                  <option value="year">Temporal Archiving</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Recommends Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-6">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00dce5]" />
              Top Curation Outputs
            </h2>
            <button 
              onClick={() => { setPage(1); fetchRecommendations(1) }}
              className="flex items-center gap-1.5 text-xs font-mono tracking-widest text-[#00dce5] hover:text-[#fface8] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> RE-CALCULATE
            </button>
          </div>

          {loading && recommendations.length === 0 ? (
            <div className="flex justify-center py-24">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00dce5]/10 border-t-[#00dce5] shadow-[0_0_20px_rgba(0,220,229,0.3)]" />
                <p className="text-xs font-mono tracking-widest text-[#70707f] uppercase animate-pulse">Running matrices...</p>
              </div>
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
            >
              {recommendations.slice(0, 20).map((movie) => (
                <motion.div key={movie.tmdb_id} variants={itemVariants}>
                  <MovieCard movie={movie} />
                </motion.div>
              ))}
            </motion.div>
          )}

          <div ref={sentinelRef} className="h-4" />
          
          {loading && recommendations.length > 0 && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#00dce5] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#08080a] pt-28 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00dce5] border-t-transparent" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </main>
    }>
      <RecommendationsContent />
    </Suspense>
  )
}
