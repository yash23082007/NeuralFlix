'use client'

import { useState, useEffect } from 'react'
import { Film, Clock, Star, BarChart3, Brain, CalendarDays, Activity, Globe, Compass, RefreshCw } from 'lucide-react'

interface Director {
  name: string;
  count: number;
  image: string;
}

const DEFAULT_DIRECTORS: Director[] = [
  { name: "Wong Kar-wai", count: 18, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUoa4NgBV87bZjk1_L_xkCNPitkFA4J8nndWiB3NlEyepKTIR7RWq4bb63ElP-6alEhMu0pX-rThXMOxOS6EgJktKjgSQnlql0NVdCmS-ZFGuaAacJgVc60NSESjC6Pl_XPiO1XiQ_WEzK4Y0bqzB67i8ElEiZYkFuzphsn3BjsQpLpE0Q7hWPDynYVIokaBc7HfVuayqzN6H6ROWyyRHbE2A3EEw1-0IAJcF02a2xePNJGOLLc_NlHv3IDtA7nj6hFXwAufnicpo" },
  { name: "Denis Villeneuve", count: 12, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkZclSu7wvKNgFKry8OGGm3gY-VvA-rze2QIovvGW5kiox2Grep9YacQyZRe5xK9J0TIX1AZqlLG3P5mZP-oSl34gc7jKXhxCBWyaIxMNxQLRftBZ1hdgkHWuDU_W2dAVz2uq1Iuv-jDz_oX1cOrPzRBO8t6RMQNn7HfZ2v9apSDT-8_gJH5N7gV-L34U1ghm_-XpncFWMor4pa3mqY4uPgxvgFR0ihfqebVp-wpu3azv--nBpUYtN3LEr_gDcuaqemS5TkOt-LvM" },
  { name: "Celine Sciamma", count: 9, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuApeZp86D5EcrFF1B9CUT_bbWpvdLi0GzY_x1eeEN9uEsBPaivJVJG3x-xmYnrz4txaRaC9ipNxDsUDhkvVsWg-2QfUNWvhqh5ejcI1DKaWyKbt_Ge04R-QeSTlF3PtcjIJlP6IchEAWT85c7_jxcDgE5Eyd6orBV220Rh1MRLpwHBwwcoEJpw0nTU-3W9EacG8GFbz-nNALyhgb5QmDdSSS5wi_GGGJxNiQzrKWrWU479ysP71u5myjcTXFPqNLPgXw_h5vCIN3xw" },
  { name: "Bong Joon-ho", count: 11, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB4xTbAMBgiEg6Sa24Up_zz4ZfdwVa0mx3nplS7sECs_wJhX-j5ORDjHAPgj_bxKhrxZcVcxaDA2EYhKPdveh5GbkvP5yx-60JDum8ysNUX6w61DKazCHg4OCrXBPDaE2VwywPwmdyQL6w-ydSfJ2_oD2pFmRnXYDvHerrjZ3t8g1tJ2hGrKaUqJ-C2Tj3D8m0vNUqKIbjby8IPPfm7T3sllcxofX9AXJf7PyD5oumj4HsCfJ5L_MRrIxFHOuprlZDxw3U24Opa-bM" },
  { name: "Greta Gerwig", count: 8, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRgFzNJgLmg10XdGI4yT_fw5L4tw2QAK9AmseZPG0xlGyBzIZUyP0JteBMaDTYl3A0H_PjBdw_yRgNzdCteZL8iTP-qpCveDGILqzO1QUg5aTAOFVYW6ETWdNq6R3CbMaQaqIh-86tX2OXVRxna0wV3r76QJToPEYxvbE0y9-7qjStOLyCeWqcJs9SHQgwmzWi2yNQ5NpoVBZfcxI5z1zT2rb6yunekksKMM_RpjvVHoXc9-kYuwn2FSvEOLRGSyReifxPRM0AQJk" }
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState({ movies: 0, hours: 0, avgRating: 0, topGenre: 'N/A' })

  useEffect(() => {
    async function fetchData() {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const [profileRes, historyRes] = await Promise.all([
          fetch(`${API}/api/v1/users/1/profile`),
          fetch(`${API}/api/v1/users/1/history`),
        ])
        if (profileRes.ok) {
          const data = await profileRes.json()
          setProfile(data.profile || data)
        }
        if (historyRes.ok) {
          const data = await historyRes.json()
          const h = data.history || data.results || []
          setHistory(h)
          setStats({
            movies: h.length,
            hours: Math.round(h.reduce((a: number, m: any) => a + (m.runtime || 120), 0) / 60),
            avgRating: h.length > 0 ? (h.reduce((a: number, m: any) => a + (m.rating || 0), 0) / h.length) : 0,
            topGenre: 'Drama',
          })
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    fetchData()
  }, [])

  const profileData = profile as any

  const genresDistribution = [
    { name: "Nordic Noir", value: 32, color: "#00dce5" },
    { name: "Neo-Tokyo Cyberpunk", value: 24, color: "#fface8" },
    { name: "Latin Magic Realism", value: 18, color: "#d1bcff" },
    { name: "New Wave French", value: 14, color: "#849495" }
  ];

  return (
    <div className="min-h-screen bg-[#131314] text-[#e5e2e3] font-sans overflow-x-hidden selection:bg-[#00dce5]/20 selection:text-[#00dce5] relative pt-28 pb-20">
      
      {/* Immersive fixed aurora-mesh background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-1/4 left-1/4 h-[800px] w-[800px] rounded-full bg-radial from-[#00dce5]/10 to-transparent blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-[600px] w-[600px] rounded-full bg-radial from-[#fface8]/5 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-container-max mx-auto px-6 sm:px-12 md:px-margin-desktop space-y-16">
        
        {/* Profile Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
          <div>
            <span className="font-label-caps text-xs text-[#00dce5] uppercase tracking-[0.2em] mb-4 block">CURATOR PROFILE</span>
            <h1 className="font-display-lg text-5xl md:text-6xl font-black text-white leading-none mb-4">Cinematic Portfolio</h1>
            <p className="text-[#b9caca] max-w-2xl text-base leading-relaxed">
              A statistical overview of your cinematic journey. This portfolio tracks your viewing habits, directorial preferences, and the qualitative attributes of your library.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => window.print()}
              className="bg-[#00dce5] text-[#002021] px-8 py-3.5 rounded-full font-black font-label-caps text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,220,229,0.3)]"
            >
              EXPORT PORTFOLIO
            </button>
          </div>
        </header>

        {/* Bento Grid Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
          
          {/* Viewing Stats Card */}
          <div className="md:col-span-4 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5 flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex items-center gap-2 mb-10 text-[#00dce5]">
                <Activity className="h-5 w-5" />
                <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">VIEWING STATS</span>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="text-5xl font-black text-white tracking-tight">{loading ? "..." : stats.movies}</div>
                  <div className="text-xs text-[#b9caca] uppercase tracking-wider font-semibold mt-1">Films Cataloged</div>
                </div>
                <div>
                  <div className="text-5xl font-black text-white tracking-tight">{loading ? "..." : stats.hours}</div>
                  <div className="text-xs text-[#b9caca] uppercase tracking-wider font-semibold mt-1">Hours Screened</div>
                </div>
                <div>
                  <div className="text-5xl font-black text-white tracking-tight">{loading ? "..." : stats.avgRating > 0 ? `${(stats.avgRating * 10).toFixed(0)}%` : "0%"}</div>
                  <div className="text-xs text-[#b9caca] uppercase tracking-wider font-semibold mt-1">Curation Affinity</div>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-xs text-[#b9caca] italic">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Real-time matrix sync completed
            </div>
          </div>

          {/* Genre Distribution Card */}
          <div className="md:col-span-8 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5 min-h-[460px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-8 text-[#fface8]">
                <BarChart3 className="h-5 w-5" />
                <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">GENRE DISTRIBUTION</span>
              </div>
              <div className="space-y-6">
                {genresDistribution.map((genre) => (
                  <div key={genre.name} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="font-body-lg font-bold text-white text-base">{genre.name}</span>
                      <span className="text-xs font-black text-[#b9caca]">{genre.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${genre.value}%`,
                          backgroundColor: genre.color,
                          boxShadow: `0 0 15px ${genre.color}50`
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 text-xs text-[#b9caca] leading-relaxed">
              Your genre preferences reveal a high level of cinematic openness, emphasizing visual ambiance and narrative complexity.
            </div>
          </div>

          {/* Regional Coverage Map Section */}
          <div className="md:col-span-7 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5 min-h-[440px] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-[#00dce5]">
                <Globe className="h-5 w-5" />
                <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">REGIONAL COVERAGE</span>
              </div>
              <span className="text-xs font-semibold text-[#b9caca]">62 Countries Indexed</span>
            </div>
            
            <div className="flex-grow flex items-center justify-center relative overflow-hidden rounded-2xl bg-black/30 border border-white/5 min-h-[220px]">
              <img
                className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen scale-105"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGqS8KNoju1Qi8Y9a71n3PxatHaDiPGRhxm3Esj1VER4a-UrvHuoQ21DezWEZyvuLnS-bUePt6Ze9xR7M_3egODjfgNDpupOKUbIjHt0hay9sPrNV4rzkw7mTlDteOdMVtBpfk4IPueK_plmj6acwER8J15_SfIZ-ui9sV1EJ4kAtqxmriSuN6pNfCoVWPUf539WdolZ6TyMPKnpz28x7QR4rB5QfgjcwyTKkpnSHhw8F6mkoV4ZulRJA3W5WBUhhmuyqqAz0FcN4"
                alt="Global wireframe map representation"
              />
              <div className="relative z-10 flex flex-wrap gap-3 justify-center p-6">
                <span className="glass-panel px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white bg-surface/20">Europe (42%)</span>
                <span className="glass-panel px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white bg-surface/20">East Asia (28%)</span>
                <span className="glass-panel px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white bg-surface/20">Latin America (15%)</span>
                <span className="glass-panel px-4 py-2 rounded-full border border-white/10 text-xs font-bold text-white bg-surface/20">Others (15%)</span>
              </div>
            </div>
          </div>

          {/* Film Attributes radar chart */}
          <div className="md:col-span-5 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5 min-h-[440px] flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-8 text-[#d1bcff]">
              <Compass className="h-5 w-5" />
              <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">FILM ATTRIBUTES</span>
            </div>
            
            <div className="flex-grow flex items-center justify-center">
              <div className="relative w-52 h-52">
                <div className="absolute inset-0 border border-white/10 rounded-full"></div>
                <div className="absolute inset-4 border border-white/10 rounded-full"></div>
                <div className="absolute inset-12 border border-white/10 rounded-full"></div>
                <div className="absolute inset-20 border border-white/10 rounded-full"></div>
                
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/10"></div>
                <div className="absolute left-1/2 top-0 h-full w-px bg-white/10"></div>
                
                <svg className="absolute inset-0 w-full h-full transform -rotate-90 drop-shadow-[0_0_10px_rgba(0,220,229,0.4)]" viewBox="0 0 100 100">
                  <polygon className="fill-[#00dce5]/20 stroke-[#00dce5] stroke-[0.75]" points="50,15 80,50 50,85 20,50"></polygon>
                  <circle className="fill-[#00dce5]" cx="50" cy="15" r="2"></circle>
                  <circle className="fill-[#00dce5]" cx="80" cy="50" r="2"></circle>
                  <circle className="fill-[#00dce5]" cx="50" cy="85" r="2"></circle>
                  <circle className="fill-[#00dce5]" cx="20" cy="50" r="2"></circle>
                </svg>
                
                <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-white">Cinematography</div>
                <div className="absolute bottom-[-25px] left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-white">Pacing</div>
                <div className="absolute top-1/2 right-[-50px] -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-white">Writing</div>
                <div className="absolute top-1/2 left-[-45px] -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-white">Acting</div>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-[#b9caca]">
              Narrative attributes align with visually rich auteur profiles.
            </div>
          </div>

          {/* Favorite Directors Section */}
          <div className="md:col-span-12 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5">
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2 text-[#fface8]">
                <Activity className="h-5 w-5" />
                <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">FAVORITE DIRECTORS</span>
              </div>
              <span className="text-xs font-semibold text-[#b9caca]">Ranked by total catalog interaction</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
              {DEFAULT_DIRECTORS.map((dir, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative border border-white/5 shadow-md">
                    <img
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 filter brightness-90 group-hover:brightness-100"
                      src={dir.image}
                      alt={dir.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#131314] to-transparent opacity-0 group-hover:opacity-40 transition-opacity"></div>
                  </div>
                  <h4 className="font-bold text-white text-sm truncate">{dir.name}</h4>
                  <p className="text-xs text-[#b9caca] mt-1">{dir.count} Titles Screened</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Curation Logs */}
          <div className="md:col-span-12 glass-panel p-8 rounded-3xl border border-white/10 bg-surface/5">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <CalendarDays className="h-5 w-5 text-[#00dce5]" />
              <span className="font-label-caps text-xs tracking-widest font-black uppercase text-white">RECENT VIEWING LOGS</span>
            </div>
            
            {history.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {history.slice(0, 9).map((m: any, i: number) => (
                  <a
                    href={`/movie/${m.tmdb_id || m.id}`}
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-[#00dce5]/20 hover:bg-[#00dce5]/5 transition-all duration-300 cursor-pointer"
                  >
                    {m.poster_url ? (
                      <img src={m.poster_url} alt={m.title} className="w-12 h-18 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-18 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Film className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{m.title}</p>
                      <p className="text-xs text-[#b9caca] mt-1 line-clamp-1">
                        {m.genres?.slice(0, 2).join(', ') || "Drama"}
                      </p>
                      {m.rating && (
                        <div className="flex items-center gap-1 text-[10px] text-[#00dce5] font-black uppercase mt-2">
                          <Star className="h-3.5 w-3.5 fill-current" />
                          {(m.rating * 10).toFixed(0)}% Affinity
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#b9caca]">
                <Film className="w-10 h-10 mx-auto mb-3 opacity-30 text-[#00dce5]" />
                <p className="text-sm font-bold text-white">No viewing logs logged yet</p>
                <p className="text-xs mt-1">Begin matching titles to catalog your cinematic fingerprint.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
