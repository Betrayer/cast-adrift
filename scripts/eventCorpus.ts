import { CONTRACTS, type ContractDef } from "../src/data/contracts";
import { SINGLE_ACHIEVEMENTS } from "../src/data/achievements";
import { SECTORS, sectorDef, sectorMotif } from "../src/data/sectors";
import { generateSectorMap } from "../src/game/map/generator";
import { BAND_DEPTHS, bandWindowOf } from "../src/game/map/holeBand";
import { mostElitesOnMap } from "../src/game/map/elitePath";
import { contractSectorOf, mapOptionsFor } from "../src/game/run/mapOptions";
import { createStreams } from "../src/services/rng";
import { MAX_EXTRA_ROWS } from "../src/game/map/wormhole";
import { allOutcomes, optionRequirements } from "../src/game/events/engine";
import type { EventDef, EventOption } from "../src/types/events";

export const OPTIONS_PER_EVENT_MIN = 3.2;

export const SINGLE_OUTCOME_CEILING = 408;

export const POOL_PER_QUOTA = 1.5;

export const DIALOGUE_LINES: readonly [number, number] = [2, 4];

export const SHARDS_PER_OUTCOME: readonly [number, number] = [5, 15];

export const CONTRACT_PROBE_SEEDS = 300;

export const CONTRACT_STAR_REACH_MIN = 1;

const CAMPAIGN_SECTORS = 5;

const outcomeCount = (option: EventOption): number => allOutcomes(option).length;

export interface CorpusStats {
  events: number;
  options: number;
  outcomes: number;
  singleOutcomeOptions: number;
  dialogueEvents: number;
  pools: readonly { sector: number; pool: number; need: number }[];
}

export const corpusStats = (
  events: readonly EventDef[],
  chainEventIds: ReadonlySet<string>,
): CorpusStats => ({
  events: events.length,
  options: events.reduce((n, e) => n + e.options.length, 0),
  outcomes: events.reduce(
    (n, e) => n + e.options.reduce((m, o) => m + outcomeCount(o), 0),
    0,
  ),
  singleOutcomeOptions: events.reduce(
    (n, e) => n + e.options.filter((o) => outcomeCount(o) < 2).length,
    0,
  ),
  dialogueEvents: events.filter((e) => (e.dialogue ?? []).length > 0).length,
  pools: SECTORS.map((def) => ({
    sector: def.id,
    pool: events.filter(
      (e) =>
        e.kind !== "beacon" &&
        !chainEventIds.has(e.id) &&
        (e.requires?.sector ?? []).includes(def.id),
    ).length,
    need: Math.ceil(POOL_PER_QUOTA * def.shape.quotas.events[1]),
  })),
});

export const purchasePrice = (option: EventOption): number => {
  const debits = allOutcomes(option).map((outcome) =>
    outcome.effects.reduce(
      (sum, effect) =>
        effect.k === "scrap" && effect.n < 0 ? sum - effect.n : sum,
      0,
    ),
  );
  if (debits.length === 0 || debits.some((debit) => debit <= 0)) return 0;
  return Math.max(...debits);
};

export const eventCorpusErrors = (
  events: readonly EventDef[],
  chainEventIds: ReadonlySet<string>,
): string[] => {
  const errors: string[] = [];
  const stats = corpusStats(events, chainEventIds);
  const average = stats.options / Math.max(1, stats.events);
  if (average < OPTIONS_PER_EVENT_MIN) {
    errors.push(
      `events: ${average.toFixed(2)} options per event, target ${String(OPTIONS_PER_EVENT_MIN)}`,
    );
  }
  if (stats.singleOutcomeOptions > SINGLE_OUTCOME_CEILING) {
    errors.push(
      `events: ${String(stats.singleOutcomeOptions)} options have a single outcome — every option added since revision 6 carries two or more (ceiling ${String(SINGLE_OUTCOME_CEILING)})`,
    );
  }
  for (const pool of stats.pools) {
    if (pool.pool < pool.need) {
      errors.push(
        `events: S${String(pool.sector)} draws from ${String(pool.pool)} eligible events, needs ${String(pool.need)} (${String(POOL_PER_QUOTA)} × its event quota)`,
      );
    }
  }
  for (const event of events) {
    if (!Number.isInteger(event.weight) || event.weight <= 0) {
      errors.push(`events: "${event.id}" weight must be a positive integer`);
    }
    const lines = event.dialogue ?? [];
    if (
      lines.length > 0 &&
      (lines.length < DIALOGUE_LINES[0] || lines.length > DIALOGUE_LINES[1])
    ) {
      errors.push(
        `events: "${event.id}" dialogue has ${String(lines.length)} lines, expected ${String(DIALOGUE_LINES[0])}–${String(DIALOGUE_LINES[1])}`,
      );
    }
    for (const option of event.options) {
      const where = `${event.id}.${option.id}`;
      if ((option.onPass?.length ?? 0) > 1 || (option.onFail?.length ?? 0) > 1) {
        errors.push(
          `events: "${where}" forks inside a check — a weighted fork belongs at the option level, where it is previewed`,
        );
      }
      for (const outcome of option.outcomes ?? []) {
        const weight = outcome.weight ?? 1;
        if (!Number.isInteger(weight) || weight <= 0) {
          errors.push(
            `events: "${where}" has an outcome weight of ${String(weight)} — weights are positive integers and every outcome is reachable`,
          );
        }
      }
      const price = purchasePrice(option);
      if (
        price > 0 &&
        !optionRequirements(option.requires).some(
          (req) => req.req === "scrap" && req.n >= price,
        )
      ) {
        errors.push(
          `events: "${where}" charges ${String(price)} scrap on every outcome and does not require it, so a short purse pays less than the price`,
        );
      }
      for (const outcome of allOutcomes(option)) {
        for (const effect of outcome.effects) {
          if (
            effect.k === "shards" &&
            (effect.n < SHARDS_PER_OUTCOME[0] || effect.n > SHARDS_PER_OUTCOME[1])
          ) {
            errors.push(
              `events: "${where}" grants ${String(effect.n)} shards, allowed ${String(SHARDS_PER_OUTCOME[0])}–${String(SHARDS_PER_OUTCOME[1])}`,
            );
          }
        }
      }
    }
  }
  return errors;
};

const hasBand = (sector: number): boolean =>
  sectorMotif(sector, "blackHoles") !== undefined;

export const sectorJumpFloor = (sector: number, rides: number): number => {
  const shape = sectorDef(sector).shape;
  if (!hasBand(sector)) return shape.bossRow;
  const extra = rides > 1 ? MAX_EXTRA_ROWS : 0;
  return shape.bossRow - BAND_DEPTHS[1] - extra;
};

export const campaignJumpFloor = (): number => {
  let floor = 0;
  let rides = 0;
  for (let sector = 1; sector <= CAMPAIGN_SECTORS; sector += 1) {
    floor += sectorJumpFloor(sector, rides);
    if (hasBand(sector)) rides += 1;
  }
  return floor;
};

export interface EliteStarReach {
  contract: string;
  sector: number;
  n: number;
  reached: number;
  seeds: number;
}

const eliteReachOf = (contract: ContractDef, n: number): EliteStarReach => {
  const sector = contractSectorOf(contract);
  const options = mapOptionsFor(contract.setup.mutators ?? [], "contract", contract);
  let reached = 0;
  for (let seed = 1; seed <= CONTRACT_PROBE_SEEDS; seed += 1) {
    if (mostElitesOnMap(generateSectorMap(createStreams(seed).map, sector, options)) >= n) reached += 1;
  }
  return { contract: contract.id, sector, n, reached, seeds: CONTRACT_PROBE_SEEDS };
};

export const eliteStarReach = (): EliteStarReach[] =>
  CONTRACTS.flatMap((contract) =>
    contract.goals.flatMap((goal) => (goal.g === "elitesAtLeast" ? [eliteReachOf(contract, goal.n)] : [])),
  );

export const contractFeasibilityErrors = (reach: readonly EliteStarReach[]): string[] => {
  const errors: string[] = [];
  for (const contract of CONTRACTS) {
    const sector = contractSectorOf(contract);
    const shape = sectorDef(sector).shape;
    for (const goal of contract.goals) {
      if (goal.g === "jumpsAtMost") {
        errors.push(
          `contracts: "${contract.id}" asks for at most ${String(goal.n)} jumps — a single-sector run's jumps are fixed by its map (a ride and a bypass skip the same band), so the star is either free or unreachable`,
        );
      }
      if (goal.g === "elitesAtLeast" && goal.n > shape.quotas.elites[1]) {
        errors.push(
          `contracts: "${contract.id}" asks for ${String(goal.n)} elites, sector ${String(sector)} places at most ${String(shape.quotas.elites[1])}`,
        );
      }
    }
  }
  for (const star of reach) {
    if (star.reached / star.seeds < CONTRACT_STAR_REACH_MIN) {
      errors.push(
        `contracts: "${star.contract}" asks for ${String(star.n)} elites, which one path through S${String(star.sector)} reaches on only ${String(star.reached)} of ${String(star.seeds)} maps (floor ${String(CONTRACT_STAR_REACH_MIN * 100)} %) — elites on the map are not elites on a path`,
      );
    }
  }
  const floor = campaignJumpFloor();
  for (const single of SINGLE_ACHIEVEMENTS) {
    const cond = single.cond;
    if (cond.c === "runStatAtMost" && cond.stat === "jumps" && cond.n < floor) {
      errors.push(
        `achievements: "${single.id}" asks for a campaign in ${String(cond.n)} jumps, the shortest possible is ${String(floor)}`,
      );
    }
  }
  for (const def of SECTORS) {
    if (!hasBand(def.id)) continue;
    const [lo, hi] = bandWindowOf(def.shape);
    if (hi - lo + 1 < BAND_DEPTHS[0]) {
      errors.push(
        `sectors: S${String(def.id)} band window ${String(lo)}–${String(hi)} cannot hold a ${String(BAND_DEPTHS[0])}-row band`,
      );
    }
  }
  return errors;
};
