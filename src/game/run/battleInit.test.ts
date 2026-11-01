import { beforeEach, describe, expect, it } from "vitest";
import { computeMutatorMods } from "@/data/mutators";
import type { EngravingMap } from "@/data/engravings";
import { chartSlotTierDelta } from "@/game/chart/engine";
import {
  battleInitFromRun,
  runSlotCap,
  runSlotStates,
  type RunBattleInit,
} from "@/game/run/battleInit";
import { cargoChargeCap, cargoSlotTier } from "@/game/run/cargo";
import { abandonRun, startEventBattle, startRun } from "@/game/run/flow";
import { setupForRun } from "@/game/run/modes";
import { runChargeCap } from "@/game/run/runMods";
import { useBattleStore } from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import {
  createInitialRunValues,
  useRunStore,
  type RunCargo,
  type RunValues,
} from "@/stores/runStore";
import type { SlotId } from "@/types/battle";

const legacyInit = (s: RunValues, engravings: EngravingMap): RunBattleInit => {
  const setup = setupForRun(s);
  const mut = computeMutatorMods(s.mutators);
  const slotTierDelta: Partial<Record<SlotId, number>> = {
    ...chartSlotTierDelta(s.chartPicks),
  };
  if (mut.sensorsTierDelta !== 0) {
    slotTierDelta.sensors = (slotTierDelta.sensors ?? 0) + mut.sensorsTierDelta;
  }
  for (const [slot, delta] of Object.entries(cargoSlotTier(s.cargo))) {
    const key = slot as SlotId;
    slotTierDelta[key] = (slotTierDelta[key] ?? 0) + delta;
  }
  const disabledSlots: SlotId[] = [
    ...(setup.sensorsDisabled === true ? (["sensors"] as SlotId[]) : []),
    ...(setup.shieldsDisabled === true
      ? (["shields", "shieldsB"] as SlotId[])
      : []),
  ];
  return {
    shipId: s.shipId,
    tide: s.tide,
    interference: s.interferenceStacks,
    perks: s.perks,
    chartPicks: s.chartPicks,
    mutators: s.mutators,
    modules: s.modules,
    officers: s.officers,
    echo: s.echo ?? undefined,
    engravings,
    flags: Object.keys(s.flags),
    runCounters: s.counters,
    hull: s.hull,
    hullMax: s.hullMax,
    runScrap: s.scrap,
    chargeCap: Math.max(
      1,
      runChargeCap(s.perks, s.chartPicks, s.modules, s.officers) +
        mut.chargeCapDelta +
        cargoChargeCap(s.cargo),
    ),
    rerollSizeBonus: s.rerollSizeRun,
    forcedTraits: setup.forcedTraits,
    slotTierDelta,
    disabledSlots,
  };
};

const cargo = (defId: string): RunCargo => ({
  defId,
  nodeId: "r3l0",
  sectorIndex: 1,
  takenRow: 0,
});

const STATES: readonly Partial<RunValues>[] = [
  {},
  {
    shipId: "ark",
    hull: 17,
    hullMax: 28,
    scrap: 44,
    tide: 2,
    interferenceStacks: 1,
    perks: ["coldFusion", "targeter"],
    chartPicks: ["blue-key1", "black-s2"],
    modules: ["capacitorBank", "hardpointClamp"],
    officers: ["defector", "welder"],
    echo: "reserve",
    flags: { hunterEngaged: true, choirMet: 1 },
    counters: { kills: 4 },
    rerollSizeRun: 1,
  },
  {
    shipId: "corsair",
    mutators: ["radioSilence", "overheat", "brittleShields"],
    cargo: [cargo("unstableCore"), cargo("leadBallast")],
    contractId: "blindJump",
  },
  {
    shipId: "ram",
    perks: ["ledgerTrick", "payloadShuffle"],
    modules: ["nonEuclidRack"],
    mutators: ["overheat"],
    contractId: "bareArmor",
    cargo: [cargo("overwoundCoils")],
  },
  { contractId: "singleCast", chartPicks: ["blue-key1"] },
];

const ENGRAVINGS: EngravingMap = { ember: ["sting"] };

const runOf = (over: Partial<RunValues>): RunValues => ({
  ...createInitialRunValues(),
  ...over,
});

describe("the battle init read from the run", () => {
  it("is what runBattleInit computed before it moved", () => {
    for (const over of STATES) {
      const run = runOf(over);
      expect(battleInitFromRun(run, ENGRAVINGS)).toEqual(
        legacyInit(run, ENGRAVINGS),
      );
    }
  });

  it("never lets the charge cap fall below one", () => {
    const run = runOf({
      perks: ["ledgerTrick", "payloadShuffle"],
      modules: ["nonEuclidRack"],
      mutators: ["overheat"],
    });
    expect(battleInitFromRun(run, {}).chargeCap).toBe(1);
  });

  it("gives the run's slot caps with the chart, mutator and cargo shrinks applied", () => {
    const run = runOf({
      shipId: "corsair",
      chartPicks: ["blue-key1"],
      mutators: ["radioSilence"],
      cargo: [cargo("unstableCore")],
      mkLevels: { reactor: 2, engines: 3 },
    });
    expect(runSlotCap(run, "engines")).toBe(8);
    expect(runSlotCap(run, "enginesB")).toBe(6);
    expect(runSlotCap(run, "sensors")).toBe(4);
    expect(runSlotCap(run, "reactor")).toBe(10);
    expect(runSlotCap(run, "weaponA")).toBe(8);
    expect(runSlotCap(run, "shields")).toBeNull();
  });

  it("takes a disabled slot off the board", () => {
    const run = runOf({ contractId: "blindJump" });
    expect(runSlotCap(run, "sensors")).toBeNull();
    expect(runSlotStates(run).weaponA?.cap).toBe(8);
  });
});

describe("the battle the run starts", () => {
  beforeEach(() => {
    abandonRun();
  });

  it("opens with the caps and charge cap the pure init reports", () => {
    for (const over of STATES.slice(1)) {
      startRun(7);
      const { position, map, seed } = useRunStore.getState();
      useRunStore.setState({ ...over, position, map, seed });
      startEventBattle({ enemyIds: ["raider"] });
      const run = useRunStore.getState();
      const init = battleInitFromRun(run, useMetaStore.getState().engravings);
      const battle = useBattleStore.getState();
      expect(battle.chargeCap).toBe(init.chargeCap);
      expect(battle.perks).toEqual(init.perks);
      expect(battle.modules).toEqual(init.modules);
      expect(battle.officers).toEqual(init.officers);
      const slots = runSlotStates(run);
      expect(Object.keys(battle.slots).sort()).toEqual(Object.keys(slots).sort());
      for (const slotId of Object.keys(slots) as SlotId[]) {
        expect(battle.slots[slotId]?.cap).toBe(runSlotCap(run, slotId));
      }
      abandonRun();
    }
  });
});
