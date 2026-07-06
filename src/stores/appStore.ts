import { create } from "zustand";
import type { ScreenId } from "@/types";

export interface AppState {
  screen: ScreenId;
  params: Record<string, string> | undefined;
  tgUserId: number | null;
  cloudResume: boolean;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  setTgUserId: (tgUserId: number | null) => void;
  setCloudResume: (cloudResume: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  screen: "menu",
  params: undefined,
  tgUserId: null,
  cloudResume: false,
  go: (screen, params) => set({ screen, params }),
  setTgUserId: (tgUserId) => set({ tgUserId }),
  setCloudResume: (cloudResume) => set({ cloudResume }),
}));
