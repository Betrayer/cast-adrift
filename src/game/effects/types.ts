import type { ContentTag } from "@/data/tags";
import type { StatusKey } from "@/game/battle/statuses";
import type { NodeType } from "@/game/map/types";
import type { BattleOutcome, RolledDie, SlotId } from "@/types/battle";
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
  | "shopEnter";

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
];

export const BATTLE_HOOKS: readonly Hook[] = [
  "battleStart",
  "rollStart",
  "rolled",
  "place",
  "beforeResolveSlot",
  "afterResolveSlot",
  "turnEnd",
  "enemyTurnEnd",
  "battleEnd",
];

export const RUN_HOOKS: readonly Hook[] = [
  "nodeEnter",
  "eventOutcome",
  "shopEnter",
];

export const SUBJECT_HOOKS: readonly Hook[] = [
  "rolled",
  "place",
  "beforeResolveSlot",
  "afterResolveSlot",
];

export interface BattleEndInfo {
  outcome: BattleOutcome;
  turns: number;
  overkill: number;
}

export type NodeKind = NodeType | "pocket";

export interface NodeEnterInfo {
  nodeId: string;
  nodeType: NodeType;
  sector: number;
  row: number;
  pocket: boolean;
}

export interface EventOutcomeInfo {
  eventId: string;
  optionId: string;
  optionIndex: number;
  beacon?: boolean;
  passed?: boolean;
}

export interface ShopEnterInfo {
  nodeId: string;
  sector: number;
}

export interface HookPayload {
  die?: RolledDie;
  slot?: SlotId;
  battleEnd?: BattleEndInfo;
  node?: NodeEnterInfo;
  event?: EventOutcomeInfo;
  shop?: ShopEnterInfo;
}

export type SlotMatch = SlotId | "weapons";

export type CounterScope = "battle" | "run";

export type Cond =
  | { c: "any"; of: readonly Cond[] }
  | { c: "not"; of: Cond }
  | { c: "school"; is: School; exact?: boolean }
  | { c: "slot"; is: SlotMatch }
  | { c: "slotMk"; slot: SlotId; n: 1 | 2 | 3 }
  | { c: "valueGte"; n: number }
  | { c: "valueLt"; n: number }
  | { c: "isMaxFace" }
  | { c: "isMinFace" }
  | { c: "equalsLast" }
  | { c: "resonanceAtLeast"; school: School; n: 2 | 4 | 6 }
  | { c: "turnLte"; n: number }
  | { c: "hullPctLt"; n: number }
  | { c: "flag"; key: string }
  | { c: "firstOfTurn" }
  | { c: "chargeAtLeast"; n: number }
  | { c: "shieldAtLeast"; n: number }
  | { c: "tideAtLeast"; n: number }
  | { c: "inverted" }
  | { c: "counterAtLeast"; scope: CounterScope; key: string; n: number }
  | { c: "enemyHpPctLt"; n: number }
  | { c: "enemyShielded" }
  | { c: "enemyHasStatus"; s: StatusKey }
  | { c: "enemyCountAtLeast"; n: number }
  | { c: "targetIsBossOrMini" }
  | { c: "hasTag"; tag: ContentTag }
  | { c: "countTag"; tag: ContentTag; n: number }
  | { c: "battleOutcome"; is: BattleOutcome }
  | { c: "nodeIs"; is: NodeKind };

export type EffectTarget = "target" | "self";

export type DieSelector =
  | { s: "subject" }
  | { s: "dieInSlot"; slot: SlotId }
  | { s: "lowestDie" }
  | { s: "highestDie" }
  | { s: "randomOther" }
  | { s: "allOfSchool"; school: School };

export type ScheduleWhen = "nextTurn" | "forTurns";

export type GrantKey = "rerollUses" | "rerollSize" | "reserve" | "nudge";

export const MAX_EFFECT_CHAIN = 8;

export interface ExceedCapGrant {
  school?: School;
  slot?: SlotMatch;
  hullCost: number;
}

export type Action =
  | { a: "dmg"; n: number; target?: EffectTarget; perTag?: ContentTag }
  | { a: "shield"; n: number; perTag?: ContentTag }
  | { a: "heal"; n: number; perTag?: ContentTag }
  | { a: "charge"; n: number; perTag?: ContentTag }
  | { a: "scrap"; n: number; perTag?: ContentTag }
  | { a: "hull"; n: number; perTag?: ContentTag }
  | { a: "modDieValue"; n: number; sel?: DieSelector }
  | { a: "setDieValue"; n: number; sel?: DieSelector }
  | { a: "rerollDie"; sel?: DieSelector }
  | { a: "addStatus"; s: StatusKey; n: number; target?: EffectTarget }
  | { a: "primeSchool"; school: School; n?: number; max?: boolean }
  | { a: "allowExceedCap"; school?: School; slot?: SlotMatch; hullCost?: number }
  | { a: "repeatSlot" }
  | { a: "crit" }
  | { a: "grow"; n: number; cap: number }
  | { a: "grant"; what: GrantKey; n: number }
  | { a: "counter"; scope: CounterScope; key: string; delta: number }
  | { a: "schedule"; on: ScheduleWhen; turns?: number; do: readonly Action[] }
  | { a: "addTempDie"; defId: string; turns?: number }
  | { a: "removeTempDie" }
  | { a: "setFlag"; key: string };

const ACTION_NAME_SET: Record<Action["a"], true> = {
  dmg: true,
  shield: true,
  heal: true,
  charge: true,
  scrap: true,
  hull: true,
  modDieValue: true,
  setDieValue: true,
  rerollDie: true,
  addStatus: true,
  primeSchool: true,
  allowExceedCap: true,
  repeatSlot: true,
  crit: true,
  grow: true,
  grant: true,
  counter: true,
  schedule: true,
  addTempDie: true,
  removeTempDie: true,
  setFlag: true,
};

const COND_NAME_SET: Record<Cond["c"], true> = {
  any: true,
  not: true,
  school: true,
  slot: true,
  slotMk: true,
  valueGte: true,
  valueLt: true,
  isMaxFace: true,
  isMinFace: true,
  equalsLast: true,
  resonanceAtLeast: true,
  turnLte: true,
  hullPctLt: true,
  flag: true,
  firstOfTurn: true,
  chargeAtLeast: true,
  shieldAtLeast: true,
  tideAtLeast: true,
  inverted: true,
  counterAtLeast: true,
  enemyHpPctLt: true,
  enemyShielded: true,
  enemyHasStatus: true,
  enemyCountAtLeast: true,
  targetIsBossOrMini: true,
  hasTag: true,
  countTag: true,
  battleOutcome: true,
  nodeIs: true,
};

export const ACTION_NAMES = Object.keys(ACTION_NAME_SET) as Action["a"][];

export const COND_NAMES = Object.keys(COND_NAME_SET) as Cond["c"][];

export const SUBJECT_CONDS: readonly Cond["c"][] = [
  "school",
  "valueGte",
  "valueLt",
  "isMaxFace",
  "isMinFace",
  "equalsLast",
];

export const RUN_ACTIONS: readonly Action["a"][] = [
  "scrap",
  "hull",
  "heal",
  "counter",
  "setFlag",
];

export interface ScheduledEffect {
  turn: number;
  do: readonly Action[];
}

export interface EffectDef {
  on: Hook;
  if?: Cond[];
  do: Action[];
}
