import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/api';

export const useWatchlist = () => useQuery({ queryKey: ['watchlist'], queryFn: getWatchlist });
export const useAddToWatchlist = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: addToWatchlist, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }) });
};
export const useRemoveFromWatchlist = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: removeFromWatchlist, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }) });
};
