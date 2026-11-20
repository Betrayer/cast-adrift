import { beforeEach, describe, expect, it } from "vitest";
import { BEACON_FLAGS } from "@/data/events/beacons";
import {
  FINAL_MEMORY_BY_ENDING,
  GATE_MEMORIES,
  MEMORY_TOTAL,
} from "@/data/narrative/memories";
import { sealFinalMemory, syncMemoryArc } from "@/game/narrative/memoryArc";
import { createInitialMetaValues, useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

const memoryEntries = (): number[] =>
  useNarrativeStore
    .getState()
    .journal.filter((entry) => entry.k === "memory")
    .map((entry) => (entry.k === "memory" ? entry.order : 0));

const newRun = (): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    hull: 30,
    hullMax: 30,
  });
  useNarrativeStore.getState().reset();
};

describe("an Echo memory fragment unlocks once per account", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    newRun();
  });

  it("pays the gate fragments on the first run and nothing on the second", () => {
    useRunStore.getState().bumpStats({ bosses: GATE_MEMORIES });
    syncMemoryArc();
    expect(memoryEntries()).toHaveLength(GATE_MEMORIES);

    newRun();
    useRunStore.getState().bumpStats({ bosses: GATE_MEMORIES });
    syncMemoryArc();
    expect(memoryEntries()).toEqual([]);
    expect(useNarrativeStore.getState().memoryQueue).toEqual([]);
  });

  it("pays the elite fragments once although the counter is lifetime", () => {
    useMetaStore.getState().bumpLifetime({ elites: 9 });
    syncMemoryArc();
    expect(memoryEntries()).toEqual([11, 12, 13]);

    newRun();
    expect(syncMemoryArc()).toEqual([]);
    expect(memoryEntries()).toEqual([]);
    expect(useNarrativeStore.getState().memoryQueue).toEqual([]);
  });

  it("pays the beacon fragments once although the flags are per run", () => {
    for (const key of BEACON_FLAGS) useRunStore.getState().setFlag(key);
    syncMemoryArc();
    expect(memoryEntries()).toEqual([14, 15]);

    newRun();
    for (const key of BEACON_FLAGS) useRunStore.getState().setFlag(key);
    expect(syncMemoryArc()).toEqual([]);
    expect(memoryEntries()).toEqual([]);
  });

  it("keeps the run's own record of what it earned", () => {
    useMetaStore.getState().bumpLifetime({ elites: 9 });
    syncMemoryArc();
    newRun();
    syncMemoryArc();
    expect(useRunStore.getState().memoryOrders).toEqual([11, 12, 13]);
  });

  it("seals the final fragment once, whichever ending comes second", () => {
    sealFinalMemory("seal");
    expect(memoryEntries()).toEqual([MEMORY_TOTAL]);

    newRun();
    sealFinalMemory("merge");
    expect(memoryEntries()).toEqual([]);
    const codex = useMetaStore.getState().codex;
    expect(codex).toContain(FINAL_MEMORY_BY_ENDING.seal);
    expect(codex).toContain(FINAL_MEMORY_BY_ENDING.merge);
  });
});
