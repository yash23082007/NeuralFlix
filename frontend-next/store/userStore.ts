import { create } from 'zustand';

interface UserState {
  userId: string | null;
  setUserId: (id: string) => void;
  clearUserId: () => void;
  tasteProfile: any | null;
  setTasteProfile: (profile: any) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: "1", // Hardcoded for demo purposes
  setUserId: (id) => set({ userId: id }),
  clearUserId: () => set({ userId: null }),
  tasteProfile: null,
  setTasteProfile: (profile) => set({ tasteProfile: profile })
}));