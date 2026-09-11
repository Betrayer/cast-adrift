import type { LocKey, SlotId } from "@/types/content";

export const BASE_CARGO_HOLD = 1;

export const CARGO_PREFER_ROWS: readonly [number, number] = [3, 5];

export type CargoId =
  | "unstableCore"
  | "liveHold"
  | "overwoundCoils"
  | "saintsReliquary"
  | "leadBallast"
  | "stasisPods"
  | "choirContraband"
  | "keeperArchive";

interface CargoCopy {
  name: LocKey;
  desc: LocKey;
}

interface CargoBase extends CargoCopy {
  id: CargoId;
  payout: number;
  weight: number;
  chargeCapDelta?: number;
}

export type CargoDef =
  | (CargoBase & { drawback: "slotTier"; slot: SlotId; steps: number })
  | (CargoBase & { drawback: "hullPerNode"; hull: number })
  | (CargoBase & { drawback: "axisShift"; axis: number });

export type CargoDrawback = CargoDef["drawback"];

const copy = (id: CargoId): CargoCopy => ({
  name: `content:cargo.${id}.name`,
  desc: `content:cargo.${id}.desc`,
});

export const CARGO: readonly CargoDef[] = [
  {
    id: "unstableCore",
    ...copy("unstableCore"),
    drawback: "slotTier",
    slot: "reactor",
    steps: 1,
    payout: 62,
    weight: 3,
  },
  {
    id: "liveHold",
    ...copy("liveHold"),
    drawback: "hullPerNode",
    hull: 2,
    payout: 60,
    weight: 2,
  },
  {
    id: "overwoundCoils",
    ...copy("overwoundCoils"),
    drawback: "slotTier",
    slot: "weaponA",
    steps: 1,
    payout: 56,
    weight: 3,
  },
  {
    id: "saintsReliquary",
    ...copy("saintsReliquary"),
    drawback: "slotTier",
    slot: "shields",
    steps: 1,
    payout: 54,
    weight: 3,
  },
  {
    id: "leadBallast",
    ...copy("leadBallast"),
    drawback: "slotTier",
    slot: "engines",
    steps: 1,
    payout: 52,
    weight: 4,
  },
  {
    id: "stasisPods",
    ...copy("stasisPods"),
    drawback: "hullPerNode",
    hull: 1,
    payout: 50,
    weight: 4,
  },
  {
    id: "choirContraband",
    ...copy("choirContraband"),
    drawback: "axisShift",
    axis: -3,
    payout: 48,
    weight: 2,
  },
  {
    id: "keeperArchive",
    ...copy("keeperArchive"),
    drawback: "axisShift",
    axis: 3,
    payout: 47,
    weight: 2,
  },
];

export const CARGO_IDS: readonly CargoId[] = CARGO.map((def) => def.id);

export const CARGO_BY_ID: ReadonlyMap<string, CargoDef> = new Map(
  CARGO.map((def) => [def.id, def]),
);

export const cargoDef = (id: string): CargoDef | undefined =>
  CARGO_BY_ID.get(id);

export const cargoName = (id: string): LocKey =>
  CARGO_BY_ID.get(id)?.name ?? `content:cargo.${id}.name`;

export const CARGO_PAYOUT_RANGE: readonly [number, number] = [47, 93];

export const cargoPayout = (def: CargoDef, scrapMult: number): number =>
  Math.round(def.payout * Math.max(0, scrapMult));

export const cargoChargeCapDelta = (def: CargoDef): number =>
  def.chargeCapDelta ?? 0;

export const cargoSlotTierDelta = (
  def: CargoDef,
): Partial<Record<SlotId, number>> =>
  def.drawback === "slotTier" ? { [def.slot]: -def.steps } : {};

export const cargoHullPerNode = (def: CargoDef): number =>
  def.drawback === "hullPerNode" ? def.hull : 0;

export const cargoAxisShift = (def: CargoDef): number =>
  def.drawback === "axisShift" ? def.axis : 0;

export const cargoDescVars = (
  def: CargoDef,
): Readonly<Record<string, number>> => {
  switch (def.drawback) {
    case "slotTier":
      return { n: def.steps };
    case "hullPerNode":
      return { n: def.hull };
    case "axisShift":
      return { n: Math.abs(def.axis) };
  }
};
