import { beforeEach, describe, expect, it } from "vitest";
import { FULL_RESONANCE, endRun, startRun } from "@/game/run/flow";
import {
  noteCheckWon,
  noteEventResolved,
  noteFusion,
  noteMkTop,
} from "@/game/meta/counters";
import { largestResonance, useBattleStore } from "@/stores/battleStore";
import { computeCensus } from "@/game/battle/resonance";
import {
  createInitialMetaStats,
  useMetaStore,
  type MetaStats,
} from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";

const lifetime = (): MetaStats => useMetaStore.getState().stats;

const resetMeta = (): void => {
  useMetaStore.setState({
    shards: 0,
    xp: 0,
    level: 1,
    achievements: [],
    achievementsSeen: [],
    unlocksGranted: [],
    badges: [],
    engravings: {},
    voucherOffers: [],
    vouchers: { perkDraft: 0 },
    flagsArchive: [],
    bossFirstKills: [],
    endings: [],
    ascension: { campaign: 0 },
    stats: createInitialMetaStats(),
  });
};

describe("lifetime counter sites", () => {
  beforeEach(() => {
    resetMeta();
    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  it("counts a won check once, at the check", () => {
    noteCheckWon();
    noteCheckWon();
    expect(lifetime().checksWon).toBe(2);
  });

  it("counts a resolved event outcome", () => {
    noteEventResolved();
    expect(lifetime().eventsResolved).toBe(1);
  });

  it("counts a fusion and an Mk3 build", () => {
    noteFusion();
    noteMkTop();
    noteMkTop();
    expect(lifetime().fusions).toBe(1);
    expect(lifetime().mk3Built).toBe(2);
  });

  it("settles a family tier the moment its counter crosses", () => {
    for (let i = 0; i < 5; i += 1) noteFusion();
    expect(useMetaStore.getState().achievements).toContain("machinist-1");
  });

  it("counts a fitted engraving inside the store that fits it", () => {
    useMetaStore.setState({ shards: 999 });
    expect(useMetaStore.getState().engrave("red-d6", "keen", 10)).toBe(true);
    expect(lifetime().engravingsFitted).toBe(1);
    expect(useMetaStore.getState().engrave("red-d6", "keen", 10)).toBe(false);
    expect(lifetime().engravingsFitted).toBe(1);
  });

  it("counts a campaign clear against the ship that flew it", () => {
    startRun(4242, 0);
    expect(useRunStore.getState().shipId).toBe("wanderer");
    endRun(true);
    expect(lifetime().clearsWanderer).toBe(1);
    expect(lifetime().clearsRam).toBe(0);
    expect(lifetime().clearsArk).toBe(0);
  });

  it("does not count a loss or a non-campaign win as a ship clear", () => {
    startRun(4242, 0);
    endRun(false);
    expect(lifetime().clearsWanderer).toBe(0);
    useRunStore.getState().reset();
    startRun(4242, 0);
    useRunStore.setState({ mode: "contract" });
    endRun(true);
    expect(lifetime().clearsWanderer).toBe(0);
  });

  it("reads the widest school count of a battle as its resonance", () => {
    const census = computeCensus([
      { school: "red" },
      { school: "red" },
      { school: "red" },
      { school: "red" },
      { school: "red" },
      { school: "red" },
      { school: "blue" },
    ]);
    expect(largestResonance(census)).toBe(FULL_RESONANCE);
    expect(largestResonance(computeCensus([{ school: "red" }]))).toBe(1);
  });
});
