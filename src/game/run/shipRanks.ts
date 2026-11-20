import { SHIP_PERK_MK } from "@/data/perks/ship";
import { shipRankOf } from "@/data/shipRanks";
import { MK_TOP, nextMkFor } from "@/game/economy/prices";
import { noteMkTop } from "@/game/meta/counters";
import { applyPerkPick } from "@/game/run/rewardPicks";
import { runDisabledSlots } from "@/game/run/battleInit";
import { setupForRun } from "@/game/run/modes";
import {
  rollShipDraft,
  shipDraftRerollAllowed,
  shipDraftSize,
  type ShipDraftContext,
} from "@/game/run/shipRules";
import { autosaveRun } from "@/game/run/snapshot";
import { deriveSeed } from "@/services/rng";
import { useRunStore, type RunState } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";

const draftSeed = (rank: number, rerolls: number): number => {
  const run = useRunStore.getState();
  return deriveSeed(run.seed, `shipDraft:${String(rank)}:${String(rerolls)}`);
};

const draftContextOf = (run: RunState): ShipDraftContext => ({
  shipId: run.shipId,
  mkLevels: run.mkLevels,
  ascension: run.ascension,
  disabledSlots: runDisabledSlots(run),
});

const openDraft = (): void => {
  const run = useRunStore.getState();
  const claimed = shipRankOf(run.shipRankXp) - run.pendingRankUps;
  const cards = rollShipDraft(
    draftContextOf(run),
    run.perks,
    shipDraftSize(run.masteryRank),
    draftSeed(claimed + 1, 0),
  );
  useRunStore.setState({ pendingShipDraft: cards, shipDraftRerollUsed: false });
};

export const gainShipRankXp = (n: number): void => {
  const before = useRunStore.getState();
  if (n <= 0 || setupForRun(before).perksDisabled === true) return;
  const xp = before.shipRankXp + n;
  const gained = shipRankOf(xp) - shipRankOf(before.shipRankXp);
  useRunStore.setState({
    shipRankXp: xp,
    pendingRankUps: before.pendingRankUps + gained,
  });
  if (gained > 0 && before.pendingShipDraft.length === 0) openDraft();
};

const applyPerkExtras = (perkId: string): void => {
  const slot: SlotId | undefined = SHIP_PERK_MK[perkId];
  if (slot === undefined) return;
  const run = useRunStore.getState();
  if (nextMkFor(slot, run.mkLevels[slot] ?? 1, run.ascension) === null) return;
  run.bumpMk(slot);
  if ((useRunStore.getState().mkLevels[slot] ?? 1) >= MK_TOP) noteMkTop();
};

export const pickShipPerk = (perkId: string): void => {
  const run = useRunStore.getState();
  if (!run.pendingShipDraft.includes(perkId)) return;
  applyPerkPick(perkId);
  applyPerkExtras(perkId);
  const left = run.pendingRankUps - 1;
  useRunStore.setState({
    pendingShipDraft: [],
    pendingRankUps: Math.max(0, left),
    shipDraftRerollUsed: false,
  });
  if (left > 0) openDraft();
  autosaveRun();
};

export const rerollShipDraft = (): void => {
  const run = useRunStore.getState();
  if (
    run.pendingShipDraft.length === 0 ||
    run.shipDraftRerollUsed ||
    !shipDraftRerollAllowed(run.masteryRank)
  ) {
    return;
  }
  const rank = shipRankOf(run.shipRankXp) - run.pendingRankUps + 1;
  useRunStore.setState({
    pendingShipDraft: rollShipDraft(
      draftContextOf(run),
      [...run.perks, ...run.pendingShipDraft],
      shipDraftSize(run.masteryRank),
      draftSeed(rank, 1),
    ),
    shipDraftRerollUsed: true,
  });
  autosaveRun();
};
