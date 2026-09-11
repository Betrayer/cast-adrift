import { barkBudgetWaitMs, emitBark } from "@/game/narrative/barks";
import { useRunStore } from "@/stores/runStore";

export const officerBarkPending = (): boolean =>
  useRunStore.getState().pendingOfficerBark;

export const officerBarkWaitMs = (): number =>
  officerBarkPending() ? barkBudgetWaitMs() : 0;

export const spendOfficerBark = (): boolean => {
  if (!officerBarkPending()) return false;
  if (barkBudgetWaitMs() > 0) return false;
  emitBark("officerRescued");
  useRunStore.getState().setOfficerBark(false);
  return true;
};
