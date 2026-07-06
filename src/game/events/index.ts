export {
  eventEligible,
  eventKind,
  eligibleEvents,
  flagPresent,
  matchesFlagQuery,
  optionMet,
  optionOutcomes,
  outcomeWeight,
  pickEvent,
  selectOutcome,
} from "@/game/events/engine";
export type {
  DeckDie,
  EventContext,
  OptionContext,
} from "@/game/events/engine";
export {
  checkOdds,
  checkTotal,
  highestSuccessOdds,
  oddsPercent,
  resolveFaces,
  rollCheckDice,
  sumSuccessOdds,
  topDiceForCheck,
} from "@/game/events/checks";
export type { DeckRef, FaceDie } from "@/game/events/checks";
export { applyOutcome, TIDE_CAP } from "@/game/events/apply";
export type { ApplyResult } from "@/game/events/apply";
