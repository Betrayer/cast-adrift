import type { RngStream } from "@/services/rng";
import type { NodeType } from "@/game/map/types";

// Singles: uniform over the sector-1 roster. raider is a solo bruiser (Phase-3 notes:
// ~83% solo) and is NOT a pair member — brutal in pairs (raider+scavDrone ≈ 14%).
const SINGLE_POOL: readonly (readonly [string, number])[] = [
  ["scavDrone", 2],
  ["raider", 2],
  ["shieldWarden", 2],
  ["jammerCorvette", 2],
  ["leechSkiff", 2],
  ["choirZealot", 2],
  ["riftWasp", 2],
];

// Curated pairs (Phase-3 notes open risk #5: curate, don't sample the roster uniformly).
// Excludes raider and the near-impossible shieldWarden+riftWasp (0.3%). These land in the
// 45-65% pair band against the greedy bot.
const CURATED_PAIRS: readonly (readonly [string, string])[] = [
  ["choirZealot", "riftWasp"],
  ["jammerCorvette", "leechSkiff"],
  ["shieldWarden", "scavDrone"],
  ["scavDrone", "scavDrone"],
  ["leechSkiff", "riftWasp"],
  ["choirZealot", "scavDrone"],
];

const LIGHT_POOL: readonly string[] = ["scavDrone", "riftWasp", "choirZealot"];

export const buildEncounterIds = (
  type: NodeType,
  rng: RngStream,
): string[] => {
  if (type === "boss" || type === "miniboss") {
    return ["raiderAlpha"];
  }
  if (type === "elite") {
    const ids = ["raiderAlpha"];
    if (rng.next() < 0.4) ids.push(rng.pick(LIGHT_POOL));
    return ids;
  }
  // Sector 1 is tutorialized (DESIGN §2): singles-dominant, one enemy at a time, with
  // the occasional curated pair as a step-up. Enemy stats stay at the Phase-3 baseline.
  const count = rng.weighted([
    [1, 4],
    [2, 1],
  ]);
  if (count === 1) return [rng.weighted(SINGLE_POOL)];
  return [...rng.pick(CURATED_PAIRS)];
};

export const scaleHpForTide = (baseHp: number, tide: number): number =>
  Math.round(baseHp * (1 + 0.1 * Math.max(0, tide)));
