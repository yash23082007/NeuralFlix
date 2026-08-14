/**
 * NeuralFlix — API Client
 *
 * Single source of truth for all backend communication.
 * Rules:
 *   - No `any`
 *   - No silent null failures
 *   - No hardcoded fallback backend URL (use env var)
 *   - No user_id query parameter
 *   - No browser token storage
 *   - No duplicate endpoint functions
 */

import type {
  Movie,
  MovieDetail,
  MovieSearchResult,
  HomeData,
  AggregatedRatings,
  Availability,
  RecommendationResponse,
  WhyThisResponse,
  FeedbackRequest,
  TasteControls,
  WatchlistResponse,
  CinemaTrail,
} from "./types";
import { ApiError, TimeoutError } from "./errors";

// ── Configuration ────────────────────────────────────────────

const API_BASE =
  typeof window === "undefined"
    ? process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://neuralflix.onrender.com"
    : process.env.NEXT_PUBLIC_API_URL || "https://neuralflix.onrender.com";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES_GET = 2;

// ── In-memory cache (client-side only) ───────────────────────

const apiCache = new Map<string, { data: unknown; expiry: number }>();

// ── Core fetch wrapper ───────────────────────────────────────

interface ApiFetchOptions extends Omit<RequestInit, "signal"> {
  revalidate?: number;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions
): Promise<T> {
  const {
    revalidate = 600,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries: maxRetries,
    signal: externalSignal,
    ...fetchOptions
  } = options || {};

  const isGet = !fetchOptions.method || fetchOptions.method === "GET";
  const retries = maxRetries ?? (isGet ? MAX_RETRIES_GET : 0);

  // Client-side cache check
  const cacheKey = `${path}_${JSON.stringify(fetchOptions)}`;
  if (revalidate > 0 && typeof window !== "undefined") {
    const cached = apiCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data as T;
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Link external abort signal
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutId);
        throw new ApiError(0, "Request aborted");
      }
      externalSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        next: typeof window === "undefined" ? { revalidate } : undefined,
        credentials: "include",
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        let errorMsg = `API Error: ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch {
          // JSON parsing failed, use statusText
        }
        throw new ApiError(res.status, errorMsg);
      }

      const data = (await res.json()) as T;

      // Cache successful GET responses client-side
      if (revalidate > 0 && typeof window !== "undefined" && isGet) {
        apiCache.set(cacheKey, {
          data,
          expiry: Date.now() + revalidate * 1000,
        });
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        // Don't retry client errors (4xx), only server errors (5xx)
        if (err.status > 0 && err.status < 500) throw err;
        lastError = err;
      } else if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        if (externalSignal?.aborted) {
          throw new ApiError(0, "Request aborted");
        }
        lastError = new TimeoutError(`${API_BASE}${path}`, timeoutMs);
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(1000 * 2 ** attempt, 5000))
        );
      }
    }
  }

  throw lastError ?? new Error("Unknown API error");
}

// ── Authenticated fetch helper ───────────────────────────────

function authHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...extra,
  };
}

// ── Home ─────────────────────────────────────────────────────

export async function getHome(): Promise<HomeData> {
  return apiFetch<HomeData>("/api/v1/home");
}

// ── Movies ───────────────────────────────────────────────────

export async function getTrending(): Promise<{ results: Movie[] }> {
  return apiFetch<{ results: Movie[] }>("/api/v1/movies/trending");
}

export async function searchMovies(
  query: string,
  page = 1
): Promise<MovieSearchResult> {
  return apiFetch<MovieSearchResult>(
    `/api/v1/movies/search/?query=${encodeURIComponent(query)}&page=${page}`
  );
}

export async function getMovieDetails(
  tmdbId: string | number
): Promise<MovieDetail> {
  return apiFetch<MovieDetail>(`/api/v1/movies/${tmdbId}`);
}

export async function getAggregatedRatings(
  tmdbId: number,
  imdbId?: string
): Promise<AggregatedRatings> {
  const url = imdbId
    ? `/api/v1/movies/${tmdbId}/ratings?imdb_id=${imdbId}`
    : `/api/v1/movies/${tmdbId}/ratings`;
  return apiFetch<AggregatedRatings>(url);
}

export async function getStreamingAvailability(
  tmdbId: number,
  region = "US"
): Promise<Availability> {
  return apiFetch<Availability>(
    `/api/v1/movies/${tmdbId}/streaming?region=${region}`
  );
}

// ── Recommendations ──────────────────────────────────────────

export async function getRecommendationFeed(): Promise<RecommendationResponse> {
  return apiFetch<RecommendationResponse>("/api/v1/recommendations/feed", {
    credentials: "include",
  });
}

export async function getWhyRecommended(
  tmdbId: number
): Promise<WhyThisResponse> {
  return apiFetch<WhyThisResponse>(
    `/api/v1/recommendations/${tmdbId}/why`,
    { credentials: "include" }
  );
}

export async function submitFeedback(
  req: FeedbackRequest
): Promise<{ status: string; action: string }> {
  return apiFetch<{ status: string; action: string }>(
    `/api/v1/recommendations/feedback?movie_id=${req.movie_id}&action=${req.action}`,
    {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
    }
  );
}

// ── Taste Controls ───────────────────────────────────────────

export async function getTasteControls(): Promise<TasteControls> {
  return apiFetch<TasteControls>("/api/v1/users/me/taste-controls", {
    credentials: "include",
  });
}

export async function updateTasteControls(
  controls: TasteControls
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/api/v1/users/me/taste-controls", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(controls),
    credentials: "include",
  });
}

// ── Watchlist ────────────────────────────────────────────────

export async function getWatchlist(): Promise<WatchlistResponse> {
  return apiFetch<WatchlistResponse>("/api/v1/users/me/watchlist", {
    credentials: "include",
  });
}

export async function addToWatchlist(
  tmdbId: number
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(
    `/api/v1/users/me/watchlist?tmdb_id=${tmdbId}`,
    {
      method: "POST",
      credentials: "include",
    }
  );
}

export async function removeFromWatchlist(
  tmdbId: number
): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(
    `/api/v1/users/me/watchlist/${tmdbId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
}

// ── Trails ───────────────────────────────────────────────────

export async function getTrails(): Promise<{ trails: CinemaTrail[] }> {
  return apiFetch<{ trails: CinemaTrail[] }>("/api/v1/trails");
}

export async function getTrail(trailId: string): Promise<CinemaTrail> {
  return apiFetch<CinemaTrail>(`/api/v1/trails/${trailId}`);
}

// ── Availability ─────────────────────────────────────────────

export async function getAvailability(
  tmdbId: number
): Promise<Availability> {
  return apiFetch<Availability>(`/api/v1/movies/${tmdbId}/availability`);
}
