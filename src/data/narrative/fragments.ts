import type { LocKey } from "@/types/content";
import type { FlagQuery, FlagValue } from "@/types/events";

export interface FragmentDef {
  id: string;
  sector: number;
  text: LocKey;
  requires?: FlagQuery;
}

// Jump fragments: one-line world facts shown on the sector interstitial, drawn
// unseen-first across runs (DESIGN §2.1). Twenty per sector, four of which only
// surface once the run has earned them.
export const FRAGMENTS_PER_SECTOR = 20;
export const GATED_PER_SECTOR = 4;

const fragment = (sector: number, index: number): FragmentDef => ({
  id: `f${String(sector)}-${String(index)}`,
  sector,
  text: `content:fragment.f${String(sector)}-${String(index)}`,
});

// The gated tail of each sector: the same slot ids, plus the state that has to
// hold before the line is true.
const GATES: Readonly<Record<number, readonly FlagQuery[]>> = {
  1: [
    { any: ["maraFriend", "maraGrudge"] },
    { any: ["crewSaved"] },
    { any: ["beacon1"] },
    { any: ["hunterEngaged", "boardPosted"] },
  ],
  2: [
    { any: ["yusufFriend", "yusufGrudge"] },
    { any: ["fleetTruthShared", "fleetTruthKept", "fleetTruthLost"] },
    { any: ["clanPaid", "clanSlighted"] },
    { any: ["beaconRebuilt", "beaconBroken"] },
  ],
  3: [
    { any: ["pactStep1", "refusedChoir"] },
    { any: ["mirrorSpoke", "mirrorBroken", "mirrorBound"] },
    { any: ["fleetAnswered"] },
    { any: ["ledgerSolved"] },
  ],
  4: [
    { any: ["pactSealed", "choirEnemy"] },
    { any: ["hereticsArmed"] },
    { any: ["keeperRepaid", "keeperSlighted"] },
    { any: ["fleetLaneOpen", "fleetLaneClosed"] },
  ],
  5: [
    { any: ["beacon4", "beacon5"] },
    { any: ["silentReady"] },
    { any: ["lighthouseLit"] },
    { any: ["hereticFleetLed", "preacherAnswered"] },
  ],
  6: [
    { any: ["hushHeard", "hushRefused"] },
    { any: ["fleetRemembered", "fleetSilenced"] },
    { any: ["thresholdHeard", "thresholdCommitted", "thresholdWalked"] },
    { any: ["remainderKept", "remainderReturned"] },
  ],
};

const sectorFragments = (sector: number): FragmentDef[] => {
  const gates = GATES[sector] ?? [];
  return Array.from({ length: FRAGMENTS_PER_SECTOR }, (_, i) => {
    const base = fragment(sector, i + 1);
    const gateIndex = i - (FRAGMENTS_PER_SECTOR - GATED_PER_SECTOR);
    const gate = gateIndex >= 0 ? gates[gateIndex] : undefined;
    return gate === undefined ? base : { ...base, requires: gate };
  });
};

export const FRAGMENTS: readonly FragmentDef[] = [1, 2, 3, 4, 5, 6].flatMap(
  sectorFragments,
);

export const GATED_FRAGMENTS: readonly FragmentDef[] = FRAGMENTS.filter(
  (f) => f.requires !== undefined,
);

const matches = (
  flags: Record<string, FlagValue>,
  query: FlagQuery | undefined,
): boolean => {
  if (query === undefined) return true;
  const has = (key: string): boolean => flags[key] !== undefined;
  if (query.all !== undefined && !query.all.every(has)) return false;
  if (query.any !== undefined && !query.any.some(has)) return false;
  if (query.not !== undefined && query.not.some(has)) return false;
  return true;
};

export const fragmentsForSector = (
  sector: number,
  flags: Record<string, FlagValue> = {},
): FragmentDef[] =>
  FRAGMENTS.filter((f) => f.sector === sector && matches(flags, f.requires));

// Unseen-first, for real: a line the profile has already read only comes back
// when the sector has nothing left to say.
export const pickFragment = (
  sector: number,
  flags: Record<string, FlagValue>,
  seen: readonly string[],
  pick: <T>(items: readonly T[]) => T,
): FragmentDef | null => {
  const pool = fragmentsForSector(sector, flags);
  if (pool.length === 0) return null;
  const seenSet = new Set(seen);
  const fresh = pool.filter((f) => !seenSet.has(f.id));
  return pick(fresh.length > 0 ? fresh : pool);
};
