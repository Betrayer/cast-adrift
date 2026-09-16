import { describe, expect, it } from 'vitest';
import { INTENT_KINDS, type Intent, type IntentKind } from '@/types/content';
import { oldIntentSummary } from './zzOldSummary';
import { newIntentSummary } from './zzNewSummary';

const SAMPLE: Record<IntentKind, Intent> = {
  idle: { t: 'idle' },
  attack: { t: 'attack', n: 5 },
  shield: { t: 'shield', n: 4 },
  shieldAll: { t: 'shieldAll', n: 3 },
  multi: { t: 'multi', n: 3, k: 2 },
  charge: { t: 'charge' },
  jamSlot: { t: 'jamSlot' },
  lockDie: { t: 'lockDie' },
  summon: { t: 'summon', id: 'choirAcolyte' },
  healAllies: { t: 'healAllies', n: 4 },
  mirrorHalf: { t: 'mirrorHalf' },
  stealScrap: { t: 'stealScrap', n: 6 },
  capShrink: { t: 'capShrink' },
  twistDie: { t: 'twistDie' },
  swapValues: { t: 'swapValues' },
  storm: { t: 'storm' },
  curseDie: { t: 'curseDie', n: 2 },
  shieldGate: { t: 'shieldGate', n: 6 },
  mirrorSchool: { t: 'mirrorSchool' },
  drainCharge: { t: 'drainCharge', n: 3 },
  siphonShield: { t: 'siphonShield', n: 4 },
  bargain: { t: 'bargain', n: 10, heal: 6 },
  enrage: { t: 'enrage', n: 2 },
  hijack: { t: 'hijack' },
  echoTotal: { t: 'echoTotal', cap: 14 },
  foldOrder: { t: 'foldOrder' },
  devourDie: { t: 'devourDie' },
};

describe('intentSummary parity', () => {
  it('matches for every kind', () => {
    for (const kind of INTENT_KINDS) {
      expect(newIntentSummary(SAMPLE[kind]), kind).toBe(
        oldIntentSummary(SAMPLE[kind]),
      );
    }
    for (const intent of [
      { t: 'attack', n: 6, self: 3 },
      { t: 'lockDie', target: 'highest' },
      { t: 'jamSlot', k: 2 },
    ] as Intent[]) {
      expect(newIntentSummary(intent)).toBe(oldIntentSummary(intent));
    }
  });
});
