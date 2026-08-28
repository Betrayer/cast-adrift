import type { SlotProjection } from '@/game/battle/view';
import type { SlotId, SlotState } from '@/types/battle';

export interface FixtureSlot {
  slotId: SlotId;
  slot: SlotState;
  order: number;
  projection: SlotProjection;
  legal: boolean;
}

const projection = (
  slotId: SlotId,
  patch: Partial<SlotProjection>,
): SlotProjection => ({
  slotId,
  kind: null,
  base: 5,
  value: 5,
  bonus: 0,
  amount: 0,
  inherited: null,
  evasion: null,
  sensor: null,
  overflowHull: 0,
  jammed: false,
  ...patch,
});

export const PREVIEW_SLOTS: readonly FixtureSlot[] = [
  {
    slotId: 'sensors',
    slot: { cap: 6, mk: 1 },
    order: 1,
    legal: false,
    projection: projection('sensors', {
      kind: 'sensor',
      sensor: { vulnerable: 3, pierce: 0 },
    }),
  },
  {
    slotId: 'weaponA',
    slot: { cap: 8, mk: 1 },
    order: 2,
    legal: true,
    projection: projection('weaponA', {
      kind: 'damage',
      value: 7,
      bonus: 2,
      amount: 7,
    }),
  },
  {
    slotId: 'weaponB',
    slot: { cap: 8, mk: 1 },
    order: 3,
    legal: true,
    projection: projection('weaponB', {
      kind: 'damage',
      value: 7,
      bonus: 2,
      amount: 7,
    }),
  },
  {
    slotId: 'shields',
    slot: { cap: 8, mk: 1 },
    order: 4,
    legal: false,
    projection: projection('shields', { kind: 'shield', amount: 5 }),
  },
  {
    slotId: 'engines',
    slot: { cap: 6, mk: 1 },
    order: 5,
    legal: false,
    projection: projection('engines', {
      kind: 'engine',
      evasion: { dodgePct: 6, glancingPct: 14, intercept: false },
    }),
  },
  {
    slotId: 'reactor',
    slot: { cap: 10, mk: 1 },
    order: 6,
    legal: false,
    projection: projection('reactor', { kind: 'charge', amount: 5 }),
  },
];
