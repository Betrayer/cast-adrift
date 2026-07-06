import { create } from "zustand";
import type { LocKey } from "@/types/content";

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
  bark: BarkToast | null;
  seq: number;
  pushConsequence: (origin: LocKey) => void;
  pushBark: (line: LocKey) => void;
  dismissConsequence: () => void;
  dismissBark: () => void;
  reset: () => void;
}

export const useNarrativeStore = create<NarrativeState>()((set) => ({
  consequence: null,
  bark: null,
  seq: 0,

  pushConsequence: (origin) => {
    set((s) => ({ consequence: { id: s.seq + 1, origin }, seq: s.seq + 1 }));
  },

  pushBark: (line) => {
    set((s) => {
      if (s.bark !== null) return s;
      return { bark: { id: s.seq + 1, line }, seq: s.seq + 1 };
    });
  },

  dismissConsequence: () => {
    set({ consequence: null });
  },

  dismissBark: () => {
    set({ bark: null });
  },

  reset: () => {
    set({ consequence: null, bark: null });
  },
}));
