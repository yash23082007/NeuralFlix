const API_BASE =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  rec_score?: number;
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
  deep_metadata?: unknown;
}

export interface MlOverview {
  catalog_size: number;
  average_rating: number;
  top_genres: { name: string; count: number }[];
  top_regions: { name: string; count: number }[];
  pipeline: { stage: string; method: string }[];
  model_cards: { name: string; type: string; status: string; purpose: string }[];
}

const apiCache = new Map<string, { data: any; expiry: number }>();

async function apiFetch<T>(path: string, options?: RequestInit & { revalidate?: number }): Promise<T | null> {
  const { revalidate = 600, ...fetchOptions } = options || {};
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

export async function getTrendingAll(): Promise<Movie[]> {
  const data = await apiFetch<any>("/api/v1/movies/trending-all");
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

export async function getByMood(mood: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/mood/${mood}?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getByGenre(genre: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<any>(`/api/v1/movies/genre/${genre}?page=${page}`);
  return Array.isArray(data) ? data : (data?.results || []);
}

export async function getMovieDetails(id: string, mediaType = "movie"): Promise<MovieDetail | null> {
  return await apiFetch<MovieDetail>(`/api/v1/movies/${id}?media_type=${mediaType}`);
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await apiFetch<{ results: Movie[] }>(
    `/api/v1/search/movies?query=${encodeURIComponent(query)}&page=${page}`,
    { revalidate: 60 },
  );
  return data?.results || [];
}

export async function getRecommendations(movieId: string, mediaType = "movie"): Promise<Movie[]> {
  const data = await apiFetch<{ recommendations: Movie[] }>(
    `/api/v1/recommendations/${movieId}?media_type=${mediaType}`,
    { revalidate: 120 },
  );
  return data?.recommendations || [];
}

export async function getMlOverview(): Promise<MlOverview | null> {
  return await apiFetch<MlOverview>("/api/v1/ml/overview", { revalidate: 120 });
}

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

// ─── Enhanced Data Layer ──────────────────────────────────

export interface StreamingProvider {
  name: string;
  provider_id?: number;
  logo_url?: string | null;
  type: "stream" | "rent" | "buy" | "ads";
  region?: string;
  deep_link?: string;
  price?: string;
}

export interface StreamingAvailability {
  providers: {
    stream: StreamingProvider[];
    rent: StreamingProvider[];
    buy: StreamingProvider[];
    ads: StreamingProvider[];
    all: StreamingProvider[];
    tmdb_link?: string;
  };
  summary: {
    streaming_on: string[];
    total_providers: number;
    has_stream: boolean;
    has_rent: boolean;
    has_buy: boolean;
  };
}

export interface RatingSource {
  score: number;
  label: string;
  votes?: number;
  source: string;
  color?: string;
  sentiment?: string;
  icon?: string;
}

export interface AggregatedRatings {
  ratings: {
    imdb?: RatingSource;
    tmdb?: RatingSource;
    rotten_tomatoes?: RatingSource;
    metacritic?: RatingSource;
  };
  composite_score: number;
  composite_label: string;
  total_sources: number;
  awards?: string | null;
  box_office?: string | null;
}

export interface RatingBadges {
  imdb?: string;
  rt?: string;
  mc?: string;
  neuralflix_score?: string;
}

export interface TraktTrending {
  title: string;
  year?: number;
  tmdb_id?: number;
  imdb_id?: string;
  trakt_watchers?: number;
  overview?: string;
  rating?: number;
  genres?: string[];
}

// Streaming Availability
export async function getStreamingAvailability(
  tmdbId: number,
  imdbId?: string,
  mediaType = "movie",
  regions?: string
): Promise<StreamingAvailability | null> {
  let path = `/api/v1/data/streaming/${tmdbId}?media_type=${mediaType}`;
  if (imdbId) path += `&imdb_id=${imdbId}`;
  if (regions) path += `&regions=${regions}`;
  return await apiFetch<StreamingAvailability>(path, { revalidate: 3600 });
}

// Multi-Source Ratings
export async function getAggregatedRatings(
  tmdbId: number,
  imdbId?: string,
  mediaType = "movie"
): Promise<AggregatedRatings | null> {
  let path = `/api/v1/data/ratings/${tmdbId}?media_type=${mediaType}`;
  if (imdbId) path += `&imdb_id=${imdbId}`;
  return await apiFetch<AggregatedRatings>(path, { revalidate: 1800 });
}

// Rating Badges (lightweight, for card display)
export async function getRatingBadges(
  tmdbId: number,
  imdbId?: string
): Promise<RatingBadges | null> {
  let path = `/api/v1/data/ratings/${tmdbId}/badges`;
  if (imdbId) path += `?imdb_id=${imdbId}`;
  return await apiFetch<RatingBadges>(path, { revalidate: 1800 });
}

// Batch Streaming Providers (for movie grids)
export async function batchStreamingProviders(
  tmdbIds: number[],
  mediaType = "movie"
): Promise<Record<number, string[]>> {
  const data = await apiFetch<{ providers: Record<number, string[]> }>(
    `/api/v1/data/streaming/batch?media_type=${mediaType}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tmdbIds),
      revalidate: 3600,
    }
  );
  return data?.providers || {};
}

// Trakt Trending
export async function getTraktTrending(
  mediaType = "movies",
  page = 1,
  limit = 20
): Promise<TraktTrending[]> {
  const data = await apiFetch<{ results: TraktTrending[] }>(
    `/api/v1/data/trakt/trending?media_type=${mediaType}&page=${page}&limit=${limit}`,
    { revalidate: 600 }
  );
  return data?.results || [];
}

// Trakt Popular
export async function getTraktPopular(
  mediaType = "movies",
  page = 1,
  limit = 20
): Promise<TraktTrending[]> {
  const data = await apiFetch<{ results: TraktTrending[] }>(
    `/api/v1/data/trakt/popular?media_type=${mediaType}&page=${page}&limit=${limit}`,
    { revalidate: 600 }
  );
  return data?.results || [];
}

// Trakt Most Watched
export async function getTraktMostWatched(
  mediaType = "movies",
  period = "weekly"
): Promise<TraktTrending[]> {
  const data = await apiFetch<{ results: TraktTrending[] }>(
    `/api/v1/data/trakt/most-watched?media_type=${mediaType}&period=${period}`,
    { revalidate: 600 }
  );
  return data?.results || [];
}
