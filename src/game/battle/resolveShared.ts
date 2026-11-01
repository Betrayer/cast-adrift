import { resonanceGrantActive } from "@/data/resonance";
import { computeMutatorMods, type MutatorMods } from "@/data/mutators";
import { aliveEnemies } from "@/game/battle/damage";
import { emit, type BattleCtx, type EffectSource } from "@/game/effects";
import { sourceTrait } from "@/game/run/runMods";
import type { BattleSnapshot } from "@/types/battle";

export const clone = (snapshot: BattleSnapshot): BattleSnapshot =>
  structuredClone(snapshot);

export const battleMutators = (snapshot: BattleSnapshot): MutatorMods =>
  computeMutatorMods(snapshot.mutators ?? []);

export const scaleDamage = (damage: number, multPct: number): number =>
  multPct === 0 ? damage : Math.round(damage * (1 + multPct / 100));

const guardLethal = (next: BattleSnapshot): void => {
  if (
    next.hull <= 0 &&
    !next.survivedLethal &&
    (resonanceGrantActive(next.resonance.counts, "surviveLethal") ||
      sourceTrait(next, "escapePod"))
  ) {
    next.hull = 1;
    next.survivedLethal = true;
  }
};

export const finalizeOutcome = (next: BattleSnapshot): void => {
  guardLethal(next);
  if (next.hull <= 0) {
    next.outcome = "defeat";
    return;
  }
  if (aliveEnemies(next).length === 0) next.outcome = "victory";
};

export const syncCtxFlags = (next: BattleSnapshot, ctx: BattleCtx): void => {
  if (ctx.flags.size === 0) return;
  next.flags = [...ctx.flags];
};

export const emitBattleEnd = (
  sources: readonly EffectSource[],
  ctx: BattleCtx,
  next: BattleSnapshot,
  overkill: number,
): void => {
  if (next.outcome === undefined) return;
  ctx.payload = {
    battleEnd: { outcome: next.outcome, turns: next.turn, overkill },
  };
  emit(sources, "battleEnd", ctx);
  ctx.payload = {};
};
