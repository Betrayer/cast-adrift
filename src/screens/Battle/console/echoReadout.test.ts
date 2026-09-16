import { describe, expect, it } from 'vitest';
import { ENEMY_BY_ID } from '@/data/enemies';
import { harnessSnap } from '@/game/battle/battleHarness';
import { resolveEnemyPhase } from '@/game/battle/resolver';
import { patternFor, spawnEnemy } from '@/game/battle/setup';
import { createStream } from '@/services/rng';
import type { BattleSnapshot } from '@/types/battle';
import type { PatternStep } from '@/types/content';
import { echoReadoutFor } from './echoReadout';

const defOf = (id: string) => {
  const def = ENEMY_BY_ID.get(id);
  if (def === undefined) throw new Error(`no enemy ${id}`);
  return def;
};

const rawDamageOf = (step: PatternStep): number => {
  if ('pick' in step || 'when' in step) return -1;
  if (step.t === 'attack') return step.n;
  if (step.t === 'multi') return step.n * step.k;
  return -1;
};

const heaviestAttackIn = (pattern: readonly PatternStep[]): PatternStep => {
  const best = [...pattern].sort(
    (a, b) => rawDamageOf(b) - rawDamageOf(a),
  )[0];
  if (best === undefined) throw new Error('empty pattern');
  return best;
};

describe('the Readout card', () => {
  it('names the fork of the step after the one on show', () => {
    const readout = echoReadoutFor(defOf('raider'), { intentIndex: 0, phase: 0 }, 0);
    expect(readout?.kind).toBe('fork');
    if (readout?.kind !== 'fork') return;
    expect(readout.fork.cond).toBe('content:echo.cond.selfHpPctLt');
    expect(readout.fork.values).toEqual({ n: 40 });
    expect(readout.fork.then).toEqual({ t: 'multi', n: 5, k: 4 });
    expect(readout.fork.else).toEqual({ t: 'shield', n: 6 });
  });

  it('names a fixed step rather than pretending it forks', () => {
    const readout = echoReadoutFor(defOf('raider'), { intentIndex: 1, phase: 0 }, 0);
    expect(readout).toEqual({ kind: 'fixed', intent: { t: 'multi', n: 5, k: 3 } });
  });

  it('says a drawn step is undecided instead of guessing a face', () => {
    const readout = echoReadoutFor(
      defOf('shieldWarden'),
      { intentIndex: 0, phase: 0 },
      0,
    );
    expect(readout).toEqual({ kind: 'open' });
  });

  it('wraps the pattern so the last step reads back to the first', () => {
    const readout = echoReadoutFor(defOf('raider'), { intentIndex: 2, phase: 0 }, 0);
    expect(readout).toEqual({ kind: 'fixed', intent: { t: 'multi', n: 5, k: 4 } });
  });

  it('reads the pattern the ascension actually plays', () => {
    const boss = defOf('theHush');
    const plain = patternFor(boss, 0, 0);
    const ascended = patternFor(boss, 0, 8);
    const last = plain.length - 1;

    expect(echoReadoutFor(boss, { intentIndex: last, phase: 0 }, 0)).toEqual({
      kind: 'fixed',
      intent: plain[(last + 1) % plain.length],
    });

    expect(ascended).toHaveLength(plain.length + 1);
    expect(ascended[ascended.length - 1]).toEqual(heaviestAttackIn(plain));
    expect(echoReadoutFor(boss, { intentIndex: last, phase: 0 }, 8)).toEqual({
      kind: 'fixed',
      intent: ascended[(last + 1) % ascended.length],
    });
  });

  it('names the step the enemy itself goes on to draw', () => {
    const ascension = 8;
    const boss = defOf('theHush');
    const spawned = spawnEnemy(boss.id, 'enemy-0', createStream(7), {
      ascension,
    });
    const pattern = patternFor(boss, spawned.phase, ascension);
    let snap: BattleSnapshot = harnessSnap([], {
      enemies: [spawned],
      targetId: spawned.id,
      hull: 400,
      hullMax: 400,
      ascension,
    });
    for (let step = 0; step < pattern.length - 2; step += 1) {
      snap = resolveEnemyPhase(snap, createStream(7)).next;
    }

    const armed = snap.enemies[0];
    if (armed === undefined) throw new Error('no enemy on the board');
    expect(armed.phase).toBe(spawned.phase);
    expect(armed.intentIndex).toBe(pattern.length - 2);

    const readout = echoReadoutFor(boss, armed, ascension);
    const drawn = resolveEnemyPhase(snap, createStream(7)).next.enemies[0];
    if (drawn === undefined) throw new Error('no enemy after the turn');
    expect(drawn.intentIndex).toBe(pattern.length - 1);
    expect(readout).toEqual({ kind: 'fixed', intent: drawn.nextIntent });
  });
});
