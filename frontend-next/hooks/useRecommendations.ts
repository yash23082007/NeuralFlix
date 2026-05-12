import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useRecommendations(topK: number = 20) {
  const userId = useUserStore((state) => state.userId);

  return useQuery({
    queryKey: ['recommendations', userId, topK],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${API_URL}/api/recommendations/user/${userId}?top_k=${topK}`);
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    },
    enabled: !!userId,
    // Note: To implement WebSocket real-time updates natively we will hook the queryClient cache here
  });
}

export function useTrendingMovies(page: number = 1) {
  return useQuery({
    queryKey: ['trending', page],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/movies/trending?page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    }
  });
}

export function useUserTasteProfile() {
  const userId = useUserStore((state) => state.userId);

  return useQuery({
    queryKey: ['tasteProfile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await fetch(`${API_URL}/api/users/${userId}/profile`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
    enabled: !!userId,
  });
}
