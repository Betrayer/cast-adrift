import { create } from "zustand";
import type { ScreenId } from "@/types";

export const ROOT_SCREEN: ScreenId = "menu";

const STACK_LIMIT = 12;

// Screens the player has to resolve rather than back out of: a fight, a choice,
// a ceremony that has already paid out. The Telegram BackButton hides on these
// instead of offering an exit that the run flow cannot honour.
const BACK_LOCKED: ReadonlySet<ScreenId> = new Set<ScreenId>([
  "battle",
  "event",
  "puzzle",
  "rewards",
  "summary",
  "driftSummary",
  "prologue",
  "interstitial",
  "finale",
  "ending",
]);

export interface AppState {
  screen: ScreenId;
  params: Record<string, string> | undefined;
  stack: ScreenId[];
  tgUserId: number | null;
  tgName: string | null;
  uid: string | null;
  cloudResume: boolean;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  back: () => void;
  setTgUserId: (tgUserId: number | null) => void;
  setTgName: (tgName: string | null) => void;
  setUid: (uid: string | null) => void;
  setCloudResume: (cloudResume: boolean) => void;
}

// Navigating to a screen that is already behind us is a return, not a push —
// otherwise every Settings → Menu → Settings round trip grows the history and
// the back button walks a loop the player never took.
const nextStack = (stack: ScreenId[], from: ScreenId, to: ScreenId): ScreenId[] => {
  const at = stack.indexOf(to);
  if (at >= 0) return stack.slice(0, at);
  return [...stack, from].slice(-STACK_LIMIT);
};

export const canGoBack = (state: AppState): boolean =>
  state.stack.length > 0 && !BACK_LOCKED.has(state.screen);

export const useAppStore = create<AppState>()((set, get) => ({
  screen: ROOT_SCREEN,
  params: undefined,
  stack: [],
  tgUserId: null,
  tgName: null,
  uid: null,
  cloudResume: false,
  go: (screen, params) =>
    set((s) =>
      s.screen === screen
        ? { params }
        : { screen, params, stack: nextStack(s.stack, s.screen, screen) },
    ),
  back: () => {
    const s = get();
    if (!canGoBack(s)) return;
    const previous = s.stack[s.stack.length - 1];
    if (previous === undefined) return;
    set({ screen: previous, params: undefined, stack: s.stack.slice(0, -1) });
  },
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
