import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- DTO Schemas (In sync with Backend models/schemas.py) ---

export const MovieSchema = z.object({
  tmdb_id: z.number(),
  title: z.string(),
  overview: z.string().optional(),
  year: z.number().nullable().optional(),
  release_date: z.string().nullable().optional(),
  language: z.string().optional(),
  genres: z.array(z.string()).optional(),
  rating: z.number().optional(),
  votes: z.number().optional(),
  popularity_score: z.number().optional(),
  poster_url: z.string().url().nullable().optional(),
  backdrop_url: z.string().url().nullable().optional(),
  platforms: z.array(z.string()).optional(),
  media_type: z.enum(["movie", "tv"]).optional().default("movie"),
});

export const MovieListResponseSchema = z.object({
  page: z.number().optional(),
  total: z.number(),
  results: z.array(MovieSchema),
});

export const RecommendationResponseSchema = z.object({
  movie_id: z.string(),
  recommendations: z.array(MovieSchema.extend({
    score: z.number().optional(),
    sources: z.array(z.any()).optional(),
  })),
});

export type Movie = z.infer<typeof MovieSchema>;
export type MovieListResponse = z.infer<typeof MovieListResponseSchema>;
export type RecommendationResponse = z.infer<typeof RecommendationResponseSchema>;

// --- API Client ---

class ApiError extends Error {
  constructor(public status: number, message: string, public errorId?: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  endpoint: string, 
  schema: z.ZodSchema<T>, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    // Next.js specific caching options
    next: { revalidate: 3600 }, // Cache for 1 hour by default
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status, 
      data.message || "An unexpected error occurred",
      data.error_id
    );
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`Validation failed for ${endpoint}:`, result.error);
    // In production, we might still return the data but log the error
    return data as T; 
  }

  return result.data;
}

export const api = {
  movies: {
    getTrending: () => request("/api/movies/trending", MovieListResponseSchema),
    getTopRated: () => request("/api/movies/toprated", MovieListResponseSchema),
    getNowPlaying: () => request("/api/movies/nowplaying", MovieListResponseSchema),
    getIndian: (page = 1) => request(`/api/movies/indian?page=${page}`, MovieListResponseSchema),
    getKorean: (page = 1) => request(`/api/movies/korean?page=${page}`, MovieListResponseSchema),
    getInternational: (page = 1) => request(`/api/movies/international?page=${page}`, MovieListResponseSchema),
    getAnime: (page = 1) => request(`/api/movies/anime?page=${page}`, MovieListResponseSchema),
    getSeries: (page = 1) => request(`/api/movies/series?page=${page}`, MovieListResponseSchema),
    getDetails: (id: string, type: "movie" | "tv" = "movie") => 
      request(`/api/movies/${id}?media_type=${type}`, z.any()),
  },
  recommendations: {
    get: (id: string, type: "movie" | "tv" = "movie") => 
      request(`/api/recommendations/${id}?media_type=${type}`, RecommendationResponseSchema),
  },
  search: {
    query: (q: string, page = 1) => 
      request(`/api/search?q=${encodeURIComponent(q)}&page=${page}`, z.any()),
  }
};
