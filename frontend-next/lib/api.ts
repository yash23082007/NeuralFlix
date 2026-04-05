import { z } from "zod";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Zod schemas for validation
export const MovieSchema = z.object({
  tmdb_id: z.number().or(z.string()),
  title: z.string(),
  poster_url: z.string().nullable().optional(),
  rating: z.number().optional(),
  year: z.number().or(z.string()).optional(),
  media_type: z.string().optional()
}).passthrough();

export const RecommendationResponseSchema = z.object({
  movie_id: z.string().or(z.number()),
  recommendations: z.array(MovieSchema)
});

/**
 * Production-ready fetch with exponential backoff retry logic.
 */
export async function fetchWithRetry(url: string, retries = 3, options: RequestInit = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        }
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      // Exponential backoff
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
    }
  }
}
