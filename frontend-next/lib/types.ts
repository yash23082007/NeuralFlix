/**
 * NeuralFlix — Shared Type Definitions
 *
 * Every API response shape lives here. No `any` allowed.
 */

// ── Movie ─────────────────────────────────────────────────────

export interface Movie {
  tmdb_id: number;
  title: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  year?: number | null;
  rating?: number | null;
  rec_score?: number | null;
  genres?: string[];
  language?: string | null;
  cinema_region?: string | null;
  explanation?: string | null;
  popularity_score?: number | null;
  overview?: string | null;
  runtime?: number | null;
  _id?: string | number | null;
  media_type?: string | null;
}

export interface CastMember {
  name: string;
  character: string;
  profile_url: string | null;
}

export interface MovieDetail extends Movie {
  tagline?: string | null;
  runtime?: number | null;
  director?: string | null;
  cast?: CastMember[];
  trailer_key?: string | null;
  similar?: Movie[];
  imdb_id?: string | null;
  omdb_rating?: string | null;
  rt_rating?: string | null;
  metacritic?: string | null;
  box_office?: string | null;
  awards?: string | null;
}

export interface MovieSearchResult {
  results: Movie[];
  total: number;
}

// ── Recommendations ───────────────────────────────────────────

export interface RecommendationReason {
  factor: string;
  evidence: string;
  weight: number;
}

export interface RecommendationResponse {
  recommendations: Movie[];
  ranking_version: string;
}

export interface WhyThisResponse {
  explanation: string;
  factors: string[];
  reasons?: RecommendationReason[];
  ranking_version?: string;
  freshness?: string;
}

// ── Taste Controls ────────────────────────────────────────────

export interface TasteControls {
  discovery: number;
  global: number;
  challenge: number;
  pace: number;
  hiddenGems: number;
  diversityBoost: boolean;
}

// ── Feedback ──────────────────────────────────────────────────

export interface FeedbackRequest {
  movie_id: number;
  action: string;
  reason?: string;
}

// ── Availability ──────────────────────────────────────────────

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface Availability {
  movie_id: number;
  link?: string;
  flatrate?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  free?: StreamingProvider[];
  platforms?: { name: string; type: string }[];
}

// ── Aggregated Ratings ────────────────────────────────────────

export interface AggregatedRatings {
  tmdb?: number;
  imdb?: string;
  metacritic?: string;
  rotten_tomatoes?: string;
  letterboxd?: string;
  neuralflix_composite?: number;
  vote_count?: number;
}

// ── Cold Start ────────────────────────────────────────────────

export interface ColdStartCollection {
  id: string;
  title: string;
  description?: string;
  movies: Movie[];
}

// ── Home ──────────────────────────────────────────────────────

export interface HomeData {
  featured: Movie | null;
  trending: Movie[];
  topRated: Movie[];
  regions: Record<string, Movie[]>;
  coldStartCollections: ColdStartCollection[];
}

// ── Trails ────────────────────────────────────────────────────

export interface CinemaTrail {
  id: string;
  name: string;
  description: string;
  theme: string;
  movie_ids: number[];
  movies?: Movie[];
}

// ── Watchlist ─────────────────────────────────────────────────

export interface WatchlistResponse {
  watchlist: Movie[];
}

// ── Taste Profile (for TasteDNA visualization) ────────────────

export interface TasteProfile {
  top_genres?: [string, number][];
  preferred_decades?: [string, number][];
  avg_runtime_preference?: number;
  language_preferences?: [string, number][];
  rating_threshold?: number;
  top_directors?: [string, number][];
}

// ── Auth ──────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  is_admin?: boolean;
}
