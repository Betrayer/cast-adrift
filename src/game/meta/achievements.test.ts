import { beforeEach, describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_ALIASES,
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENT_FAMILIES,
  ACHIEVEMENT_ROWS,
  compileFamily,
  condFromTemplate,
  resolveAchievementId,
  tierId,
  tierNumeral,
  type AchievementFamilyDef,
} from "@/data/achievements";
import { CHAINS } from "@/data/narrative/chains";
import { UNLOCK_BY_ID, UNLOCKS, unlockedDice } from "@/data/unlocks";
import {
  achievementMet,
  achievementProgress,
  achievementTitleById,
  LIFETIME_ACHIEVEMENTS,
  newlyMetAchievements,
  settleAchievements,
  settleLifetimeAchievements,
  takeVoucherOffer,
  type AchievementCtx,
  type AchievementRunCtx,
} from "@/game/meta/achievements";
import { unlockContextOf } from "@/game/meta/unlockState";
import {
  createInitialMetaStats,
  META_VERSION,
  migrateMeta,
  useMetaStore,
  VOUCHER_CAP,
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
  deckSchools: 0,
  stats: createInitialRunStats(),
  ...patch,
});

const def = (id: string) => {
  const found = ACHIEVEMENT_BY_ID.get(id);
  if (found === undefined) throw new Error(`no achievement ${id}`);
  return found;
};

const chainFlags = (chainId: string): string[] => {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (chain === undefined) throw new Error(`no chain ${chainId}`);
  return chain.steps
    .map((step) => step.done[0])
    .filter((key): key is string => key !== undefined);
};

describe("achievement catalogue", () => {
  it("compiles ninety definitions with unique ids", () => {
    expect(ACHIEVEMENTS).toHaveLength(90);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(90);
  });

  it("gates eleven of them on content and reads flags in seven", () => {
    expect(
      ACHIEVEMENTS.filter((a) => a.reward?.unlockId !== undefined),
    ).toHaveLength(11);
    expect(ACHIEVEMENTS.filter((a) => a.cond.c === "flags")).toHaveLength(7);
  });

  it("only points at unlocks that exist, and every unlock waits on a real id", () => {
    for (const a of ACHIEVEMENTS) {
      if (a.reward?.unlockId === undefined) continue;
      expect(UNLOCK_BY_ID.has(a.reward.unlockId)).toBe(true);
    }
    for (const unlock of UNLOCKS) {
      if (unlock.source.achievement === undefined) continue;
      expect(
        ACHIEVEMENT_BY_ID.has(unlock.source.achievement),
        unlock.id,
      ).toBe(true);
    }
  });

  it("keeps every family monotonic and pays vouchers only at legendary rank", () => {
    for (const family of ACHIEVEMENT_FAMILIES) {
      const tiers = family.tiers;
      for (let i = 1; i < tiers.length; i += 1) {
        expect(tiers[i]?.need, family.id).toBeGreaterThan(tiers[i - 1]?.need ?? 0);
        expect(tiers[i]?.shards, family.id).toBeGreaterThanOrEqual(
          tiers[i - 1]?.shards ?? 0,
        );
      }
      tiers.forEach((tier, index) => {
        if (tier.voucher === undefined) return;
        expect(tier.legendary, family.id).toBe(true);
        expect(index, family.id).toBe(tiers.length - 1);
        expect(tier.altShards ?? 0, family.id).toBeGreaterThan(0);
      });
    }
  });

  it("puts every definition in exactly one row", () => {
    const members = ACHIEVEMENT_ROWS.flatMap((row) =>
      row.kind === "family" ? row.tiers.map((tier) => tier.id) : [row.def.id],
    );
    expect(members).toHaveLength(ACHIEVEMENTS.length);
    expect(new Set(members).size).toBe(ACHIEVEMENTS.length);
  });

  it("nothing is met on a fresh profile", () => {
    for (const a of ACHIEVEMENTS) {
      expect(achievementMet(a, ctx()), a.id).toBe(false);
    }
  });

  it("keeps the run-scoped set out of the lifetime pool", () => {
    expect(LIFETIME_ACHIEVEMENTS.length).toBeLessThan(ACHIEVEMENTS.length);
    for (const a of LIFETIME_ACHIEVEMENTS) {
      expect(a.cond.c.startsWith("run"), a.id).toBe(false);
      expect(a.cond.c, a.id).not.toBe("clearAtAscension");
    }
  });
});

describe("family compiler", () => {
  const family: AchievementFamilyDef = {
    id: "probe",
    group: "combat",
    name: "meta:ach.bounty.name",
    desc: "meta:ach.bounty.desc",
    cond: { c: "lifetime", stat: "kills" },
    tiers: [
      { need: 2, shards: 10 },
      { need: 8, shards: 40, legendary: true, voucher: "perkDraft", altShards: 90 },
    ],
  };

  it("names tiers by index and carries the family back-reference", () => {
    const tiers = compileFamily(family);
    expect(tiers.map((t) => t.id)).toEqual(["probe-1", "probe-2"]);
    expect(tierId("probe", 2)).toBe("probe-2");
    expect(tiers[0]?.family).toBe("probe");
    expect(tiers[0]?.tier).toBe(1);
    expect(tiers[0]?.tierCount).toBe(2);
    expect(tiers[1]?.legendary).toBe(true);
    expect(tiers[0]?.legendary).toBeUndefined();
  });

  it("stamps the tier target into the condition and the reward", () => {
    const tiers = compileFamily(family);
    expect(tiers[0]?.cond).toEqual({ c: "lifetime", stat: "kills", n: 2 });
    expect(tiers[1]?.reward).toEqual({
      shards: 40,
      voucher: "perkDraft",
      altShards: 90,
    });
    expect(condFromTemplate({ c: "codex" }, 7)).toEqual({ c: "codex", n: 7 });
  });

  it("numbers tiers in roman up to six", () => {
    expect([1, 2, 3, 4, 5, 6].map(tierNumeral)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
    ]);
  });
});

describe("achievement conditions", () => {
  it("counts lifetime tallies with a progress bar", () => {
    const at10 = achievementProgress(def("bounty-3"), ctx({ stats: stats({ kills: 10 }) }));
    expect(at10).toEqual({ have: 10, need: 25, done: false });
    expect(
      achievementMet(def("bounty-3"), ctx({ stats: stats({ kills: 25 }) })),
    ).toBe(true);
  });

  it("clamps progress at the target instead of overshooting", () => {
    expect(
      achievementProgress(def("bounty-3"), ctx({ stats: stats({ kills: 900 }) })),
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

  it("asks the winning deck for every school", () => {
    expect(
      achievementMet(def("spectrumClear"), ctx({ run: runCtx({ deckSchools: 6 }) })),
    ).toBe(true);
    expect(
      achievementMet(def("spectrumClear"), ctx({ run: runCtx({ deckSchools: 5 }) })),
    ).toBe(false);
    expect(
      achievementMet(
        def("spectrumClear"),
        ctx({ run: runCtx({ deckSchools: 6, win: false }) }),
      ),
    ).toBe(false);
  });

  it("counts chain steps out of the flag archive", () => {
    const flags = chainFlags("mara");
    expect(
      achievementProgress(def("chainMara"), ctx({ flagsArchive: flags.slice(0, 1) })),
    ).toEqual({ have: 1, need: flags.length, done: false });
    expect(achievementMet(def("chainMara"), ctx({ flagsArchive: flags }))).toBe(
      true,
    );
  });

  it("counts finished chains for the all-four achievement", () => {
    const all = CHAINS.flatMap((chain) => chainFlags(chain.id));
    expect(achievementMet(def("allChains"), ctx({ flagsArchive: all }))).toBe(true);
    const threeOnly = CHAINS.slice(0, 3).flatMap((chain) => chainFlags(chain.id));
    expect(
      achievementProgress(def("allChains"), ctx({ flagsArchive: threeOnly })),
    ).toEqual({ have: 3, need: 4, done: false });
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
    expect(achievementMet(def("outfitter-1"), ctx({ collection: owned }))).toBe(true);
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
    expect(achievementMet(def("contractor-2"), ctx({ contracts }))).toBe(true);
  });

  it("reports only what has newly been met, tier by tier", () => {
    const full = ctx({ stats: stats({ kills: 600 }) });
    expect(newlyMetAchievements(full, []).map((a) => a.id)).toEqual([
      "bounty-1",
      "bounty-2",
      "bounty-3",
      "bounty-4",
      "bounty-5",
      "bounty-6",
    ]);
    expect(
      newlyMetAchievements(full, ["bounty-1", "bounty-2", "bounty-3"]).map(
        (a) => a.id,
      ),
    ).toEqual(["bounty-4", "bounty-5", "bounty-6"]);
  });
});

describe("id migration", () => {
  it("maps every retired id onto a live tier", () => {
    for (const [oldId, newId] of Object.entries(ACHIEVEMENT_ALIASES)) {
      expect(ACHIEVEMENT_BY_ID.has(newId), oldId).toBe(true);
      expect(ACHIEVEMENT_BY_ID.has(oldId), oldId).toBe(false);
      expect(resolveAchievementId(oldId)).toBe(newId);
    }
    expect(resolveAchievementId("flawless")).toBe("flawless");
  });

  it("carries a v13 profile across without losing an earned achievement", () => {
    const earned = [
      "firstBlood",
      "hunter",
      "eliteHunter",
      "ironStreak",
      "scrapper",
      "tycoon",
      "cryptographer",
      "tierFive",
      "outfitter",
      "puzzleBreadth",
      "fiftyFound",
      "archivist",
      "contractor",
      "flawless",
      "theAnswer",
    ];
    const migrated = migrateMeta(
      {
        shards: 400,
        achievements: earned,
        achievementsSeen: ["firstBlood", "flawless"],
        stats: { kills: 700 },
      },
      13,
    );
    expect(migrated.achievements).toHaveLength(earned.length);
    for (const id of earned) {
      expect(migrated.achievements, id).toContain(resolveAchievementId(id));
    }
    expect(migrated.achievementsSeen).toEqual(["bounty-3", "flawless"]);
    expect(migrated.shards).toBe(400);
    expect(migrated.stats.kills).toBe(700);
    expect(migrated.vouchers).toEqual({ perkDraft: 0 });
    expect(migrated.voucherOffers).toEqual([]);
    expect(META_VERSION).toBe(14);
  });

  it("keeps a die unlock reachable through its renamed achievement", () => {
    const granted = migrateMeta({ achievements: ["ironStreak"] }, 13);
    expect(granted.achievements).toEqual(["deathless-2"]);
    const dice = unlockedDice({
      level: 1,
      achievements: granted.achievements,
      ascension: 0,
      clears: 0,
      granted: [],
    });
    expect(dice.size).toBeGreaterThan(0);
  });
});

describe("settlement", () => {
  beforeEach(() => {
    useMetaStore.setState({
      achievements: [],
      achievementsSeen: [],
      unlocksGranted: [],
      badges: [],
      shards: 0,
      level: 1,
      vouchers: { perkDraft: 0 },
      voucherOffers: [],
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
    useRunStore.getState().reset();
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
    settleAchievements();
    expect(useMetaStore.getState().achievements).not.toContain("flawless");
  });

  it("walks a whole family in one pass and pays every tier", () => {
    useMetaStore.setState({ stats: stats({ kills: 120 }) });
    const settled = settleAchievements();
    const ids = settled.unlocked.map((a) => a.id);
    expect(ids).toEqual([
      "bounty-1",
      "bounty-2",
      "bounty-3",
      "bounty-4",
      "bounty-5",
    ]);
    expect(settled.shards).toBe(15 + 25 + 40 + 70 + 120);
  });

  it("the lifetime pass never settles a run-scoped achievement", () => {
    useMetaStore.setState({ stats: stats({ kills: 5 }) });
    const settled = settleLifetimeAchievements();
    expect(settled.unlocked.map((a) => a.id)).toEqual(["bounty-1"]);
    expect(useMetaStore.getState().achievements).not.toContain("flawless");
  });

  it("writes a journal line while a run is live and stays quiet outside one", () => {
    useMetaStore.setState({ stats: stats({ kills: 5 }) });
    settleLifetimeAchievements();
    expect(useNarrativeStore.getState().journal).toHaveLength(0);
    useRunStore.setState({ active: true, sector: 3 });
    useMetaStore.setState({ stats: stats({ kills: 10 }) });
    settleLifetimeAchievements();
    const journal = useNarrativeStore.getState().journal;
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({
      k: "achievement",
      achievement: "bounty-2",
      sector: 3,
    });
  });
});

describe("legendary vouchers", () => {
  beforeEach(() => {
    useMetaStore.setState({
      achievements: [],
      shards: 0,
      vouchers: { perkDraft: 0 },
      voucherOffers: [],
      stats: stats(),
    });
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
  });

  it("offers a choice instead of granting the voucher outright", () => {
    useMetaStore.setState({ stats: stats({ kills: 500 }) });
    const settled = settleAchievements();
    expect(settled.offers).toEqual(["bounty-6"]);
    expect(useMetaStore.getState().voucherOffers).toEqual(["bounty-6"]);
    expect(useMetaStore.getState().vouchers.perkDraft).toBe(0);
  });

  it("banks the voucher when the player takes it", () => {
    useMetaStore.setState({ stats: stats({ kills: 500 }) });
    settleAchievements();
    const before = useMetaStore.getState().shards;
    expect(takeVoucherOffer("bounty-6", "voucher")).toBe(true);
    expect(useMetaStore.getState().vouchers.perkDraft).toBe(1);
    expect(useMetaStore.getState().shards).toBe(before);
    expect(useMetaStore.getState().voucherOffers).toEqual([]);
  });

  it("pays the alternative shard pile when the player refuses", () => {
    useMetaStore.setState({ stats: stats({ kills: 500 }) });
    settleAchievements();
    const before = useMetaStore.getState().shards;
    expect(takeVoucherOffer("bounty-6", "shards")).toBe(true);
    expect(useMetaStore.getState().vouchers.perkDraft).toBe(0);
    expect(useMetaStore.getState().shards).toBe(
      before + (def("bounty-6").reward?.altShards ?? 0),
    );
  });

  it("caps the bank and falls back to shards once it is full", () => {
    useMetaStore.setState({ vouchers: { perkDraft: VOUCHER_CAP } });
    useMetaStore.setState({ stats: stats({ kills: 500 }) });
    settleAchievements();
    const before = useMetaStore.getState().shards;
    expect(takeVoucherOffer("bounty-6", "voucher")).toBe(true);
    expect(useMetaStore.getState().vouchers.perkDraft).toBe(VOUCHER_CAP);
    expect(useMetaStore.getState().shards).toBeGreaterThan(before);
  });

  it("ignores an offer that is not on the ledger", () => {
    expect(takeVoucherOffer("bounty-6", "voucher")).toBe(false);
    expect(takeVoucherOffer("flawless", "voucher")).toBe(false);
  });
});

describe("titles", () => {
  it("marks a family tier in roman and leaves one-shots plain", () => {
    const translate = (key: string): string => key;
    expect(achievementTitleById("bounty-3", translate)).toBe(
      "meta:ach.bounty.name III",
    );
    expect(achievementTitleById("flawless", translate)).toBe(
      "meta:ach.flawless.name",
    );
    expect(achievementTitleById("nope", translate)).toBe("nope");
  });
});
