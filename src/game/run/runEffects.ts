import { DIE_BY_ID } from "@/data/dice";
import { computeCensus } from "@/game/battle/resonance";
import { buildRunSources, emit, RunCtx } from "@/game/effects";
import type { Hook, HookPayload } from "@/game/effects";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore, type RunValues } from "@/stores/runStore";
import type { School } from "@/types/content";

const deckSchools = (
  deck: RunValues["deck"],
): readonly { school: School }[] =>
  deck.flatMap((die) => {
    const school = DIE_BY_ID.get(die.defId)?.school;
    return school === undefined ? [] : [{ school }];
  });

const commitDeltas = (ctx: RunCtx): void => {
  const { scrap, hull, flags, counters } = ctx.deltas;
  const run = useRunStore.getState();
  for (const [key, delta] of Object.entries(counters)) {
    if (delta !== 0) run.bumpCounter(key, delta);
  }
  if (scrap > 0) run.addScrap(scrap);
  else if (scrap < 0) run.spendScrap(Math.min(-scrap, run.scrap));
  if (hull !== 0) run.setHull(run.hull + hull);
  for (const key of flags) run.setFlag(key);
};

export const emitRunHook = (hook: Hook, payload: HookPayload = {}): RunCtx => {
  const s = useRunStore.getState();
  const loadout = {
    perks: s.perks,
    chartPicks: s.chartPicks,
    modules: s.modules,
    deckDefIds: s.deck.map((d) => d.defId),
    engravings: useMetaStore.getState().engravings,
  };
  const ctx = new RunCtx({
    hull: s.hull,
    hullMax: s.hullMax,
    tide: s.tide,
    interference: s.interferenceStacks,
    flagKeys: Object.keys(s.flags),
    counters: s.counters,
    resonance: computeCensus(deckSchools(s.deck)),
    loadout,
  });
  ctx.payload = payload;
  emit(buildRunSources(loadout), hook, ctx);
  commitDeltas(ctx);
  return ctx;
};
