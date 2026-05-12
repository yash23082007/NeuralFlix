'use client'

import { useEffect, useRef, useState } from 'react'

interface TasteProfile {
  top_genres?: [string, number][]
  preferred_decades?: [string, number][]
  avg_runtime_preference?: number
  language_preferences?: [string, number][]
  rating_threshold?: number
  top_directors?: [string, number][]
}

const GENRE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981',
  '#3B82F6', '#EF4444', '#14B8A6', '#F97316', '#A855F7',
]

interface TasteDNAProps {
  profile: TasteProfile | null
  loading?: boolean
}

export default function TasteDNA({ profile, loading }: TasteDNAProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.top_genres?.length || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = canvas.clientWidth
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.35
    const genres = profile.top_genres.slice(0, 8)
    const n = genres.length
    const maxCount = genres[0][1]

    ctx.clearRect(0, 0, size, size)

    // Draw grid
    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const angle = (i / n) * Math.PI * 2 - Math.PI / 2
        const r = (radius * ring) / 5
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)'
      ctx.stroke()
    }

    // Draw data polygon
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const angle = (idx / n) * Math.PI * 2 - Math.PI / 2
      const count = genres[idx][1]
      const normalized = count / maxCount
      const r = radius * normalized
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)')
    gradient.addColorStop(1, 'rgba(139, 92, 246, 0.1)')
    ctx.fillStyle = gradient
    ctx.fill()
    ctx.strokeStyle = '#6366F1'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw labels
    ctx.font = '11px "Plus Jakarta Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      const labelR = radius + 22
      const x = cx + Math.cos(angle) * labelR
      const y = cy + Math.sin(angle) * labelR
      ctx.fillStyle = activeGenre === genres[i][0] ? '#6366F1' : 'rgba(9, 9, 11, 0.6)'
      ctx.fillText(genres[i][0], x, y)
    }
  }, [profile, activeGenre])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile?.top_genres?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)]">
        <p className="text-sm">Not enough data to build your taste profile yet.</p>
        <p className="text-xs mt-1">Watch more movies to unlock your Cinematic Fingerprint</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full aspect-square"
          style={{ maxHeight: 320 }}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {profile.top_genres.slice(0, 8).map(([genre, count], i) => (
          <button
            key={genre}
            onMouseEnter={() => setActiveGenre(genre)}
            onMouseLeave={() => setActiveGenre(null)}
            className="px-3 py-1.5 text-xs rounded-full border transition-all"
            style={{
              borderColor: GENRE_COLORS[i % GENRE_COLORS.length],
              backgroundColor: activeGenre === genre ? `${GENRE_COLORS[i % GENRE_COLORS.length]}20` : 'transparent',
              color: activeGenre === genre ? GENRE_COLORS[i % GENRE_COLORS.length] : 'var(--text-secondary)',
            }}
          >
            {genre} · {count}
          </button>
        ))}
      </div>

      {profile.preferred_decades?.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Preferred Eras</p>
          <div className="flex justify-center gap-3 mt-2">
            {profile.preferred_decades.map(([decade]) => (
              <span key={decade} className="px-3 py-1 text-sm bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
                {decade}s
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
