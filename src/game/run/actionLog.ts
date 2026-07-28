import { fnv1a } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";

// Plausibility anchor, NOT cryptography (DESIGN §15). A rolling fnv1a over an
// ordered action log lets the board spot two submissions that claim the same
// daily seed with wildly different play; a determined client can still forge it.
export const ACTION_HASH_SEED = 0x811c9dc5;

let hash = ACTION_HASH_SEED;
let count = 0;

export interface ActionLogState {
  hash: number;
  count: number;
}

export const resetActionLog = (): void => {
  hash = ACTION_HASH_SEED;
  count = 0;
};

export const restoreActionLog = (state: ActionLogState): void => {
  hash = state.hash >>> 0;
  count = Math.max(0, state.count);
};

export const actionLogState = (): ActionLogState => ({ hash, count });

export const recordAction = (token: string): void => {
  hash = fnv1a(`${String(hash)}|${token}`);
  count += 1;
};

export const rollActionHash = (
  from: ActionLogState,
  tokens: readonly string[],
): ActionLogState => {
  let next = from.hash >>> 0;
  for (const token of tokens) next = fnv1a(`${String(next)}|${token}`);
  return { hash: next, count: from.count + tokens.length };
};

// Synced at node boundaries only: per-placement writes would push runStore
// updates through React mid-battle, which the architecture rules forbid.
export const syncActionStats = (): void => {
  const run = useRunStore.getState();
  if (run.stats.actionHash === hash && run.stats.actionCount === count) return;
  useRunStore.setState({
    stats: { ...run.stats, actionHash: hash, actionCount: count },
  });
};
