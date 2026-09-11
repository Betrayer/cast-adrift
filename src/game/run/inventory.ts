import { MODULE_BY_ID } from "@/data/modules";
import { OFFICER_BY_ID } from "@/data/officers";
import { takeCargo } from "@/game/run/cargo";
import {
  DECK_CAP,
  moduleSellValue,
  ptsForDie,
  sellValue,
} from "@/game/economy/prices";
import {
  useRunStore,
  type PendingSwap,
  type RunValues,
} from "@/stores/runStore";

export type GrantOutcome = "added" | "queued" | "owned";

const modulePrice = (moduleId: string): number =>
  MODULE_BY_ID.get(moduleId)?.price ?? 0;

export const swapValue = (swap: PendingSwap): number => {
  if (swap.kind === "die") return sellValue(ptsForDie(swap.defId));
  if (swap.kind === "module") return moduleSellValue(modulePrice(swap.moduleId));
  return 0;
};

export const grantDie = (defId: string): GrantOutcome => {
  const run = useRunStore.getState();
  if (run.deck.length < DECK_CAP) {
    run.addDie(defId);
    return "added";
  }
  run.queueSwap({ kind: "die", defId });
  return "queued";
};

const swapQueued = (run: RunValues, moduleId: string): boolean =>
  run.pendingSwaps.some(
    (swap) => swap.kind === "module" && swap.moduleId === moduleId,
  );

export const grantModule = (moduleId: string): GrantOutcome => {
  const run = useRunStore.getState();
  if (run.modules.includes(moduleId) || swapQueued(run, moduleId)) {
    return "owned";
  }
  if (run.addModule(moduleId)) return "added";
  run.queueSwap({ kind: "module", moduleId });
  return "queued";
};

const officerQueued = (run: RunValues, officerId: string): boolean =>
  run.pendingSwaps.some(
    (swap) => swap.kind === "officer" && swap.officerId === officerId,
  );

export const grantOfficer = (officerId: string): GrantOutcome => {
  const run = useRunStore.getState();
  if (OFFICER_BY_ID.get(officerId) === undefined) return "owned";
  if (run.officers.includes(officerId) || officerQueued(run, officerId)) {
    return "owned";
  }
  if (run.addOfficer(officerId)) return "added";
  run.queueSwap({ kind: "officer", officerId });
  return "queued";
};

export const grantCargo = (cargoId: string): GrantOutcome => {
  const run = useRunStore.getState();
  if (run.cargo.some((held) => held.defId === cargoId)) return "owned";
  return takeCargo(cargoId) ? "added" : "owned";
};

export const sellModule = (moduleId: string): boolean => {
  const run = useRunStore.getState();
  if (!run.modules.includes(moduleId)) return false;
  run.removeModule(moduleId);
  run.addScrap(moduleSellValue(modulePrice(moduleId)));
  return true;
};

export const replaceDie = (uid: string, defId: string): boolean => {
  const run = useRunStore.getState();
  const outgoing = run.deck.find((die) => die.uid === uid);
  if (outgoing === undefined) return false;
  run.removeDie(uid);
  run.addScrap(sellValue(ptsForDie(outgoing.defId)));
  useRunStore.getState().addDie(defId);
  return true;
};

export const replaceModule = (outgoingId: string, moduleId: string): boolean => {
  const run = useRunStore.getState();
  if (!run.modules.includes(outgoingId)) return false;
  if (run.modules.includes(moduleId)) return false;
  run.removeModule(outgoingId);
  run.addScrap(moduleSellValue(modulePrice(outgoingId)));
  return useRunStore.getState().addModule(moduleId);
};

export const replaceOfficer = (
  outgoingId: string,
  officerId: string,
): boolean => {
  const run = useRunStore.getState();
  if (!run.officers.includes(outgoingId)) return false;
  if (run.officers.includes(officerId)) return false;
  run.removeOfficer(outgoingId);
  return useRunStore.getState().addOfficer(officerId);
};

const swapResolvable = (run: RunValues, swap: PendingSwap): boolean => {
  if (swap.kind === "die") return true;
  if (swap.kind === "module") return !run.modules.includes(swap.moduleId);
  return !run.officers.includes(swap.officerId);
};

export const resolveSwapReplace = (outgoing: string): void => {
  const run = useRunStore.getState();
  const swap = run.pendingSwaps[0];
  if (swap === undefined) return;
  if (!swapResolvable(run, swap)) {
    run.shiftSwap();
    return;
  }
  const done =
    swap.kind === "die"
      ? replaceDie(outgoing, swap.defId)
      : swap.kind === "module"
        ? replaceModule(outgoing, swap.moduleId)
        : replaceOfficer(outgoing, swap.officerId);
  if (!done) return;
  useRunStore.getState().shiftSwap();
};

export const resolveSwapSell = (): void => {
  const run = useRunStore.getState();
  const swap = run.pendingSwaps[0];
  if (swap === undefined) return;
  const value = swapValue(swap);
  if (value > 0) run.addScrap(value);
  useRunStore.getState().shiftSwap();
};
