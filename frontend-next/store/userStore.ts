import { create } from 'zustand';

interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  clearUserId: () => void;
  tasteProfile: any | null;
  setTasteProfile: (profile: any) => void;
}

const getStoredUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('neuralflix_user');
    if (!stored) return null;
    return JSON.parse(stored)?.id || null;
  } catch {
    return null;
  }
};

export const useUserStore = create<UserState>((set) => ({
  userId: getStoredUserId(),
  setUserId: (id) => set({ userId: id }),
  clearUserId: () => set({ userId: null }),
  tasteProfile: null,
  setTasteProfile: (profile) => set({ tasteProfile: profile })
}));