import { create } from "zustand";
import { hasBackGuard, runBackGuard } from "@/app/backGuard";
import { fixedBackTarget, ROUTES, type NavDirection } from "@/app/routes";
import type { MergePrompt } from "@/services/account-link";
import type { AuthErrorCode } from "@/services/authErrors";
import type { AccountInfo } from "@/services/uid";
import type { ScreenId } from "@/types";

export const ROOT_SCREEN: ScreenId = "menu";

const STACK_LIMIT = 12;

export type ScreenParams = Record<string, string> | undefined;

export interface StackEntry {
  screen: ScreenId;
  params: ScreenParams;
}

export type BackAction =
  | { kind: "none" }
  | { kind: "guard" }
  | { kind: "to"; entry: StackEntry; stack: StackEntry[] };

export interface AppState {
  screen: ScreenId;
  params: ScreenParams;
  stack: StackEntry[];
  navDir: NavDirection;
  tgUserId: number | null;
  tgName: string | null;
  isTelegram: boolean;
  uid: string | null;
  account: AccountInfo | null;
  authError: AuthErrorCode | null;
  authBusy: boolean;
  merge: MergePrompt | null;
  cloudResume: boolean;
  systemMenu: boolean;
  buildSheet: boolean;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  back: () => void;
  seed: (stack: readonly StackEntry[], screen: ScreenId, params?: ScreenParams) => void;
  setParams: (params: ScreenParams) => void;
  setSystemMenu: (systemMenu: boolean) => void;
  setBuildSheet: (buildSheet: boolean) => void;
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

const nextStack = (
  stack: readonly StackEntry[],
  from: StackEntry,
  to: ScreenId,
): StackEntry[] => {
  const at = stack.findIndex((entry) => entry.screen === to);
  if (at >= 0) return stack.slice(0, at);
  return [...stack, from].slice(-STACK_LIMIT);
};

export const backActionFor = (state: {
  screen: ScreenId;
  stack: readonly StackEntry[];
}): BackAction => {
  const mode = ROUTES[state.screen].backMode;
  if (mode === "locked") return { kind: "none" };
  if (mode === "guarded") {
    return hasBackGuard(state.screen) ? { kind: "guard" } : { kind: "none" };
  }
  const fixed = fixedBackTarget(mode);
  if (fixed !== null) {
    const at = state.stack.findIndex((entry) => entry.screen === fixed);
    if (at >= 0) {
      const entry = state.stack[at];
      if (entry !== undefined) {
        return { kind: "to", entry, stack: state.stack.slice(0, at) };
      }
    }
    return {
      kind: "to",
      entry: { screen: fixed, params: undefined },
      stack: [...state.stack],
    };
  }
  const previous = state.stack[state.stack.length - 1];
  if (previous === undefined) return { kind: "none" };
  return { kind: "to", entry: previous, stack: state.stack.slice(0, -1) };
};

export const canGoBack = (state: {
  screen: ScreenId;
  stack: readonly StackEntry[];
}): boolean => backActionFor(state).kind !== "none";

export const useAppStore = create<AppState>()((set, get) => ({
  screen: ROOT_SCREEN,
  params: undefined,
  stack: [],
  navDir: "forward",
  tgUserId: null,
  tgName: null,
  isTelegram: false,
  uid: null,
  account: null,
  authError: null,
  authBusy: false,
  merge: null,
  cloudResume: false,
  systemMenu: false,
  buildSheet: false,
  go: (screen, params) =>
    set((s) =>
      s.screen === screen
        ? { params, systemMenu: false, buildSheet: false }
        : {
            screen,
            params,
            navDir: "forward" as NavDirection,
            systemMenu: false,
            buildSheet: false,
            stack: nextStack(s.stack, { screen: s.screen, params: s.params }, screen),
          },
    ),
  back: () => {
    const s = get();
    const action = backActionFor(s);
    if (action.kind === "none") return;
    if (action.kind === "guard") {
      runBackGuard(s.screen);
      return;
    }
    set({
      screen: action.entry.screen,
      params: action.entry.params,
      stack: action.stack,
      navDir: "back",
      systemMenu: false,
      buildSheet: false,
    });
  },
  seed: (stack, screen, params) =>
    set({
      screen,
      params,
      stack: [...stack],
      navDir: "forward",
      systemMenu: false,
      buildSheet: false,
    }),
  setParams: (params) => set({ params }),
  setSystemMenu: (systemMenu) => set({ systemMenu }),
  setBuildSheet: (buildSheet) => set({ buildSheet }),
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
