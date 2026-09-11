import { describe, expect, it } from 'vitest';
import { ENEMY_BY_ID } from '@/data/enemies';
import { echoReadoutFor } from './echoReadout';

const defOf = (id: string) => {
  const def = ENEMY_BY_ID.get(id);
  if (def === undefined) throw new Error(`no enemy ${id}`);
  return def;
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
    const last = boss.pattern.length - 1;
    expect(echoReadoutFor(boss, { intentIndex: last, phase: 0 }, 0)).toEqual({
      kind: 'fixed',
      intent: { t: 'jamSlot' },
    });
    expect(echoReadoutFor(boss, { intentIndex: last, phase: 0 }, 8)).toEqual({
      kind: 'fixed',
      intent: { t: 'attack', n: 10 },
    });
  });
});
