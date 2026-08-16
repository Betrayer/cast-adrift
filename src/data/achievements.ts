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
  | { c: "flags"; keys: readonly string[]; mode: "all" | "any" };

export interface AchievementReward {
  shards?: number;
  unlockId?: string;
  badge?: string;
}

export interface AchievementDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  group: AchievementGroup;
  cond: AchievementCond;
  reward?: AchievementReward;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  {
    id: "firstBlood",
    name: "meta:ach.firstBlood.name",
    desc: "meta:ach.firstBlood.desc",
    group: "combat",
    cond: { c: "lifetime", stat: "kills", n: 25 },
    reward: { shards: 20 },
  },
  {
    id: "hunter",
    name: "meta:ach.hunter.name",
    desc: "meta:ach.hunter.desc",
    group: "combat",
    cond: { c: "lifetime", stat: "kills", n: 500 },
    reward: { shards: 90 },
  },
  {
    id: "eliteHunter",
    name: "meta:ach.eliteHunter.name",
    desc: "meta:ach.eliteHunter.desc",
    group: "combat",
    cond: { c: "lifetime", stat: "elites", n: 25 },
    reward: { unlockId: "contractsAchGauntlet", shards: 60 },
  },
  {
    id: "sectorFive",
    name: "meta:ach.sectorFive.name",
    desc: "meta:ach.sectorFive.desc",
    group: "combat",
    cond: { c: "bossFirstKills", n: 5 },
    reward: { unlockId: "diceAchFirstClear", shards: 120 },
  },
  {
    id: "ironStreak",
    name: "meta:ach.ironStreak.name",
    desc: "meta:ach.ironStreak.desc",
    group: "combat",
    cond: { c: "streak", n: 3 },
    reward: { unlockId: "diceAchSurvivor", shards: 80 },
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
    id: "scrapper",
    name: "meta:ach.scrapper.name",
    desc: "meta:ach.scrapper.desc",
    group: "economy",
    cond: { c: "lifetime", stat: "scrapEarned", n: 5000 },
    reward: { shards: 40 },
  },
  {
    id: "tycoon",
    name: "meta:ach.tycoon.name",
    desc: "meta:ach.tycoon.desc",
    group: "economy",
    cond: { c: "lifetime", stat: "scrapEarned", n: 25000 },
    reward: { shards: 140 },
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
    id: "outfitter",
    name: "meta:ach.outfitter.name",
    desc: "meta:ach.outfitter.desc",
    group: "economy",
    cond: { c: "collectionOwned", n: 30 },
    reward: { shards: 70 },
  },
  {
    id: "tierFive",
    name: "meta:ach.tierFive.name",
    desc: "meta:ach.tierFive.desc",
    group: "puzzles",
    cond: { c: "lifetime", stat: "t5Solved", n: 1 },
    reward: { unlockId: "diceAchPuzzler", shards: 60 },
  },
  {
    id: "cryptographer",
    name: "meta:ach.cryptographer.name",
    desc: "meta:ach.cryptographer.desc",
    group: "puzzles",
    cond: { c: "lifetime", stat: "t5Solved", n: 10 },
    reward: { unlockId: "diceL30", shards: 110 },
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
    id: "puzzleBreadth",
    name: "meta:ach.puzzleBreadth.name",
    desc: "meta:ach.puzzleBreadth.desc",
    group: "puzzles",
    cond: { c: "seenPuzzles", n: 30 },
    reward: { shards: 75 },
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
    id: "fiftyFound",
    name: "meta:ach.fiftyFound.name",
    desc: "meta:ach.fiftyFound.desc",
    group: "collection",
    cond: { c: "encountered", n: 50 },
    reward: { unlockId: "diceAchCollector", shards: 90 },
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
    id: "archivist",
    name: "meta:ach.archivist.name",
    desc: "meta:ach.archivist.desc",
    group: "collection",
    cond: { c: "codex", n: 60 },
    reward: { unlockId: "contractsL28", shards: 80, badge: "archivist" },
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
    id: "beyondTheCore",
    name: "meta:ach.beyondTheCore.name",
    desc: "meta:ach.beyondTheCore.desc",
    group: "combat",
    cond: { c: "lifetime", stat: "deepClears", n: 1 },
    reward: { unlockId: "diceS6", shards: 150 },
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
    id: "contractor",
    name: "meta:ach.contractor.name",
    desc: "meta:ach.contractor.desc",
    group: "modes",
    cond: { c: "contractStars", n: 30 },
    reward: { shards: 120 },
  },
];

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map((def) => [def.id, def]),
);

export const ACHIEVEMENT_GROUPS: readonly AchievementGroup[] = [
  "combat",
  "economy",
  "puzzles",
  "story",
  "collection",
  "modes",
];
