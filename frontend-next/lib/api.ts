/**
 * Movie Intelligence Platform Frontend API Client
 * Clean, type-safe API communication layer aligned with active FastAPI backend contracts.
 */

const API_BASE =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Movie {
  _id?: string;
  id?: number;
  tmdb_id?: number;
  imdb_id?: string | null;
  title: string;
  overview?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  rating?: number;
  tmdb_rating?: number;
  votes?: number;
  year?: number | null;
  release_date?: string;
  runtime?: number;
  language?: string;
  genres?: string[];
  platforms?: string[];
  media_type?: string;
  cinema_region?: string;
  director?: string;
  cast_members?: string[];
  popularity_score?: number;
  rec_score?: number;
  score?: number;
  explanation?: string;
  components?: Array<{ feature: string; delta: number; because: string }>;
}

export interface MovieDetail extends Movie {
  tagline?: string;
  cast?: { name: string; character: string; profile_url: string }[];
  trailer_key?: string;
  similar?: Movie[];
  omdb_rating?: string;
  rt_rating?: string;
  metacritic?: number;
  awards?: string;
}

export interface MlOverview {
  catalog_size: number;
  average_rating: number;
  impressions_logged?: number;
  feedback_logged?: number;
  top_genres: { name: string; count: number }[];
  top_regions: { name: string; count: number }[];
  pipeline: { stage: string; method: string }[];
  model_cards: { name: string; type: string; status: string; purpose: string; train_data?: string }[];
}

export interface CinemaTrail {
  id: string;
  title: string;
  description: string;
  region: string;
  stops: Array<{
    step: number;
    movie: Movie;
    transition_reason: string;
  }>;
}

const apiCache = new Map<string, { data: any; expiry: number }>();

async function apiFetch<T>(path: string, options?: RequestInit & { revalidate?: number }): Promise<T | null> {
  const { revalidate = 300, ...fetchOptions } = options || {};
  const cacheKey = `${path}_${JSON.stringify(fetchOptions)}`;

  if (revalidate > 0 && typeof window !== "undefined") {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate },
      ...fetchOptions,
    });
    if (!res.ok) return null;
    const data = await res.json();

    if (revalidate > 0 && typeof window !== "undefined") {
      apiCache.set(cacheKey, {
        data,
        expiry: Date.now() + revalidate * 1000,
      });
    }
    return data;
  } catch (error) {
    console.error(`API Error [${path}]:`, error);
    return null;
  }
}

export async function getTrending(): Promise<Movie[]> {
  const data = await apiFetch<any>("/api/v1/movies/trending");
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getTopRated(page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/toprated?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getNowPlaying(page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/nowplaying?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getAnime(page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/anime?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getSeries(page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/series?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getByRegion(region: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/region/${region}?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getRegionStats(region: string): Promise<any> {
  return await apiFetch<any>(`/api/v1/movies/region/${region}/stats`);
}

export async function getByMood(mood: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/mood/${mood}?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getByGenre(genre: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/genre/${genre}?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getMovieDetails(id: string): Promise<MovieDetail | null> {
  return await apiFetch<MovieDetail>(`/api/v1/movies/${id}`);
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(
    `/api/v1/search?q=${encodeURIComponent(query)}&page=${page}`,
    { revalidate: 60 },
  );
  return data?.results || [];
}

export async function getSearchSuggestions(query: string): Promise<Movie[]> {
  const data = await apiFetch<{ suggestions: Movie[] }>(
    `/api/v1/search/suggest?q=${encodeURIComponent(query)}`,
    { revalidate: 30 },
  );
  return data?.suggestions || [];
}

export async function getSimilarRecommendations(movieId: number | string): Promise<Movie[]> {
  const data = await apiFetch<{ recommendations: Movie[] }>(
    `/api/v1/recommendations/similar/${movieId}`,
    { revalidate: 120 },
  );
  return data?.recommendations || [];
}

export async function getMlOverview(): Promise<MlOverview | null> {
  return await apiFetch<MlOverview>("/api/v1/ml/overview", { revalidate: 60 });
}

export async function getTrails(): Promise<CinemaTrail[]> {
  const data = await apiFetch<{ trails: CinemaTrail[] }>("/api/v1/trails");
  return data?.trails || [];
}

export async function getTrail(id: string): Promise<CinemaTrail | null> {
  return await apiFetch<CinemaTrail>(`/api/v1/trails/${id}`);
}
