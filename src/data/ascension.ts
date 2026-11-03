import type { LocKey } from "@/types/content";

export interface AscensionMods {
  enemyHpPct: number;
  eliteShield: number;
  shopPricePct: number;
  tideCapDelta: number;
  bossPhaseShift: boolean;
  eliteSubsystem: boolean;
  bossPatternInsert: boolean;
  hullPct: number;
  tableDelta: number;
  bypassPctDelta: number;
  disintegrationPctDelta: number;
  hiddenIntents: number;
  sensorsMkCapDelta: number;
  bossExtraPart: boolean;
  gentleRidesUnmake: boolean;
}

export interface AscensionDef {
  level: number;
  name: LocKey;
  desc: LocKey;
  mods: Partial<AscensionMods>;
}

export const MAX_ASCENSION = 15;

export const ASCENSIONS: readonly AscensionDef[] = [
  {
    level: 1,
    name: "content:ascension.1.name",
    desc: "content:ascension.1.desc",
    mods: { enemyHpPct: 10 },
  },
  {
    level: 2,
    name: "content:ascension.2.name",
    desc: "content:ascension.2.desc",
    mods: { eliteShield: 6 },
  },
  {
    level: 3,
    name: "content:ascension.3.name",
    desc: "content:ascension.3.desc",
    mods: { shopPricePct: 20 },
  },
  {
    level: 4,
    name: "content:ascension.4.name",
    desc: "content:ascension.4.desc",
    mods: { tideCapDelta: 1 },
  },
  {
    level: 5,
    name: "content:ascension.5.name",
    desc: "content:ascension.5.desc",
    mods: { bossPhaseShift: true },
  },
  {
    level: 6,
    name: "content:ascension.6.name",
    desc: "content:ascension.6.desc",
    mods: { eliteSubsystem: true },
  },
  {
    level: 7,
    name: "content:ascension.7.name",
    desc: "content:ascension.7.desc",
    mods: { shopPricePct: 25 },
  },
  {
    level: 8,
    name: "content:ascension.8.name",
    desc: "content:ascension.8.desc",
    mods: { bossPatternInsert: true },
  },
  {
    level: 9,
    name: "content:ascension.9.name",
    desc: "content:ascension.9.desc",
    mods: { tideCapDelta: 1 },
  },
  {
    level: 10,
    name: "content:ascension.10.name",
    desc: "content:ascension.10.desc",
    mods: { hullPct: -15 },
  },
  {
    level: 11,
    name: "content:ascension.11.name",
    desc: "content:ascension.11.desc",
    mods: { tableDelta: -1 },
  },
  {
    level: 12,
    name: "content:ascension.12.name",
    desc: "content:ascension.12.desc",
    mods: { bypassPctDelta: 0.1, disintegrationPctDelta: 3 },
  },
  {
    level: 13,
    name: "content:ascension.13.name",
    desc: "content:ascension.13.desc",
    mods: { hiddenIntents: 1, sensorsMkCapDelta: -1 },
  },
  {
    level: 14,
    name: "content:ascension.14.name",
    desc: "content:ascension.14.desc",
    mods: { shopPricePct: 40, eliteShield: 6 },
  },
  {
    level: 15,
    name: "content:ascension.15.name",
    desc: "content:ascension.15.desc",
    mods: { bossExtraPart: true, tideCapDelta: -1, gentleRidesUnmake: true },
  },
];

export const ZERO_ASCENSION_MODS: AscensionMods = {
  enemyHpPct: 0,
  eliteShield: 0,
  shopPricePct: 0,
  tideCapDelta: 0,
  bossPhaseShift: false,
  eliteSubsystem: false,
  bossPatternInsert: false,
  hullPct: 0,
  tableDelta: 0,
  bypassPctDelta: 0,
  disintegrationPctDelta: 0,
  hiddenIntents: 0,
  sensorsMkCapDelta: 0,
  bossExtraPart: false,
  gentleRidesUnmake: false,
};

export const ascensionMods = (level: number): AscensionMods => {
  const out: AscensionMods = { ...ZERO_ASCENSION_MODS };
  for (const def of ASCENSIONS) {
    if (def.level > level) break;
    out.enemyHpPct += def.mods.enemyHpPct ?? 0;
    out.eliteShield += def.mods.eliteShield ?? 0;
    out.shopPricePct += def.mods.shopPricePct ?? 0;
    out.tideCapDelta += def.mods.tideCapDelta ?? 0;
    out.hullPct += def.mods.hullPct ?? 0;
    out.tableDelta += def.mods.tableDelta ?? 0;
    out.bypassPctDelta += def.mods.bypassPctDelta ?? 0;
    out.disintegrationPctDelta += def.mods.disintegrationPctDelta ?? 0;
    out.hiddenIntents += def.mods.hiddenIntents ?? 0;
    out.sensorsMkCapDelta += def.mods.sensorsMkCapDelta ?? 0;
    out.bossPhaseShift = out.bossPhaseShift || def.mods.bossPhaseShift === true;
    out.eliteSubsystem = out.eliteSubsystem || def.mods.eliteSubsystem === true;
    out.bossPatternInsert =
      out.bossPatternInsert || def.mods.bossPatternInsert === true;
    out.bossExtraPart = out.bossExtraPart || def.mods.bossExtraPart === true;
    out.gentleRidesUnmake =
      out.gentleRidesUnmake || def.mods.gentleRidesUnmake === true;
  }
  return out;
};

export const maxSelectableAscension = (cleared: number): number =>
  Math.max(0, Math.min(MAX_ASCENSION, cleared));

export const SCRAP_BONUS_FROM = 10;

export const SCRAP_BONUS_PCT_PER_LEVEL = 5;

export const ascensionScrapBonusPct = (level: number): number =>
  SCRAP_BONUS_PCT_PER_LEVEL * Math.max(0, Math.min(MAX_ASCENSION, level) - SCRAP_BONUS_FROM);

export const KEEPER_BADGE_ASCENSION = 10;

export type AscensionRewardKind = "shards" | "scrap" | "cosmetic" | "contract" | "badge";

export interface AscensionReward {
  level: number;
  kind: AscensionRewardKind;
  label: LocKey;
  unlockId?: string;
}

export const ASCENSION_REWARDS: readonly AscensionReward[] = [
  { level: 1, kind: "shards", label: "meta:ascension.reward.shards" },
  { level: 3, kind: "cosmetic", label: "meta:ascension.reward.skinAshen", unlockId: "skinAshen" },
  { level: 5, kind: "contract", label: "meta:ascension.reward.contract", unlockId: "contractsA5" },
  { level: 6, kind: "cosmetic", label: "meta:ascension.reward.skinVoidglass", unlockId: "skinVoidglass" },
  { level: 9, kind: "cosmetic", label: "meta:ascension.reward.skinEmberglass", unlockId: "skinEmberglass" },
  { level: 10, kind: "cosmetic", label: "meta:ascension.reward.prestigeTheme", unlockId: "prestigeTheme" },
  { level: 10, kind: "badge", label: "meta:ascension.reward.badge" },
  { level: 11, kind: "scrap", label: "meta:ascension.reward.scrapBonus" },
  { level: 11, kind: "cosmetic", label: "meta:ascension.reward.skinSingularity", unlockId: "skinSingularity" },
  { level: 12, kind: "contract", label: "meta:ascension.reward.contractA12", unlockId: "contractsA12" },
  { level: 13, kind: "cosmetic", label: "meta:ascension.reward.frameObsidian", unlockId: "frameObsidian" },
  { level: 15, kind: "cosmetic", label: "meta:ascension.reward.prestigeThemeTwo", unlockId: "prestigeThemeTwo" },
  { level: 15, kind: "badge", label: "meta:ascension.reward.badgeSingularity" },
];

export const ascensionRewardsUpTo = (level: number): AscensionReward[] =>
  ASCENSION_REWARDS.filter((reward) => reward.level <= level);

export const A6_ELITE_SUBSYSTEM = {
  id: "overclock",
  name: "content:enemies.subsystem.overclock",
  hp: 12,
  aura: "atk+2",
} as const;

export const A15_BOSS_PART = {
  id: "singularity",
  name: "content:enemies.subsystem.singularity",
  hp: 14,
  aura: "atk+2",
} as const;
