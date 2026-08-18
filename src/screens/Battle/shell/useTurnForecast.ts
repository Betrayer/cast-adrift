import { useShallow } from 'zustand/react/shallow';
import { enemyForecast, type TurnForecast } from '@/game/battle/view';
import {
  battleSnapshot,
  useBattleStore,
  type BattleState,
} from '@/stores/battleStore';

export const forecastDeps = (board: BattleState): readonly unknown[] => [
  board.phase,
  board.turn,
  board.dice,
  board.slots,
  board.enemies,
  board.hull,
  board.shield,
  board.charge,
  board.evasion,
  board.mutators,
  board.blockedSlots,
  board.shrunkSlots,
  board.inverted,
  board.foldedTurns,
  board.nextTurnMods,
  board.grants,
  board.scheduled,
];

const sameDeps = (a: readonly unknown[], b: readonly unknown[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

interface ForecastCache {
  deps: readonly unknown[];
  value: TurnForecast | null;
}

let cache: ForecastCache | null = null;
let computations = 0;

export const forecastComputations = (): number => computations;

export const resetForecastCache = (): void => {
  cache = null;
  computations = 0;
};

export const forecastFrom = (
  deps: readonly unknown[],
  board: BattleState,
): TurnForecast | null => {
  if (cache !== null && sameDeps(cache.deps, deps)) return cache.value;
  computations += 1;
  const value =
    board.phase === 'placement' ? enemyForecast(battleSnapshot(board)) : null;
  cache = { deps, value };
  return value;
};

export const useTurnForecast = (): TurnForecast | null => {
  const deps = useBattleStore(useShallow(forecastDeps));
  return forecastFrom(deps, useBattleStore.getState());
};
