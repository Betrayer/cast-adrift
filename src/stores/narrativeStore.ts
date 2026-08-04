import { create } from "zustand";
import type { LocKey } from "@/types/content";

export const TOAST_QUEUE_CAP = 3;

export interface ConsequenceToast {
  id: number;
  origin: LocKey;
}

export interface BarkToast {
  id: number;
  line: LocKey;
}

export interface NarrativeState {
  consequence: ConsequenceToast | null;
  consequenceQueue: ConsequenceToast[];
  bark: BarkToast | null;
  barkQueue: BarkToast[];
  seq: number;
  pushConsequence: (origin: LocKey) => void;
  pushBark: (line: LocKey) => void;
  dismissConsequence: () => void;
  dismissBark: () => void;
  reset: () => void;
}

export const useNarrativeStore = create<NarrativeState>()((set) => ({
  consequence: null,
  consequenceQueue: [],
  bark: null,
  barkQueue: [],
  seq: 0,

  pushConsequence: (origin) => {
    set((s) => {
      const toast = { id: s.seq + 1, origin };
      if (s.consequence === null) return { consequence: toast, seq: toast.id };
      if (s.consequenceQueue.length >= TOAST_QUEUE_CAP) return s;
      return { consequenceQueue: [...s.consequenceQueue, toast], seq: toast.id };
    });
  },

  pushBark: (line) => {
    set((s) => {
      const toast = { id: s.seq + 1, line };
      if (s.bark === null) return { bark: toast, seq: toast.id };
      if (s.barkQueue.length >= TOAST_QUEUE_CAP) return s;
      return { barkQueue: [...s.barkQueue, toast], seq: toast.id };
    });
  },

  dismissConsequence: () => {
    set((s) => ({
      consequence: s.consequenceQueue[0] ?? null,
      consequenceQueue: s.consequenceQueue.slice(1),
    }));
  },

  dismissBark: () => {
    set((s) => ({
      bark: s.barkQueue[0] ?? null,
      barkQueue: s.barkQueue.slice(1),
    }));
  },

  reset: () => {
    set({
      consequence: null,
      consequenceQueue: [],
      bark: null,
      barkQueue: [],
    });
  },
}));

declare global {
  interface Window {
    __narrative?: typeof useNarrativeStore;
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__narrative = useNarrativeStore;
}
