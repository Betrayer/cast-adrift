import type { MetaStats } from "@/stores/metaStore";
import type { RunStats } from "@/stores/runStore";
import type { LocKey } from "@/types/content";

export type AchievementGroup =
  | "combat"
  | "economy"
  | "puzzles"
  | "story"
  | "collection"
  | "modes";

type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

export type LifetimeStatKey = NumericKeys<MetaStats>;
export type RunStatKey = NumericKeys<RunStats>;

export type AchievementCond =
  | { c: "lifetime"; stat: LifetimeStatKey; n: number }
  | { c: "runStatAtMost"; stat: RunStatKey; n: number }
  | { c: "runHullPct"; n: number }
  | { c: "runBeacons"; n: number }
  | { c: "runPuzzles"; n: number }
  | { c: "runDeckSchools"; n: number }
  | { c: "clearAtAscension"; n: number }
  | { c: "endings"; n: number }
  | { c: "endingReached"; id: string }
  | { c: "bossFirstKills"; n: number }
  | { c: "collectionOwned"; n: number }
  | { c: "collectionSchools"; n: number }
  | { c: "encountered"; n: number }
  | { c: "contractStars"; n: number }
  | { c: "keystones"; n: number }
  | { c: "codex"; n: number }
  | { c: "seenPuzzles"; n: number }
  | { c: "streak"; n: number }
  | { c: "chainDone"; id: string }
  | { c: "chainsDone"; n: number }
  | { c: "flags"; keys: readonly string[]; mode: "all" | "any" };

export type VoucherKind = "perkDraft";

export interface AchievementReward {
  shards?: number;
  unlockId?: string;
  badge?: string;
  voucher?: VoucherKind;
  altShards?: number;
}

export interface AchievementDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  group: AchievementGroup;
  cond: AchievementCond;
  reward?: AchievementReward;
  family?: string;
  tier?: number;
  tierCount?: number;
  need?: number;
  legendary?: true;
}

export type CondTemplate =
  | { c: "lifetime"; stat: LifetimeStatKey }
  | { c: "bossFirstKills" }
  | { c: "collectionOwned" }
  | { c: "collectionSchools" }
  | { c: "contractStars" }
  | { c: "codex" }
  | { c: "encountered" }
  | { c: "endings" }
  | { c: "chainsDone" }
  | { c: "keystones" }
  | { c: "seenPuzzles" }
  | { c: "streak" };

export interface TierDef {
  need: number;
  shards: number;
  unlockId?: string;
  badge?: string;
  voucher?: VoucherKind;
  altShards?: number;
  legendary?: true;
}

export interface AchievementFamilyDef {
  id: string;
  group: AchievementGroup;
  name: LocKey;
  desc: LocKey;
  cond: CondTemplate;
  tiers: readonly TierDef[];
}

export const condFromTemplate = (
  template: CondTemplate,
  n: number,
): AchievementCond =>
  template.c === "lifetime"
    ? { c: "lifetime", stat: template.stat, n }
    : { ...template, n };

export const tierId = (familyId: string, tier: number): string =>
  `${familyId}-${String(tier)}`;

const rewardOfTier = (tier: TierDef): AchievementReward => ({
  shards: tier.shards,
  ...(tier.unlockId === undefined ? {} : { unlockId: tier.unlockId }),
  ...(tier.badge === undefined ? {} : { badge: tier.badge }),
  ...(tier.voucher === undefined ? {} : { voucher: tier.voucher }),
  ...(tier.altShards === undefined ? {} : { altShards: tier.altShards }),
});

export const compileFamily = (
  family: AchievementFamilyDef,
): AchievementDef[] =>
  family.tiers.map((tier, index) => ({
    id: tierId(family.id, index + 1),
    name: family.name,
    desc: family.desc,
    group: family.group,
    cond: condFromTemplate(family.cond, tier.need),
    reward: rewardOfTier(tier),
    family: family.id,
    tier: index + 1,
    tierCount: family.tiers.length,
    need: tier.need,
    ...(tier.legendary === true ? { legendary: true as const } : {}),
  }));

export const LEGENDARY_ALT_SHARDS = 250;

const legendaryTier = (need: number, shards: number): TierDef => ({
  need,
  shards,
  voucher: "perkDraft",
  altShards: LEGENDARY_ALT_SHARDS,
  legendary: true,
});

const family = (
  id: string,
  body: Omit<AchievementFamilyDef, "id" | "name" | "desc">,
): AchievementFamilyDef => ({
  id,
  name: `meta:ach.${id}.name`,
  desc: `meta:ach.${id}.desc`,
  ...body,
});

const single = (
  id: string,
  body: Omit<AchievementDef, "id" | "name" | "desc">,
): AchievementDef => ({
  id,
  name: `meta:ach.${id}.name`,
  desc: `meta:ach.${id}.desc`,
  ...body,
});

export const ACHIEVEMENT_FAMILIES: readonly AchievementFamilyDef[] = [
  family("bounty", {
    group: "combat",
    cond: { c: "lifetime", stat: "kills" },
    tiers: [
      { need: 5, shards: 15 },
      { need: 10, shards: 25 },
      { need: 25, shards: 40 },
      { need: 50, shards: 70 },
      { need: 100, shards: 120 },
      legendaryTier(500, 220),
    ],
  }),
  family("eliteHunt", {
    group: "combat",
    cond: { c: "lifetime", stat: "elites" },
    tiers: [
      { need: 5, shards: 30 },
      { need: 25, shards: 70, unlockId: "contractsAchGauntlet" },
      { need: 100, shards: 150 },
    ],
  }),
  family("deathless", {
    group: "combat",
    cond: { c: "streak" },
    tiers: [
      { need: 1, shards: 25 },
      { need: 3, shards: 55, unlockId: "diceAchSurvivor" },
      { need: 5, shards: 100 },
      legendaryTier(10, 180),
    ],
  }),
  family("flawlessBoss", {
    group: "combat",
    cond: { c: "lifetime", stat: "flawlessBosses" },
    tiers: [
      { need: 1, shards: 40 },
      { need: 5, shards: 110 },
    ],
  }),
  family("resonant", {
    group: "combat",
    cond: { c: "lifetime", stat: "resonance6" },
    tiers: [
      { need: 1, shards: 30 },
      { need: 10, shards: 70 },
      { need: 50, shards: 150 },
    ],
  }),
  family("voidRider", {
    group: "combat",
    cond: { c: "lifetime", stat: "wormholeRides" },
    tiers: [
      { need: 1, shards: 30 },
      { need: 10, shards: 70 },
      { need: 50, shards: 150 },
    ],
  }),
  family("horizonTester", {
    group: "combat",
    cond: { c: "lifetime", stat: "disintegrations" },
    tiers: [
      { need: 1, shards: 40 },
      { need: 3, shards: 90 },
      { need: 7, shards: 180 },
    ],
  }),
  family("rimRunner", {
    group: "combat",
    cond: { c: "lifetime", stat: "holesBypassed" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  }),
  family("scrapBaron", {
    group: "economy",
    cond: { c: "lifetime", stat: "scrapEarned" },
    tiers: [
      { need: 5000, shards: 30 },
      { need: 25000, shards: 70 },
      { need: 100000, shards: 150 },
    ],
  }),
  family("machinist", {
    group: "economy",
    cond: { c: "lifetime", stat: "fusions" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  }),
  family("engraver", {
    group: "economy",
    cond: { c: "lifetime", stat: "engravingsFitted" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  }),
  family("refit", {
    group: "economy",
    cond: { c: "lifetime", stat: "mk3Built" },
    tiers: [
      { need: 1, shards: 40 },
      { need: 10, shards: 110 },
    ],
  }),
  family("outfitter", {
    group: "economy",
    cond: { c: "collectionOwned" },
    tiers: [
      { need: 30, shards: 30 },
      { need: 60, shards: 70 },
      { need: 94, shards: 150 },
    ],
  }),
  family("tierFive", {
    group: "puzzles",
    cond: { c: "lifetime", stat: "t5Solved" },
    tiers: [
      { need: 1, shards: 25, unlockId: "diceAchPuzzler" },
      { need: 5, shards: 55 },
      { need: 10, shards: 100, unlockId: "diceL30" },
      legendaryTier(25, 180),
    ],
  }),
  family("puzzleBreadth", {
    group: "puzzles",
    cond: { c: "seenPuzzles" },
    tiers: [
      { need: 10, shards: 30 },
      { need: 25, shards: 70 },
      { need: 40, shards: 150 },
    ],
  }),
  family("eventful", {
    group: "story",
    cond: { c: "lifetime", stat: "eventsResolved" },
    tiers: [
      { need: 25, shards: 30 },
      { need: 100, shards: 70 },
      { need: 400, shards: 150 },
    ],
  }),
  family("gambler", {
    group: "story",
    cond: { c: "lifetime", stat: "checksWon" },
    tiers: [
      { need: 10, shards: 40 },
      { need: 50, shards: 110 },
    ],
  }),
  family("fiftyFound", {
    group: "collection",
    cond: { c: "encountered" },
    tiers: [
      { need: 25, shards: 25 },
      { need: 50, shards: 55, unlockId: "diceAchCollector" },
      { need: 75, shards: 100 },
      legendaryTier(94, 180),
    ],
  }),
  family("archivist", {
    group: "collection",
    cond: { c: "codex" },
    tiers: [
      { need: 30, shards: 30 },
      { need: 60, shards: 70, unlockId: "contractsL28", badge: "archivist" },
      { need: 120, shards: 150 },
    ],
  }),
  family("contractor", {
    group: "modes",
    cond: { c: "contractStars" },
    tiers: [
      { need: 15, shards: 30 },
      { need: 30, shards: 70 },
      { need: 42, shards: 150 },
    ],
  }),
  family("dailyRunner", {
    group: "modes",
    cond: { c: "lifetime", stat: "dailyRuns" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  }),
  family("driftDeep", {
    group: "modes",
    cond: { c: "lifetime", stat: "deepestDrift" },
    tiers: [
      { need: 25, shards: 30 },
      { need: 50, shards: 70 },
      { need: 100, shards: 150 },
    ],
  }),
];

export const SINGLE_ACHIEVEMENTS: readonly AchievementDef[] = [
  single("sectorFive", {
    group: "combat",
    cond: { c: "bossFirstKills", n: 5 },
    reward: { unlockId: "diceAchFirstClear", shards: 120 },
  }),
  single("flawless", {
    group: "combat",
    cond: { c: "runHullPct", n: 90 },
    reward: { shards: 70 },
  }),
  single("ascendant", {
    group: "combat",
    cond: { c: "clearAtAscension", n: 10 },
    reward: { shards: 250, badge: "ascendant" },
  }),
  single("quickWork", {
    group: "combat",
    cond: { c: "runStatAtMost", stat: "jumps", n: 11 },
    reward: { shards: 60 },
  }),
  single("beyondTheCore", {
    group: "combat",
    cond: { c: "lifetime", stat: "deepClears", n: 1 },
    reward: { unlockId: "diceS6", shards: 150 },
  }),
  single("frugal", {
    group: "economy",
    cond: { c: "runStatAtMost", stat: "scrapSpent", n: 0 },
    reward: { shards: 65 },
  }),
  single("anomalist", {
    group: "puzzles",
    cond: { c: "runPuzzles", n: 4 },
    reward: { shards: 55 },
  }),
  single("chainMara", {
    group: "story",
    cond: { c: "chainDone", id: "mara" },
    reward: { shards: 60 },
  }),
  single("chainYusuf", {
    group: "story",
    cond: { c: "chainDone", id: "yusuf" },
    reward: { shards: 60 },
  }),
  single("chainChoir", {
    group: "story",
    cond: { c: "chainDone", id: "choir" },
    reward: { shards: 60 },
  }),
  single("chainKeeper", {
    group: "story",
    cond: { c: "chainDone", id: "keeper" },
    reward: { shards: 60 },
  }),
  single("allChains", {
    group: "story",
    cond: { c: "chainsDone", n: 4 },
    reward: { shards: 200 },
  }),
  single("maraSquared", {
    group: "story",
    cond: { c: "flags", keys: ["maraDebt", "favorHeld"], mode: "all" },
    reward: { shards: 50 },
  }),
  single("keeperFriend", {
    group: "story",
    cond: { c: "flags", keys: ["keeperRepaid", "beaconRebuilt"], mode: "all" },
    reward: { shards: 50 },
  }),
  single("fleetKept", {
    group: "story",
    cond: { c: "flags", keys: ["fleetTruthKept"], mode: "any" },
    reward: { shards: 40 },
  }),
  single("apostate", {
    group: "story",
    cond: { c: "flags", keys: ["pactBroken", "choirBetrayed"], mode: "any" },
    reward: { shards: 40 },
  }),
  single("bothMirrors", {
    group: "story",
    cond: { c: "flags", keys: ["mirrorBound", "mirrorBroken"], mode: "all" },
    reward: { shards: 80 },
  }),
  single("coreTrilogy", {
    group: "story",
    cond: {
      c: "flags",
      keys: ["coreAnswered", "coreSilenced", "coreListened"],
      mode: "all",
    },
    reward: { shards: 150 },
  }),
  single("lighthouse", {
    group: "story",
    cond: { c: "flags", keys: ["lighthouseLit"], mode: "any" },
    reward: { shards: 45 },
  }),
  single("beaconkeeper", {
    group: "story",
    cond: { c: "runBeacons", n: 4 },
    reward: { shards: 100 },
  }),
  single("allEndings", {
    group: "story",
    cond: { c: "endings", n: 4 },
    reward: { shards: 200 },
  }),
  single("theAnswer", {
    group: "story",
    cond: { c: "endingReached", id: "answer" },
    reward: { unlockId: "skinThreshold", shards: 200, badge: "answer" },
  }),
  single("everyColour", {
    group: "collection",
    cond: { c: "collectionSchools", n: 7 },
    reward: { unlockId: "diceL22", shards: 60 },
  }),
  single("keystoneThree", {
    group: "modes",
    cond: { c: "keystones", n: 3 },
    reward: { unlockId: "skinChartwright", shards: 70, badge: "chartwright" },
  }),
  single("wandererClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsWanderer", n: 1 },
    reward: { shards: 60 },
  }),
  single("ramClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsRam", n: 1 },
    reward: { shards: 60 },
  }),
  single("arkClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsArk", n: 1 },
    reward: { shards: 60 },
  }),
  single("corsairClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsCorsair", n: 1 },
    reward: { shards: 60 },
  }),
  single("foundryClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsFoundry", n: 1 },
    reward: { shards: 60 },
  }),
  single("prismClear", {
    group: "modes",
    cond: { c: "lifetime", stat: "clearsPrism", n: 1 },
    reward: { shards: 60 },
  }),
  single("spectrumClear", {
    group: "modes",
    cond: { c: "runDeckSchools", n: 6 },
    reward: { shards: 90 },
  }),
];

export const ACHIEVEMENT_GROUPS: readonly AchievementGroup[] = [
  "combat",
  "economy",
  "puzzles",
  "story",
  "collection",
  "modes",
];

export type AchievementRow =
  | { kind: "family"; id: string; group: AchievementGroup; tiers: readonly AchievementDef[] }
  | { kind: "single"; id: string; group: AchievementGroup; def: AchievementDef };

const buildRows = (): AchievementRow[] => {
  const out: AchievementRow[] = [];
  for (const group of ACHIEVEMENT_GROUPS) {
    for (const family of ACHIEVEMENT_FAMILIES) {
      if (family.group !== group) continue;
      out.push({
        kind: "family",
        id: family.id,
        group,
        tiers: compileFamily(family),
      });
    }
    for (const single of SINGLE_ACHIEVEMENTS) {
      if (single.group !== group) continue;
      out.push({ kind: "single", id: single.id, group, def: single });
    }
  }
  return out;
};

export const ACHIEVEMENT_ROWS: readonly AchievementRow[] = buildRows();

export const ACHIEVEMENTS: readonly AchievementDef[] = ACHIEVEMENT_ROWS.flatMap(
  (row) => (row.kind === "family" ? row.tiers : [row.def]),
);

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((def) => [def.id, def]),
);

export const familyTiers = (familyId: string): readonly AchievementDef[] =>
  ACHIEVEMENTS.filter((def) => def.family === familyId);

export const ACHIEVEMENT_ALIASES: Readonly<Record<string, string>> = {
  firstBlood: "bounty-3",
  hunter: "bounty-6",
  eliteHunter: "eliteHunt-2",
  ironStreak: "deathless-2",
  scrapper: "scrapBaron-1",
  tycoon: "scrapBaron-2",
  cryptographer: "tierFive-3",
  tierFive: "tierFive-1",
  outfitter: "outfitter-1",
  puzzleBreadth: "puzzleBreadth-2",
  fiftyFound: "fiftyFound-2",
  archivist: "archivist-2",
  contractor: "contractor-2",
};

export const resolveAchievementId = (id: string): string =>
  ACHIEVEMENT_ALIASES[id] ?? id;

const ROMAN = ["I", "II", "III", "IV", "V", "VI"] as const;

export const tierNumeral = (tier: number): string =>
  ROMAN[tier - 1] ?? String(tier);
