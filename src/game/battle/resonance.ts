import type {
  ResonanceCensus,
  ResonanceThreshold,
  RolledDie,
} from "@/types/battle";
import type { School } from "@/types/content";

export const SCHOOL_ORDER: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

const REAL_SCHOOLS: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
];

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
): ResonanceCensus => {
  const counts = zeroCounts();
  for (const die of dice) counts[die.school] += 1;

  const prismatic = counts.prismatic;
  if (prismatic > 0) {
    let best: School = REAL_SCHOOLS[0] ?? "red";
    for (const school of REAL_SCHOOLS) {
      if (counts[school] > counts[best]) best = school;
    }
    counts[best] += prismatic;
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
