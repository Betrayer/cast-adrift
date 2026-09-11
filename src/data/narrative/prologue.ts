import type { CheckMove, CheckStep, SlotId } from "@/types/battle";
import type { LocKey } from "@/types/content";

export type PrologueVoice = "narration" | "echo";

export interface PrologueLine {
  voice: PrologueVoice;
  text: LocKey;
}

export interface PrologueBeat {
  id: string;
  lines: readonly PrologueLine[];
  cta: LocKey;
}

const narration = (key: string): PrologueLine => ({
  voice: "narration",
  text: `content:prologue.${key}`,
});

const echo = (key: string): PrologueLine => ({
  voice: "echo",
  text: `content:prologue.${key}`,
});

export const PROLOGUE_BEATS: readonly PrologueBeat[] = [
  {
    id: "drift",
    lines: [narration("drift1"), narration("drift2")],
    cta: "content:prologue.driftCta",
  },
  {
    id: "salvage",
    lines: [narration("salvage1"), echo("salvage2"), echo("salvage3")],
    cta: "content:prologue.salvageCta",
  },
  {
    id: "signal",
    lines: [narration("signal1"), echo("signal2"), narration("contact2")],
    cta: "content:prologue.contactCta",
  },
];

export const PROLOGUE_ENEMY = "scavDrone";

const CHECK_DICE = [
  "green-d4",
  "blue-d6",
  "red-d6",
  "grey-d4",
  "black-d6",
] as const;

export const CHECK_DECK: readonly string[] = CHECK_DICE;

const move = (defId: (typeof CHECK_DICE)[number], slot: SlotId): CheckMove => ({
  uid: `die-${String(CHECK_DICE.indexOf(defId))}`,
  slot,
});

export const CHECK_FIXED_ROLL: readonly number[] = [3, 4, 5, 3, 4];

export const CHECK_ENEMY_HP_PCT = 120;

export const SYSTEMS_CHECK: readonly CheckStep[] = [
  {
    id: "engines",
    moves: [move("green-d4", "engines")],
    fixedRoll: CHECK_FIXED_ROLL,
    enemyIntent: { t: "multi", n: 3, k: 3 },
    defenseRolls: [20, 1, 99],
    sayKey: "content:check.engines.say",
    failKey: "content:check.engines.fail",
  },
  {
    id: "shields",
    moves: [move("blue-d6", "shields")],
    fixedRoll: CHECK_FIXED_ROLL,
    enemyIntent: { t: "attack", n: 4 },
    sayKey: "content:check.shields.say",
    failKey: "content:check.shields.fail",
  },
  {
    id: "weapons",
    moves: [move("red-d6", "weaponA")],
    fixedRoll: CHECK_FIXED_ROLL,
    enemyIntent: { t: "attack", n: 2 },
    sayKey: "content:check.weapons.say",
    failKey: "content:check.weapons.fail",
  },
  {
    id: "sensors",
    moves: [move("grey-d4", "sensors"), move("red-d6", "weaponA")],
    fixedRoll: CHECK_FIXED_ROLL,
    enemyIntent: { t: "attack", n: 2 },
    sayKey: "content:check.sensors.say",
    failKey: "content:check.sensors.fail",
  },
  {
    id: "reactor",
    moves: [move("black-d6", "reactor")],
    fixedRoll: CHECK_FIXED_ROLL,
    enemyIntent: { t: "attack", n: 2 },
    setCharge: 6,
    grantFreeNudge: 1,
    sayKey: "content:check.reactor.say",
    failKey: "content:check.reactor.fail",
  },
  {
    id: "free",
    moves: null,
    fixedRoll: null,
    sayKey: "content:check.free.say",
    failKey: null,
  },
];
