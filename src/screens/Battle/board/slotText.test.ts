import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import battleDe from '@/i18n/de/battle.json';
import battleEn from '@/i18n/en/battle.json';
import battleEs from '@/i18n/es/battle.json';
import battleFr from '@/i18n/fr/battle.json';
import battlePl from '@/i18n/pl/battle.json';
import battleRu from '@/i18n/ru/battle.json';
import battleUk from '@/i18n/uk/battle.json';
import type { SlotProjection } from '@/game/battle/view';
import { projectionShort, projectionText } from './slotText';

type Tree = { [key: string]: string | Tree };

const LOCALES: Record<string, Tree> = {
  en: battleEn as unknown as Tree,
  ru: battleRu as unknown as Tree,
  uk: battleUk as unknown as Tree,
  de: battleDe as unknown as Tree,
  es: battleEs as unknown as Tree,
  fr: battleFr as unknown as Tree,
  pl: battlePl as unknown as Tree,
};

const resolve = (bundle: Tree, path: string): string | undefined => {
  let node: string | Tree | undefined = bundle;
  for (const seg of path.split('.')) {
    if (typeof node !== 'object') return undefined;
    node = node[seg];
  }
  return typeof node === 'string' ? node : undefined;
};

const translator = (locale: string): TFunction<['battle']> => {
  const bundle = LOCALES[locale];
  return ((key: string, vars?: Record<string, unknown>): string => {
    const raw =
      bundle === undefined
        ? undefined
        : resolve(bundle, key.replace(/^battle:/, ''));
    if (raw === undefined) return `MISSING:${key}`;
    return raw.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
      String(vars?.[name] ?? `MISSING_VAR:${name}`),
    );
  }) as unknown as TFunction<['battle']>;
};

const t = translator('en');

const projection = (patch: Partial<SlotProjection>): SlotProjection => ({
  slotId: 'weaponA',
  kind: 'damage',
  base: 6,
  value: 6,
  bonus: 0,
  amount: 6,
  inherited: null,
  evasion: null,
  sensor: null,
  overflowHull: 0,
  jammed: false,
  hits: 1,
  fragments: [6],
  ...patch,
});

const split = (fragments: readonly number[]): Partial<SlotProjection> => ({
  fragments,
  hits: fragments.length,
  amount: fragments.reduce((sum, n) => sum + n, 0),
});

const PRODUCT = /\d\s*[×xX*]\s*\d/;

describe('a slot that hits more than once reads as a split', () => {
  it('does not sell a ricochet second hit as a Vulnerable bonus', () => {
    const text = projectionText(t, 'weaponA', projection(split([8, 3])));
    expect(text).toBe('11 dmg · 8+3');
    expect(text).not.toContain('=');
  });

  it('does not sell red-6 repeat damage as a Vulnerable bonus', () => {
    expect(
      projectionText(t, 'weaponA', projection({ value: 6, ...split([6, 6]) })),
    ).toBe('12 dmg · 6+6');
  });

  it('keeps the Vulnerable line for a single hit that a mark grew', () => {
    expect(
      projectionText(
        t,
        'weaponA',
        projection({ base: 5, value: 7, amount: 9, hits: 1, fragments: [9] }),
      ),
    ).toBe('9 = 7+2');
  });

  it('states the damage a mode costs instead of the untouched slot value', () => {
    expect(
      projectionText(
        t,
        'weaponA',
        projection({ base: 3, value: 5, amount: 4, hits: 1, fragments: [4] }),
      ),
    ).toBe('4 = 5−1');
  });

  it('nets a mark against a mode cost on one line', () => {
    expect(
      projectionText(
        t,
        'weaponA',
        projection({ base: 3, value: 5, amount: 7, hits: 1, fragments: [7] }),
      ),
    ).toBe('7 = 5+2');
  });

  it('shows what a single hit deals, not its slot value, on the compact layouts', () => {
    expect(
      projectionShort(
        t,
        'weaponA',
        projection({ value: 5, amount: 3, hits: 1, fragments: [3] }),
      ),
    ).toBe('3');
  });

  it('spells the beats out on the compact layouts instead of a total', () => {
    expect(
      projectionShort(t, 'weaponA', projection(split([6, 6, 6]))),
    ).toBe('6+6+6');
  });

  it('keeps an uneven scatter honest about every fragment', () => {
    const uneven = projection(split([4, 3, 3]));
    expect(projectionShort(t, 'weaponA', uneven)).toBe('4+3+3');
    expect(projectionText(t, 'weaponA', uneven)).toBe('10 dmg · 4+3+3');
  });

  it('leaves a single hit reading as one number on the compact layouts', () => {
    expect(
      projectionShort(t, 'weaponA', projection({ amount: 6, hits: 1 })),
    ).toBe('6');
  });
});

describe('no multi-hit line can be read as a product of two numbers', () => {
  const CASES = [split([6, 6]), split([4, 3, 3]), split([12, 12]), split([8, 8, 7])];

  for (const locale of Object.keys(LOCALES)) {
    it(`holds in ${locale}, where the beats always sum to the stated total`, () => {
      const localised = translator(locale);
      for (const patch of CASES) {
        const one = projection(patch);
        const long = projectionText(localised, 'weaponA', one);
        const short = projectionShort(localised, 'weaponA', one);
        expect(long).not.toMatch(PRODUCT);
        expect(short).not.toMatch(PRODUCT);
        expect(short).toBe(one.fragments.join('+'));
        expect(long).toContain(short);
        expect(long.startsWith(String(one.amount))).toBe(true);
        expect(one.fragments.reduce((sum, n) => sum + n, 0)).toBe(one.amount);
      }
    });
  }
});
