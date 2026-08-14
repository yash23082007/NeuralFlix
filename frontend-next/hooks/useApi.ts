import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, getUser } from "../lib/auth";
import type { TasteControls } from "../lib/types";

const API = process.env.NEXT_PUBLIC_API_URL || "https://neuralflix.onrender.com";

// ── Types ─────────────────────────────────────────────────────────

export interface Movie {
  tmdb_id: number;
  title: string;
  poster_url?: string;
  backdrop_url?: string;
  year?: number;
  rating?: number;
  rec_score?: number;
  genres?: string[];
  language?: string;
  cinema_region?: string;
  explanation?: string;
}

// ── Hooks ─────────────────────────────────────────────────────────

export function useMovieDetail(tmdb_id: string) {
  return useQuery({
    queryKey: ["movie", tmdb_id],
    queryFn: async () => {
      const res = await fetch(`${API}/api/v1/movies/${tmdb_id}`);
      if (!res.ok) throw new Error("Failed to fetch movie detail");
      return res.json();
    },
    enabled: !!tmdb_id,
  });
}

export function useDiscoverMovies(params: {
  sort?: string;
  region?: string;
  genre?: string;
  language?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["discover", params],
    queryFn: async ({ pageParam = 1 }) => {
      let url = `${API}/api/v1/movies/trending`;
      if (params.region) {
        url = `${API}/api/v1/movies/region/${params.region}`;
      }
      
      const res = await fetch(`${url}?page=${pageParam}`);
      if (!res.ok) throw new Error("Failed to fetch discover feed");
      const data = await res.json();
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: () => {
      return undefined;
    },
  });
}

export function useRecommendationsFeed() {
  const user = getUser();
  
  return useInfiniteQuery({
    queryKey: ["recommendations", user?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await authFetch(`${API}/api/v1/recommendations/feed?page=${pageParam}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations feed");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.recommendations?.length > 0 ? allPages.length + 1 : undefined;
    },
    enabled: !!user?.id,
  });
}

export function useTasteControls() {
  const user = getUser();
  
  return useQuery({
    queryKey: ["taste_controls", user?.id],
    queryFn: async () => {
      const res = await authFetch(`${API}/api/v1/users/me/taste-controls`);
      if (!res.ok) throw new Error("Failed to fetch taste controls");
      return res.json();
    },
    enabled: !!user?.id,
  });
}

export function useUpdateTasteControls() {
  const queryClient = useQueryClient();
  const user = getUser();
  
  return useMutation({
    mutationFn: async (controls: TasteControls) => {
      const res = await authFetch(`${API}/api/v1/users/me/taste-controls`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(controls),
      });
      if (!res.ok) throw new Error("Failed to update taste controls");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taste_controls", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["recommendations", user?.id] });
    },
  });
}

export function useWatchlist() {
  const user = getUser();
  
  return useQuery({
    queryKey: ["watchlist", user?.id],
    queryFn: async () => {
      const res = await authFetch(`${API}/api/v1/users/me/watchlist`);
      if (!res.ok) throw new Error("Failed to fetch watchlist");
      return res.json();
    },
    enabled: !!user?.id,
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  const user = getUser();
  
  return useMutation({
    mutationFn: async (tmdb_id: number) => {
      const res = await authFetch(`${API}/api/v1/users/me/watchlist?tmdb_id=${tmdb_id}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to add to watchlist");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
    },
  });
}
