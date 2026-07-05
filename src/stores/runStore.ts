import { create } from 'zustand';

export interface RunState {
  pendingDeepScan: boolean;
  clearPendingDeepScan: () => void;
}

export const useRunStore = create<RunState>()((set) => ({
  pendingDeepScan: false,
  clearPendingDeepScan: () => {
    set({ pendingDeepScan: false });
  },
}));
