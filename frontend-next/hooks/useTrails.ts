import { useQuery } from '@tanstack/react-query';
import { getTrails, getTrail } from '../lib/api';

export const useTrails = () => useQuery({ queryKey: ['trails'], queryFn: getTrails });
export const useTrail = (id: string) => useQuery({ queryKey: ['trails', id], queryFn: () => getTrail(id), enabled: !!id });
