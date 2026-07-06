import { DIE_ITEMS } from "@/data/dice";
import { dieForRarity } from "@/game/economy/rewards";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import type { RngStream } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import type { EventEffect, ForcedBattle, Outcome } from "@/types/events";

export const TIDE_CAP = 3;

export interface ApplyResult {
  follow: ForcedBattle | null;
}

const addScrapDelta = (n: number): void => {
  const run = useRunStore.getState();
  if (n >= 0) {
    run.addScrap(n);
  } else {
    run.spendScrap(Math.min(-n, run.scrap));
  }
};

const applyLoot = (
  die: string | undefined,
  rarity: string | undefined,
  stream: RngStream,
): void => {
  const run = useRunStore.getState();
  const defId =
    die ??
    (rarity !== undefined
      ? dieForRarity(stream, rarity as never)
      : dieForRarity(stream, "common"));
  if (run.deck.length < DECK_CAP) {
    run.addDie(defId);
  } else {
    run.addScrap(sellValue(ptsForDie(defId)));
  }
};

const applySwapLowest = (stream: RngStream): void => {
  const run = useRunStore.getState();
  if (run.deck.length === 0) return;
  const withPts = run.deck.map((d) => ({ uid: d.uid, pts: ptsForDie(d.defId) }));
  const lowest = withPts.reduce((a, b) => (b.pts < a.pts ? b : a));
  const samePts = DIE_ITEMS.filter((d) => d.pts === lowest.pts);
  const pool = samePts.length > 0 ? samePts : DIE_ITEMS;
  const replacement = stream.pick(pool).id;
  run.removeDie(lowest.uid);
  run.addDie(replacement);
};

const applyEffect = (effect: EventEffect, stream: RngStream): void => {
  const run = useRunStore.getState();
  switch (effect.k) {
    case "scrap":
      addScrapDelta(effect.n);
      return;
    case "hull":
      if (effect.n >= 0) run.healHull(effect.n);
      else run.setHull(run.hull + effect.n);
      return;
    case "hullMax": {
      const nextMax = Math.max(1, run.hullMax + effect.n);
      useRunStore.setState({
        hullMax: nextMax,
        hull: Math.min(
          nextMax,
          effect.n > 0 ? run.hull + effect.n : run.hull,
        ),
      });
      return;
    }
    case "tide":
      useRunStore.setState({
        tide: Math.max(0, Math.min(TIDE_CAP, run.tide + effect.n)),
      });
      return;
    case "axis":
      run.addAxis(effect.n);
      return;
    case "flag":
      run.setFlag(effect.key, effect.value ?? true);
      return;
    case "loot":
      applyLoot(effect.die, effect.rarity, stream);
      return;
    case "swapLowestDie":
      applySwapLowest(stream);
      return;
    case "battleMod":
      run.addBattleMod({
        kind: effect.mod,
        value: effect.n ?? (effect.mod === "startCharge" ? 2 : 1),
        battlesLeft: effect.battles ?? 1,
      });
      return;
    case "nodeMod":
      if (effect.mod === "revealRows") run.addBonusReveal(effect.n ?? 2);
      else if (effect.mod === "shipyardDiscount")
        run.addShipyardDiscount(effect.n ?? 30);
      else if (effect.mod === "endHeal") run.addBattleEndHeal(effect.n ?? 1);
      else run.addRerollSizeRun(effect.n ?? 1);
      return;
  }
};

export const applyOutcome = (
  outcome: Outcome,
  stream: RngStream,
): ApplyResult => {
  for (const effect of outcome.effects) applyEffect(effect, stream);
  if (outcome.codex !== undefined) {
    useMetaStore.getState().unlockCodex(outcome.codex);
  }
  if (outcome.consequence !== undefined) {
    useNarrativeStore.getState().pushConsequence(outcome.consequence);
  }
  return { follow: outcome.follow ?? null };
};
