import { SHIP_BY_ID, type ShipId, type ShipPassive } from "@/data/ships";
import type { SlotId } from "@/types/battle";

export type PassiveHandlerId = ShipPassive["kind"];

export type PassiveActionId = "fuse" | "reschool";

export interface OverCapRule {
  hullCost: number;
  slots: ReadonlySet<SlotId>;
}

export interface AfterburnerRule {
  weapons: number;
  cap: number;
}

export interface EvasionTuning {
  delta: number;
  dodgeCap: number;
  glancingCap: number;
  dodgePerValue: number;
  glancingPerValue: number;
}

export interface PassiveProfile {
  battleStartScrap: number;
  overCap: OverCapRule | null;
  shieldKeepPct: number;
  evasion: EvasionTuning | null;
  afterburner: AfterburnerRule | null;
  prismaticCensusMult: number;
  fuseTierStep: number;
  action: PassiveActionId | null;
}

const NONE: PassiveProfile = {
  battleStartScrap: 0,
  overCap: null,
  shieldKeepPct: 0,
  evasion: null,
  afterburner: null,
  prismaticCensusMult: 1,
  fuseTierStep: 0,
  action: null,
};

const OVERLOAD_SLOTS: ReadonlySet<SlotId> = new Set([
  "weaponA",
  "weaponB",
  "spinal",
]);

type PassiveOf<K extends PassiveHandlerId> = Extract<ShipPassive, { kind: K }>;

type PassiveHandler<K extends PassiveHandlerId> = (
  passive: PassiveOf<K>,
) => Partial<PassiveProfile>;

const HANDLERS: { [K in PassiveHandlerId]: PassiveHandler<K> } = {
  scrapper: (passive) => ({ battleStartScrap: passive.scrap }),
  overload: (passive) => ({
    overCap: { hullCost: passive.hullCost, slots: OVERLOAD_SLOTS },
  }),
  bulwark: (passive) => ({ shieldKeepPct: passive.keepPct }),
  afterburner: (passive) => ({
    evasion: {
      delta: passive.evasionDelta,
      dodgeCap: passive.dodgeCap,
      glancingCap: passive.glancingCap,
      dodgePerValue: passive.dodgePerValue,
      glancingPerValue: passive.glancingPerValue,
    },
    afterburner: { weapons: passive.weapons, cap: passive.cap },
  }),
  annealer: (passive) => ({ fuseTierStep: passive.tierStep, action: "fuse" }),
  refractor: (passive) => ({
    prismaticCensusMult: passive.censusMult,
    action: "reschool",
  }),
};

const dispatch = (passive: ShipPassive): Partial<PassiveProfile> =>
  (HANDLERS[passive.kind] as PassiveHandler<PassiveHandlerId>)(passive);

export const passiveProfileOf = (
  passive: ShipPassive | undefined,
): PassiveProfile =>
  passive === undefined ? NONE : { ...NONE, ...dispatch(passive) };

const PROFILES: ReadonlyMap<ShipId, PassiveProfile> = new Map(
  [...SHIP_BY_ID].map(([id, def]) => [id, passiveProfileOf(def.passive)]),
);

export const shipProfile = (shipId: ShipId | undefined): PassiveProfile =>
  shipId === undefined ? NONE : (PROFILES.get(shipId) ?? NONE);

export const overCapAllowed = (
  shipId: ShipId | undefined,
  slotId: SlotId,
): OverCapRule | null => {
  const rule = shipProfile(shipId).overCap;
  return rule !== null && rule.slots.has(slotId) ? rule : null;
};

export const passiveActionOf = (
  shipId: ShipId | undefined,
): PassiveActionId | null => shipProfile(shipId).action;
