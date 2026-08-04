import { DIE_BY_ID } from "@/data/dice";
import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, Rarity } from "@/types/content";

// Grants are the four engravings the Effect pipeline cannot express: they change
// what the battle store may *do* to a die rather than what the die contributes.
export type EngravingGrant =
  | "lockImmune"
  | "blockImmune"
  | "freeReroll"
  | "freeNudge";

export interface EngravingDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  price: number;
  effects?: readonly EffectDef[];
  grant?: EngravingGrant;
  tags?: readonly ContentTag[];
}

const eng = (
  id: string,
  price: number,
  body: Pick<EngravingDef, "effects" | "grant" | "tags">,
): EngravingDef => ({
  id,
  name: `content:engravings.${id}.name`,
  desc: `content:engravings.${id}.desc`,
  price,
  ...body,
});

export const ENGRAVINGS: readonly EngravingDef[] = [
  eng("sting", 60, {
    tags: ["weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("frost", 60, {
    tags: ["shields"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  eng("vein", 60, {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 1 }],
      },
    ],
  }),
  eng("echo", 90, {
    tags: ["charge"],
    effects: [
      { on: "rolled", if: [{ c: "equalsLast" }], do: [{ a: "charge", n: 1 }] },
    ],
  }),
  eng("anchor", 120, { grant: "lockImmune", tags: ["survival"] }),
  eng("wedge", 120, { grant: "blockImmune", tags: ["control"] }),
  eng("flame", 90, {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  eng("edge", 120, { grant: "freeReroll", tags: ["reroll"] }),
  eng("shade", 60, {
    tags: ["reactor"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("spring", 120, { grant: "freeNudge", tags: ["reroll"] }),
  eng("lead", 90, {
    tags: ["spinal"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("spark", 90, {
    tags: ["charge"],
    effects: [
      { on: "rolled", if: [{ c: "valueLt", n: 2 }], do: [{ a: "charge", n: 2 }] },
    ],
  }),
  eng("keel", 60, {
    tags: ["engines"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("lens", 60, {
    tags: ["sensors"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("bastion", 60, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("hunger", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "dmg", n: 1, target: "target" }],
      },
    ],
  }),
  eng("ash", 60, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "scrap", n: 2 }],
      },
    ],
  }),
  eng("surf", 90, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("lastLight", 120, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 30 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("weight", 90, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "valueLt", n: 3 }],
        do: [{ a: "setDieValue", n: 3 }],
      },
    ],
  }),
  eng("crown", 60, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  eng("thorn", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 5 }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  eng("glass", 120, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "hull", n: -1 }],
      },
    ],
  }),
  eng("rime", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  eng("loam", 90, {
    tags: ["growth"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("cinder", 120, {
    tags: ["burn"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  eng("mint", 90, {
    tags: ["scrap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "scrap", n: 3 }],
      },
    ],
  }),
  eng("wick", 60, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  eng("pin", 90, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("drum", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  eng("scale", 60, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  eng("beaconRune", 60, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "turnLte", n: 2 }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("rust", 90, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 8 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("salt", 60, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  eng("glimmer", 60, {
    effects: [
      { on: "rolled", if: [{ c: "valueLt", n: 3 }], do: [{ a: "charge", n: 1 }] },
    ],
  }),
  eng("sinew", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "valueGte", n: 4 }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  eng("cipher", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "equalsLast" }],
        do: [{ a: "scrap", n: 4 }],
      },
    ],
  }),
  eng("brand", 90, {
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "school", is: "red" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("tidepool", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMinFace" }],
        do: [{ a: "shield", n: 3 }],
      },
    ],
  }),
  eng("voidmark", 90, {
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "isMinFace" }],
        do: [{ a: "charge", n: 3 }],
      },
    ],
  }),
];

export const ENGRAVING_BY_ID: ReadonlyMap<string, EngravingDef> = new Map(
  ENGRAVINGS.map((def) => [def.id, def]),
);

export const ENGRAVING_REMOVAL_REFUND = 0;

const TWO_SOCKET_RARITIES: ReadonlySet<Rarity> = new Set(["rare", "legendary"]);

export const socketsForDie = (defId: string): number => {
  const rarity = DIE_BY_ID.get(defId)?.rarity;
  if (rarity === undefined) return 0;
  return TWO_SOCKET_RARITIES.has(rarity) ? 2 : 1;
};

export type EngravingMap = Readonly<Record<string, readonly string[]>>;

export const engravingsForDie = (
  map: EngravingMap | undefined,
  defId: string,
): readonly string[] => map?.[defId] ?? [];

export const dieHasGrant = (
  map: EngravingMap | undefined,
  defId: string,
  grant: EngravingGrant,
): boolean =>
  engravingsForDie(map, defId).some(
    (id) => ENGRAVING_BY_ID.get(id)?.grant === grant,
  );

export const engravingEffects = (
  map: EngravingMap | undefined,
  defId: string,
): readonly EffectDef[] =>
  engravingsForDie(map, defId).flatMap(
    (id) => ENGRAVING_BY_ID.get(id)?.effects ?? [],
  );
