import { PERK_BY_ID } from "@/data/perks";
import { ptsForDie, sellValue } from "@/game/economy/prices";
import { grantDie, grantModule } from "@/game/run/inventory";
import { logConsequence } from "@/game/run/journal";
import {
  applySalvageFace,
  salvageStreamFor,
  SALVAGE_DECLINED,
} from "@/game/run/salvage";
import { computePerkMods } from "@/game/run/perkMods";
import {
  DRAFT_REROLL_COST,
  rollPerkChoices,
  skipScrapFor,
  type DraftContext,
} from "@/game/run/perkDraft";
import { autosaveRun } from "@/game/run/snapshot";
import { createStream, deriveSeed } from "@/services/rng";
import {
  useRunStore,
  withHullMaxDelta,
  type RunState,
} from "@/stores/runStore";

export const draftContext = (
  run: RunState,
  floor?: DraftContext["floor"],
): DraftContext => ({
  owned: run.perks,
  banished: run.banishedPerks,
  sector: run.sector,
  deckDefIds: run.deck.map((d) => d.defId),
  modules: run.modules,
  shipId: run.shipId,
  draftsSinceRare: run.draftsSinceRare,
  ...(floor === undefined ? {} : { floor }),
});

export const noteDraftOffer = (choices: readonly string[]): void => {
  if (choices.length === 0) return;
  useRunStore
    .getState()
    .noteDraftOffer(
      choices.some((id) => PERK_BY_ID.get(id)?.rarity === "rare"),
    );
};

export const applyPerkPick = (perkId: string): void => {
  useRunStore.getState().addPerk(perkId);
  const delta = computePerkMods([perkId]).hullMaxDelta;
  if (delta !== 0) useRunStore.setState((s) => withHullMaxDelta(s, delta));
};

export const resolveDieReward = (keep: boolean): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || pending.dieDrop === null) return;
  const dieId = pending.dieDrop;
  if (keep) grantDie(dieId);
  else run.addScrap(sellValue(ptsForDie(dieId)));
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieDrop: null });
  autosaveRun();
};

export const resolveSalvagePick = (faceId: string | null): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || (pending.salvage ?? []).length === 0) return;
  if (faceId === null) {
    logConsequence(SALVAGE_DECLINED);
  } else {
    if (!(pending.salvage ?? []).includes(faceId)) return;
    const nodeId = pending.draftNodeId ?? run.position ?? "salvage";
    if (!applySalvageFace(faceId, salvageStreamFor(run.seed, nodeId))) return;
  }
  useRunStore.getState().setPendingRewards({ ...pending, salvage: [] });
  autosaveRun();
};

export const resolveDieChoice = (dieId: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || (pending.dieChoices ?? []).length === 0) return;
  grantDie(dieId);
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieChoices: [], moduleChoices: [] });
  autosaveRun();
};

export const resolveModuleChoice = (moduleId: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null || (pending.moduleChoices ?? []).length === 0) return;
  grantModule(moduleId);
  useRunStore
    .getState()
    .setPendingRewards({ ...pending, dieChoices: [], moduleChoices: [] });
  autosaveRun();
};

export const resolvePerkChoice = (perkId: string | null): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null) return;
  if (perkId === null) {
    run.addScrap(skipScrapFor(run.sector));
  } else {
    applyPerkPick(perkId);
  }
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: [] });
  autosaveRun();
};

const redrawDraft = (label: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null) return;
  const nodeId = pending.draftNodeId ?? run.position ?? "draft";
  const stream = createStream(deriveSeed(run.seed, `${label}:${nodeId}`));
  const base = draftContext(run, pending.draftFloor);
  const choices = rollPerkChoices(stream, {
    ...base,
    owned: [...base.owned, ...pending.perkChoices],
  });
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: choices });
  noteDraftOffer(choices);
  autosaveRun();
};

export const banishPerkChoice = (perkId: string): void => {
  const run = useRunStore.getState();
  const pending = run.pendingRewards;
  if (pending === null) return;
  if (!pending.perkChoices.includes(perkId)) return;
  if (!run.banishPerk(perkId)) return;
  const after = useRunStore.getState();
  const kept = pending.perkChoices.filter((id) => id !== perkId);
  const nodeId = pending.draftNodeId ?? after.position ?? "draft";
  const base = draftContext(after, pending.draftFloor);
  const replacement = rollPerkChoices(
    createStream(deriveSeed(after.seed, `banish:${perkId}:${nodeId}`)),
    { ...base, owned: [...base.owned, ...kept] },
  ).slice(0, 1);
  const choices = [...kept, ...replacement];
  useRunStore.getState().setPendingRewards({ ...pending, perkChoices: choices });
  noteDraftOffer(replacement);
  autosaveRun();
};

export const rerollPerkDraft = (): void => {
  const run = useRunStore.getState();
  if (run.pendingRewards === null) return;
  if (run.draftRerollUsed) return;
  if (!run.spendScrap(DRAFT_REROLL_COST)) return;
  if (!useRunStore.getState().useDraftReroll()) return;
  redrawDraft("draftReroll");
};
