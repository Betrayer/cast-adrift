import { create } from "zustand";
import type { ScoreBreakdown } from "@/game/run/modes";
import type { RunMode } from "@/stores/runStore";

export type SubmitState = "idle" | "pending" | "sent" | "failed" | "offline";

export interface RunResult {
  xpGain: number;
  shardGain: number;
  fromLevel: number;
  toLevel: number;
  win: boolean;
  milestones: string[];
  mode: RunMode;
  score: ScoreBreakdown | null;
  contractId: string | null;
  contractStars: number;
  rotation: readonly string[];
}

export interface SummaryState {
  result: RunResult | null;
  personalBest: number;
  beatPersonalBest: boolean;
  submit: SubmitState;
  setResult: (result: RunResult) => void;
  setPersonalBest: (best: number, beaten: boolean) => void;
  setSubmit: (submit: SubmitState) => void;
  clear: () => void;
}

export const useSummaryStore = create<SummaryState>()((set) => ({
  result: null,
  personalBest: 0,
  beatPersonalBest: false,
  submit: "idle",
  setResult: (result) => {
    set({ result, submit: "idle" });
  },
  setPersonalBest: (personalBest, beatPersonalBest) => {
    set({ personalBest, beatPersonalBest });
  },
  setSubmit: (submit) => {
    set({ submit });
  },
  clear: () => {
    set({
      result: null,
      personalBest: 0,
      beatPersonalBest: false,
      submit: "idle",
    });
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
