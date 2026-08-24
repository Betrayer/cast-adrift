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

export const ACHIEVEMENT_FAMILIES: readonly AchievementFamilyDef[] = [
  {
    id: "bounty",
    group: "combat",
    name: "meta:ach.bounty.name",
    desc: "meta:ach.bounty.desc",
    cond: { c: "lifetime", stat: "kills" },
    tiers: [
      { need: 5, shards: 15 },
      { need: 10, shards: 25 },
      { need: 25, shards: 40 },
      { need: 50, shards: 70 },
      { need: 100, shards: 120 },
      {
        need: 500,
        shards: 220,
        voucher: "perkDraft",
        altShards: LEGENDARY_ALT_SHARDS,
        legendary: true,
      },
    ],
  },
  {
    id: "eliteHunt",
    group: "combat",
    name: "meta:ach.eliteHunt.name",
    desc: "meta:ach.eliteHunt.desc",
    cond: { c: "lifetime", stat: "elites" },
    tiers: [
      { need: 5, shards: 30 },
      { need: 25, shards: 70, unlockId: "contractsAchGauntlet" },
      { need: 100, shards: 150 },
    ],
  },
  {
    id: "deathless",
    group: "combat",
    name: "meta:ach.deathless.name",
    desc: "meta:ach.deathless.desc",
    cond: { c: "streak" },
    tiers: [
      { need: 1, shards: 25 },
      { need: 3, shards: 55, unlockId: "diceAchSurvivor" },
      { need: 5, shards: 100 },
      {
        need: 10,
        shards: 180,
        voucher: "perkDraft",
        altShards: LEGENDARY_ALT_SHARDS,
        legendary: true,
      },
    ],
  },
  {
    id: "flawlessBoss",
    group: "combat",
    name: "meta:ach.flawlessBoss.name",
    desc: "meta:ach.flawlessBoss.desc",
    cond: { c: "lifetime", stat: "flawlessBosses" },
    tiers: [
      { need: 1, shards: 40 },
      { need: 5, shards: 110 },
    ],
  },
  {
    id: "resonant",
    group: "combat",
    name: "meta:ach.resonant.name",
    desc: "meta:ach.resonant.desc",
    cond: { c: "lifetime", stat: "resonance6" },
    tiers: [
      { need: 1, shards: 30 },
      { need: 10, shards: 70 },
      { need: 50, shards: 150 },
    ],
  },
  {
    id: "voidRider",
    group: "combat",
    name: "meta:ach.voidRider.name",
    desc: "meta:ach.voidRider.desc",
    cond: { c: "lifetime", stat: "wormholeRides" },
    tiers: [
      { need: 1, shards: 30 },
      { need: 10, shards: 70 },
      { need: 50, shards: 150 },
    ],
  },
  {
    id: "rimRunner",
    group: "combat",
    name: "meta:ach.rimRunner.name",
    desc: "meta:ach.rimRunner.desc",
    cond: { c: "lifetime", stat: "holesBypassed" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  },
  {
    id: "scrapBaron",
    group: "economy",
    name: "meta:ach.scrapBaron.name",
    desc: "meta:ach.scrapBaron.desc",
    cond: { c: "lifetime", stat: "scrapEarned" },
    tiers: [
      { need: 5000, shards: 30 },
      { need: 25000, shards: 70 },
      { need: 100000, shards: 150 },
    ],
  },
  {
    id: "machinist",
    group: "economy",
    name: "meta:ach.machinist.name",
    desc: "meta:ach.machinist.desc",
    cond: { c: "lifetime", stat: "fusions" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  },
  {
    id: "engraver",
    group: "economy",
    name: "meta:ach.engraver.name",
    desc: "meta:ach.engraver.desc",
    cond: { c: "lifetime", stat: "engravingsFitted" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  },
  {
    id: "refit",
    group: "economy",
    name: "meta:ach.refit.name",
    desc: "meta:ach.refit.desc",
    cond: { c: "lifetime", stat: "mk3Built" },
    tiers: [
      { need: 1, shards: 40 },
      { need: 10, shards: 110 },
    ],
  },
  {
    id: "outfitter",
    group: "economy",
    name: "meta:ach.outfitter.name",
    desc: "meta:ach.outfitter.desc",
    cond: { c: "collectionOwned" },
    tiers: [
      { need: 30, shards: 30 },
      { need: 60, shards: 70 },
      { need: 94, shards: 150 },
    ],
  },
  {
    id: "tierFive",
    group: "puzzles",
    name: "meta:ach.tierFive.name",
    desc: "meta:ach.tierFive.desc",
    cond: { c: "lifetime", stat: "t5Solved" },
    tiers: [
      { need: 1, shards: 25, unlockId: "diceAchPuzzler" },
      { need: 5, shards: 55 },
      { need: 10, shards: 100, unlockId: "diceL30" },
      {
        need: 25,
        shards: 180,
        voucher: "perkDraft",
        altShards: LEGENDARY_ALT_SHARDS,
        legendary: true,
      },
    ],
  },
  {
    id: "puzzleBreadth",
    group: "puzzles",
    name: "meta:ach.puzzleBreadth.name",
    desc: "meta:ach.puzzleBreadth.desc",
    cond: { c: "seenPuzzles" },
    tiers: [
      { need: 10, shards: 30 },
      { need: 25, shards: 70 },
      { need: 40, shards: 150 },
    ],
  },
  {
    id: "eventful",
    group: "story",
    name: "meta:ach.eventful.name",
    desc: "meta:ach.eventful.desc",
    cond: { c: "lifetime", stat: "eventsResolved" },
    tiers: [
      { need: 25, shards: 30 },
      { need: 100, shards: 70 },
      { need: 400, shards: 150 },
    ],
  },
  {
    id: "gambler",
    group: "story",
    name: "meta:ach.gambler.name",
    desc: "meta:ach.gambler.desc",
    cond: { c: "lifetime", stat: "checksWon" },
    tiers: [
      { need: 10, shards: 40 },
      { need: 50, shards: 110 },
    ],
  },
  {
    id: "fiftyFound",
    group: "collection",
    name: "meta:ach.fiftyFound.name",
    desc: "meta:ach.fiftyFound.desc",
    cond: { c: "encountered" },
    tiers: [
      { need: 25, shards: 25 },
      { need: 50, shards: 55, unlockId: "diceAchCollector" },
      { need: 75, shards: 100 },
      {
        need: 94,
        shards: 180,
        voucher: "perkDraft",
        altShards: LEGENDARY_ALT_SHARDS,
        legendary: true,
      },
    ],
  },
  {
    id: "archivist",
    group: "collection",
    name: "meta:ach.archivist.name",
    desc: "meta:ach.archivist.desc",
    cond: { c: "codex" },
    tiers: [
      { need: 30, shards: 30 },
      { need: 60, shards: 70, unlockId: "contractsL28", badge: "archivist" },
      { need: 120, shards: 150 },
    ],
  },
  {
    id: "contractor",
    group: "modes",
    name: "meta:ach.contractor.name",
    desc: "meta:ach.contractor.desc",
    cond: { c: "contractStars" },
    tiers: [
      { need: 15, shards: 30 },
      { need: 30, shards: 70 },
      { need: 42, shards: 150 },
    ],
  },
  {
    id: "dailyRunner",
    group: "modes",
    name: "meta:ach.dailyRunner.name",
    desc: "meta:ach.dailyRunner.desc",
    cond: { c: "lifetime", stat: "dailyRuns" },
    tiers: [
      { need: 5, shards: 40 },
      { need: 25, shards: 110 },
    ],
  },
  {
    id: "driftDeep",
    group: "modes",
    name: "meta:ach.driftDeep.name",
    desc: "meta:ach.driftDeep.desc",
    cond: { c: "lifetime", stat: "deepestDrift" },
    tiers: [
      { need: 25, shards: 30 },
      { need: 50, shards: 70 },
      { need: 100, shards: 150 },
    ],
  },
];

export const SINGLE_ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "sectorFive",
    name: "meta:ach.sectorFive.name",
    desc: "meta:ach.sectorFive.desc",
    group: "combat",
    cond: { c: "bossFirstKills", n: 5 },
    reward: { unlockId: "diceAchFirstClear", shards: 120 },
  },
  {
    id: "flawless",
    name: "meta:ach.flawless.name",
    desc: "meta:ach.flawless.desc",
    group: "combat",
    cond: { c: "runHullPct", n: 90 },
    reward: { shards: 70 },
  },
  {
    id: "ascendant",
    name: "meta:ach.ascendant.name",
    desc: "meta:ach.ascendant.desc",
    group: "combat",
    cond: { c: "clearAtAscension", n: 10 },
    reward: { shards: 250, badge: "ascendant" },
  },
  {
    id: "quickWork",
    name: "meta:ach.quickWork.name",
    desc: "meta:ach.quickWork.desc",
    group: "combat",
    cond: { c: "runStatAtMost", stat: "jumps", n: 11 },
    reward: { shards: 60 },
  },
  {
    id: "beyondTheCore",
    name: "meta:ach.beyondTheCore.name",
    desc: "meta:ach.beyondTheCore.desc",
    group: "combat",
    cond: { c: "lifetime", stat: "deepClears", n: 1 },
    reward: { unlockId: "diceS6", shards: 150 },
  },
  {
    id: "frugal",
    name: "meta:ach.frugal.name",
    desc: "meta:ach.frugal.desc",
    group: "economy",
    cond: { c: "runStatAtMost", stat: "scrapSpent", n: 0 },
    reward: { shards: 65 },
  },
  {
    id: "anomalist",
    name: "meta:ach.anomalist.name",
    desc: "meta:ach.anomalist.desc",
    group: "puzzles",
    cond: { c: "runPuzzles", n: 4 },
    reward: { shards: 55 },
  },
  {
    id: "chainMara",
    name: "meta:ach.chainMara.name",
    desc: "meta:ach.chainMara.desc",
    group: "story",
    cond: { c: "chainDone", id: "mara" },
    reward: { shards: 60 },
  },
  {
    id: "chainYusuf",
    name: "meta:ach.chainYusuf.name",
    desc: "meta:ach.chainYusuf.desc",
    group: "story",
    cond: { c: "chainDone", id: "yusuf" },
    reward: { shards: 60 },
  },
  {
    id: "chainChoir",
    name: "meta:ach.chainChoir.name",
    desc: "meta:ach.chainChoir.desc",
    group: "story",
    cond: { c: "chainDone", id: "choir" },
    reward: { shards: 60 },
  },
  {
    id: "chainKeeper",
    name: "meta:ach.chainKeeper.name",
    desc: "meta:ach.chainKeeper.desc",
    group: "story",
    cond: { c: "chainDone", id: "keeper" },
    reward: { shards: 60 },
  },
  {
    id: "allChains",
    name: "meta:ach.allChains.name",
    desc: "meta:ach.allChains.desc",
    group: "story",
    cond: { c: "chainsDone", n: 4 },
    reward: { shards: 200 },
  },
  {
    id: "maraSquared",
    name: "meta:ach.maraSquared.name",
    desc: "meta:ach.maraSquared.desc",
    group: "story",
    cond: { c: "flags", keys: ["maraDebt", "favorHeld"], mode: "all" },
    reward: { shards: 50 },
  },
  {
    id: "keeperFriend",
    name: "meta:ach.keeperFriend.name",
    desc: "meta:ach.keeperFriend.desc",
    group: "story",
    cond: { c: "flags", keys: ["keeperRepaid", "beaconRebuilt"], mode: "all" },
    reward: { shards: 50 },
  },
  {
    id: "fleetKept",
    name: "meta:ach.fleetKept.name",
    desc: "meta:ach.fleetKept.desc",
    group: "story",
    cond: { c: "flags", keys: ["fleetTruthKept"], mode: "any" },
    reward: { shards: 40 },
  },
  {
    id: "apostate",
    name: "meta:ach.apostate.name",
    desc: "meta:ach.apostate.desc",
    group: "story",
    cond: { c: "flags", keys: ["pactBroken", "choirBetrayed"], mode: "any" },
    reward: { shards: 40 },
  },
  {
    id: "bothMirrors",
    name: "meta:ach.bothMirrors.name",
    desc: "meta:ach.bothMirrors.desc",
    group: "story",
    cond: { c: "flags", keys: ["mirrorBound", "mirrorBroken"], mode: "all" },
    reward: { shards: 80 },
  },
  {
    id: "coreTrilogy",
    name: "meta:ach.coreTrilogy.name",
    desc: "meta:ach.coreTrilogy.desc",
    group: "story",
    cond: {
      c: "flags",
      keys: ["coreAnswered", "coreSilenced", "coreListened"],
      mode: "all",
    },
    reward: { shards: 150 },
  },
  {
    id: "lighthouse",
    name: "meta:ach.lighthouse.name",
    desc: "meta:ach.lighthouse.desc",
    group: "story",
    cond: { c: "flags", keys: ["lighthouseLit"], mode: "any" },
    reward: { shards: 45 },
  },
  {
    id: "beaconkeeper",
    name: "meta:ach.beaconkeeper.name",
    desc: "meta:ach.beaconkeeper.desc",
    group: "story",
    cond: { c: "runBeacons", n: 4 },
    reward: { shards: 100 },
  },
  {
    id: "allEndings",
    name: "meta:ach.allEndings.name",
    desc: "meta:ach.allEndings.desc",
    group: "story",
    cond: { c: "endings", n: 4 },
    reward: { shards: 200 },
  },
  {
    id: "theAnswer",
    name: "meta:ach.theAnswer.name",
    desc: "meta:ach.theAnswer.desc",
    group: "story",
    cond: { c: "endingReached", id: "answer" },
    reward: { unlockId: "skinThreshold", shards: 200, badge: "answer" },
  },
  {
    id: "everyColour",
    name: "meta:ach.everyColour.name",
    desc: "meta:ach.everyColour.desc",
    group: "collection",
    cond: { c: "collectionSchools", n: 7 },
    reward: { unlockId: "diceL22", shards: 60 },
  },
  {
    id: "keystoneThree",
    name: "meta:ach.keystoneThree.name",
    desc: "meta:ach.keystoneThree.desc",
    group: "modes",
    cond: { c: "keystones", n: 3 },
    reward: { unlockId: "skinChartwright", shards: 70, badge: "chartwright" },
  },
  {
    id: "wandererClear",
    name: "meta:ach.wandererClear.name",
    desc: "meta:ach.wandererClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsWanderer", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "ramClear",
    name: "meta:ach.ramClear.name",
    desc: "meta:ach.ramClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsRam", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "arkClear",
    name: "meta:ach.arkClear.name",
    desc: "meta:ach.arkClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsArk", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "corsairClear",
    name: "meta:ach.corsairClear.name",
    desc: "meta:ach.corsairClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsCorsair", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "foundryClear",
    name: "meta:ach.foundryClear.name",
    desc: "meta:ach.foundryClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsFoundry", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "prismClear",
    name: "meta:ach.prismClear.name",
    desc: "meta:ach.prismClear.desc",
    group: "modes",
    cond: { c: "lifetime", stat: "clearsPrism", n: 1 },
    reward: { shards: 60 },
  },
  {
    id: "spectrumClear",
    name: "meta:ach.spectrumClear.name",
    desc: "meta:ach.spectrumClear.desc",
    group: "modes",
    cond: { c: "runDeckSchools", n: 6 },
    reward: { shards: 90 },
  },
];

export const ACHIEVEMENT_GROUPS: readonly AchievementGroup[] = [
  "combat",
  "economy",
  "puzzles",
  "story",
  "collection",
  "modes",
];

const buildCatalogue = (): AchievementDef[] => {
  const out: AchievementDef[] = [];
  for (const group of ACHIEVEMENT_GROUPS) {
    for (const family of ACHIEVEMENT_FAMILIES) {
      if (family.group === group) out.push(...compileFamily(family));
    }
    for (const single of SINGLE_ACHIEVEMENTS) {
      if (single.group === group) out.push(single);
    }
  }
  return out;
};

export const ACHIEVEMENTS: readonly AchievementDef[] = buildCatalogue();

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((def) => [def.id, def]),
);

export const familyTiers = (familyId: string): readonly AchievementDef[] =>
  ACHIEVEMENTS.filter((def) => def.family === familyId);

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
        tiers: familyTiers(family.id),
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
