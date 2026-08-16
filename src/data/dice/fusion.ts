import { die } from "@/data/dice/builder";
import type { DieItemDef, DieTier, School } from "@/types/content";

interface FusionSpec {
  base: string;
  id: string;
  tier: DieTier;
  school: School;
  effects?: DieItemDef["effects"];
  faces?: DieItemDef["faces"];
  growth?: DieItemDef["growth"];
  active?: DieItemDef["active"];
  tags?: DieItemDef["tags"];
}

const SPECS: readonly FusionSpec[] = [
  {
    base: "red-d6",
    id: "fused-emberforge",
    tier: 8,
    school: "red",
    faces: [2, 2, 4, 4, 6, 6, 8, 8],
    tags: ["dice", "precision"],
  },
  {
    base: "blue-d6",
    id: "fused-frostwall",
    tier: 8,
    school: "blue",
    faces: [3, 3, 4, 4, 5, 5, 6, 6],
    tags: ["dice", "precision"],
  },
  {
    base: "grey-d4",
    id: "fused-counterweight",
    tier: 6,
    school: "grey",
    active: "swap",
    tags: ["dice"],
  },
  {
    base: "green-d4",
    id: "fused-seedling",
    tier: 6,
    school: "green",
    effects: [
      {
        on: "battleStart",
        do: [{ a: "addTempDie", defId: "green-d4", turns: 2 }],
      },
    ],
    tags: ["dice", "swarm"],
  },
  {
    base: "yellow-d6",
    id: "fused-goldvein",
    tier: 8,
    school: "yellow",
    faces: [1, 2, 3, 4, 5, 6, 8, 8],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 4 }],
      },
    ],
    tags: ["dice", "scrap"],
  },
  {
    base: "black-d6",
    id: "fused-voidcore",
    tier: 8,
    school: "black",
    active: "split",
    tags: ["dice", "risk"],
  },
  {
    base: "ember",
    id: "fused-pyroclast",
    tier: 8,
    school: "red",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "dmg", n: 3 }],
      },
    ],
    tags: ["dice", "weapons", "spike"],
  },
  {
    base: "frostplate",
    id: "fused-glacier",
    tier: 8,
    school: "blue",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "shields" },
          { c: "not", of: { c: "turnLte", n: 2 } },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
    ],
    tags: ["dice", "shields", "shieldwall"],
  },
  {
    base: "ballast",
    id: "fused-keel",
    tier: 6,
    school: "grey",
    active: "bank",
    tags: ["dice"],
  },
  {
    base: "coil",
    id: "fused-tendril",
    tier: 6,
    school: "green",
    effects: [
      {
        on: "rolled",
        if: [{ c: "any", of: [{ c: "equalsLast" }, { c: "isMinFace" }] }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
    tags: ["dice", "growth"],
  },
  {
    base: "lucky-chip",
    id: "fused-windfall",
    tier: 6,
    school: "yellow",
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "scrap", n: 1 }],
      },
    ],
    tags: ["dice", "scrap"],
  },
  {
    base: "slug",
    id: "fused-railslug",
    tier: 10,
    school: "red",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
    tags: ["dice", "weapons", "spinal"],
  },
  {
    base: "bulwark",
    id: "fused-rampart",
    tier: 10,
    school: "blue",
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "shieldAtLeast", n: 8 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
    tags: ["dice", "shields", "shieldwall"],
  },
  {
    base: "sprout",
    id: "fused-bloom",
    tier: 8,
    school: "green",
    growth: { perMax: 1, cap: 3 },
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "valueGte", n: 9 }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
    tags: ["dice", "growth", "survival"],
  },
];

export const FUSED_DICE: readonly DieItemDef[] = SPECS.map((spec) =>
  die(spec.id, spec.tier, spec.school, "uncommon", {
    ...(spec.effects ? { effects: spec.effects } : {}),
    ...(spec.faces ? { faces: spec.faces } : {}),
    ...(spec.growth ? { growth: spec.growth } : {}),
    ...(spec.active ? { active: spec.active } : {}),
    ...(spec.tags ? { tags: spec.tags } : {}),
  }),
);

export const FUSION_MAP: ReadonlyMap<string, string> = new Map(
  SPECS.map((spec) => [spec.base, spec.id]),
);

export const fusionTarget = (defId: string): string | undefined =>
  FUSION_MAP.get(defId);
