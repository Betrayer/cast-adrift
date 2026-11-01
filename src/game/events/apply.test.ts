import { beforeEach, describe, expect, it } from "vitest";
import { applyEventEffects } from "@/game/events/apply";
import { createStream } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

const tideAfter = (sector: number, tide: number, n: number): number => {
  useRunStore.setState({ ...createInitialRunValues(), sector, tide, mode: "campaign", ascension: 0 });
  applyEventEffects([{ k: "tide", n }], createStream(1));
  return useRunStore.getState().tide;
};

describe("event effects on the tide", () => {
  it("raises the tide up to the sector's own cap, not the base one", () => {
    expect(tideAfter(6, 4, 1)).toBe(5);
    expect(tideAfter(6, 3, 5)).toBe(5);
    expect(tideAfter(1, 2, 3)).toBe(3);
  });

  it("never lowers a tide that already stands at or above the cap", () => {
    expect(tideAfter(6, 5, 1)).toBe(5);
    expect(tideAfter(1, 4, 1)).toBe(4);
  });

  it("lowers the tide on a negative effect and stops at zero", () => {
    expect(tideAfter(6, 4, -2)).toBe(2);
    expect(tideAfter(1, 1, -3)).toBe(0);
  });
});

describe("event effects on shards", () => {
  beforeEach(() => {
    useMetaStore.setState({ shards: 40 });
  });

  it("pays a shard outcome into the meta store", () => {
    applyEventEffects([{ k: "shards", n: 12 }], createStream(1));
    expect(useMetaStore.getState().shards).toBe(52);
  });

  it("never takes shards away", () => {
    applyEventEffects([{ k: "shards", n: -5 }], createStream(1));
    expect(useMetaStore.getState().shards).toBe(40);
  });
});
