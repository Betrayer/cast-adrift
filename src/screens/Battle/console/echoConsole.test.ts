import { beforeEach, describe, expect, it } from 'vitest';
import { STARTER_DECK } from '@/data/decks';
import { echoToken } from '@/data/echo';
import { consoleActions, consoleShape } from '@/game/battle/view';
import { createStreams } from '@/services/rng';
import {
  createInitialBattleValues,
  useBattleStore,
} from '@/stores/battleStore';
import { createInitialRunValues, useRunStore } from '@/stores/runStore';
import { growShape } from './shape';
import type { EchoNodeId } from '@/data/echo';

const seat = (echo: EchoNodeId | undefined): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    hull: 30,
    hullMax: 30,
    echo: echo ?? null,
  });
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
  useBattleStore
    .getState()
    .startBattle({ enemyIds: ['raider'], echo }, [...STARTER_DECK], createStreams(42));
};

const board = () => useBattleStore.getState();

describe('the Echo console entry', () => {
  beforeEach(() => {
    useRunStore.getState().hydrate(createInitialRunValues());
  });

  it('renders for a battle active and for nothing else', () => {
    seat('secondLook');
    expect(consoleShape(board()).echo?.id).toBe('secondLook');
    seat('calculus');
    expect(consoleShape(board()).echo?.id).toBe('calculus');

    for (const passive of ['readout', 'echolocation', 'reserve', 'veto'] as const) {
      seat(passive);
      expect(consoleShape(board()).echo).toBeNull();
      expect(consoleActions(board()).echo.enabled).toBe(false);
      expect(consoleActions(board()).echo.block).toBe('notAllowed');
    }

    seat(undefined);
    expect(consoleShape(board()).echo).toBeNull();
  });

  it('is live once and then reads spent', () => {
    seat('calculus');
    expect(consoleActions(board()).echo.enabled).toBe(true);
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().spentGrants).toContain(
      echoToken('calculus'),
    );
    expect(consoleActions(board()).echo.enabled).toBe(false);
    expect(consoleActions(board()).echo.block).toBe('spent');
  });

  it('blocks Second Look when nothing is left in the tray', () => {
    seat('secondLook');
    expect(consoleActions(board()).echo.enabled).toBe(true);
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => ({ ...d, state: 'burned' as const })),
    }));
    expect(consoleActions(board()).echo.block).toBe('notAllowed');
  });

  it('is gated with every other entry while the board resolves', () => {
    seat('calculus');
    useBattleStore.setState({ phase: 'resolving' });
    expect(consoleActions(board()).echo.block).toBe('resolving');
    useBattleStore.setState({ phase: 'placement', rerollMode: true });
    expect(consoleActions(board()).echo.block).toBe('rerollMode');
  });

  it('keeps the node across a shape refresh so the row never blinks', () => {
    seat('calculus');
    const first = consoleShape(board());
    expect(growShape(first, consoleShape(board()))).toBe(first);
    expect(growShape(first, { ...first, echo: null }).echo?.id).toBe('calculus');
  });
});
