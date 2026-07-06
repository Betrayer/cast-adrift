import { DIE_PTS } from "@/data/tiers";
import type { DieItemDef, DieTier } from "@/types/content";

interface FusionSpec {
  base: string;
  id: string;
  name: string;
  tier: DieTier;
  school: DieItemDef["school"];
  effects?: DieItemDef["effects"];
  growth?: DieItemDef["growth"];
}

const SPECS: readonly FusionSpec[] = [
  { base: "red-d6", id: "fused-emberforge", name: "content:dice.fused-emberforge", tier: 8, school: "red" },
  { base: "blue-d6", id: "fused-frostwall", name: "content:dice.fused-frostwall", tier: 8, school: "blue" },
  { base: "grey-d4", id: "fused-counterweight", name: "content:dice.fused-counterweight", tier: 6, school: "grey" },
  { base: "green-d4", id: "fused-seedling", name: "content:dice.fused-seedling", tier: 6, school: "green" },
  { base: "yellow-d6", id: "fused-goldvein", name: "content:dice.fused-goldvein", tier: 8, school: "yellow" },
  { base: "black-d6", id: "fused-voidcore", name: "content:dice.fused-voidcore", tier: 8, school: "black" },
  { base: "ember", id: "fused-pyroclast", name: "content:dice.fused-pyroclast", tier: 8, school: "red" },
  { base: "frostplate", id: "fused-glacier", name: "content:dice.fused-glacier", tier: 8, school: "blue" },
  { base: "ballast", id: "fused-keel", name: "content:dice.fused-keel", tier: 6, school: "grey" },
  {
    base: "coil",
    id: "fused-tendril",
    name: "content:dice.fused-tendril",
    tier: 6,
    school: "green",
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "modDieValue", n: 1 }] },
    ],
  },
  {
    base: "lucky-chip",
    id: "fused-windfall",
    name: "content:dice.fused-windfall",
    tier: 6,
    school: "yellow",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  },
  {
    base: "slug",
    id: "fused-railslug",
    name: "content:dice.fused-railslug",
    tier: 10,
    school: "red",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  },
  {
    base: "bulwark",
    id: "fused-rampart",
    name: "content:dice.fused-rampart",
    tier: 10,
    school: "blue",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  },
  {
    base: "sprout",
    id: "fused-bloom",
    name: "content:dice.fused-bloom",
    tier: 8,
    school: "green",
    growth: { perMax: 1, cap: 3 },
  },
];

export const FUSED_DICE: readonly DieItemDef[] = SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  tier: spec.tier,
  school: spec.school,
  rarity: "uncommon",
  pts: DIE_PTS[spec.tier],
  ...(spec.effects ? { effects: spec.effects } : {}),
  ...(spec.growth ? { growth: spec.growth } : {}),
}));

export const FUSION_MAP: ReadonlyMap<string, string> = new Map(
  SPECS.map((spec) => [spec.base, spec.id]),
);

export const fusionTarget = (defId: string): string | undefined =>
  FUSION_MAP.get(defId);
