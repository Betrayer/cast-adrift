import { DIE_BY_ID } from "@/data/dice";
import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, Rarity } from "@/types/content";

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
  eng("anchor", 120, { grant: "lockImmune", tags: ["survival", "dice"] }),
  eng("wedge", 120, { grant: "blockImmune", tags: ["control"] }),
  eng("edge", 120, { grant: "freeReroll", tags: ["reroll"] }),
  eng("spring", 120, { grant: "freeNudge", tags: ["reroll", "precision"] }),

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
    tags: ["shields", "shieldwall"],
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
    tags: ["sensors", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("bastion", 60, {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 6 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
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
  eng("lead", 90, {
    tags: ["spinal", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "spinal" }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("hunger", 90, {
    tags: ["weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "dmg", n: 1, target: "target" }],
      },
    ],
  }),
  eng("crown", 60, {
    tags: ["charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  eng("wick", 60, {
    tags: ["charge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  eng("lastLight", 120, {
    tags: ["risk", "survival"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "hullPctLt", n: 30 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),

  eng("flame", 90, {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "firstOfTurn" }],
        do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
      },
    ],
  }),
  eng("thorn", 90, {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 5 }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
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
  eng("pyre", 90, {
    tags: ["burn", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "countTag", tag: "burn", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }],
        do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
      },
    ],
  }),
  eng("glass", 120, {
    tags: ["weapons", "risk", "spike"],
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
  eng("rust", 90, {
    tags: ["weapons", "overcap", "risk"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "valueGte", n: 8 }],
        do: [{ a: "allowExceedCap", slot: "weapons", hullCost: 1 }],
      },
    ],
  }),
  eng("brand", 90, {
    tags: ["weapons", "spike"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "school", is: "red" }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "not", of: { c: "school", is: "red" } },
        ],
        do: [{ a: "modDieValue", n: 1 }],
      },
    ],
  }),
  eng("swarmMark", 90, {
    tags: ["swarm", "weapons"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "weapons" },
          { c: "countTag", tag: "swarm", n: 3 },
        ],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
        do: [{ a: "dmg", n: 1, target: "target", perTag: "swarm" }],
      },
    ],
  }),

  eng("seventhFace", 120, {
    tags: ["dice", "overcap"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }, { c: "firstOfTurn" }],
        do: [{ a: "repeatSlot" }],
      },
    ],
  }),
  eng("mirrorFace", 90, {
    tags: ["dice", "precision"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "modDieValue", n: 3, sel: { s: "lowestDie" } },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),
  eng("echo", 90, {
    tags: ["charge", "dice"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "equalsLast" }],
        do: [
          { a: "charge", n: 1 },
          { a: "modDieValue", n: 1 },
        ],
      },
    ],
  }),
  eng("weight", 90, {
    tags: ["precision", "risk"],
    effects: [
      {
        on: "place",
        if: [{ c: "valueLt", n: 3 }],
        do: [
          { a: "setDieValue", n: 3 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  eng("sleeve", 90, {
    tags: ["reroll", "dice"],
    effects: [
      {
        on: "battleStart",
        if: [{ c: "countTag", tag: "reroll", n: 2 }],
        do: [{ a: "grant", what: "rerollUses", n: 1 }],
      },
    ],
  }),

  eng("spark", 90, {
    tags: ["charge", "reactor"],
    effects: [
      {
        on: "rolled",
        if: [{ c: "valueLt", n: 2 }],
        do: [
          { a: "charge", n: 2 },
          { a: "setDieValue", n: 2 },
        ],
      },
    ],
  }),
  eng("glimmer", 60, {
    tags: ["charge", "scrap"],
    effects: [
      {
        on: "place",
        if: [{ c: "valueLt", n: 3 }],
        do: [
          { a: "charge", n: 1 },
          { a: "scrap", n: 1 },
        ],
      },
    ],
  }),
  eng("drum", 90, {
    tags: ["charge", "reactor"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }],
        do: [
          { a: "charge", n: 2 },
          { a: "counter", scope: "battle", key: "drumBeat", delta: 1 },
        ],
      },
      {
        on: "turnEnd",
        if: [{ c: "counterAtLeast", scope: "battle", key: "drumBeat", n: 3 }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
  eng("tuningFork", 90, {
    tags: ["charge", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "chargeAtLeast", n: 5 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
      {
        on: "place",
        if: [{ c: "countTag", tag: "charge", n: 2 }],
        do: [{ a: "charge", n: 1 }],
      },
    ],
  }),
  eng("voidmark", 90, {
    tags: ["charge", "reactor"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "isMinFace" }],
        do: [{ a: "charge", n: 3 }],
      },
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "reactor" }, { c: "chargeAtLeast", n: 8 }],
        do: [{ a: "modDieValue", n: 2 }],
      },
    ],
  }),
  eng("tickMark", 90, {
    tags: ["charge", "control"],
    effects: [
      {
        on: "place",
        if: [{ c: "slot", is: "reactor" }],
        do: [
          {
            a: "schedule",
            on: "nextTurn",
            do: [
              { a: "charge", n: 3 },
              { a: "shield", n: 2 },
            ],
          },
        ],
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
      {
        on: "battleEnd",
        if: [{ c: "battleOutcome", is: "victory" }],
        do: [{ a: "scrap", n: 5 }],
      },
    ],
  }),
  eng("ledgerMark", 90, {
    tags: ["scrap", "sensors", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "sensors" },
          { c: "countTag", tag: "scrap", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "scrap", n: 2 }],
      },
    ],
  }),
  eng("ash", 60, {
    tags: ["scrap", "burn"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMinFace" }],
        do: [
          { a: "scrap", n: 2 },
          { a: "addStatus", s: "burn", n: 1, target: "target" },
        ],
      },
    ],
  }),
  eng("cipher", 90, {
    tags: ["scrap", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "equalsLast" }],
        do: [
          { a: "scrap", n: 4 },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),

  eng("rime", 90, {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }],
        do: [{ a: "shield", n: 2 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "shieldAtLeast", n: 8 }],
        do: [{ a: "shield", n: 1 }],
      },
    ],
  }),
  eng("glacis", 120, {
    tags: ["shieldwall", "shields"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [
          { c: "slot", is: "shields" },
          { c: "countTag", tag: "shieldwall", n: 2 },
        ],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "shieldAtLeast", n: 6 }],
        do: [{ a: "heal", n: 1 }],
      },
    ],
  }),
  eng("tidepool", 90, {
    tags: ["shields", "shieldwall"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMinFace" }],
        do: [{ a: "shield", n: 3 }],
      },
      {
        on: "turnEnd",
        if: [{ c: "tideAtLeast", n: 2 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  eng("salt", 60, {
    tags: ["shieldwall", "risk"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "isMaxFace" }],
        do: [
          { a: "shield", n: 2 },
          { a: "hull", n: -1 },
        ],
      },
    ],
  }),
  eng("scale", 60, {
    tags: ["shields", "survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "shields" }, { c: "isMaxFace" }],
        do: [
          { a: "heal", n: 1 },
          { a: "shield", n: 2 },
        ],
      },
    ],
  }),
  eng("lifeline", 90, {
    tags: ["repairBay", "survival"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "repairBay" }],
        do: [
          { a: "heal", n: 2 },
          { a: "shield", n: 2 },
        ],
      },
    ],
  }),

  eng("sinew", 90, {
    tags: ["engines", "dodge"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "valueGte", n: 4 }],
        do: [
          { a: "shield", n: 1 },
          { a: "charge", n: 1 },
        ],
      },
    ],
  }),
  eng("surf", 90, {
    tags: ["engines", "dodge"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "turnLte", n: 1 }],
        do: [{ a: "modDieValue", n: 3 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }, { c: "turnLte", n: 1 }],
        do: [{ a: "shield", n: 2 }],
      },
    ],
  }),
  eng("loam", 90, {
    tags: ["growth", "engines"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "engines" }],
        do: [{ a: "grow", n: 1, cap: 3 }],
      },
    ],
  }),

  eng("beaconRune", 90, {
    tags: ["sensors", "precision"],
    effects: [
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }],
        do: [{ a: "primeSchool", school: "red", n: 3 }],
      },
    ],
  }),
  eng("pin", 90, {
    tags: ["sensors", "precision"],
    effects: [
      {
        on: "beforeResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "valueLt", n: 5 }],
        do: [{ a: "setDieValue", n: 5 }],
      },
      {
        on: "afterResolveSlot",
        if: [{ c: "slot", is: "sensors" }, { c: "isMaxFace" }],
        do: [{ a: "charge", n: 2 }],
      },
    ],
  }),
];

export const ENGRAVING_PAIRS: readonly (readonly [string, string])[] = [
  ["cinder", "pyre"],
  ["drum", "tuningFork"],
  ["mint", "ledgerMark"],
  ["rime", "glacis"],
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
