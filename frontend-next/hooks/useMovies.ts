import { useQuery } from '@tanstack/react-query';
import { getTrending, searchMovies, getMovieDetails, getAggregatedRatings, getStreamingAvailability } from '../lib/api';

export const useTrendingMovies = () => useQuery({ queryKey: ['movies', 'trending'], queryFn: getTrending });
export const useSearchMovies = (query: string, page: number) => useQuery({ queryKey: ['movies', 'search', query, page], queryFn: () => searchMovies(query, page), enabled: !!query });
export const useMovieDetails = (id: number) => useQuery({ queryKey: ['movies', id], queryFn: () => getMovieDetails(id), enabled: !!id });
export const useMovieRatings = (id: number, imdbId?: string) => useQuery({ queryKey: ['movies', id, 'ratings', imdbId], queryFn: () => getAggregatedRatings(id, imdbId), enabled: !!id });
export const useMovieStreaming = (id: number, region: string) => useQuery({ queryKey: ['movies', id, 'streaming', region], queryFn: () => getStreamingAvailability(id, region), enabled: !!id });
