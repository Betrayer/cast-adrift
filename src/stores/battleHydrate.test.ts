import { beforeEach, describe, expect, it } from "vitest";
import { seatCount } from "@/game/battle/table";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  hydrateBattle,
  serializeBattle,
  useBattleStore,
} from "@/stores/battleStore";

const agedBlob = (hand: readonly string[]) => {
  useBattleStore.getState().startBattle({ enemyIds: ["raider"] }, [...hand], createStreams(11));
  const save = serializeBattle();
  if (save === null) throw new Error("serializeBattle: no live battle");
  return {
    ...save,
    values: {
      ...save.values,
      dice: save.values.dice.map((die) => {
        const legacy = { ...die };
        delete legacy.seat;
        return legacy;
      }),
    },
  };
};

describe("a v16 battle blob", () => {
  beforeEach(() => {
    useBattleStore.setState(useBattleStore.getInitialState(), true);
    useBattleStore.setState(createInitialBattleValues());
  });

  it("hydrates with its table seated in array order and its values kept", () => {
    const blob = agedBlob(["ember", "red-d6", "blue-d6", "grey-d4", "sprout"]);
    expect(blob.values.dice.every((die) => die.seat === undefined)).toBe(true);
    hydrateBattle(blob);
    const state = useBattleStore.getState();
    expect(state.dice.map((die) => die.seat)).toEqual([0, 1, 2, 3, 4]);
    expect(state.dice.map((die) => die.value)).toEqual(blob.values.dice.map((die) => die.value));
    expect(seatCount(state.dice)).toBe(7);
  });

  it("seats a whole old deck on the table rather than dropping any of it", () => {
    const hand = ["ember", "red-d6", "blue-d6", "grey-d4", "sprout", "red-d6", "blue-d6", "grey-d4", "ember"];
    const blob = agedBlob(hand);
    const onTable = blob.values.dice.map((die) => ({ ...die, state: "tray" as const }));
    hydrateBattle({ ...blob, values: { ...blob.values, dice: onTable } });
    const state = useBattleStore.getState();
    expect(state.dice.filter((die) => die.state === "tray")).toHaveLength(hand.length);
    expect(new Set(state.dice.map((die) => die.seat)).size).toBe(hand.length);
    expect(seatCount(state.dice)).toBe(hand.length);
  });
});