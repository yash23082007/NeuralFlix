'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ArrowRight, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface SearchSuggestion {
  tmdb_id: number
  title: string
  year?: number
  genres?: string[]
  poster_url?: string
  rating?: number
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('neuralflix_recent_searches')
    if (stored) setRecentSearches(JSON.parse(stored))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchAPI = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/search/movies?query=${encodeURIComponent(q)}&limit=6`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSuggestions(data.results || [])
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setIsOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAPI(value), 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const searches = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5)
    setRecentSearches(searches)
    localStorage.setItem('neuralflix_recent_searches', JSON.stringify(searches))
    setIsOpen(false)
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const handleSelect = (movie: SearchSuggestion) => {
    setIsOpen(false)
    setQuery('')
    router.push(`/movie/${movie.tmdb_id}`)
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-lg">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search films..."
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-warm)] focus:ring-2 focus:ring-[var(--accent-warm)]/20 transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]" />
            </button>
          )}
        </div>
      </form>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] overflow-hidden z-50 shadow-xl">
          {loading && (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-[var(--accent-warm)] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">Suggestions</p>
              {suggestions.map((m) => (
                <button
                  key={m.tmdb_id}
                  onClick={() => handleSelect(m)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors text-left"
                >
                  {m.poster_url ? (
                    <img src={m.poster_url} alt="" className="w-8 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-8 h-12 rounded bg-[var(--surface-muted)] flex items-center justify-center">
                      <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{m.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {m.year && `${m.year} · `}{m.rating && `${m.rating.toFixed(1)}/10`}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                </button>
              ))}
            </div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recent
              </p>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s)
                    searchAPI(s)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors text-left"
                >
                  <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                  <span className="text-sm text-[var(--text-primary)]">{s}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && query && suggestions.length === 0 && query.length >= 2 && (
            <div className="p-4 text-center text-sm text-[var(--text-tertiary)]">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  )
}
