export {
  effectiveSlotValue,
  inheritedSchool,
  slotAffinity,
} from "@/game/battle/view/affinity";
export type { SlotAffinity } from "@/game/battle/view/affinity";
export { mitigationOf } from "@/game/battle/view/forecast";
export type { Mitigation } from "@/game/battle/view/forecast";
export {
  ACTIVE_IDS,
  consoleActions,
  consoleShape,
  fateMaxUses,
  nudgeCostFor,
  selectedDie,
} from "@/game/battle/view/actions";
export type {
  ActiveActionId,
  ConsoleAction,
  ConsoleActionId,
  ConsoleActions,
  ConsoleBlock,
  ConsoleShape,
} from "@/game/battle/view/actions";
export { enemyForecast, expectedHit } from "@/game/battle/view/forecast";
export type { TurnForecast } from "@/game/battle/view/forecast";
export {
  allowedSlotsNow,
  boardSlotIds,
  canReserve,
  checkEndTurnBlocked,
  checkMovesNow,
  currentCheckStep,
  goalDiceNow,
  goalSlotsNow,
  legalTargets,
  moveAllowedNow,
  pendingCheckMoves,
  placeBlockFor,
  reserveCapacity,
  reservedCount,
  slotAllowedNow,
} from "@/game/battle/view/legal";
export type { LegalTargets, PlaceBlock } from "@/game/battle/view/legal";
export {
  orderBadgeFor,
  orderInverted,
  resolutionOrderFor,
} from "@/game/battle/view/order";
export type { OrderView } from "@/game/battle/view/order";
export {
  boardWithDie,
  projectBoard,
  projectPlacements,
  projectSlot,
} from "@/game/battle/view/project";
export type { SlotProjection } from "@/game/battle/view/project";
export type { BattleBoard } from "@/game/battle/view/types";
