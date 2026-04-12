import { notFound } from "next/navigation";
import { MovieCard, Movie } from "../../../components/MovieCard";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const REGION_MAP: Record<string, {
  title: string;
  subtitle: string;
  flag: string;
  accent: string;
  filmMovement?: string;
  filmMovementDesc?: string;
  keyDirectors?: string[];
  iconicFilms?: string[];
  ottPlatforms?: string[];
}> = {
  // ── Indian Industries ──────────────────────────
  indian:    { title: "Indian Cinema", subtitle: "10 Industries, 22 Languages, Infinite Stories", flag: "🇮🇳", accent: "#FF6B35",
    filmMovement: "Parallel Cinema (Indian New Wave)", filmMovementDesc: "Satyajit Ray, Shyam Benegal, Mira Nair — realism that inspired world cinema.",
    keyDirectors: ["Satyajit Ray", "S.S. Rajamouli", "Mani Ratnam", "Anurag Kashyap"],
    iconicFilms: ["Pather Panchali", "Baahubali", "Sholay", "Dil Chahta Hai", "RRR"],
    ottPlatforms: ["Netflix", "Hotstar", "JioCinema", "Amazon Prime", "ZEE5"] },
  bollywood: { title: "Bollywood", subtitle: "Hindi Cinema — Mumbai's Dream Factory", flag: "🇮🇳", accent: "#FF6B35",
    keyDirectors: ["Sanjay Leela Bhansali", "Rajkumar Hirani", "Anurag Kashyap", "Zoya Akhtar"],
    iconicFilms: ["Sholay", "DDLJ", "3 Idiots", "Dangal", "Pathaan"] },
  tollywood: { title: "Tollywood", subtitle: "Telugu Cinema — Epic Scale & Pan-India Power", flag: "🇮🇳", accent: "#F39C12",
    keyDirectors: ["S.S. Rajamouli", "Sukumar", "Trivikram", "Sekhar Kammula"],
    iconicFilms: ["Baahubali", "RRR", "Pushpa", "Eega", "Arjun Reddy"] },
  kollywood: { title: "Kollywood", subtitle: "Tamil Cinema — Superstar Legacy & Social Commentary", flag: "🇮🇳", accent: "#E74C3C",
    keyDirectors: ["Mani Ratnam", "Lokesh Kanagaraj", "Pa. Ranjith", "Vetrimaaran"],
    iconicFilms: ["Vikram", "Roja", "Indian", "Kaala", "Vada Chennai"] },
  mollywood: { title: "Mollywood", subtitle: "Malayalam Cinema — India's Quality Cinema Capital", flag: "🇮🇳", accent: "#27AE60",
    keyDirectors: ["Lijo Jose Pellissery", "Aashiq Abu", "Dileesh Pothan", "Jeethu Joseph"],
    iconicFilms: ["Drishyam", "Jallikattu", "Kumbalangi Nights", "Premam"] },
  sandalwood: { title: "Sandalwood", subtitle: "Kannada Cinema — Karnataka's Rising Force", flag: "🇮🇳", accent: "#8E44AD",
    iconicFilms: ["KGF", "Kantara", "777 Charlie", "Ulidavaru Kandanthe"] },
  bengali:   { title: "Bengali Cinema", subtitle: "Satyajit Ray's Legacy — Art Cinema Capital of India", flag: "🇮🇳", accent: "#2980B9",
    filmMovement: "Indian Parallel Cinema", filmMovementDesc: "Satyajit Ray's Apu Trilogy changed world cinema forever.",
    keyDirectors: ["Satyajit Ray", "Ritwik Ghatak", "Rituparno Ghosh", "Srijit Mukherji"],
    iconicFilms: ["Pather Panchali", "Charulata", "Kahaani", "Feluda series"] },
  marathi:   { title: "Marathi Cinema", subtitle: "Award-Winning Regional Cinema from Maharashtra", flag: "🇮🇳", accent: "#D35400",
    iconicFilms: ["Court", "Sairat", "Natrang", "The Disciple"] },
  punjabi:   { title: "Punjabi Cinema", subtitle: "Growing Diaspora-Powered Industry", flag: "🇮🇳", accent: "#F1C40F" },

  // ── Global Regions ─────────────────────────────
  korean:    { title: "Korean Cinema", subtitle: "From Parasite to Oldboy — The Korean New Wave", flag: "🇰🇷", accent: "#4A90D9",
    filmMovement: "Korean New Wave (1990s–2000s)", filmMovementDesc: "Park Chan-wook, Bong Joon-ho, and Kim Ki-duk transformed Korea into a global cinema powerhouse.",
    keyDirectors: ["Bong Joon-ho", "Park Chan-wook", "Kim Ki-duk", "Lee Chang-dong"],
    iconicFilms: ["Parasite", "Oldboy", "Memories of Murder", "Train to Busan", "The Handmaiden"],
    ottPlatforms: ["Netflix", "Wavve", "Tving", "Watcha"] },
  japanese:  { title: "Japanese Cinema", subtitle: "Kurosawa, Ghibli, J-Horror & Anime Mastery", flag: "🇯🇵", accent: "#C0392B",
    filmMovement: "Golden Age (1950s–1960s)", filmMovementDesc: "Akira Kurosawa invented visual storytelling that inspired Star Wars, The Magnificent Seven, and A Fistful of Dollars.",
    keyDirectors: ["Akira Kurosawa", "Hayao Miyazaki", "Hirokazu Kore-eda", "Makoto Shinkai"],
    iconicFilms: ["Seven Samurai", "Spirited Away", "Your Name", "Rashomon", "Tokyo Story"] },
  french:    { title: "French Cinema", subtitle: "The Birth of Cinematic Art — Nouvelle Vague & Beyond", flag: "🇫🇷", accent: "#6C5CE7",
    filmMovement: "French New Wave (1958–1973)", filmMovementDesc: "Godard, Truffaut, and Varda reinvented filmmaking grammar and influenced every director since.",
    keyDirectors: ["Jean-Luc Godard", "François Truffaut", "Agnès Varda", "Jean-Pierre Jeunet"],
    iconicFilms: ["Breathless", "Amélie", "The 400 Blows", "Portrait of a Lady on Fire"] },
  spanish:   { title: "Spanish-Language Cinema", subtitle: "Spain, Mexico & Latin America — Passion & Magic Realism", flag: "🇪🇸", accent: "#E67E22",
    keyDirectors: ["Pedro Almodóvar", "Alfonso Cuarón", "Guillermo del Toro", "Alejandro González Iñárritu"],
    iconicFilms: ["Pan's Labyrinth", "Roma", "Y Tu Mamá También", "The Secret in Their Eyes"] },
  nollywood: { title: "Nollywood", subtitle: "Nigeria — The World's 3rd Largest Film Industry", flag: "🇳🇬", accent: "#F39C12",
    iconicFilms: ["The Black Book", "Living in Bondage", "Lionheart", "October 1"] },
  iranian:   { title: "Iranian Cinema", subtitle: "Critically Acclaimed Realism — Two Oscar Winners", flag: "🇮🇷", accent: "#27AE60",
    filmMovement: "Iranian New Wave (1960s–present)", filmMovementDesc: "Abbas Kiarostami and Asghar Farhadi created one of the most respected national cinemas.",
    keyDirectors: ["Abbas Kiarostami", "Asghar Farhadi", "Majid Majidi", "Jafar Panahi"],
    iconicFilms: ["A Separation", "Children of Heaven", "Close-Up", "The Salesman"] },
  hollywood: { title: "Hollywood", subtitle: "Global Box Office Giants — The Universal Language of Blockbusters", flag: "🇺🇸", accent: "#F5A623",
    keyDirectors: ["Steven Spielberg", "Christopher Nolan", "Martin Scorsese", "Quentin Tarantino"],
    iconicFilms: ["The Godfather", "The Dark Knight", "Inception", "Pulp Fiction", "Schindler's List"] },
  italian:   { title: "Italian Cinema", subtitle: "Neorealism to Spaghetti Westerns — The Birth of Drama", flag: "🇮🇹", accent: "#E67E22",
    filmMovement: "Italian Neorealism (1943–1952)", filmMovementDesc: "Rossellini and De Sica created the first realistic cinema, the direct predecessor of all modern drama.",
    iconicFilms: ["Bicycle Thieves", "Life Is Beautiful", "Cinema Paradiso", "The Good, the Bad and the Ugly"] },
  german:    { title: "German Cinema", subtitle: "Expressionism, New German Cinema & Modern Masterpieces", flag: "🇩🇪", accent: "#2D3436",
    filmMovement: "German Expressionism (1919–1933)", filmMovementDesc: "Nosferatu, Metropolis, and M invented the visual language of horror and noir.",
    iconicFilms: ["Metropolis", "The Lives of Others", "Run Lola Run", "Toni Erdmann"] },
  chinese:   { title: "Chinese Cinema", subtitle: "Wuxia Epics, Hong Kong Action & Mainland Blockbusters", flag: "🇨🇳", accent: "#D63031",
    iconicFilms: ["Crouching Tiger, Hidden Dragon", "Hero", "In the Mood for Love", "Chungking Express"] },
  thai:      { title: "Thai Cinema", subtitle: "Martial Arts, Horror & Arthouse", flag: "🇹🇭", accent: "#00B894",
    iconicFilms: ["Uncle Boonmee", "Ong-Bak", "Bad Genius", "The Medium"] },
  turkish:   { title: "Turkish Cinema", subtitle: "Rich Storytelling from the Crossroads of East & West", flag: "🇹🇷", accent: "#E17055",
    iconicFilms: ["Once Upon a Time in Anatolia", "Winter Sleep", "Distant"] },
  russian:   { title: "Russian Cinema", subtitle: "Tarkovsky, Eisenstein & Soviet Montage", flag: "🇷🇺", accent: "#6C5CE7",
    filmMovement: "Soviet Montage (1920s–1930s)",
    iconicFilms: ["Stalker", "Solaris", "Come and See", "Battleship Potemkin"] },
  brazilian: { title: "Brazilian Cinema", subtitle: "Cinema Novo & City of God", flag: "🇧🇷", accent: "#27AE60",
    iconicFilms: ["City of God", "Elite Squad", "Central Station", "Carandiru"] },
};

async function getMoviesByRegion(region: string, page = 1) {
  try {
    const res = await fetch(`${API_BASE}/api/movies/region/${region}?page=${page}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch region movies:", error);
    return null;
  }
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const regionKey = region.toLowerCase();
  const regionConfig = REGION_MAP[regionKey];

  if (!regionConfig) {
    notFound();
  }

  const data = await getMoviesByRegion(regionKey);
  const movies: Movie[] = data?.results || [];

  return (
    <div className="w-full relative pb-20 page-enter">
      {/* Cinematic Hero Header */}
      <div
        className="relative h-[45vh] w-full p-8 flex flex-col justify-end overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${regionConfig.accent}40 0%, var(--bg-primary) 70%)` }}
      >
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <span className="text-6xl mb-4 block country-flag">{regionConfig.flag}</span>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
            {regionConfig.title}
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl">
            {regionConfig.subtitle}
          </p>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 mt-4">
            <span className="text-sm text-text-muted bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              🎬 {movies.length > 0 ? `${movies.length}+ films` : "Loading..."}
            </span>
            {regionConfig.keyDirectors && (
              <span className="text-sm text-text-muted bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                🎬 {regionConfig.keyDirectors.length}+ iconic directors
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-8 space-y-12">
        {/* Film Movement Card */}
        {regionConfig.filmMovement && (
          <div className="glass-card p-6 border-l-4" style={{ borderLeftColor: regionConfig.accent }}>
            <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
              📚 Film Movement: {regionConfig.filmMovement}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {regionConfig.filmMovementDesc}
            </p>
          </div>
        )}

        {/* Key Directors */}
        {regionConfig.keyDirectors && (
          <div>
            <h3 className="section-heading mb-4">🎬 Key Directors</h3>
            <div className="flex flex-wrap gap-3">
              {regionConfig.keyDirectors.map((d) => (
                <span
                  key={d}
                  className="px-4 py-2 bg-surface border border-border rounded-xl text-sm font-medium text-text-primary hover:border-accent/40 transition-colors cursor-default"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Iconic Films */}
        {regionConfig.iconicFilms && (
          <div>
            <h3 className="section-heading mb-4">🏆 Iconic Films</h3>
            <div className="flex flex-wrap gap-3">
              {regionConfig.iconicFilms.map((f) => (
                <span
                  key={f}
                  className="genre-pill"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* OTT Platforms */}
        {regionConfig.ottPlatforms && (
          <div>
            <h3 className="section-heading mb-4">📺 Where to Watch</h3>
            <div className="flex flex-wrap gap-3">
              {regionConfig.ottPlatforms.map((p) => (
                <span
                  key={p}
                  className={`ott-badge ${p.toLowerCase().replace(/[+ ]/g, "")}`}
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Indian Industries Quick Links */}
        {regionKey === "indian" && (
          <div>
            <h3 className="section-heading mb-4">🎭 Explore by Industry</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["bollywood", "tollywood", "kollywood", "mollywood", "sandalwood", "bengali", "marathi", "punjabi"].map((ind) => {
                const cfg = REGION_MAP[ind];
                if (!cfg) return null;
                return (
                  <Link
                    key={ind}
                    href={`/cinema/${ind}`}
                    className="glass-card p-4 hover:bg-bg-elevated transition-all group border-l-4"
                    style={{ borderLeftColor: cfg.accent }}
                  >
                    <h4 className="font-heading font-bold text-text-primary group-hover:text-accent transition-colors text-sm">
                      {cfg.title}
                    </h4>
                    <p className="text-xs text-text-muted mt-1 line-clamp-1">{cfg.subtitle}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Movies Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-heading">Top Films</h2>
            <span className="text-sm text-text-muted">{movies.length} films</span>
          </div>

          {movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {movies.map((m) => (
                <MovieCard key={m.tmdb_id || m._id} movie={m} />
              ))}
            </div>
          ) : (
            <div className="w-full text-center py-20 bg-surface rounded-xl border border-border">
              <div className="text-4xl mb-4 opacity-50">🍿</div>
              <h3 className="text-xl font-semibold mb-2">Loading cinema...</h3>
              <p className="text-text-muted">Films are being fetched from TMDB. Refresh to see results.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
