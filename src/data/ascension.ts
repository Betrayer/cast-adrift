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
}

export interface AscensionDef {
  level: number;
  name: LocKey;
  desc: LocKey;
  mods: Partial<AscensionMods>;
}

export const MAX_ASCENSION = 10;

// A1–A10 per DESIGN §13. Each level stacks on top of the ones below it.
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
    out.bossPhaseShift = out.bossPhaseShift || def.mods.bossPhaseShift === true;
    out.eliteSubsystem = out.eliteSubsystem || def.mods.eliteSubsystem === true;
    out.bossPatternInsert =
      out.bossPatternInsert || def.mods.bossPatternInsert === true;
  }
  return out;
};

export const maxSelectableAscension = (cleared: number): number =>
  Math.max(0, Math.min(MAX_ASCENSION, cleared));

export type AscensionRewardKind = "shards" | "cosmetic" | "contract" | "badge";

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
];

export const ascensionRewardsUpTo = (level: number): AscensionReward[] =>
  ASCENSION_REWARDS.filter((reward) => reward.level <= level);

export const ascensionRewardsAt = (level: number): AscensionReward[] =>
  ASCENSION_REWARDS.filter((reward) => reward.level === level);

// A6 bolts one extra subsystem onto every elite; A8 inserts an extra pattern
// step into boss phases. Both are data shapes the resolver already understands.
export const A6_ELITE_SUBSYSTEM = {
  id: "overclock",
  name: "content:enemies.subsystem.overclock",
  hp: 12,
  aura: "atk+2",
} as const;
