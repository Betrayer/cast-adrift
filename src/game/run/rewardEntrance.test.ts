import { beforeEach, describe, expect, it } from "vitest";
import {
  entranceKey,
  LEGACY_ENTRANCE,
  pickEntrance,
  REWARD_ENTRANCES,
  type RewardEntrance,
} from "@/game/run/rewardEntrance";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

const chain = (seed: number, count: number): RewardEntrance[] => {
  const out: RewardEntrance[] = [];
  let previous: RewardEntrance | null = null;
  for (let i = 0; i < count; i += 1) {
    previous = pickEntrance(seed, entranceKey(i % 6, `r${String(i)}l1`), previous);
    out.push(previous);
  }
  return out;
};

describe("reward entrances", () => {
  beforeEach(() => {
    useRunStore.setState({ ...createInitialRunValues(), seed: 4242 });
  });

  it("replays the same sequence for the same seed", () => {
    expect(chain(7, 40)).toEqual(chain(7, 40));
    expect(chain(7, 40)).not.toEqual(chain(8, 40));
  });

  it("never shows the same entrance twice in a row and uses all five", () => {
    for (const seed of [1, 2, 3, 99, 4242]) {
      const sequence = chain(seed, 60);
      for (let i = 1; i < sequence.length; i += 1) {
        expect(sequence[i]).not.toBe(sequence[i - 1]);
      }
      expect(new Set(sequence)).toEqual(new Set(REWARD_ENTRANCES));
    }
  });

  it("stamps a new bundle once, keeps it through partial updates, and remembers it", () => {
    const store = useRunStore.getState();
    store.setPendingRewards({ dieDrop: "red-d6", perkChoices: [], draftNodeId: "r3l1" });
    const first = useRunStore.getState().pendingRewards?.entrance;
    expect(first).toBeDefined();
    expect(useRunStore.getState().lastEntrance).toBe(first);
    const pending = useRunStore.getState().pendingRewards;
    if (pending === null) throw new Error("bundle missing");
    useRunStore.getState().setPendingRewards({ ...pending, dieDrop: null });
    expect(useRunStore.getState().pendingRewards?.entrance).toBe(first);
    useRunStore.getState().setPendingRewards(null);
    useRunStore
      .getState()
      .setPendingRewards({ dieDrop: "red-d6", perkChoices: [], draftNodeId: "r4l0" });
    const second = useRunStore.getState().pendingRewards?.entrance;
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it("gives a bundle saved before entrances existed the legacy one, and keeps it through a partial update", () => {
    useRunStore.setState({
      pendingRewards: { dieDrop: "red-d6", perkChoices: [], draftNodeId: "r3l1" },
      lastEntrance: "fan",
    });
    const snapshot = captureRunSnapshot();
    expect(snapshot.run.pendingRewards?.entrance).toBeUndefined();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    const restored = useRunStore.getState().pendingRewards;
    expect(restored?.entrance).toBe(LEGACY_ENTRANCE);
    if (restored === null) throw new Error("bundle missing");
    useRunStore.getState().setPendingRewards({ ...restored, dieDrop: null });
    expect(useRunStore.getState().pendingRewards?.entrance).toBe(LEGACY_ENTRANCE);
    expect(useRunStore.getState().lastEntrance).toBe("fan");
  });
});
