import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://neuralflix.onrender.com';

export function useRecommendations(topK: number = 20) {
  const userId = useUserStore((state) => state.userId);

  return useQuery({
    queryKey: ['recommendations', userId, topK],
    queryFn: async () => {
      // If unauthenticated, fetch cold-start editorial fallback
      if (!userId) {
        const res = await fetch(`${API_URL}/api/v1/recommendations/onboarding?limit=${topK}`);
        if (!res.ok) throw new Error('Failed to fetch onboarding');
        return res.json();
      }
      const res = await fetch(`${API_URL}/api/v1/recommendations/feed?top_k=${topK}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    },
    enabled: true, // Always enabled so we fetch fallback
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useTrendingMovies(page: number = 1) {
  return useQuery({
    queryKey: ['trending', page],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/movies/trending?page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserTasteProfile() {
  const userId = useUserStore((state) => state.userId);

  return useQuery({
    queryKey: ['tasteProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${API_URL}/api/v1/tracking/profile/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
