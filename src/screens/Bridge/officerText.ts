import type { PerkMods } from "@/data/perks/types";
import type { LocKey } from "@/types/content";

export interface PassiveLine {
  field: keyof PerkMods;
  key: LocKey;
  n: number;
}

const PASSIVE_KEY: Partial<Record<keyof PerkMods, LocKey>> = {
  scrapMultPct: "run:bridge.passive.scrapMultPct",
  scrapPerKill: "run:bridge.passive.scrapPerKill",
  battleEndHeal: "run:bridge.passive.battleEndHeal",
  markBonusDelta: "run:bridge.passive.markBonusDelta",
  evasionDelta: "run:bridge.passive.evasionDelta",
  rerollSizeDelta: "run:bridge.passive.rerollSizeDelta",
};

export const passiveLabelFor = (field: keyof PerkMods): LocKey | undefined =>
  PASSIVE_KEY[field];

export const officerPassiveLines = (
  passive: Partial<PerkMods>,
): readonly PassiveLine[] =>
  (Object.keys(passive) as (keyof PerkMods)[]).flatMap((field) => {
    const key = PASSIVE_KEY[field];
    const n = passive[field];
    return key === undefined || n === undefined ? [] : [{ field, key, n }];
  });
