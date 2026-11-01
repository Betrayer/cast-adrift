import { A6_ELITE_SUBSYSTEM, ascensionMods } from "@/data/ascension";
import { ENEMY_BY_ID, expandEncounterIds } from "@/data/enemies";
import { REAL_SCHOOL_ORDER } from "@/data/schools";
import { scaleEnemyHp } from "@/game/run/encounter";
import type { RngStream } from "@/services/rng";
import type { BattleSnapshot, EnemyState } from "@/types/battle";
import type {
  EnemyDef,
  Intent,
  PatternStep,
  School,
  StepCond,
  SubsystemDef,
} from "@/types/content";

export const MAX_ENEMIES = 3;

export const phaseFloor = (ascension: number): number =>
  ascensionMods(ascension).bossPhaseShift ? 1 : 0;

export const phaseIndexForHp = (
  def: EnemyDef,
  hp: number,
  hpMax: number,
  ascension = 0,
): number => {
  const phases = def.phases;
  if (phases === undefined || phases.length === 0) return 0;
  const floor = Math.min(phaseFloor(ascension), phases.length - 1);
  const pct = hpMax > 0 ? (hp / hpMax) * 100 : 0;
  for (let i = floor; i < phases.length; i += 1) {
    const phase = phases[i];
    if (phase !== undefined && pct > phase.untilHpPct) return i;
  }
  return phases.length - 1;
};

const heaviestAttack = (pattern: readonly PatternStep[]): PatternStep | undefined => {
  let best: PatternStep | undefined;
  let bestN = -1;
  for (const step of pattern) {
    if ("pick" in step || "when" in step) continue;
    const n =
      step.t === "attack" ? step.n : step.t === "multi" ? step.n * step.k : -1;
    if (n > bestN) {
      bestN = n;
      best = step;
    }
  }
  return best;
};

export interface StepContext {
  selfHpPct: number;
  selfShield: number;
  playerShield: number;
  playerCharge: number;
  playerHullPct: number;
  allies: number;
  turn: number;
}

export const NEUTRAL_STEP_CONTEXT: StepContext = {
  selfHpPct: 100,
  selfShield: 0,
  playerShield: 0,
  playerCharge: 0,
  playerHullPct: 100,
  allies: 1,
  turn: 1,
};

export const stepContextFor = (
  snapshot: Pick<BattleSnapshot, "shield" | "charge" | "hull" | "hullMax" | "turn" | "enemies">,
  enemy: Pick<EnemyState, "hp" | "hpMax" | "shield">,
): StepContext => ({
  selfHpPct: enemy.hpMax > 0 ? (enemy.hp / enemy.hpMax) * 100 : 0,
  selfShield: enemy.shield,
  playerShield: snapshot.shield,
  playerCharge: snapshot.charge,
  playerHullPct:
    snapshot.hullMax > 0 ? (snapshot.hull / snapshot.hullMax) * 100 : 0,
  allies: snapshot.enemies.filter((e) => e.hp > 0).length,
  turn: snapshot.turn,
});

export const stepCondHolds = (cond: StepCond, ctx: StepContext): boolean => {
  switch (cond.c) {
    case "selfHpPctLt":
      return ctx.selfHpPct < cond.n;
    case "selfShielded":
      return ctx.selfShield > 0;
    case "playerShielded":
      return ctx.playerShield > 0;
    case "playerChargeAtLeast":
      return ctx.playerCharge >= cond.n;
    case "playerHullPctLt":
      return ctx.playerHullPct < cond.n;
    case "alliesAtLeast":
      return ctx.allies >= cond.n;
    case "turnGte":
      return ctx.turn >= cond.n;
  }
};

export const patternFor = (
  def: EnemyDef,
  phase: number,
  ascension = 0,
): PatternStep[] => {
  const script = def.phases?.[phase];
  const base = script?.pattern ?? def.pattern;
  if (def.boss !== true || !ascensionMods(ascension).bossPatternInsert) {
    return [...base];
  }
  const extra = heaviestAttack(base);
  return extra === undefined ? [...base] : [...base, extra];
};

export const everyTurnFor = (def: EnemyDef, phase: number): readonly Intent[] =>
  def.phases?.[phase]?.everyTurn ?? [];

const resolveStep = (
  step: PatternStep,
  enemyStream: RngStream,
  ctx: StepContext,
): Intent => {
  if ("pick" in step) return enemyStream.weighted(step.pick);
  if ("when" in step)
    return stepCondHolds(step.when, ctx) ? step.then : step.else;
  return step;
};

export const drawIntent = (
  def: EnemyDef,
  intentIndex: number,
  enemyStream: RngStream,
  phase = 0,
  ascension = 0,
  ctx: StepContext = NEUTRAL_STEP_CONTEXT,
): Intent => {
  const pattern = patternFor(def, phase, ascension);
  const step = pattern[intentIndex % pattern.length];
  if (step === undefined)
    throw new Error(`drawIntent: "${def.id}" empty pattern`);
  return resolveStep(step, enemyStream, ctx);
};

export const drawPartIntent = (
  part: SubsystemDef,
  intentIndex: number,
  enemyStream: RngStream,
  parentContext: StepContext = NEUTRAL_STEP_CONTEXT,
): Intent | undefined => {
  const pattern = part.intents ?? [];
  if (pattern.length === 0) return undefined;
  const step = pattern[intentIndex % pattern.length];
  if (step === undefined) return undefined;
  return resolveStep(step, enemyStream, parentContext);
};

export interface SpawnInit {
  tide?: number;
  sectorHpPct?: number;
  hpBonusPct?: number;
  eliteShield?: number;
  ascension?: number;
}

const isTough = (def: EnemyDef): boolean =>
  def.elite === true || def.miniboss === true || def.boss === true;

export const WARD_SCHOOLS: readonly School[] = REAL_SCHOOL_ORDER;

export const rotateWard = (current: School | undefined, stream: RngStream): School => {
  const options = WARD_SCHOOLS.filter((school) => school !== current);
  return stream.pick(options);
};

export const spawnEnemy = (
  defId: string,
  id: string,
  enemyStream: RngStream,
  init: SpawnInit = {},
): EnemyState => {
  const def = ENEMY_BY_ID.get(defId);
  if (def === undefined)
    throw new Error(`spawnEnemy: unknown enemy "${defId}"`);
  const scale = (base: number): number =>
    scaleEnemyHp(base, {
      tide: init.tide,
      sectorHpPct: init.sectorHpPct,
      hpBonusPct: init.hpBonusPct,
    });
  const hp = scale(def.hp);
  const ascension = init.ascension ?? 0;
  const phase = phaseIndexForHp(def, hp, hp, ascension);
  const subs = [
    ...(def.subsystems ?? []),
    ...(def.elite === true && ascensionMods(ascension).eliteSubsystem
      ? [A6_ELITE_SUBSYSTEM]
      : []),
  ];
  return {
    id,
    defId,
    hp,
    hpMax: hp,
    shield: isTough(def) ? (init.eliteShield ?? 0) : 0,
    intentIndex: 0,
    nextIntent: drawIntent(def, 0, enemyStream, phase, ascension),
    statuses: {},
    ...(def.ward === true ? { ward: rotateWard(undefined, enemyStream) } : {}),
    subsystems: subs.map((sub) => {
      const partIntent = drawPartIntent(sub, 0, enemyStream);
      return {
        id: `${id}:${sub.id}`,
        key: sub.id,
        hp: scale(sub.hp),
        hpMax: scale(sub.hp),
        aura: sub.aura,
        ...(partIntent === undefined
          ? {}
          : { intentIndex: 0, nextIntent: partIntent }),
      };
    }),
    phase,
  };
};

export const buildEnemies = (
  enemyIds: readonly string[],
  enemyStream: RngStream,
  init: SpawnInit = {},
): EnemyState[] =>
  expandEncounterIds(enemyIds)
    .slice(0, MAX_ENEMIES)
    .map((defId, index) =>
      spawnEnemy(defId, `enemy-${String(index)}`, enemyStream, init),
    );
