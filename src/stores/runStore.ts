import { create } from 'zustand';
import type { MkLevel } from '@/data/slots';
import type { SlotId } from '@/types/battle';

export type MkLevels = Partial<Record<SlotId, MkLevel>>;

export interface RunState {
  pendingDeepScan: boolean;
  mkLevels: MkLevels;
  clearPendingDeepScan: () => void;
  bumpMk: (slotId: SlotId) => void;
  setMk: (slotId: SlotId, mk: MkLevel) => void;
  resetMk: () => void;
}

export const useRunStore = create<RunState>()((set) => ({
  pendingDeepScan: false,
  mkLevels: {},
  clearPendingDeepScan: () => {
    set({ pendingDeepScan: false });
  },
  bumpMk: (slotId) => {
    set((s) => {
      const current = s.mkLevels[slotId] ?? 1;
      const next: MkLevel = current >= 3 ? 3 : ((current + 1) as MkLevel);
      return { mkLevels: { ...s.mkLevels, [slotId]: next } };
    });
  },
  setMk: (slotId, mk) => {
    set((s) => ({ mkLevels: { ...s.mkLevels, [slotId]: mk } }));
  },
  resetMk: () => {
    set({ mkLevels: {} });
  },
}));
