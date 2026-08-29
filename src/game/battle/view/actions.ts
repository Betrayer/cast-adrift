import { DIE_BY_ID } from "@/data/dice";
import { dieHasGrant } from "@/data/engravings";
import { FATE_DIE_ID } from "@/data/fate";
import { computeMutatorMods } from "@/data/mutators";
import {
  canBank,
  canCopy,
  canFlip,
  canFuse,
  canReschool,
  canSplit,
  canSwap,
  isFuseTarget,
} from "@/game/battle/actives";
import { passiveActionOf, type PassiveActionId } from "@/game/battle/passives";
import {
  BLOOD_REACTOR_HULL,
  BONUS_REROLL_COST,
  nudgeChargeCost,
  SURGE_COST,
} from "@/game/battle/resolver";
import { canReserve } from "@/game/battle/view/legal";
import { sourceMods, sourceTrait } from "@/game/run/runMods";
import type { BattleBoard } from "@/game/battle/view/types";
import type { DieActive } from "@/types/content";
import type { RolledDie } from "@/types/battle";

export const ACTIVE_IDS = [
  "flip",
  "copy",
  "swap",
  "bank",
  "split",
] as const satisfies readonly DieActive[];

export type ActiveActionId = (typeof ACTIVE_IDS)[number];

export type ConsoleActionId =
  | "reroll"
  | "nudgeMinus"
  | "nudgePlus"
  | "reserve"
  | "fate"
  | "buyReroll"
  | "surge"
  | "bloodReactor"
  | "sacrifice"
  | PassiveActionId
  | ActiveActionId;

export type ConsoleBlock =
  | "resolving"
  | "rerollMode"
  | "noSelection"
  | "notInTray"
  | "noCharge"
  | "noRerolls"
  | "atFloor"
  | "atCeiling"
  | "reserveFull"
  | "used"
  | "hullLow"
  | "notAllowed"
  | "occupied"
  | "tierCap"
  | "slotBlocked"
  | "dieLocked"
  | "noPartner"
  | "spent";

export interface ConsoleAction {
  id: ConsoleActionId;
  enabled: boolean;
  cost: number;
  free: boolean;
  block: ConsoleBlock | null;
}

export type ConsoleActions = Record<ConsoleActionId, ConsoleAction>;

export interface ConsoleShape {
  fate: boolean;
  bloodReactor: boolean;
  sacrifice: boolean;
  passive: PassiveActionId | null;
  actives: ActiveActionId[];
}

export interface NudgeCost {
  cost: number;
  free: boolean;
}

export const nudgeCostFor = (
  board: BattleBoard,
  die?: Pick<RolledDie, "uid" | "defId">,
): NudgeCost => {
  const springFree =
    die !== undefined &&
    dieHasGrant(board.engravings, die.defId, "freeNudge") &&
    !board.spentGrants.includes(`nudge:${die.uid}`);
  if (springFree || board.freeNudges > 0) return { cost: 0, free: true };
  return {
    cost: nudgeChargeCost(
      sourceMods(board).nudgeCostDelta +
        computeMutatorMods(board.mutators ?? []).nudgeCostDelta,
      sourceTrait(board, "coldLogic"),
    ),
    free: false,
  };
};

export const fateMaxUses = (board: BattleBoard): number =>
  sourceTrait(board, "fateTwice") ? 2 : 1;

export const selectedDie = (board: BattleBoard): RolledDie | undefined =>
  board.selectedDieUid === null
    ? undefined
    : board.dice.find((d) => d.uid === board.selectedDieUid);

const action = (
  id: ConsoleActionId,
  block: ConsoleBlock | null,
  cost = 0,
  free = false,
): ConsoleAction => ({ id, enabled: block === null, cost, free, block });

const activeBlock = (
  die: RolledDie | undefined,
  ready: boolean,
  needsTray: boolean,
): ConsoleBlock | null => {
  if (die === undefined) return "noSelection";
  if (needsTray && die.state !== "tray") return "notInTray";
  return ready ? null : "used";
};

export const consoleActions = (board: BattleBoard): ConsoleActions => {
  const idle = board.phase !== "placement";
  const die = selectedDie(board);
  const nudge = nudgeCostFor(board, die);
  const nudgeBlock = (dir: -1 | 1): ConsoleBlock | null => {
    if (idle) return "resolving";
    if (board.rerollMode) return "rerollMode";
    if (die === undefined) return "noSelection";
    if (die.state !== "tray" && die.state !== "placed") return "notInTray";
    if (dir === -1 && die.value <= 1) return "atFloor";
    if (dir === 1 && die.value >= die.tier) return "atCeiling";
    if (!nudge.free && board.charge < nudge.cost) return "noCharge";
    return null;
  };
  const gate = (block: ConsoleBlock | null): ConsoleBlock | null =>
    idle ? "resolving" : board.rerollMode ? "rerollMode" : block;

  const reserveBlock = idle
    ? "resolving"
    : board.rerollMode
      ? "rerollMode"
      : die === undefined
        ? "noSelection"
        : die.state !== "tray"
          ? "notInTray"
          : canReserve(board, die.uid)
            ? null
            : "reserveFull";

  return {
    reroll: action(
      "reroll",
      idle ? "resolving" : board.rerollsLeft <= 0 ? "noRerolls" : null,
    ),
    nudgeMinus: action("nudgeMinus", nudgeBlock(-1), nudge.cost, nudge.free),
    nudgePlus: action("nudgePlus", nudgeBlock(1), nudge.cost, nudge.free),
    reserve: action("reserve", reserveBlock),
    fate: action(
      "fate",
      gate(board.fateUses >= fateMaxUses(board) ? "used" : null),
    ),
    buyReroll: action(
      "buyReroll",
      idle
        ? "resolving"
        : board.rerollMode
          ? "rerollMode"
          : board.rerollsLeft <= 0
            ? "noRerolls"
            : board.charge < BONUS_REROLL_COST
              ? "noCharge"
              : null,
      BONUS_REROLL_COST,
    ),
    surge: action(
      "surge",
      idle
        ? "resolving"
        : board.rerollMode
          ? "rerollMode"
          : board.charge < SURGE_COST
            ? "noCharge"
            : null,
      SURGE_COST,
    ),
    bloodReactor: action(
      "bloodReactor",
      gate(
        board.bloodReactorUsed
          ? "used"
          : board.hull <= BLOOD_REACTOR_HULL
            ? "hullLow"
            : null,
      ),
    ),
    sacrifice: action(
      "sacrifice",
      gate(
        die === undefined
          ? "noSelection"
          : die.state !== "tray"
            ? "notInTray"
            : null,
      ),
    ),
    fuse: action(
      "fuse",
      gate(
        passiveActionOf(board.shipId) !== "fuse"
          ? "notAllowed"
          : board.passiveUsed === true
            ? "spent"
            : die === undefined
              ? "noSelection"
              : !canFuse(die)
                ? "notInTray"
                : board.dice.some((d) => isFuseTarget(die, d))
                  ? null
                  : "noPartner",
      ),
    ),
    reschool: action(
      "reschool",
      gate(
        passiveActionOf(board.shipId) !== "reschool"
          ? "notAllowed"
          : board.passiveUsed === true
            ? "spent"
            : die === undefined
              ? "noSelection"
              : die.state !== "tray" && die.state !== "placed"
                ? "notInTray"
                : canReschool(die)
                  ? null
                  : "notAllowed",
      ),
    ),
    flip: action(
      "flip",
      gate(activeBlock(die, die !== undefined && canFlip(die), false)),
    ),
    copy: action(
      "copy",
      gate(
        activeBlock(die, die !== undefined && canCopy(die, board.resonance), true),
      ),
    ),
    swap: action(
      "swap",
      gate(activeBlock(die, die !== undefined && canSwap(die), false)),
    ),
    bank: action(
      "bank",
      gate(activeBlock(die, die !== undefined && canBank(die), false)),
    ),
    split: action(
      "split",
      gate(activeBlock(die, die !== undefined && canSplit(die), true)),
    ),
  };
};

export const consoleShape = (board: BattleBoard): ConsoleShape => {
  const actives = new Set<ActiveActionId>();
  for (const die of board.dice) {
    const kind = DIE_BY_ID.get(die.defId)?.active;
    if (kind !== undefined) actives.add(kind);
    if (die.school === "grey") actives.add("copy");
  }
  return {
    fate: board.dice.some((d) => d.defId === FATE_DIE_ID),
    bloodReactor: sourceTrait(board, "bloodReactor"),
    sacrifice: sourceTrait(board, "sacrifice"),
    passive: passiveActionOf(board.shipId),
    actives: ACTIVE_IDS.filter((id) => actives.has(id)),
  };
};
