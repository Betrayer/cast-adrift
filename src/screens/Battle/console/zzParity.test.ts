import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { INTENT_KINDS, type Intent, type IntentKind } from '@/types/content';
import { intentLabel } from './intentLabel';
import { intentExplain } from './intentExplain';
import { oldIntentLabel } from './zzOldLabel';
import { oldIntentExplain } from './zzOldExplain';

const t = ((key: string, vars?: Record<string, unknown>): string =>
  `${key}|${JSON.stringify(vars ?? {})}`) as unknown as TFunction<
  ['battle', 'content']
>;

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

const EXTRA: readonly Intent[] = [
  { t: 'attack', n: 6, self: 3 },
  { t: 'attack', n: 6, self: 0 },
  { t: 'lockDie', target: 'highest' },
  { t: 'jamSlot', k: 2 },
];

describe('parity', () => {
  it('label key parity', () => {
    for (const kind of INTENT_KINDS) {
      const now = intentLabel(t, SAMPLE[kind]);
      const before = oldIntentLabel(t, SAMPLE[kind]);
      expect(now.split('|')[0], kind).toBe(before.split('|')[0]);
    }
    for (const intent of EXTRA) {
      expect(intentLabel(t, intent).split('|')[0]).toBe(
        oldIntentLabel(t, intent).split('|')[0],
      );
    }
  });
  it('explain key parity', () => {
    for (const kind of INTENT_KINDS) {
      expect(intentExplain(t, SAMPLE[kind]), kind).toBe(
        oldIntentExplain(t, SAMPLE[kind]),
      );
    }
    for (const intent of EXTRA) {
      expect(intentExplain(t, intent)).toBe(oldIntentExplain(t, intent));
    }
  });
  it('label vars superset with no changed values', () => {
    for (const intent of [...INTENT_KINDS.map((k) => SAMPLE[k]), ...EXTRA]) {
      const before = JSON.parse(
        oldIntentLabel(t, intent).split('|')[1] ?? '{}',
      ) as Record<string, number>;
      const now = JSON.parse(
        intentLabel(t, intent).split('|')[1] ?? '{}',
      ) as Record<string, number>;
      for (const [k, v] of Object.entries(before)) expect(now[k]).toBe(v);
    }
  });
});
