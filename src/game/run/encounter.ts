import { sectorDef } from "@/data/sectors";
import type { RngStream } from "@/services/rng";
import type { NodeType } from "@/game/map/types";
import type { FlagValue } from "@/types/events";

const LIGHT_POOL: readonly string[] = ["scavDrone", "riftWasp", "choirZealot"];

const flagSet = (flags: Record<string, FlagValue>, key: string): boolean =>
  flags[key] !== undefined;

// Consequence hook (DESIGN §3): once the player carries the cursed-cargo bounty
// mark, the Bounty Huntress stalks the next elite until engaged.
export const shouldInjectBounty = (
  type: NodeType,
  flags: Record<string, FlagValue>,
): boolean =>
  type === "elite" &&
  flagSet(flags, "hunterMark") &&
  !flagSet(flags, "hunterEngaged");

export interface EncounterContext {
  sector?: number;
  flags?: Record<string, FlagValue>;
  usedMinibosses?: readonly string[];
}

export const pickMiniboss = (
  sector: number,
  rng: RngStream,
  used: readonly string[] = [],
): string => {
  const pool = sectorDef(sector).minibossPool;
  const fresh = pool.filter((id) => !used.includes(id));
  return rng.pick(fresh.length > 0 ? fresh : pool);
};

export const buildEncounterIds = (
  type: NodeType,
  rng: RngStream,
  ctx: EncounterContext = {},
): string[] => {
  const sector = ctx.sector ?? 1;
  const flags = ctx.flags ?? {};
  const def = sectorDef(sector);

  if (type === "boss") return [def.bossId];
  if (type === "miniboss") {
    return [pickMiniboss(sector, rng, ctx.usedMinibosses ?? [])];
  }
  if (type === "elite") {
    if (shouldInjectBounty(type, flags)) return ["bountyHuntress"];
    const ids = [rng.pick(def.elitePool)];
    if (rng.next() < 0.4) ids.push(rng.pick(LIGHT_POOL));
    return ids;
  }
  // Sector 1 is tutorialized (DESIGN §2): singles-dominant, one enemy at a time,
  // with the occasional curated pair as a step-up. Later sectors pair harder.
  const pairWeight = sector === 1 ? 1 : 2;
  const count = rng.weighted([
    [1, 4],
    [2, pairWeight],
  ]);
  if (count === 1) return [rng.weighted(def.enemyPool)];
  return [...rng.pick(def.pairPool)];
};

export const scaleHpForTide = (baseHp: number, tide: number): number =>
  Math.round(baseHp * (1 + 0.1 * Math.max(0, tide)));
