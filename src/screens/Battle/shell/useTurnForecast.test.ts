import { beforeEach, describe, expect, it } from "vitest";
import { createStreams } from "@/services/rng";
import {
  forecastComputations,
  forecastDeps,
  forecastFrom,
  resetForecastCache,
} from "@/screens/Battle/shell/useTurnForecast";
import { useBattleStore } from "@/stores/battleStore";

const DECK = ["ember", "frostplate", "sprout", "grey-d4", "ashen", "coreshard"];

const startBattle = (): void => {
  useBattleStore.getState().reset();
  useBattleStore
    .getState()
    .startBattle({ enemyIds: ["raider"] }, DECK, createStreams(42));
};

const read = (): void => {
  const board = useBattleStore.getState();
  forecastFrom(forecastDeps(board), board);
};

describe("turn forecast memo", () => {
  beforeEach(() => {
    resetForecastCache();
    startBattle();
  });

  it("computes once and then serves the same board from the cache", () => {
    read();
    const after = forecastComputations();
    read();
    read();
    expect(forecastComputations()).toBe(after);
  });

  it("does not recompute when only the selection changes", () => {
    read();
    const before = forecastComputations();
    const die = useBattleStore.getState().dice.find((d) => d.state === "tray");
    expect(die).toBeDefined();
    if (die === undefined) return;
    useBattleStore.getState().selectDie(die.uid);
    read();
    expect(forecastComputations()).toBe(before);
  });

  it("recomputes exactly once per placement change", () => {
    read();
    const before = forecastComputations();
    const die = useBattleStore.getState().dice.find((d) => d.state === "tray");
    if (die === undefined) return;
    useBattleStore.getState().placeDie(die.uid, "weaponA");
    read();
    read();
    expect(forecastComputations()).toBe(before + 1);

    useBattleStore.getState().unplaceDie(die.uid);
    read();
    read();
    expect(forecastComputations()).toBe(before + 2);
  });

  it("shares one computation between the console line and the tablet strip", () => {
    const board = useBattleStore.getState();
    const consoleDeps = forecastDeps(board);
    const stripDeps = forecastDeps(board);
    expect(consoleDeps).not.toBe(stripDeps);
    resetForecastCache();
    forecastFrom(consoleDeps, board);
    forecastFrom(stripDeps, board);
    expect(forecastComputations()).toBe(1);
  });
});
