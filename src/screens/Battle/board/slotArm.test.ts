import { beforeEach, describe, expect, it } from 'vitest';
import { legalTargets } from '@/game/battle/view';
import { dropTargetSelector } from '@/pixi/battle/anchors';
import { createStreams } from '@/services/rng';
import { useBattleStore } from '@/stores/battleStore';
import { armedTargets } from './slotArm';

const DECK = ['ember', 'frostplate', 'sprout', 'grey-d4', 'ashen', 'coreshard'];

const startBattle = (): void => {
  useBattleStore.getState().reset();
  useBattleStore
    .getState()
    .startBattle({ enemyIds: ['raider'] }, DECK, createStreams(42));
};

const trayDie = () =>
  useBattleStore.getState().dice.find((die) => die.state === 'tray');

describe('slot arm', () => {
  beforeEach(startBattle);

  it('arms the slot a placement fills and nothing else', () => {
    const die = trayDie();
    expect(die).toBeDefined();
    if (die === undefined) return;
    const slotId = legalTargets(useBattleStore.getState(), die.uid).slots[0];
    expect(slotId).toBeDefined();
    if (slotId === undefined) return;
    const before = useBattleStore.getState();
    before.placeDie(die.uid, slotId);
    const after = useBattleStore.getState();
    expect(armedTargets(before, after)).toEqual([slotId]);
    expect(armedTargets(after, after)).toEqual([]);
  });

  it('does not arm the slot a die leaves', () => {
    const die = trayDie();
    expect(die).toBeDefined();
    if (die === undefined) return;
    const slotId = legalTargets(useBattleStore.getState(), die.uid).slots[0];
    expect(slotId).toBeDefined();
    if (slotId === undefined) return;
    useBattleStore.getState().placeDie(die.uid, slotId);
    const placed = useBattleStore.getState();
    placed.unplaceDie(die.uid);
    expect(armedTargets(placed, useBattleStore.getState())).toEqual([]);
  });

  it('arms the reserve when a die is reserved', () => {
    const board = useBattleStore.getState();
    const die = board.dice.find(
      (candidate) =>
        candidate.state === 'tray' && legalTargets(board, candidate.uid).reserve,
    );
    expect(die).toBeDefined();
    if (die === undefined) return;
    board.reserveDie(die.uid);
    expect(armedTargets(board, useBattleStore.getState())).toEqual(['reserve']);
  });

  it('ignores fills outside placement', () => {
    const board = useBattleStore.getState();
    const resolving = { ...board, phase: 'resolving' as const };
    const filled = {
      ...board,
      slots: { ...board.slots, weaponA: { cap: 6 as const, mk: 1 as const, dieUid: 'x' } },
    };
    expect(armedTargets(resolving, filled)).toEqual([]);
    expect(armedTargets(board, filled)).toEqual(['weaponA']);
  });

  it('targets the measured card of each drop target', () => {
    expect(dropTargetSelector('reserve')).toBe('[data-reserve]');
    expect(dropTargetSelector('engines')).toBe('[data-slot="engines"]');
  });
});
