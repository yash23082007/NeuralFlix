import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasteControls, updateTasteControls } from '../lib/api';

export const useTasteControls = () => useQuery({ queryKey: ['taste-controls'], queryFn: getTasteControls });
export const useUpdateTasteControls = () => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn: updateTasteControls, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['taste-controls'] }) });
};
