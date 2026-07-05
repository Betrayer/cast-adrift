import { create } from 'zustand';
import type { ScreenId } from '@/types';

export interface AppState {
  screen: ScreenId;
  params: Record<string, string> | undefined;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  screen: 'menu',
  params: undefined,
  go: (screen, params) => set({ screen, params }),
}));
