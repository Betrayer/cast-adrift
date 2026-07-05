import { create } from "zustand";
import type { ScreenId } from "@/types";

export interface AppState {
  screen: ScreenId;
  params: Record<string, string> | undefined;
  tgUserId: number | null;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  setTgUserId: (tgUserId: number | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  screen: "menu",
  params: undefined,
  tgUserId: null,
  go: (screen, params) => set({ screen, params }),
  setTgUserId: (tgUserId) => set({ tgUserId }),
}));
