import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import en from '@/i18n/en/battle.json';
import { INTENT_KINDS, type Intent, type IntentKind } from '@/types/content';
import { intentExplain } from './intentExplain';
import { intentLabel } from './intentLabel';

type Tree = { [key: string]: string | Tree };

const resolve = (path: string): string | undefined => {
  let node: string | Tree | undefined = en as unknown as Tree;
  for (const seg of path.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[seg];
  }
  return typeof node === 'string' ? node : undefined;
};

const t = ((key: string, vars?: Record<string, unknown>): string => {
  const raw = resolve(key.replace(/^battle:/, ''));
  if (raw === undefined) return `MISSING:${key}`;
  return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(vars?.[name] ?? `MISSING_VAR:${name}`),
  );
}) as unknown as TFunction<['battle', 'content']>;

const SAMPLE: Record<IntentKind, Intent> = {
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

const VARIANTS: readonly Intent[] = [
  { t: 'attack', n: 6, self: 3 },
  { t: 'lockDie', target: 'highest' },
  { t: 'jamSlot', k: 2 },
];

describe('intent explainers', () => {
  it('covers every intent kind in the union', () => {
    expect(Object.keys(SAMPLE).sort()).toEqual([...INTENT_KINDS].sort());
  });

  it('renders a real sentence for every kind', () => {
    for (const kind of INTENT_KINDS) {
      const intent = SAMPLE[kind];
      const line = intentExplain(t, intent);
      expect(line, kind).not.toContain('MISSING');
      expect(line.length, kind).toBeGreaterThan(12);
      expect(line, kind).toMatch(/[.!]$/);
    }
  });

  it('renders a chip label for every kind', () => {
    for (const kind of INTENT_KINDS) {
      const line = intentLabel(t, SAMPLE[kind]);
      expect(line, kind).not.toContain('MISSING');
      expect(line.length, kind).toBeGreaterThan(0);
    }
  });

  it('states the number for the kinds that carry one', () => {
    expect(intentExplain(t, SAMPLE.attack)).toContain('5');
    expect(intentExplain(t, SAMPLE.multi)).toContain('6');
    expect(intentExplain(t, SAMPLE.bargain)).toContain('10');
    expect(intentExplain(t, SAMPLE.echoTotal)).toContain('14');
  });

  it('branches on the optional fields', () => {
    for (const intent of VARIANTS) {
      const line = intentExplain(t, intent);
      expect(line).not.toContain('MISSING');
    }
    expect(intentExplain(t, VARIANTS[0] as Intent)).toContain('3');
    expect(intentExplain(t, VARIANTS[2] as Intent)).toContain('2');
  });
});
