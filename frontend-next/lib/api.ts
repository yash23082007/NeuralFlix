const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types ──────────────────────────────────────────────────
export interface Movie {
  _id?: string;
  tmdb_id?: number;
  title: string;
  overview?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  votes?: number;
  year?: number | null;
  release_date?: string;
  runtime?: number;
  language?: string;
  genres?: string[];
  platforms?: string[];
  media_type?: string;
  cinema_region?: string;
  popularity_score?: number;
}

export interface MovieDetail extends Movie {
  tagline?: string;
  director?: string;
  cast?: { name: string; character: string; profile_url: string }[];
  trailer_key?: string;
  similar?: Movie[];
  imdb_id?: string;
  omdb_rating?: string;
  rt_rating?: string;
  metacritic?: number;
  box_office?: string;
  awards?: string;
  deep_metadata?: any;
}

// ─── HTTP Helpers ───────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit & { revalidate?: number }): Promise<T | null> {
  try {
    const { revalidate = 3600, ...fetchOptions } = options || {};
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
      ...fetchOptions,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`API Error [${path}]:`, error);
    return null;
  }
}

// ─── Movie Endpoints ────────────────────────────────────────

export async function getTrending(): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>("/api/movies/trending");
  return data?.results || [];
}

export async function getTopRated(page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/toprated?page=${page}`);
  return data?.results || [];
}

export async function getNowPlaying(page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/nowplaying?page=${page}`);
  return data?.results || [];
}

export async function getTrendingAll(): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>("/api/movies/trending-all");
  return data?.results || [];
}

export async function getAnime(page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/anime?page=${page}`);
  return data?.results || [];
}

export async function getSeries(page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/series?page=${page}`);
  return data?.results || [];
}

// ─── Regional Cinema ────────────────────────────────────────

export async function getByRegion(region: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/region/${region}?page=${page}`);
  return data?.results || [];
}

export async function getByMood(mood: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/mood/${mood}?page=${page}`);
  return data?.results || [];
}

export async function getByGenre(genre: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/movies/genre/${genre}?page=${page}`);
  return data?.results || [];
}

// ─── Movie Details ──────────────────────────────────────────

export async function getMovieDetails(id: string, mediaType = "movie"): Promise<MovieDetail | null> {
  return await apiFetch<MovieDetail>(`/api/movies/${id}?media_type=${mediaType}`);
}

// ─── Search ─────────────────────────────────────────────────

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(`/api/search/movies?query=${encodeURIComponent(query)}&page=${page}`);
  return data?.results || [];
}

// ─── Recommendations ────────────────────────────────────────

export async function getRecommendations(movieId: string, mediaType = "movie"): Promise<Movie[]> {
  const data = await apiFetch<{ recommendations: Movie[] }>(`/api/recommendations/${movieId}?media_type=${mediaType}`);
  return data?.recommendations || [];
}

// ─── Convenience Wrappers ───────────────────────────────────

export async function getIndianMovies(page = 1): Promise<Movie[]> {
  return getByRegion("indian", page);
}

export async function getBollywoodMovies(page = 1): Promise<Movie[]> {
  return getByRegion("bollywood", page);
}

export async function getKoreanMovies(page = 1): Promise<Movie[]> {
  return getByRegion("korean", page);
}

export async function getJapaneseMovies(page = 1): Promise<Movie[]> {
  return getByRegion("japanese", page);
}

export async function getFrenchMovies(page = 1): Promise<Movie[]> {
  return getByRegion("french", page);
}

export async function getHollywoodMovies(page = 1): Promise<Movie[]> {
  return getByRegion("hollywood", page);
}
