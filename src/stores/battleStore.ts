import { create } from 'zustand';

export type BattleState = Record<string, never>;

export const useBattleStore = create<BattleState>()(() => ({}));
