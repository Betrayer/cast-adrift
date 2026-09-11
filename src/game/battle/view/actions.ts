import { DIE_BY_ID } from "@/data/dice";
import {
  echoIsBattleActive,
  echoNodeDef,
  echoToken,
  type EchoNodeDef,
} from "@/data/echo";
import { dieHasGrant } from "@/data/engravings";
import { FATE_DIE_ID } from "@/data/fate";
import { computeMutatorMods } from "@/data/mutators";
import {
  officerActiveDead,
  officerChargeCost,
  officerDef,
  officerToken,
  type OfficerDef,
} from "@/data/officers";
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
import { aimedEnemy } from "@/game/battle/target";
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

export const CABIN_IDS = ["cabinA", "cabinB"] as const;

export type CabinActionId = (typeof CABIN_IDS)[number];

export const ECHO_ACTION_ID = "echo" as const;

export type ConsoleActionId =
  | "echo"
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
  | ActiveActionId
  | CabinActionId;

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
  | "needsTwoEnemies"
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
  cabins: (OfficerDef | null)[];
  echo: EchoNodeDef | null;
}

export const cabinOfficer = (
  board: BattleBoard,
  cabin: CabinActionId,
): OfficerDef | undefined => {
  const id = (board.officers ?? [])[CABIN_IDS.indexOf(cabin)];
  return id === undefined ? undefined : officerDef(id);
};

export const echoBattleNode = (
  board: BattleBoard,
): EchoNodeDef | undefined =>
  echoIsBattleActive(board.echo) ? echoNodeDef(board.echo) : undefined;

export const echoActionDead = (
  board: BattleBoard,
  def: EchoNodeDef,
): boolean =>
  def.id === "secondLook" && !board.dice.some((die) => die.state === "tray");

export const officerMarkDead = (
  board: BattleBoard,
  def: OfficerDef,
): boolean => {
  if (def.active.id !== "designate") return false;
  const enemy = aimedEnemy(board.enemies, board.targetId);
  if (enemy === undefined) return true;
  return officerActiveDead(def.active, enemy.statuses.mark);
};

export interface NudgeCost {
  cost: number;
  free: boolean;
}

export const nudgeChargePrice = (board: BattleBoard): number =>
  nudgeChargeCost(
    sourceMods(board).nudgeCostDelta +
      computeMutatorMods(board.mutators ?? []).nudgeCostDelta,
    sourceTrait(board, "coldLogic"),
  );

export const nudgeCostFor = (
  board: BattleBoard,
  die?: Pick<RolledDie, "uid" | "defId">,
): NudgeCost => {
  const springFree =
    die !== undefined &&
    dieHasGrant(board.engravings, die.defId, "freeNudge") &&
    !board.spentGrants.includes(`nudge:${die.uid}`);
  if (springFree || board.freeNudges > 0) return { cost: 0, free: true };
  return { cost: nudgeChargePrice(board), free: false };
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

export const cabinAction = (
  board: BattleBoard,
  cabin: CabinActionId,
): ConsoleAction => {
  const def = cabinOfficer(board, cabin);
  if (def === undefined) return action(cabin, "notAllowed");
  const cost = officerChargeCost(def.active);
  const block: ConsoleBlock | null = board.spentGrants.includes(
    officerToken(def.id),
  )
    ? "spent"
    : board.charge < cost
      ? "noCharge"
      : officerMarkDead(board, def)
        ? "notAllowed"
        : null;
  return action(cabin, block, cost);
};

export const echoAction = (board: BattleBoard): ConsoleAction => {
  const def = echoBattleNode(board);
  if (def === undefined) return action(ECHO_ACTION_ID, "notAllowed");
  const block: ConsoleBlock | null = board.spentGrants.includes(
    echoToken(def.id),
  )
    ? "spent"
    : echoActionDead(board, def)
      ? "notAllowed"
      : null;
  return action(ECHO_ACTION_ID, block);
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
  const withGate = (entry: ConsoleAction): ConsoleAction =>
    action(entry.id, gate(entry.block), entry.cost, entry.free);

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
    cabinA: withGate(cabinAction(board, "cabinA")),
    cabinB: withGate(cabinAction(board, "cabinB")),
    echo: withGate(echoAction(board)),
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
    cabins: CABIN_IDS.map((cabin) => cabinOfficer(board, cabin) ?? null),
    echo: echoBattleNode(board) ?? null,
  };
};
