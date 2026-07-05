import { create } from 'zustand';

export type RunState = Record<string, never>;

export const useRunStore = create<RunState>()(() => ({}));
