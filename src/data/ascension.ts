import type { LocKey } from "@/types/content";

export interface AscensionMods {
  enemyHpPct: number;
  eliteShield: number;
  shopPricePct: number;
  tideCapDelta: number;
  bossPhaseShift: boolean;
}

export interface AscensionDef {
  level: number;
  name: LocKey;
  desc: LocKey;
  mods: Partial<AscensionMods>;
}

export const MAX_ASCENSION = 5;

// A1–A5 exactly per DESIGN §13. Each level stacks on top of the ones below it.
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
];

export const ZERO_ASCENSION_MODS: AscensionMods = {
  enemyHpPct: 0,
  eliteShield: 0,
  shopPricePct: 0,
  tideCapDelta: 0,
  bossPhaseShift: false,
};

export const ascensionMods = (level: number): AscensionMods => {
  const out: AscensionMods = { ...ZERO_ASCENSION_MODS };
  for (const def of ASCENSIONS) {
    if (def.level > level) break;
    out.enemyHpPct += def.mods.enemyHpPct ?? 0;
    out.eliteShield += def.mods.eliteShield ?? 0;
    out.shopPricePct += def.mods.shopPricePct ?? 0;
    out.tideCapDelta += def.mods.tideCapDelta ?? 0;
    out.bossPhaseShift = out.bossPhaseShift || def.mods.bossPhaseShift === true;
  }
  return out;
};

export const maxSelectableAscension = (cleared: number): number =>
  Math.max(0, Math.min(MAX_ASCENSION, cleared));
