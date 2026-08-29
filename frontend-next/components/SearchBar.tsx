'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, ArrowRight, Clock, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface SearchSuggestion {
  tmdb_id: number
  id?: number
  title: string
  year?: number
  genres?: string[]
  poster_url?: string
  rating?: number
  cinema_region?: string
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
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('neuralflix_recent_searches')
    if (stored) setRecentSearches(JSON.parse(stored))
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setLoading(true)
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(
        `${apiBase}/api/v1/search/suggest?q=${encodeURIComponent(q)}`,
        { signal: abortControllerRef.current.signal }
      )
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSuggestions([])
      }
    } finally {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setIsOpen(true)
    if (value.length < 2) {
      setSuggestions([])
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchAPI(value), 250)
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
    router.push(`/movie/${movie.tmdb_id || movie.id}`)
  }

  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search movies, directors, 'dark sci-fi under 2 hours'..."
            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)]/90 py-2.5 pl-10 pr-10 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-warm)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-warm)] transition-all shadow-sm backdrop-blur-md"
          />
          {query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 rounded-md p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 hidden rounded border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-tertiary)] sm:inline">
              ↵
            </kbd>
          )}
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && (suggestions.length > 0 || (query.length < 2 && recentSearches.length > 0)) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Suggestions List */}
          {suggestions.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center justify-between">
                <span>Matching Titles</span>
                {loading && <span className="text-[var(--accent-warm)] animate-pulse">Searching...</span>}
              </div>
              {suggestions.map((movie) => (
                <button
                  key={movie.tmdb_id || movie.id}
                  onClick={() => handleSelect(movie)}
                  className="w-full flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--surface-hover)] group"
                >
                  {movie.poster_url ? (
                    <div className="relative h-10 w-7 overflow-hidden rounded-md shrink-0 bg-[var(--surface-muted)]">
                      <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-7 items-center justify-center rounded-md bg-[var(--surface-muted)] shrink-0">
                      <Sparkles className="h-3 w-3 text-[var(--text-tertiary)]" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warm)] transition-colors">
                      {movie.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                      {movie.year && <span>{movie.year}</span>}
                      {movie.genres?.[0] && <span>· {movie.genres[0]}</span>}
                      {movie.rating ? (
                        <span className="font-bold text-[var(--accent-warm)]">★ {movie.rating.toFixed(1)}</span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}

              <button
                onClick={handleSubmit}
                className="w-full mt-1 border-t border-[var(--border-subtle)] pt-2 pb-1 text-center text-xs font-semibold text-[var(--accent-warm)] hover:underline"
              >
                View all natural language results for &ldquo;{query}&rdquo; →
              </button>
            </div>
          ) : (
            query.length < 2 && recentSearches.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Recent Searches
                </div>
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(term)
                      router.push(`/search?q=${encodeURIComponent(term)}`)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  >
                    <span>{term}</span>
                    <ArrowRight className="h-3 w-3 text-[var(--text-tertiary)]" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
