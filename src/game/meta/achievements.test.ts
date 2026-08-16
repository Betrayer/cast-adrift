import { beforeEach, describe, expect, it } from "vitest";
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from "@/data/achievements";
import { UNLOCK_BY_ID, unlockedDice } from "@/data/unlocks";
import {
  achievementMet,
  achievementProgress,
  newlyMetAchievements,
  settleAchievements,
  type AchievementCtx,
  type AchievementRunCtx,
} from "@/game/meta/achievements";
import { unlockContextOf } from "@/game/meta/unlockState";
import {
  createInitialMetaStats,
  useMetaStore,
  type MetaStats,
} from "@/stores/metaStore";
import { createInitialRunStats, useRunStore } from "@/stores/runStore";
import { useNarrativeStore } from "@/stores/narrativeStore";

const stats = (patch: Partial<MetaStats> = {}): MetaStats => ({
  ...createInitialMetaStats(),
  ...patch,
});

const ctx = (patch: Partial<AchievementCtx> = {}): AchievementCtx => ({
  stats: stats(),
  endings: [],
  bossFirstKills: [],
  collection: [],
  encountered: {},
  contracts: {},
  chartPicks: [],
  codex: [],
  seenPuzzles: [],
  flagsArchive: [],
  run: null,
  ...patch,
});

const runCtx = (patch: Partial<AchievementRunCtx> = {}): AchievementRunCtx => ({
  win: true,
  hullPct: 100,
  beacons: 0,
  puzzles: 0,
  ascension: 0,
  stats: createInitialRunStats(),
  ...patch,
});

const def = (id: string) => {
  const found = ACHIEVEMENT_BY_ID.get(id);
  if (found === undefined) throw new Error(`no achievement ${id}`);
  return found;
};

describe("achievement catalogue", () => {
  it("ships thirty-two definitions with unique ids", () => {
    expect(ACHIEVEMENTS).toHaveLength(32);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(32);
  });

  it("gates eleven of them on content and reads flags in seven", () => {
    expect(
      ACHIEVEMENTS.filter((a) => a.reward?.unlockId !== undefined),
    ).toHaveLength(11);
    expect(ACHIEVEMENTS.filter((a) => a.cond.c === "flags")).toHaveLength(7);
  });

  it("only points at unlocks that exist", () => {
    for (const a of ACHIEVEMENTS) {
      if (a.reward?.unlockId === undefined) continue;
      expect(UNLOCK_BY_ID.has(a.reward.unlockId)).toBe(true);
    }
  });

  it("nothing is met on a fresh profile", () => {
    for (const a of ACHIEVEMENTS) {
      expect(achievementMet(a, ctx()), a.id).toBe(false);
    }
  });
});

describe("achievement conditions", () => {
  it("counts lifetime tallies with a progress bar", () => {
    const at10 = achievementProgress(def("firstBlood"), ctx({ stats: stats({ kills: 10 }) }));
    expect(at10).toEqual({ have: 10, need: 25, done: false });
    expect(
      achievementMet(def("firstBlood"), ctx({ stats: stats({ kills: 25 }) })),
    ).toBe(true);
  });

  it("clamps progress at the target instead of overshooting", () => {
    expect(
      achievementProgress(def("firstBlood"), ctx({ stats: stats({ kills: 900 }) })),
    ).toEqual({ have: 25, need: 25, done: true });
  });

  it("reads run-scoped conditions only when a run is supplied", () => {
    expect(achievementMet(def("flawless"), ctx())).toBe(false);
    expect(
      achievementMet(def("flawless"), ctx({ run: runCtx({ hullPct: 90 }) })),
    ).toBe(true);
    expect(
      achievementMet(def("flawless"), ctx({ run: runCtx({ hullPct: 89 }) })),
    ).toBe(false);
    expect(
      achievementMet(
        def("flawless"),
        ctx({ run: runCtx({ hullPct: 100, win: false }) }),
      ),
    ).toBe(false);
  });

  it("reads an «at most» run condition as a constraint, not a counter", () => {
    expect(
      achievementMet(
        def("frugal"),
        ctx({ run: runCtx({ stats: { ...createInitialRunStats(), scrapSpent: 0 } }) }),
      ),
    ).toBe(true);
    expect(
      achievementMet(
        def("frugal"),
        ctx({ run: runCtx({ stats: { ...createInitialRunStats(), scrapSpent: 1 } }) }),
      ),
    ).toBe(false);
  });

  it("requires every flag for an «all» story achievement", () => {
    const one = ctx({ flagsArchive: ["mirrorBound"] });
    expect(achievementProgress(def("bothMirrors"), one)).toEqual({
      have: 1,
      need: 2,
      done: false,
    });
    expect(
      achievementMet(
        def("bothMirrors"),
        ctx({ flagsArchive: ["mirrorBound", "mirrorBroken"] }),
      ),
    ).toBe(true);
  });

  it("accepts either flag for an «any» story achievement", () => {
    expect(
      achievementMet(def("apostate"), ctx({ flagsArchive: ["choirBetrayed"] })),
    ).toBe(true);
    expect(
      achievementMet(def("apostate"), ctx({ flagsArchive: ["pactBroken"] })),
    ).toBe(true);
    expect(achievementMet(def("apostate"), ctx({ flagsArchive: [] }))).toBe(false);
  });

  it("counts the collection by distinct owned dice and by school", () => {
    const owned = Array.from({ length: 30 }, (_, i) => ({
      defId: `x${String(i)}`,
      count: 1,
    }));
    expect(achievementMet(def("outfitter"), ctx({ collection: owned }))).toBe(true);
    const oneEach = [
      "red-d6",
      "blue-d6",
      "green-d4",
      "yellow-d6",
      "black-d6",
      "grey-d4",
      "glimmer",
    ].map((defId) => ({ defId, count: 1 }));
    expect(achievementMet(def("everyColour"), ctx({ collection: oneEach }))).toBe(
      true,
    );
    expect(
      achievementMet(def("everyColour"), ctx({ collection: oneEach.slice(0, 6) })),
    ).toBe(false);
  });

  it("counts keystones rather than raw chart picks", () => {
    expect(
      achievementMet(
        def("keystoneThree"),
        ctx({ chartPicks: ["red-key1", "blue-key1", "green-key1"] }),
      ),
    ).toBe(true);
    expect(
      achievementMet(
        def("keystoneThree"),
        ctx({ chartPicks: ["red-key1", "red-s1", "red-s2"] }),
      ),
    ).toBe(false);
  });

  it("counts contract stars across the whole board", () => {
    const contracts: Record<string, number> = {};
    for (let i = 0; i < 10; i += 1) contracts[`c${String(i)}`] = 0b111;
    expect(achievementMet(def("contractor"), ctx({ contracts }))).toBe(true);
  });

  it("reports only what has newly been met", () => {
    const full = ctx({ stats: stats({ kills: 600 }) });
    expect(newlyMetAchievements(full, []).map((a) => a.id)).toEqual([
      "firstBlood",
      "hunter",
    ]);
    expect(newlyMetAchievements(full, ["firstBlood"]).map((a) => a.id)).toEqual([
      "hunter",
    ]);
  });
});

describe("settlement", () => {
  beforeEach(() => {
    useMetaStore.setState({
      achievements: [],
      unlocksGranted: [],
      badges: [],
      shards: 0,
      level: 1,
      ascension: { campaign: 0 },
      collection: [],
      encountered: {},
      contracts: {},
      chartPicks: [],
      codex: [],
      seenPuzzles: [],
      flagsArchive: [],
      endings: [],
      bossFirstKills: [],
      stats: stats(),
    });
    useNarrativeStore.getState().reset();
  });

  it("pays the shards, grants the unlock, awards the badge and toasts once", () => {
    useMetaStore.setState({ bossFirstKills: ["a", "b", "c", "d", "e"] });
    const settled = settleAchievements();
    expect(settled.unlocked.map((a) => a.id)).toContain("sectorFive");
    const meta = useMetaStore.getState();
    expect(meta.achievements).toContain("sectorFive");
    expect(meta.shards).toBe(settled.shards);
    expect(meta.unlocksGranted).toContain("diceAchFirstClear");
    expect(useNarrativeStore.getState().achievement?.achievement).toBe(
      "sectorFive",
    );
    const dice = unlockedDice(unlockContextOf(useMetaStore.getState()));
    expect(dice.has("aurora")).toBe(true);
    useNarrativeStore.getState().dismissAchievement();
    const again = settleAchievements();
    expect(again.unlocked).toHaveLength(0);
    expect(again.shards).toBe(0);
    expect(useMetaStore.getState().shards).toBe(settled.shards);
  });

  it("awards the animated A10 badge with the ascension clear", () => {
    settleAchievements(runCtx({ ascension: 10 }));
    expect(useMetaStore.getState().achievements).toContain("ascendant");
    expect(useMetaStore.getState().badges).toContain("ascendant");
  });

  it("keeps the run store out of it: no run means no run-scoped unlock", () => {
    useRunStore.getState().reset();
    settleAchievements();
    expect(useMetaStore.getState().achievements).not.toContain("flawless");
  });
});
