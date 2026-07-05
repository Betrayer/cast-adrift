import { create } from "zustand";

export interface LootState {
  pending: string | null;
  drop: (dieId: string) => void;
  clear: () => void;
}

export const useLootStore = create<LootState>()((set) => ({
  pending: null,
  drop: (dieId) => {
    set({ pending: dieId });
  },
  clear: () => {
    set({ pending: null });
  },
}));
