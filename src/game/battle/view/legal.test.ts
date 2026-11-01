import { beforeEach, describe, expect, it } from "vitest";
import { FATE_DIE_ID } from "@/data/fate";
import { isTableSpent } from "@/game/battle/view";
import { createStreams } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";

const DECK = ["ember", "frostplate", "sprout", "grey-d4", "ashen", "coreshard"];

describe("the spent table", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, DECK, createStreams(42));
  });

  it("reads the table as spent only once no die is left on it", () => {
    const board = useBattleStore.getState();
    expect(isTableSpent(board)).toBe(false);
    const cleared = {
      ...board,
      dice: board.dice.map((die) =>
        die.state === "tray" ? { ...die, state: "placed" as const } : die,
      ),
    };
    expect(isTableSpent(cleared)).toBe(true);
    expect(isTableSpent({ ...cleared, phase: "resolving" })).toBe(false);
  });

  it("reads the table as spent while the Fate die still sits on it", () => {
    useBattleStore.getState().reset();
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, [...DECK, FATE_DIE_ID], createStreams(42));
    const board = useBattleStore.getState();
    expect(board.dice.some((die) => die.defId === FATE_DIE_ID && die.state === "tray")).toBe(true);
    expect(isTableSpent(board)).toBe(false);
    const cleared = {
      ...board,
      dice: board.dice.map((die) =>
        die.state === "tray" && die.defId !== FATE_DIE_ID
          ? { ...die, state: "placed" as const }
          : die,
      ),
    };
    expect(cleared.dice.some((die) => die.defId === FATE_DIE_ID && die.state === "tray")).toBe(true);
    expect(isTableSpent(cleared)).toBe(true);
  });
});
