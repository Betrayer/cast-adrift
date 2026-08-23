import { LOOT_DICE } from "@/data/dice";
import { beaconsResolved } from "@/data/events/beacons";
import { chainViews, type ChainView } from "@/data/narrative/chains";
import type { EventOutcomeInfo } from "@/game/effects";
import { dieForRarity } from "@/game/economy/rewards";
import { settleAchievements } from "@/game/meta/achievements";
import { noteEventResolved } from "@/game/meta/counters";
import { DECK_CAP, ptsForDie, sellValue } from "@/game/economy/prices";
import { applyAxisDelta, logConsequence, logJournal } from "@/game/run/journal";
import { emitRunHook } from "@/game/run/runEffects";
import { playSfx } from "@/services/audio";
import type { RngStream } from "@/services/rng";
import { haptic } from "@/services/tma";
import { useMetaStore } from "@/stores/metaStore";
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
  const samePts = LOOT_DICE.filter((d) => d.pts === lowest.pts);
  const pool = samePts.length > 0 ? samePts : LOOT_DICE;
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
      applyAxisDelta(effect.n, "choice");
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

export const applyEventEffects = (
  effects: readonly EventEffect[],
  stream: RngStream,
): void => {
  for (const effect of effects) applyEffect(effect, stream);
};

const logChainProgress = (
  before: readonly ChainView[],
  after: readonly ChainView[],
): void => {
  for (const view of after) {
    const prior = before.find((v) => v.id === view.id);
    if (prior === undefined || view.step <= prior.step) continue;
    logJournal({
      k: "chain",
      chain: view.id,
      step: view.step,
      label: view.hint,
    });
  }
};

export const applyOutcome = (
  outcome: Outcome,
  stream: RngStream,
  info?: EventOutcomeInfo,
): ApplyResult => {
  const sector = useRunStore.getState().sector;
  const chainsBefore = chainViews(useRunStore.getState().flags, sector);
  applyEventEffects(outcome.effects, stream);
  if (outcome.codex !== undefined) {
    useMetaStore.getState().unlockCodex(outcome.codex);
  }
  if (info !== undefined) {
    noteEventResolved();
    logJournal({
      k: "choice",
      event: info.eventId,
      option: info.optionId,
      text: outcome.text,
      ...(outcome.consequence === undefined
        ? {}
        : { consequence: outcome.consequence }),
    });
    if (info.beacon === true) {
      logJournal({
        k: "beacon",
        event: info.eventId,
        resolved: beaconsResolved(useRunStore.getState().flags),
      });
    }
  }
  const chainsAfter = chainViews(useRunStore.getState().flags, sector);
  logChainProgress(chainsBefore, chainsAfter);
  const advanced = chainsAfter.some((view) => {
    const prior = chainsBefore.find((v) => v.id === view.id);
    return prior !== undefined && view.step > prior.step;
  });
  if (advanced) {
    const deepest = chainsAfter.reduce((most, view) => {
      const prior = chainsBefore.find((v) => v.id === view.id);
      return prior !== undefined && view.step > prior.step
        ? Math.max(most, view.step)
        : most;
    }, 1);
    playSfx("chainStep", { rate: 0.92 + deepest * 0.07 });
    haptic("chainStep");
    useMetaStore
      .getState()
      .archiveRunFlags(Object.keys(useRunStore.getState().flags));
    settleAchievements();
  }
  if (outcome.consequence !== undefined) logConsequence(outcome.consequence);
  emitRunHook("eventOutcome", info === undefined ? {} : { event: info });
  return { follow: outcome.follow ?? null };
};
