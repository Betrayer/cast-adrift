import { MODULE_BY_ID } from "@/data/modules";
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

export const swapValue = (swap: PendingSwap): number =>
  swap.kind === "die"
    ? sellValue(ptsForDie(swap.defId))
    : moduleSellValue(modulePrice(swap.moduleId));

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

const swapResolvable = (run: RunValues, swap: PendingSwap): boolean =>
  swap.kind === "die" || !run.modules.includes(swap.moduleId);

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
      : replaceModule(outgoing, swap.moduleId);
  if (!done) return;
  useRunStore.getState().shiftSwap();
};

export const resolveSwapSell = (): void => {
  const run = useRunStore.getState();
  const swap = run.pendingSwaps[0];
  if (swap === undefined) return;
  run.addScrap(swapValue(swap));
  useRunStore.getState().shiftSwap();
};
