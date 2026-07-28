import { create } from "zustand";
import type { ScreenId } from "@/types";

export interface AppState {
  screen: ScreenId;
  params: Record<string, string> | undefined;
  tgUserId: number | null;
  tgName: string | null;
  uid: string | null;
  cloudResume: boolean;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  setTgUserId: (tgUserId: number | null) => void;
  setTgName: (tgName: string | null) => void;
  setUid: (uid: string | null) => void;
  setCloudResume: (cloudResume: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  screen: "menu",
  params: undefined,
  tgUserId: null,
  tgName: null,
  uid: null,
  cloudResume: false,
  go: (screen, params) => set({ screen, params }),
  setTgUserId: (tgUserId) => set({ tgUserId }),
  setTgName: (tgName) => set({ tgName }),
  setUid: (uid) => set({ uid }),
  setCloudResume: (cloudResume) => set({ cloudResume }),
}));

declare global {
  interface Window {
    __app?: typeof useAppStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__app = useAppStore;
}
