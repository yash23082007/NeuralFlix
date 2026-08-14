import { create } from 'zustand';

interface UiState {
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  setCommandPalette: (open: boolean) => void;
  
  isWhyThisOpen: boolean;
  activeRecommendationId: string | null;
  openWhyThis: (id: string) => void;
  closeWhyThis: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isCommandPaletteOpen: false,
  toggleCommandPalette: () => set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
  setCommandPalette: (open) => set({ isCommandPaletteOpen: open }),
  
  isWhyThisOpen: false,
  activeRecommendationId: null,
  openWhyThis: (id) => set({ isWhyThisOpen: true, activeRecommendationId: id }),
  closeWhyThis: () => set({ isWhyThisOpen: false, activeRecommendationId: null }),
}));
