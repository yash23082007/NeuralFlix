/* eslint-disable */
// @ts-nocheck
'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { MovieCard } from './MovieCard'



interface Movie {
  tmdb_id: number
  title: string
  poster_url?: string
  genres?: string[]
  rating?: number
  match_score?: number
  year?: number
}

interface RecommendationRowProps {
  title: string
  subtitle?: string
  movies: Movie[]
  showScore?: boolean
}

export default function RecommendationRow({ title, subtitle, movies, showScore = true }: RecommendationRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [useLightCards, setUseLightCards] = useState(true)

  useEffect(() => {
    const nav = navigator as Navigator & {
      deviceMemory?: number
      hardwareConcurrency?: number
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowEnd =
      reducedMotion ||
      (nav.hardwareConcurrency ?? 8) <= 4 ||
      (nav.deviceMemory ?? 8) <= 4
    setUseLightCards(lowEnd)
  }, [])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  if (!movies?.length) return null

  return (
    <section className="relative py-8">
      <div className="mb-6 px-6">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] display-font">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>

      <div className="group relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-6 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie) => (
            <div key={movie.tmdb_id} className="snap-start shrink-0">
              <div className="w-[180px] sm:w-[200px]">
                <MovieCard movie={movie} />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-white"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      </div>
    </section>
  )
}
