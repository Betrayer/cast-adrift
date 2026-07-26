import { create } from "zustand";

export interface RunResult {
  xpGain: number;
  shardGain: number;
  fromLevel: number;
  toLevel: number;
  win: boolean;
  milestones: string[];
}

export interface SummaryState {
  result: RunResult | null;
  setResult: (result: RunResult) => void;
  clear: () => void;
}

export const useSummaryStore = create<SummaryState>()((set) => ({
  result: null,
  setResult: (result) => {
    set({ result });
  },
  clear: () => {
    set({ result: null });
  },
}));

declare global {
  interface Window {
    __summary?: typeof useSummaryStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__summary = useSummaryStore;
}
