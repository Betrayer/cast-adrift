import { beforeEach, describe, expect, it } from "vitest";
import { computeMutatorMods, type MutatorMods } from "@/data/mutators";
import {
  NUDGE_COST,
  nudgeChargeCost,
  SURGE_COST,
} from "@/game/battle/resolver";
import { nudgeChargePrice } from "@/game/battle/view";
import { DROP_WEIGHTS, shiftWeights } from "@/game/economy/rewards";
import { scaleEnemyHp } from "@/game/run/encounter";
import { runChargeCap } from "@/game/run/runMods";
import {
  WEATHER,
  WEATHER_BY_ID,
  WEATHER_CHANCE_PCT,
  weatherPoolFor,
} from "@/data/weather";
import { SECTORS } from "@/data/sectors";
import {
  abandonRun,
  advanceSector,
  jumpTo,
  startRun,
  startRunMode,
} from "@/game/run/flow";
import { BASE_CHARGE_CAP } from "@/game/run/perkMods";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges } from "@/game/map/types";
import { jumpsPerTideFor } from "@/game/run/tide";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
} from "@/game/run/snapshot";
import {
  rollWeather,
  runModifiers,
  weatherIn,
  withoutWeather,
  withWeatherFor,
} from "@/game/run/weather";
import { useBattleStore } from "@/stores/battleStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";

const SEEDS = 4000;

const READ_SITES: Partial<
  Record<keyof MutatorMods, (mods: MutatorMods) => number>
> = {
  enemyHpPct: (mods) => scaleEnemyHp(200, { hpBonusPct: mods.enemyHpPct }),
  chargeCapDelta: (mods) => Math.max(1, runChargeCap([]) + mods.chargeCapDelta),
  nudgeCostDelta: (mods) => nudgeChargeCost(mods.nudgeCostDelta, false),
  fogRowDelta: (mods) => Math.max(1, 2 + mods.fogRowDelta),
  scrapMultPct: (mods) => Math.round(100 * (1 + mods.scrapMultPct / 100)),
  lootRarityStep: (mods) =>
    shiftWeights(DROP_WEIGHTS.elite, mods.lootRarityStep).legendary,
};

describe("weather roll", () => {
  it("is deterministic for a seed and sector", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      for (let sector = 2; sector <= SECTORS.length; sector += 1) {
        expect(rollWeather(seed, sector, sector)).toBe(
          rollWeather(seed, sector, sector),
        );
      }
    }
  });

  it("never fires in the first sector", () => {
    for (let seed = 1; seed <= SEEDS; seed += 1) {
      expect(rollWeather(seed, 1, 1)).toBeNull();
    }
  });

  it("fires on 60% of sectors from the second act on", () => {
    for (let sector = 2; sector <= SECTORS.length; sector += 1) {
      let fired = 0;
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        if (rollWeather(seed, sector, sector) !== null) fired += 1;
      }
      const pct = (fired / SEEDS) * 100;
      expect(Math.abs(pct - WEATHER_CHANCE_PCT)).toBeLessThan(3);
    }
  });

  it("only draws conditions the sector's pool names", () => {
    for (let sector = 2; sector <= SECTORS.length; sector += 1) {
      const allowed = new Set(weatherPoolFor(sector).map((e) => e.id));
      for (let seed = 1; seed <= 500; seed += 1) {
        const id = rollWeather(seed, sector, sector);
        if (id !== null) expect(allowed.has(id)).toBe(true);
      }
    }
  });

  it("draws off its own stream, leaving map seeds untouched", () => {
    const different = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      different.add(String(rollWeather(seed, 3, 3)));
    }
    expect(different.size).toBeGreaterThan(2);
  });
});

describe("weather as a scoped mutator", () => {
  it("carries a contract mutator alongside a weather id", () => {
    const mods = computeMutatorMods(["richVein", "debrisField"]);
    expect(mods.scrapMultPct).toBe(90);
    expect(mods.enemyHpPct).toBe(5);
  });

  it("resolves every condition's mods through computeMutatorMods", () => {
    for (const def of WEATHER) {
      const mods = computeMutatorMods([def.id]);
      for (const [key, value] of Object.entries(def.mods)) {
        expect(mods[key as keyof typeof mods]).toBe(value);
      }
    }
  });

  it("stays out of the daily/contract registry", () => {
    for (const def of WEATHER) {
      expect(computeMutatorMods([def.id])).not.toEqual(
        computeMutatorMods([]),
      );
    }
  });

  it("reaches the read site each condition names", () => {
    expect(computeMutatorMods(["nebula"]).fogRowDelta).toBe(-1);
    expect(computeMutatorMods(["nebula"]).scrapMultPct).toBe(20);
    expect(computeMutatorMods(["ionStorm"]).fogRowDelta).toBe(-1);
    expect(computeMutatorMods(["ionStorm"]).nudgeCostDelta).toBe(-1);
    expect(computeMutatorMods(["debrisField"]).scrapMultPct).toBe(40);
    expect(computeMutatorMods(["debrisField"]).enemyHpPct).toBe(5);
    expect(computeMutatorMods(["solarWind"]).chargeCapDelta).toBe(2);
    expect(computeMutatorMods(["solarWind"]).nudgeCostDelta).toBe(1);
    expect(computeMutatorMods(["magneticStorm"]).nudgeCostDelta).toBe(1);
    expect(computeMutatorMods(["magneticStorm"]).lootRarityStep).toBe(1);
    expect(computeMutatorMods(["radioBurst"]).fogRowDelta).toBe(1);
    expect(computeMutatorMods(["radioBurst"]).scrapMultPct).toBe(-20);
    expect(computeMutatorMods(["gravityRipple"]).enemyHpPct).toBe(-5);
    expect(computeMutatorMods(["gravityRipple"]).nudgeCostDelta).toBe(2);
    expect(computeMutatorMods(["stillWatch"]).chargeCapDelta).toBe(1);
    expect(computeMutatorMods(["stillWatch"]).scrapMultPct).toBe(15);
  });

  it("moves the number at the site that reads it, not only the mod", () => {
    const clear = computeMutatorMods([]);
    for (const def of WEATHER) {
      const mods = computeMutatorMods([def.id]);
      for (const [key, value] of Object.entries(def.mods)) {
        if (typeof value !== "number") continue;
        const probe = READ_SITES[key as keyof MutatorMods];
        expect(probe, `${def.id}: ${key} has no read-site probe`).toBeDefined();
        if (probe === undefined) continue;
        expect(
          Math.sign(probe(mods) - probe(clear)),
          `${def.id}: ${key} = ${String(value)} never reaches its read site`,
        ).toBe(Math.sign(value));
      }
    }
  });

  it("never prices an action out of the act", () => {
    for (const def of WEATHER) {
      const cap = runChargeCap([]) + computeMutatorMods([def.id]).chargeCapDelta;
      expect(
        cap,
        `${def.id}: a charge cap of ${String(cap)} deletes surge for the act`,
      ).toBeGreaterThanOrEqual(SURGE_COST);
    }
  });

  it("leaves the ladder's heavy knobs out of the roster", () => {
    for (const def of WEATHER) {
      expect(def.mods.shieldDecayPct).toBeUndefined();
      expect(def.mods.sensorsTierDelta).toBeUndefined();
      expect(def.mods.jumpsPerTideDelta).toBeUndefined();
      expect(def.mods.damageMultPct).toBeUndefined();
    }
    expect(jumpsPerTideFor(WEATHER.map((def) => def.id))).toBe(
      jumpsPerTideFor([]),
    );
  });

  it("replaces the previous condition instead of stacking", () => {
    const carried = withWeatherFor(["nebula", "richVein"], 7, 3, 3);
    expect(carried.filter((id) => WEATHER_BY_ID.has(id)).length).toBeLessThan(2);
    expect(carried).toContain("richVein");
    expect(withoutWeather(["nebula", "richVein"])).toEqual(["richVein"]);
  });

  it("lists weather and mutators together as live run modifiers", () => {
    const list = runModifiers(["richVein", "nebula", "nope"]);
    expect(list.map((m) => m.id)).toEqual(["richVein", "nebula"]);
    expect(list[1]?.weather).toBe(true);
    expect(list[0]?.weather).toBe(false);
  });
});

const seedWithWeather = (): number => {
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    if (rollWeather(seed, 2, 2) !== null) return seed;
  }
  throw new Error("no seed rolls weather in sector 2");
};

const seedWithoutWeather = (): number => {
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    if (rollWeather(seed, 2, 2) === null) return seed;
  }
  throw new Error("no seed rolls clear skies in sector 2");
};

describe("weather at the sector boundary", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    useNarrativeStore.getState().reset();
  });

  it("applies at sector entry and never in the first act", () => {
    const seed = seedWithWeather();
    startRun(seed, 0);
    expect(weatherIn(useRunStore.getState().mutators)).toBeNull();
    advanceSector();
    const applied = weatherIn(useRunStore.getState().mutators);
    expect(applied?.id).toBe(rollWeather(seed, 2, 2));
  });

  it("announces the condition through the consequence feed", () => {
    startRun(seedWithWeather(), 0);
    advanceSector();
    const weather = weatherIn(useRunStore.getState().mutators);
    expect(weather).not.toBeNull();
    const journal = useNarrativeStore.getState().journal;
    expect(
      journal.some(
        (entry) => entry.k === "consequence" && entry.origin === weather?.line,
      ),
    ).toBe(true);
  });

  it("clears the condition when the next act rolls clear skies", () => {
    startRun(seedWithWeather(), 0);
    advanceSector();
    expect(weatherIn(useRunStore.getState().mutators)).not.toBeNull();
    for (let sector = 3; sector <= SECTORS.length; sector += 1) {
      advanceSector();
      const run = useRunStore.getState();
      const rolled = rollWeather(run.seed, run.sectorIndex, run.sector);
      expect(weatherIn(run.mutators)?.id ?? null).toBe(rolled);
    }
  });

  it("leaves a clear-skies act with no condition at all", () => {
    startRun(seedWithoutWeather(), 0);
    advanceSector();
    expect(weatherIn(useRunStore.getState().mutators)).toBeNull();
    expect(runModifiers(useRunStore.getState().mutators)).toHaveLength(0);
  });

  it("keeps a contract's mutators across the boundary", () => {
    startRunMode({ mode: "contract", seed: 5, mutators: ["richVein"] });
    advanceSector();
    expect(useRunStore.getState().mutators).toEqual(["richVein"]);
  });

  it("survives a mid-sector resume", () => {
    startRun(seedWithWeather(), 0);
    advanceSector();
    const before = weatherIn(useRunStore.getState().mutators);
    expect(before).not.toBeNull();
    const snapshot = captureRunSnapshot();
    useRunStore.getState().reset();
    expect(weatherIn(useRunStore.getState().mutators)).toBeNull();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(weatherIn(useRunStore.getState().mutators)?.id).toBe(before?.id);
  });
});

describe("the fight reads the live condition, not the module constant", () => {
  beforeEach(() => {
    abandonRun();
    useNarrativeStore.getState().reset();
  });

  const enterBattleUnder = (mutators: readonly string[]): boolean => {
    for (let seed = 1; seed < 60; seed += 1) {
      abandonRun();
      startRun(seed);
      useRunStore.setState({ mutators: [...mutators] });
      const map = useRunStore.getState().map;
      if (map === null) continue;
      const node = outgoingEdges(map, START_NODE_ID)
        .map((id) => map.nodes.find((n) => n.id === id))
        .find((n) => n?.type === "battle");
      if (node === undefined) continue;
      return jumpTo(node.id);
    }
    return false;
  };

  it("hands the fight the condition's nudge price and leaves surge affordable", () => {
    expect(enterBattleUnder(["ionStorm"])).toBe(true);
    const board = useBattleStore.getState();
    expect(board.chargeCap).toBe(BASE_CHARGE_CAP);
    expect(board.chargeCap).toBeGreaterThanOrEqual(SURGE_COST);
    expect(nudgeChargePrice(board)).toBe(NUDGE_COST - 1);
  });

  it("raises both when the condition raises them", () => {
    expect(enterBattleUnder(["solarWind"])).toBe(true);
    const board = useBattleStore.getState();
    expect(board.chargeCap).toBe(BASE_CHARGE_CAP + 2);
    expect(nudgeChargePrice(board)).toBe(NUDGE_COST + 1);
  });

  it("leaves both at the base under clear skies", () => {
    expect(enterBattleUnder([])).toBe(true);
    const board = useBattleStore.getState();
    expect(board.chargeCap).toBe(BASE_CHARGE_CAP);
    expect(nudgeChargePrice(board)).toBe(NUDGE_COST);
  });
});
