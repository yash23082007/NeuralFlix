import { useQuery, useMutation } from '@tanstack/react-query';
import { getRecommendationFeed, getWhyRecommended, submitFeedback } from '../lib/api';

export const useRecommendationFeed = () => useQuery({ queryKey: ['recommendations', 'feed'], queryFn: getRecommendationFeed });
export const useWhyRecommended = (id: number) => useQuery({ queryKey: ['recommendations', id, 'why'], queryFn: () => getWhyRecommended(id), enabled: !!id });
export const useSubmitFeedback = () => useMutation({ mutationFn: submitFeedback });
