import { beaconsResolved } from "@/data/events/beacons";
import {
  earnedMemoryOrders,
  finalMemoryCodexId,
  memoryAt,
  FINAL_MEMORY_IDS,
  MEMORY_CODEX_IDS,
  MEMORY_TOTAL,
  NUMBERED_MEMORIES,
  type MemoryProgress,
} from "@/data/narrative/memories";
import { logJournal } from "@/game/run/journal";
import { useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";

export const memoryProgress = (): MemoryProgress => {
  const run = useRunStore.getState();
  return {
    gateKills: run.stats.minibosses + run.stats.bosses,
    lifetimeElites: useMetaStore.getState().stats.elites,
    beaconsResolved: beaconsResolved(run.flags),
  };
};

// Called wherever a memory source can move: a gate cleared, an elite killed, a
// beacon resolved. Idempotent — a threshold crossed twice pays once.
export const syncMemoryArc = (): number[] => {
  const earned = earnedMemoryOrders(memoryProgress());
  const run = useRunStore.getState();
  const fresh: number[] = [];
  for (const order of earned) {
    if (!run.unlockMemory(order)) continue;
    const memory = memoryAt(order);
    if (memory === undefined) continue;
    useMetaStore.getState().unlockCodex(memory.codexId);
    useNarrativeStore.getState().pushMemory(order);
    logJournal({ k: "memory", order });
    fresh.push(order);
  }
  return fresh;
};

// «Ответ» asks for the arc, not for the run: every numbered fragment in the
// profile's Codex plus a sixteenth slot some earlier ending already wrote.
export const echoArcComplete = (): boolean => {
  const codex = new Set(useMetaStore.getState().codex);
  return (
    NUMBERED_MEMORIES.every((m) => codex.has(m.codexId)) &&
    FINAL_MEMORY_IDS.some((id) => codex.has(id))
  );
};

export const sealFinalMemory = (endingId: string): void => {
  useRunStore.getState().unlockMemory(MEMORY_TOTAL);
  useMetaStore.getState().unlockCodex(finalMemoryCodexId(endingId));
  logJournal({ k: "memory", order: MEMORY_TOTAL });
};

export interface MemoryHint {
  key: string;
  values?: Record<string, number>;
}

// Non-spoiler silhouettes: the Codex says what would earn the fragment, never
// what it says.
export const memoryUnlockHint = (codexId: string): MemoryHint | null => {
  if (FINAL_MEMORY_IDS.includes(codexId)) return { key: "run:memory.hintEnding" };
  const def = NUMBERED_MEMORIES.find((m) => m.codexId === codexId);
  if (def === undefined) return null;
  switch (def.source.s) {
    case "gate":
      return { key: "run:memory.hintGate", values: { n: def.source.n } };
    case "elite":
      return { key: "run:memory.hintElite", values: { n: def.source.n } };
    case "beacons":
      return { key: "run:memory.hintBeacons", values: { n: def.source.n } };
    case "ending":
      return { key: "run:memory.hintEnding" };
  }
};

export const unreadMemoryIds = (
  codex: readonly string[],
  codexRead: readonly string[],
): string[] => {
  const read = new Set(codexRead);
  const memoryIds = new Set(MEMORY_CODEX_IDS);
  return codex.filter((id) => memoryIds.has(id) && !read.has(id));
};
