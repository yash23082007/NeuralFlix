'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Award, Hourglass, Calendar, Compass, Star } from 'lucide-react'

interface TasteProfile {
  top_genres?: [string, number][]
  preferred_decades?: [string, number][]
  avg_runtime_preference?: number
  language_preferences?: [string, number][]
  rating_threshold?: number
  top_directors?: [string, number][]
}

interface TasteDNAProps {
  profile: TasteProfile | null
  loading?: boolean
}

export default function TasteDNA({ profile, loading }: TasteDNAProps) {
  const [activeGenre, setActiveGenre] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <div className="relative flex items-center justify-center h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#00dce5]/10" />
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#00dce5]/10 border-t-[#00dce5] shadow-[0_0_15px_rgba(0,220,229,0.3)]" />
        </div>
        <p className="text-[10px] font-mono tracking-widest text-[#00dce5] uppercase animate-pulse">
          Sequencing taste fingerprint...
        </p>
      </div>
    )
  }

  if (!profile?.top_genres?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-72 text-center border border-white/5 rounded-3xl p-8 bg-[#0c0c10]/40 backdrop-blur-sm">
        <Compass className="h-12 w-12 text-[#70707f] mb-4 opacity-50 animate-bounce" />
        <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
          Taste Profile Offline
        </h3>
        <p className="text-xs text-[#b9caca] mt-2 max-w-xs leading-relaxed">
          Watch history logs are currently insufficient to map your Cinematic Fingerprint. Watch more movies to sequence taste coordinates.
        </p>
      </div>
    )
  }

  const genres = profile.top_genres.slice(0, 8)
  const n = genres.length
  const maxCount = genres[0]?.[1] || 1

  // Radar math
  const cx = 50
  const cy = 50
  const radius = 35

  // Generate grid concentric polygons
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0]
  const gridPolygons = rings.map((ringFactor) => {
    const r = radius * ringFactor
    const points: string[] = []
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      points.push(`${x},${y}`)
    }
    return points.join(' ')
  })

  // Generate radar axis lines
  const axes = Array.from({ length: n }).map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    return { x, y }
  })

  // Generate user data polygon
  const dataPoints = genres.map(([_, count], i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const normalized = count / maxCount
    const r = radius * Math.max(0.15, normalized)
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    return { x, y, genre: genres[i][0] }
  })

  const dataPolygonString = dataPoints.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0c0c10]/40 border border-white/5 p-6 md:p-8 rounded-3xl backdrop-blur-md">
      {/* Visual Radar Column (Col Span 6) */}
      <div className="col-span-12 lg:col-span-6 flex flex-col items-center">
        
        {/* Holographic Radar Scanner Container */}
        <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
          {/* Subtle diagnostics HUD grid overlays */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:100%_4px]" />
          
          <svg className="w-full h-full drop-shadow-[0_0_20px_rgba(0,220,229,0.1)]" viewBox="0 0 100 100">
            {/* Inner Concentric Rings */}
            {gridPolygons.map((polygonStr, idx) => (
              <polygon
                key={idx}
                points={polygonStr}
                fill="none"
                stroke="rgba(0, 220, 229, 0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Radar Axes */}
            {axes.map((axis, idx) => (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={axis.x}
                y2={axis.y}
                stroke="rgba(0, 220, 229, 0.04)"
                strokeWidth="0.5"
              />
            ))}

            {/* Radar Sweeping Scan Line */}
            <motion.circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="url(#scannerGlow)"
              strokeWidth="0.75"
              strokeDasharray="25 100"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
              style={{ transformOrigin: "center" }}
            />

            {/* Glowing user Taste DNA polygon */}
            <motion.polygon
              points={dataPolygonString}
              fill="rgba(0, 220, 229, 0.06)"
              stroke="url(#tastePolyGradient)"
              strokeWidth="1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{ transformOrigin: "center" }}
            />

            {/* Vertices Nodes */}
            {dataPoints.map((p, idx) => {
              const isHovered = activeGenre === p.genre
              return (
                <g key={p.genre}>
                  {isHovered && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="2.5"
                      fill="#00dce5"
                      className="animate-ping opacity-75"
                    />
                  )}
                  <motion.circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? "2" : "1.25"}
                    fill={isHovered ? "#00dce5" : "#fface8"}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setActiveGenre(p.genre)}
                    onMouseLeave={() => setActiveGenre(null)}
                  />
                  {/* Labels on the outer ring coordinates */}
                  <text
                    x={cx + Math.cos((idx / n) * Math.PI * 2 - Math.PI / 2) * (radius + 6)}
                    y={cy + Math.sin((idx / n) * Math.PI * 2 - Math.PI / 2) * (radius + 6)}
                    fill={isHovered ? "#00dce5" : "#b9caca"}
                    fontSize="2.8"
                    fontFamily="monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-black uppercase select-none cursor-pointer tracking-wider"
                    onMouseEnter={() => setActiveGenre(p.genre)}
                    onMouseLeave={() => setActiveGenre(null)}
                  >
                    {p.genre}
                  </text>
                </g>
              )
            })}

            {/* Gradients */}
            <defs>
              <linearGradient id="tastePolyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00dce5" />
                <stop offset="100%" stopColor="#fface8" />
              </linearGradient>
              <linearGradient id="scannerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00dce5" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fface8" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Inner diagnosis telemetry metrics */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs font-mono font-black text-[#70707f] tracking-widest uppercase">TASTE</span>
            <span className="text-[10px] font-mono text-[#00dce5] tracking-widest font-black uppercase">DNA MATCH</span>
          </div>
        </div>
      </div>

      {/* Structured Telemetry Data Columns (Col Span 6) */}
      <div className="col-span-12 lg:col-span-6 space-y-6">
        
        {/* Core telemetry details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#00dce5] animate-pulse" />
            <span className="text-[10px] font-mono tracking-widest text-[#00dce5] font-black uppercase">
              CINEMATIC PROFILE SEQUENCE
            </span>
          </div>
          
          <h3 className="text-xl font-black text-white tracking-tight leading-tight">
            Cinematic DNA Telemetry
          </h3>
          <p className="text-xs text-[#b9caca] leading-relaxed font-sans">
            Visual coordinates calculated from genre affinity vectors, auteur signatures, era thresholds, and temporal metrics.
          </p>
        </div>

        {/* Dynamic Category Buttons */}
        <div className="flex flex-wrap gap-2">
          {genres.map(([genre, count], i) => {
            const isHovered = activeGenre === genre
            return (
              <button
                key={genre}
                onMouseEnter={() => setActiveGenre(genre)}
                onMouseLeave={() => setActiveGenre(null)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                  isHovered 
                    ? 'border-[#00dce5] bg-[#00dce5]/10 text-white shadow-[0_0_15px_rgba(0,220,229,0.15)]' 
                    : 'border-white/5 bg-[#08080a]/40 text-[#b9caca]'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isHovered ? 'bg-[#00dce5] animate-ping' : 'bg-[#fface8]'}`} />
                {genre} · {count}
              </button>
            )
          })}
        </div>

        {/* Monospace telemetry badges row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-white/5 pt-4">
          
          {/* Average Runtime */}
          {profile.avg_runtime_preference && (
            <div className="bg-[#08080a]/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-1">
              <span className="text-[8px] font-mono uppercase text-[#70707f] tracking-widest flex items-center gap-1">
                <Hourglass className="h-2.5 w-2.5" /> RUNTIME PREF
              </span>
              <span className="text-xs font-mono font-bold text-white mt-1">
                {profile.avg_runtime_preference} MIN
              </span>
            </div>
          )}

          {/* Decades */}
          {profile.preferred_decades && profile.preferred_decades.length > 0 && (
            <div className="bg-[#08080a]/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-1 col-span-1">
              <span className="text-[8px] font-mono uppercase text-[#70707f] tracking-widest flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" /> DOMINANT ERAS
              </span>
              <span className="text-xs font-mono font-bold text-white mt-1 truncate">
                {profile.preferred_decades.map(([d]) => `${d}s`).slice(0, 2).join(' / ')}
              </span>
            </div>
          )}

          {/* Directors */}
          {profile.top_directors && profile.top_directors.length > 0 && (
            <div className="bg-[#08080a]/40 border border-white/5 rounded-2xl p-3 flex flex-col gap-1 col-span-2 sm:col-span-1">
              <span className="text-[8px] font-mono uppercase text-[#70707f] tracking-widest flex items-center gap-1">
                <Award className="h-2.5 w-2.5" /> FAV AUTEURS
              </span>
              <span className="text-xs font-mono font-bold text-white mt-1 truncate uppercase">
                {profile.top_directors[0][0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
