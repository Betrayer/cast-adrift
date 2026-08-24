import { ENEMY_BY_ID } from "@/data/enemies";
import { computeMutatorMods } from "@/data/mutators";
import { intentHits, resolvePlayerPhase } from "@/game/battle/resolver";
import { everyTurnFor } from "@/game/battle/setup";
import type {
  BattleOutcome,
  BattleSnapshot,
  EnemyState,
  EvasionState,
} from "@/types/battle";

export interface TurnForecast {
  outgoing: number;
  raw: number;
  incoming: number;
  toShield: number;
  toHull: number;
  shieldAfter: number;
  hullAfter: number;
  evasion: EvasionState | null;
  lethal: boolean;
  ends: BattleOutcome | null;
}

export const expectedHit = (
  raw: number,
  evasion: EvasionState | null,
): number => {
  if (evasion === null) return raw;
  const dodge = evasion.dodgePct / 100;
  const glance = evasion.glancingPct / 100;
  const full = Math.max(0, 1 - dodge - glance);
  return raw * full + Math.ceil(raw / 2) * glance;
};

export const enemyForecast = (snapshot: BattleSnapshot): TurnForecast => {
  const { next, beats } = resolvePlayerPhase(snapshot);
  const outgoing = beats
    .filter((b) => b.kind === "damage")
    .reduce((sum, b) => sum + b.amount, 0);
  if (next.outcome !== undefined) {
    return {
      outgoing,
      raw: 0,
      incoming: 0,
      toShield: 0,
      toHull: 0,
      shieldAfter: next.shield,
      hullAfter: next.hull,
      evasion: next.evasion,
      lethal: false,
      ends: next.outcome,
    };
  }

  const decayPct = computeMutatorMods(next.mutators ?? []).shieldDecayPct;
  let shield =
    decayPct > 0 && next.shield > 0
      ? Math.floor((next.shield * (100 - decayPct)) / 100)
      : next.shield;
  let incoming = 0;
  let rawTotal = 0;
  let toShield = 0;
  let toHull = 0;

  for (const enemy of next.enemies) {
    if (enemy.hp <= 0) continue;
    const def = ENEMY_BY_ID.get(enemy.defId);
    if (def === undefined) continue;
    for (const intent of [...everyTurnFor(def, enemy.phase), enemy.nextIntent]) {
      const raws = intentHits(next, enemy, intent);
      if (raws.length > 0) {
        delete enemy.statuses.charge;
        delete enemy.statuses.jam;
      }
      for (const raw of raws) {
        rawTotal += raw;
        const damage = expectedHit(raw, next.evasion);
        incoming += damage;
        const absorbed = Math.min(shield, damage);
        shield -= absorbed;
        toShield += absorbed;
        toHull += damage - absorbed;
      }
    }
  }

  return {
    outgoing,
    raw: rawTotal,
    incoming: Math.round(incoming),
    toShield: Math.round(toShield),
    toHull: Math.round(toHull),
    shieldAfter: Math.max(0, Math.round(shield)),
    hullAfter: Math.max(0, Math.round(next.hull - toHull)),
    evasion: next.evasion,
    lethal: toHull >= next.hull,
    ends: null,
  };
};

export interface Mitigation {
  raw: number;
  expected: number;
  shield: number;
  hull: number;
}

export const mitigationOf = (
  snapshot: BattleSnapshot,
  enemy: EnemyState,
): Mitigation => {
  const hits = intentHits(snapshot, enemy, enemy.nextIntent);
  const expected = hits.reduce(
    (sum, hit) => sum + expectedHit(hit, snapshot.evasion),
    0,
  );
  const absorbed = Math.min(snapshot.shield, expected);
  return {
    raw: hits.reduce((sum, hit) => sum + hit, 0),
    expected: Math.round(expected),
    shield: Math.round(absorbed),
    hull: Math.round(expected - absorbed),
  };
};
