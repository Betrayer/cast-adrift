import { DIE_PTS } from "@/data/tiers";
import type { DieItemDef } from "@/types/content";

export const BASIC_DICE: readonly DieItemDef[] = [
  {
    id: "red-d6",
    name: "content:dice.red-d6",
    tier: 6,
    school: "red",
    rarity: "common",
    pts: DIE_PTS[6],
  },
  {
    id: "blue-d6",
    name: "content:dice.blue-d6",
    tier: 6,
    school: "blue",
    rarity: "common",
    pts: DIE_PTS[6],
  },
  {
    id: "grey-d4",
    name: "content:dice.grey-d4",
    tier: 4,
    school: "grey",
    rarity: "common",
    pts: DIE_PTS[4],
  },
  {
    id: "green-d4",
    name: "content:dice.green-d4",
    tier: 4,
    school: "green",
    rarity: "common",
    pts: DIE_PTS[4],
  },
  {
    id: "yellow-d6",
    name: "content:dice.yellow-d6",
    tier: 6,
    school: "yellow",
    rarity: "common",
    pts: DIE_PTS[6],
  },
  {
    id: "black-d6",
    name: "content:dice.black-d6",
    tier: 6,
    school: "black",
    rarity: "common",
    pts: DIE_PTS[6],
  },
];

export const DIE_BY_ID: ReadonlyMap<string, DieItemDef> = new Map(
  BASIC_DICE.map((def) => [def.id, def]),
);
