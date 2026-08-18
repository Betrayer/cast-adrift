import { create } from "zustand";
import type { MergePrompt } from "@/services/account-link";
import type { AuthErrorCode } from "@/services/authErrors";
import type { AccountInfo } from "@/services/uid";
import type { ScreenId } from "@/types";

export const ROOT_SCREEN: ScreenId = "menu";

const STACK_LIMIT = 12;

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
  isTelegram: boolean;
  uid: string | null;
  account: AccountInfo | null;
  authError: AuthErrorCode | null;
  authBusy: boolean;
  merge: MergePrompt | null;
  cloudResume: boolean;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  back: () => void;
  setTgUserId: (tgUserId: number | null) => void;
  setTgName: (tgName: string | null) => void;
  setIsTelegram: (isTelegram: boolean) => void;
  setUid: (uid: string | null) => void;
  setAccount: (account: AccountInfo | null) => void;
  setAuthError: (authError: AuthErrorCode | null) => void;
  setAuthBusy: (authBusy: boolean) => void;
  setMerge: (merge: MergePrompt | null) => void;
  setCloudResume: (cloudResume: boolean) => void;
}

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
  isTelegram: false,
  uid: null,
  account: null,
  authError: null,
  authBusy: false,
  merge: null,
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
  setIsTelegram: (isTelegram) => set({ isTelegram }),
  setUid: (uid) => set({ uid }),
  setAccount: (account) => set({ account, uid: account?.uid ?? null }),
  setAuthError: (authError) => set({ authError }),
  setAuthBusy: (authBusy) => set({ authBusy }),
  setMerge: (merge) => set({ merge }),
  setCloudResume: (cloudResume) => set({ cloudResume }),
}));
