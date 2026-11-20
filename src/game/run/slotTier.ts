import { cargoSlotTierDelta, type CargoDef } from "@/data/cargo";
import { computeMutatorMods } from "@/data/mutators";
import { shipPerkSlotTierDelta } from "@/data/perks/ship";
import { chartSlotTierDelta } from "@/game/chart/engine";
import type { SlotId } from "@/types/battle";

export interface SlotTierSources {
  chartPicks: readonly string[];
  perks: readonly string[];
  mutators: readonly string[];
  cargoDefs: readonly CargoDef[];
}

type SlotSteps = Partial<Record<SlotId, number>>;

const addSteps = (into: SlotSteps, steps: SlotSteps): void => {
  for (const [slot, delta] of Object.entries(steps) as [SlotId, number][]) {
    into[slot] = (into[slot] ?? 0) + delta;
  }
};

export const slotTierDeltaFrom = (sources: SlotTierSources): SlotSteps => {
  const out: SlotSteps = {};
  addSteps(out, chartSlotTierDelta(sources.chartPicks));
  addSteps(out, shipPerkSlotTierDelta(sources.perks));
  const sensors = computeMutatorMods(sources.mutators).sensorsTierDelta;
  if (sensors !== 0) addSteps(out, { sensors });
  for (const def of sources.cargoDefs) addSteps(out, cargoSlotTierDelta(def));
  return out;
};
