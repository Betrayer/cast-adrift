import { isResumableScreen, ROUTES } from "@/app/routes";
import {
  backActionFor,
  useAppStore,
  type ScreenParams,
  type StackEntry,
} from "@/stores/appStore";
import type { ScreenId } from "@/types";

const RECORD_KEY = "ca";

export interface NavRecord {
  screen: ScreenId;
  params: ScreenParams;
  stack: StackEntry[];
}

export interface HistoryLike {
  state: unknown;
  pushState: (data: unknown, unused: string) => void;
  replaceState: (data: unknown, unused: string) => void;
  back: () => void;
}

export interface NavHost {
  history: HistoryLike;
  addEventListener: (
    type: "popstate",
    handler: (event: { state: unknown }) => void,
  ) => void;
  removeEventListener: (
    type: "popstate",
    handler: (event: { state: unknown }) => void,
  ) => void;
}

const isScreenId = (value: unknown): value is ScreenId =>
  typeof value === "string" && Object.hasOwn(ROUTES, value);

const readParams = (value: unknown): ScreenParams => {
  if (typeof value !== "object" || value === null) return undefined;
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") out[key] = entry;
  }
  return Object.keys(out).length === 0 ? undefined : out;
};

const readEntries = (value: unknown): StackEntry[] => {
  if (!Array.isArray(value)) return [];
  const out: StackEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const screen = (raw as { screen?: unknown }).screen;
    if (!isScreenId(screen)) continue;
    out.push({ screen, params: readParams((raw as { params?: unknown }).params) });
  }
  return out;
};

export const readNavRecord = (state: unknown): NavRecord | null => {
  if (typeof state !== "object" || state === null) return null;
  const raw = (state as Record<string, unknown>)[RECORD_KEY];
  if (typeof raw !== "object" || raw === null) return null;
  const screen = (raw as { screen?: unknown }).screen;
  if (!isScreenId(screen)) return null;
  return {
    screen,
    params: readParams((raw as { params?: unknown }).params),
    stack: readEntries((raw as { stack?: unknown }).stack),
  };
};

export const resumableRecord = (record: NavRecord): NavRecord | null => {
  if (!isResumableScreen(record.screen)) return null;
  return {
    screen: record.screen,
    params: record.params,
    stack: record.stack.filter((entry) => isResumableScreen(entry.screen)),
  };
};

const snapshot = (): { [RECORD_KEY]: NavRecord } => {
  const state = useAppStore.getState();
  return {
    [RECORD_KEY]: {
      screen: state.screen,
      params: state.params,
      stack: state.stack.map((entry) => ({ ...entry })),
    },
  };
};

export const installNavHistory = (host: NavHost): (() => void) => {
  let suppressMirror = 0;
  let suppressPop = 0;
  let position = 0;

  const restored = readNavRecord(host.history.state);
  const resumable = restored === null ? null : resumableRecord(restored);
  if (resumable !== null) {
    useAppStore.getState().seed(resumable.stack, resumable.screen, resumable.params);
  }
  host.history.replaceState(snapshot(), "");

  const applyRecord = (record: NavRecord): void => {
    suppressMirror += 1;
    useAppStore.getState().seed(record.stack, record.screen, record.params);
    host.history.replaceState(snapshot(), "");
  };

  const stepBack = (): void => {
    suppressMirror += 1;
    useAppStore.getState().back();
    host.history.replaceState(snapshot(), "");
  };

  const onPopState = (event: { state: unknown }): void => {
    if (suppressPop > 0) {
      suppressPop -= 1;
      host.history.replaceState(snapshot(), "");
      return;
    }
    const store = useAppStore.getState();
    const record = readNavRecord(event.state);
    const backwards = record === null || record.stack.length < store.stack.length;
    if (!backwards) {
      position += 1;
      if (isResumableScreen(record.screen)) {
        applyRecord(record);
        return;
      }
      suppressPop += 1;
      position -= 1;
      host.history.back();
      return;
    }
    position = Math.max(0, position - 1);
    const action = backActionFor(store);
    if (action.kind === "to") {
      stepBack();
      return;
    }
    host.history.pushState(snapshot(), "");
    position += 1;
    if (action.kind === "guard") store.back();
  };

  const unsubscribe = useAppStore.subscribe((state, previous) => {
    if (
      state.screen === previous.screen &&
      state.params === previous.params &&
      state.stack === previous.stack
    ) {
      return;
    }
    if (suppressMirror > 0) {
      suppressMirror -= 1;
      return;
    }
    if (state.stack.length > previous.stack.length) {
      host.history.pushState(snapshot(), "");
      position += 1;
      return;
    }
    if (state.stack.length < previous.stack.length && position > 0) {
      suppressPop += 1;
      position -= 1;
      host.history.back();
      return;
    }
    host.history.replaceState(snapshot(), "");
  });

  host.addEventListener("popstate", onPopState);
  return () => {
    host.removeEventListener("popstate", onPopState);
    unsubscribe();
  };
};

export const installBrowserNavHistory = (): (() => void) | null => {
  if (typeof window === "undefined") return null;
  return installNavHistory(window as unknown as NavHost);
};
