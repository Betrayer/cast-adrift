import type { StatusKey } from "@/game/battle/statuses";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";

export type Hook =
  | "battleStart"
  | "rollStart"
  | "rolled"
  | "place"
  | "beforeResolveSlot"
  | "afterResolveSlot"
  | "turnEnd"
  | "enemyTurnEnd"
  | "battleEnd"
  | "nodeEnter"
  | "eventOutcome"
  | "shopEnter"
  | "xpGain";

export const HOOKS: readonly Hook[] = [
  "battleStart",
  "rollStart",
  "rolled",
  "place",
  "beforeResolveSlot",
  "afterResolveSlot",
  "turnEnd",
  "enemyTurnEnd",
  "battleEnd",
  "nodeEnter",
  "eventOutcome",
  "shopEnter",
  "xpGain",
];

export type SlotMatch = SlotId | "weapons";

export type Cond =
  | { c: "school"; is: School }
  | { c: "slot"; is: SlotMatch }
  | { c: "valueGte"; n: number }
  | { c: "valueLt"; n: number }
  | { c: "isMaxFace" }
  | { c: "isMinFace" }
  | { c: "equalsLast" }
  | { c: "resonanceAtLeast"; school: School; n: 2 | 4 | 6 }
  | { c: "flag"; key: string };

export type EffectTarget = "target" | "self";

export type Action =
  | { a: "dmg"; n: number; target?: EffectTarget }
  | { a: "shield"; n: number }
  | { a: "heal"; n: number }
  | { a: "charge"; n: number }
  | { a: "modDieValue"; n: number }
  | { a: "setDieValue"; n: number }
  | { a: "addStatus"; s: StatusKey; n: number; target?: EffectTarget }
  | { a: "scrap"; n: number }
  | { a: "hull"; n: number }
  | { a: "primeSchool"; school: School; n?: number; max?: boolean }
  | { a: "allowExceedCap" }
  | { a: "repeatSlot" }
  | { a: "extraReroll"; n: number }
  | { a: "setFlag"; key: string }
  | { a: "axis"; n: number }
  | { a: "tide"; n: number };

export interface EffectDef {
  on: Hook;
  if?: Cond[];
  do: Action[];
}
