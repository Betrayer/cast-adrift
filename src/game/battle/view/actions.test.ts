import { beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { consoleActions } from "@/game/battle/view/actions";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";

const board = () => useBattleStore.getState();

const seatDie = (value: number, growth?: number): string => {
  const uid = board().dice.find((d) => d.tier === 6)?.uid ?? "";
  useBattleStore.setState((s) => ({
    charge: 9,
    dice: s.dice.map((d) =>
      d.uid === uid
        ? { ...d, value, ...(growth === undefined ? {} : { growth }) }
        : d,
    ),
  }));
  useBattleStore.getState().selectDie(uid);
  return uid;
};

describe("the nudge console entries", () => {
  beforeEach(() => {
    useBattleStore.setState(useBattleStore.getInitialState(), true);
    useBattleStore.setState(createInitialBattleValues());
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, STARTER_DECK, createStreams(42));
  });

  it("blocks nudge up at the tier of an ungrown die", () => {
    seatDie(6);
    expect(consoleActions(board()).nudgePlus.block).toBe("atCeiling");
  });

  it("leaves nudge up open while growth holds the ceiling above the tier", () => {
    seatDie(8, 3);
    expect(consoleActions(board()).nudgePlus.block).toBeNull();
  });

  it("blocks nudge up once a grown die reaches tier plus growth", () => {
    seatDie(9, 3);
    expect(consoleActions(board()).nudgePlus.block).toBe("atCeiling");
  });
});
