import { computeMutatorMods } from "@/data/mutators";
import type { EchoNodeId } from "@/data/echo";
import type { EngravingMap } from "@/data/engravings";
import type { PerkTrait } from "@/data/perks/types";
import type { ShipId } from "@/data/ships";
import { applySlotOverrides, buildShipSlots } from "@/game/battle/setup";
import { chartSlotTierDelta } from "@/game/chart/engine";
import { cargoChargeCap, cargoSlotTier } from "@/game/run/cargo";
import { setupForRun } from "@/game/run/modes";
import { runChargeCap } from "@/game/run/runMods";
import type { RunValues } from "@/stores/runStore";
import type { SlotId, SlotState } from "@/types/battle";
import type { DieTier } from "@/types/content";

export type RunInitSource = Pick<
  RunValues,
  | "shipId"
  | "tide"
  | "interferenceStacks"
  | "perks"
  | "chartPicks"
  | "mutators"
  | "modules"
  | "officers"
  | "echo"
  | "flags"
  | "counters"
  | "hull"
  | "hullMax"
  | "scrap"
  | "cargo"
  | "rerollSizeRun"
  | "contractId"
>;

export type RunSlotSource = Pick<
  RunValues,
  "shipId" | "mkLevels" | "chartPicks" | "mutators" | "cargo" | "contractId"
>;

export interface RunBattleInit {
  shipId: ShipId;
  tide: number;
  interference: number;
  perks: readonly string[];
  chartPicks: readonly string[];
  mutators: readonly string[];
  modules: readonly string[];
  officers: readonly string[];
  echo: EchoNodeId | undefined;
  engravings: EngravingMap;
  flags: readonly string[];
  runCounters: Readonly<Record<string, number>>;
  hull: number;
  hullMax: number;
  runScrap: number;
  chargeCap: number;
  rerollSizeBonus: number;
  forcedTraits: readonly PerkTrait[] | undefined;
  slotTierDelta: Partial<Record<SlotId, number>>;
  disabledSlots: SlotId[];
}

export const runSlotTierDelta = (
  run: Pick<RunValues, "chartPicks" | "mutators" | "cargo">,
): Partial<Record<SlotId, number>> => {
  const mut = computeMutatorMods(run.mutators);
  const slotTierDelta: Partial<Record<SlotId, number>> = {
    ...chartSlotTierDelta(run.chartPicks),
  };
  if (mut.sensorsTierDelta !== 0) {
    slotTierDelta.sensors =
      (slotTierDelta.sensors ?? 0) + mut.sensorsTierDelta;
  }
  for (const [slot, delta] of Object.entries(cargoSlotTier(run.cargo))) {
    const key = slot as SlotId;
    slotTierDelta[key] = (slotTierDelta[key] ?? 0) + delta;
  }
  return slotTierDelta;
};

export const runDisabledSlots = (
  run: Pick<RunValues, "contractId">,
): SlotId[] => {
  const setup = setupForRun(run);
  return [
    ...(setup.sensorsDisabled === true ? (["sensors"] as SlotId[]) : []),
    ...(setup.shieldsDisabled === true
      ? (["shields", "shieldsB"] as SlotId[])
      : []),
  ];
};

export const runBattleChargeCap = (
  run: Pick<RunValues, "perks" | "chartPicks" | "modules" | "officers" | "mutators" | "cargo">,
): number =>
  Math.max(
    1,
    runChargeCap(run.perks, run.chartPicks, run.modules, run.officers) +
      computeMutatorMods(run.mutators).chargeCapDelta +
      cargoChargeCap(run.cargo),
  );

export const battleInitFromRun = (
  run: RunInitSource,
  engravings: EngravingMap,
): RunBattleInit => ({
  shipId: run.shipId,
  tide: run.tide,
  interference: run.interferenceStacks,
  perks: run.perks,
  chartPicks: run.chartPicks,
  mutators: run.mutators,
  modules: run.modules,
  officers: run.officers,
  echo: run.echo ?? undefined,
  engravings,
  flags: Object.keys(run.flags),
  runCounters: run.counters,
  hull: run.hull,
  hullMax: run.hullMax,
  runScrap: run.scrap,
  chargeCap: runBattleChargeCap(run),
  rerollSizeBonus: run.rerollSizeRun,
  forcedTraits: setupForRun(run).forcedTraits,
  slotTierDelta: runSlotTierDelta(run),
  disabledSlots: runDisabledSlots(run),
});

export const runSlotStates = (
  run: RunSlotSource,
): Partial<Record<SlotId, SlotState>> =>
  applySlotOverrides(
    buildShipSlots(run.shipId, run.mkLevels),
    runSlotTierDelta(run),
    runDisabledSlots(run),
  );

export const runSlotCap = (
  run: RunSlotSource,
  slotId: SlotId,
): DieTier | null => runSlotStates(run)[slotId]?.cap ?? null;
