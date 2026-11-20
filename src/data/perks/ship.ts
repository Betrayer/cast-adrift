import {
  MASTERY_MAX_RANK,
  SHIP_MASTERY,
  type MasteredShipId,
} from "@/data/shipMastery";
import type { ShipId } from "@/data/ships";
import type { PerkDef, PerkRarity } from "@/data/perks/types";
import type { SlotId } from "@/types/battle";

export const MASTERY_PERK_PREFIX = "mastery-";

const SHIP_PERK_POOL = "systems";

type ShipPerkBody = Pick<PerkDef, "effects" | "mods" | "traits">;

const masteryPerk = (
  shipId: MasteredShipId,
  rank: number,
  kind: string,
  mods: PerkDef["mods"],
): PerkDef => ({
  id: `${MASTERY_PERK_PREFIX}${shipId}-${String(rank)}`,
  name: `content:shipMastery.${kind}.name`,
  desc: `content:shipMastery.${kind}.desc`,
  rarity: "common",
  pool: SHIP_PERK_POOL,
  mods,
});

export const MASTERY_PERKS: readonly PerkDef[] = (
  Object.keys(SHIP_MASTERY) as MasteredShipId[]
).flatMap((shipId) => {
  const table = SHIP_MASTERY[shipId];
  return [
    masteryPerk(shipId, 1, "hull", { hullMaxDelta: table.hull }),
    masteryPerk(shipId, 2, "reserve", { reserveDelta: table.reserve }),
    masteryPerk(shipId, 4, "firstHit", {
      firstHitReducePct: table.firstHitReducePct,
    }),
  ];
});

export const isMasteryPerk = (id: string): boolean =>
  id.startsWith(MASTERY_PERK_PREFIX);

export const draftedPerks = (perks: readonly string[]): string[] =>
  perks.filter((id) => !isMasteryPerk(id));

export const masteryPerkIds = (shipId: ShipId, rank: number): string[] => {
  const ids: string[] = [];
  for (let r = 1; r <= Math.min(rank, MASTERY_MAX_RANK); r += 1) {
    const id = `${MASTERY_PERK_PREFIX}${shipId}-${String(r)}`;
    if (MASTERY_PERKS.some((perk) => perk.id === id)) ids.push(id);
  }
  return ids;
};

const shipPerk = (
  id: string,
  rarity: PerkRarity,
  body: ShipPerkBody,
): PerkDef => ({
  id,
  name: `content:shipPerks.${id}.name`,
  desc: `content:shipPerks.${id}.desc`,
  rarity,
  pool: SHIP_PERK_POOL,
  ...body,
});

export const SHIP_PERKS: readonly PerkDef[] = [
  shipPerk("shipTurret", "common", {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  shipPerk("shipPlates", "common", { mods: { firstHitReducePct: 30 } }),
  shipPerk("shipAfterburner", "common", {
    mods: { evasionDelta: 6 },
    effects: [{ on: "battleStart", do: [{ a: "hull", n: -2 }] }],
  }),
  shipPerk("shipBay", "common", { mods: { moduleSlotDelta: 1 } }),
  shipPerk("shipTargeting", "common", {}),
  shipPerk("shipCapacitor", "common", {
    effects: [{ on: "rollStart", do: [{ a: "shield", n: 1 }] }],
  }),
  shipPerk("shipCoil", "common", { mods: { chargeCapDelta: 1 } }),
  shipPerk("shipMagnet", "common", { mods: { battleStartScrap: 2 } }),
  shipPerk("shipBallast", "common", { mods: { hullMaxDelta: 1 } }),
  shipPerk("shipOverdrive", "common", { mods: { rerollSizeDelta: 2 } }),
  shipPerk("shipHardpoint", "common", {}),
  shipPerk("shipCargoWeb", "common", { mods: { reserveDelta: 1 } }),
  shipPerk("shipLattice", "common", { mods: { shieldKeepPct: 15 } }),
  shipPerk("shipPrism", "common", { mods: { resonanceCountDelta: 1 } }),
  shipPerk("shipDrones", "common", { mods: { battleEndHeal: 1 } }),
  shipPerk("shipBlackBox", "common", { traits: ["blackBox"] }),
];

export const SHIP_PERK_IDS: readonly string[] = SHIP_PERKS.map((perk) => perk.id);

export const isShipPerk = (id: string): boolean => SHIP_PERK_IDS.includes(id);

export const ordinaryPerks = (perks: readonly string[]): string[] =>
  perks.filter((id) => !isMasteryPerk(id) && !isShipPerk(id));

export const SHIP_PERK_NEEDS_SLOT: Readonly<Record<string, readonly SlotId[]>> = {
  shipTargeting: ["sensors"],
  shipCapacitor: ["shields", "shieldsB"],
  shipLattice: ["shields", "shieldsB"],
  shipHardpoint: ["weaponA", "weaponB", "spinal"],
};

export const SHIP_PERK_MK: Readonly<Record<string, SlotId>> = {
  shipTargeting: "sensors",
};

export const SHIP_PERK_SLOT_TIER: Readonly<
  Record<string, Partial<Record<SlotId, number>>>
> = {
  shipHardpoint: { weaponA: 1, weaponB: 1, spinal: 1 },
};

export const shipPerkSlotTierDelta = (
  perks: readonly string[],
): Partial<Record<SlotId, number>> => {
  const out: Partial<Record<SlotId, number>> = {};
  for (const id of perks) {
    for (const [slot, delta] of Object.entries(SHIP_PERK_SLOT_TIER[id] ?? {})) {
      const key = slot as SlotId;
      out[key] = (out[key] ?? 0) + delta;
    }
  }
  return out;
};
