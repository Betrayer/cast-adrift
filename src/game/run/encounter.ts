import { ENEMY_BY_ID, expandEncounterIds } from "@/data/enemies";
import { sectorDef } from "@/data/sectors";
import { createStream, deriveSeed, type RngStream } from "@/services/rng";
import type { NodeType } from "@/game/map/types";
import { intentsOfStep } from "@/types/content";
import type { EnemyRole } from "@/types/content";
import type { FlagValue } from "@/types/events";

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
  seed?: number;
}

export type EncounterTemplate = readonly EnemyRole[];

export const TEMPLATES: readonly (readonly [EncounterTemplate, number])[] = [
  [["anchor", "harrier"], 2],
  [["bruiser", "support"], 2],
  [["harrier", "swarm"], 2],
  [["swarm", "swarm"], 3],
  [["bruiser", "harrier"], 1],
  [["support", "harrier"], 1],
  [["bruiser", "swarm"], 2],
  [["anchor", "support"], 2],
  [["swarm", "swarm", "swarm"], 1],
];

export const ESCORT_CHANCE = 0.4;
const ESCORT_ROLES: readonly EnemyRole[] = ["harrier", "swarm"];

export const pickMiniboss = (
  sector: number,
  rng: RngStream,
  used: readonly string[] = [],
): string => {
  const pool = sectorDef(sector).minibossPool;
  const fresh = pool.filter((id) => !used.includes(id));
  return rng.pick(fresh.length > 0 ? fresh : pool);
};

export const pickBoss = (sector: number, seed: number): string => {
  const pool = sectorDef(sector).bossPool;
  return createStream(deriveSeed(seed, `boss:${String(sector)}`)).pick(pool);
};

const poolForRole = (
  sector: number,
  role: EnemyRole,
): readonly (readonly [string, number])[] =>
  sectorDef(sector).enemyPool.filter(
    ([id]) => ENEMY_BY_ID.get(id)?.role === role,
  );

const drawRole = (sector: number, role: EnemyRole, rng: RngStream): string =>
  rng.weighted(poolForRole(sector, role));

export const templatesFor = (
  sector: number,
  size: number,
): readonly (readonly [EncounterTemplate, number])[] =>
  TEMPLATES.filter(
    ([roles]) =>
      roles.length === size &&
      roles.every((role) => poolForRole(sector, role).length > 0),
  );

export const enemyThreat = (defId: string): number => {
  const def = ENEMY_BY_ID.get(defId);
  if (def === undefined) return 0;
  const steps = [
    ...def.pattern,
    ...(def.phases ?? []).flatMap((phase) => phase.pattern),
  ];
  let worst = 0;
  for (const step of steps) {
    for (const intent of intentsOfStep(step)) {
      const n =
        intent.t === "attack"
          ? intent.n
          : intent.t === "multi"
            ? intent.n * intent.k
            : 0;
      worst = Math.max(worst, n);
    }
  }
  return worst;
};

export const encounterThreat = (ids: readonly string[]): number =>
  expandEncounterIds(ids).reduce((sum, id) => sum + enemyThreat(id), 0);

const trimToCap = (ids: readonly string[], cap: number): string[] => {
  const out = [...ids];
  while (out.length > 1 && encounterThreat(out) > cap) out.pop();
  return out;
};

export const composeEncounter = (
  sector: number,
  rng: RngStream,
): string[] => {
  const def = sectorDef(sector);
  const cap = def.encounter.threatCap;
  const sizes = def.encounter.sizeWeights;
  const size = rng.weighted(
    sizes.map((weight, index) => [index + 1, weight] as const),
  );
  if (size === 1) return [rng.weighted(def.enemyPool)];
  const templates = templatesFor(sector, size);
  const bespoke = size === 2 && def.pairPool.length > 0;
  const totalTemplateWeight = templates.reduce((sum, [, w]) => sum + w, 0);
  if (templates.length === 0 && !bespoke) return [rng.weighted(def.enemyPool)];
  const choice = rng.weighted([
    ["template", totalTemplateWeight],
    ["bespoke", bespoke ? def.encounter.bespokeWeight : 0],
  ] as const);
  if (choice === "bespoke" || templates.length === 0) {
    return trimToCap([...rng.pick(def.pairPool)], cap);
  }
  const roles = rng.weighted(templates);
  return trimToCap(
    roles.map((role) => drawRole(sector, role, rng)),
    cap,
  );
};

export const buildEncounterIds = (
  type: NodeType,
  rng: RngStream,
  ctx: EncounterContext = {},
): string[] => {
  const sector = ctx.sector ?? 1;
  const flags = ctx.flags ?? {};
  const def = sectorDef(sector);

  if (type === "boss") return [pickBoss(sector, ctx.seed ?? 0)];
  if (type === "miniboss") {
    return [pickMiniboss(sector, rng, ctx.usedMinibosses ?? [])];
  }
  if (type === "elite") {
    if (shouldInjectBounty(type, flags)) return ["bountyHuntress"];
    const ids = [rng.pick(def.elitePool)];
    const escorts = ESCORT_ROLES.filter(
      (role) => poolForRole(sector, role).length > 0,
    );
    if (rng.next() < ESCORT_CHANCE && escorts.length > 0) {
      ids.push(drawRole(sector, rng.pick(escorts), rng));
    }
    return ids;
  }
  return composeEncounter(sector, rng);
};

export interface EnemyScaleContext {
  sector?: number;
  pocket?: boolean;
}

export const sectorHpPct = (ctx: EnemyScaleContext = {}): number => {
  const scaling = sectorDef(ctx.sector ?? 1).scaling;
  return scaling.hpPct + (ctx.pocket === true ? scaling.pocketPct : 0);
};

export interface EnemyScale {
  tide?: number;
  sectorHpPct?: number;
  hpBonusPct?: number;
}

export const scaleEnemyHp = (baseHp: number, scale: EnemyScale = {}): number =>
  Math.max(
    1,
    Math.round(
      baseHp *
        (1 + 0.1 * Math.max(0, scale.tide ?? 0)) *
        (1 + Math.max(0, scale.sectorHpPct ?? 0) / 100) *
        (1 + Math.max(0, scale.hpBonusPct ?? 0) / 100),
    ),
  );
