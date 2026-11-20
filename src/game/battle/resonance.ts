import { REAL_SCHOOL_ORDER, SCHOOL_ORDER } from "@/data/schools";
import type {
  ResonanceCensus,
  ResonanceThreshold,
  RolledDie,
} from "@/types/battle";
import type { School } from "@/types/content";

export const RESONANCE_THRESHOLDS: readonly ResonanceThreshold[] = [2, 4, 6];

const zeroCounts = (): Record<School, number> => ({
  red: 0,
  blue: 0,
  green: 0,
  yellow: 0,
  black: 0,
  grey: 0,
  prismatic: 0,
});

export const computeCensus = (
  dice: readonly Pick<RolledDie, "school">[],
  prismaticMult = 1,
  leadBonus = 0,
): ResonanceCensus => {
  const counts = zeroCounts();
  for (const die of dice) counts[die.school] += 1;
  counts.prismatic *= prismaticMult;

  const prismatic = counts.prismatic;
  if (prismatic > 0 || leadBonus > 0) {
    let best: School = REAL_SCHOOL_ORDER[0] ?? "red";
    for (const school of REAL_SCHOOL_ORDER) {
      if (counts[school] > counts[best]) best = school;
    }
    counts[best] += prismatic + leadBonus;
  }

  return { counts };
};

export const resonanceAtLeast = (
  census: ResonanceCensus,
  school: School,
  n: ResonanceThreshold,
): boolean => census.counts[school] >= n;

export const activeThresholds = (
  census: ResonanceCensus,
  school: School,
): ResonanceThreshold[] =>
  RESONANCE_THRESHOLDS.filter((n) => census.counts[school] >= n);

export const nextThreshold = (count: number): ResonanceThreshold | null =>
  RESONANCE_THRESHOLDS.find((n) => count < n) ?? null;

export interface ResonanceBoardRow {
  school: School;
  deck: number;
  prism: boolean;
  placed: number;
  tray: number;
  reserved: number;
}

export const resonanceBoardRows = (
  dice: readonly Pick<RolledDie, "school" | "state">[],
  census: ResonanceCensus,
): ResonanceBoardRow[] => {
  const rows = SCHOOL_ORDER.map((school) => {
    const owned = dice.filter((d) => d.school === school);
    return {
      school,
      deck: census.counts[school],
      prism: census.counts[school] > owned.length,
      placed: owned.filter((d) => d.state === "placed").length,
      tray: owned.filter((d) => d.state === "tray").length,
      reserved: owned.filter((d) => d.state === "reserved").length,
    };
  });
  return rows.filter(
    (row) => row.deck > 0 || row.placed + row.tray + row.reserved > 0,
  );
};
