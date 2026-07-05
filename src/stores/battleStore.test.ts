import { beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";
import type { RolledDie } from "@/types/battle";

const start = (seed = 42) => {
  useBattleStore
    .getState()
    .startBattle({ enemyIds: ["raider"] }, STARTER_DECK, createStreams(seed));
};

beforeEach(() => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
});

describe("startBattle", () => {
  it("rolls 5 tray dice with values in tier range", () => {
    start();
    const { dice, phase, turn, hull, hullMax } = useBattleStore.getState();
    expect(phase).toBe("placement");
    expect(turn).toBe(1);
    expect(hull).toBe(30);
    expect(hullMax).toBe(30);
    expect(dice).toHaveLength(5);
    for (const die of dice) {
      expect(die.state).toBe("tray");
      expect(die.value).toBeGreaterThanOrEqual(1);
      expect(die.value).toBeLessThanOrEqual(die.tier);
    }
  });

  it("is deterministic for a given seed", () => {
    start(7);
    const first = useBattleStore.getState().dice.map((d) => d.value);
    start(7);
    const second = useBattleStore.getState().dice.map((d) => d.value);
    expect(second).toEqual(first);
  });

  it("builds Wanderer-v0 slots and the raider", () => {
    start();
    const { slots, enemies, targetId } = useBattleStore.getState();
    expect(slots.weaponA).toEqual({ cap: 8, mk: 1 });
    expect(slots.shields).toEqual({ cap: 8, mk: 1 });
    expect(slots.reactor).toEqual({ cap: 10, mk: 1 });
    expect(slots.engines).toBeUndefined();
    expect(enemies).toHaveLength(1);
    expect(enemies[0]).toMatchObject({
      defId: "raider",
      hp: 18,
      hpMax: 18,
      shield: 0,
      intentIndex: 0,
    });
    expect(targetId).toBe(enemies[0]?.id);
  });
});

describe("placeDie / unplaceDie", () => {
  it("flips die state and slot occupancy", () => {
    start();
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().placeDie(uid, "weaponA");
    let s = useBattleStore.getState();
    expect(s.dice.find((d) => d.uid === uid)).toMatchObject({
      state: "placed",
      slot: "weaponA",
    });
    expect(s.slots.weaponA?.dieUid).toBe(uid);

    useBattleStore.getState().unplaceDie(uid);
    s = useBattleStore.getState();
    expect(s.dice.find((d) => d.uid === uid)).toMatchObject({ state: "tray" });
    expect(s.dice.find((d) => d.uid === uid)?.slot).toBeUndefined();
    expect(s.slots.weaponA?.dieUid).toBeUndefined();
  });

  it("rejects an occupied slot", () => {
    start();
    const [a, b] = useBattleStore.getState().dice;
    useBattleStore.getState().placeDie(a?.uid ?? "", "weaponA");
    useBattleStore.getState().placeDie(b?.uid ?? "", "weaponA");
    const s = useBattleStore.getState();
    expect(s.slots.weaponA?.dieUid).toBe(a?.uid);
    expect(s.dice.find((d) => d.uid === b?.uid)?.state).toBe("tray");
  });

  it("rejects a die above the slot cap", () => {
    start();
    const big: RolledDie = {
      uid: "die-big",
      defId: "red-d6",
      tier: 12,
      school: "red",
      value: 9,
      state: "tray",
    };
    useBattleStore.setState((s) => ({ dice: [...s.dice, big] }));
    useBattleStore.getState().placeDie("die-big", "weaponA");
    const s = useBattleStore.getState();
    expect(s.slots.weaponA?.dieUid).toBeUndefined();
    expect(s.dice.find((d) => d.uid === "die-big")?.state).toBe("tray");
  });

  it("rejects placement outside the placement phase", () => {
    start();
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.setState({ phase: "ended" });
    useBattleStore.getState().placeDie(uid, "weaponA");
    expect(useBattleStore.getState().slots.weaponA?.dieUid).toBeUndefined();
  });

  it("supports place → unplace → re-place", () => {
    start();
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().placeDie(uid, "weaponA");
    useBattleStore.getState().unplaceDie(uid);
    useBattleStore.getState().placeDie(uid, "shields");
    const s = useBattleStore.getState();
    expect(s.slots.weaponA?.dieUid).toBeUndefined();
    expect(s.slots.shields?.dieUid).toBe(uid);
    expect(s.dice.find((d) => d.uid === uid)).toMatchObject({
      state: "placed",
      slot: "shields",
    });
  });
});

describe("endTurn", () => {
  it("with an empty board: dice burn, enemy acts, new roll arrives", () => {
    start();
    const before = useBattleStore.getState();
    useBattleStore.getState().endTurn();
    const s = useBattleStore.getState();
    expect(s.turn).toBe(2);
    expect(s.phase).toBe("placement");
    expect(s.hull).toBe(before.hull - 5);
    expect(s.shield).toBe(0);
    expect(s.enemies[0]?.intentIndex).toBe(1);
    expect(s.dice).toHaveLength(5);
    for (const die of s.dice) expect(die.state).toBe("tray");
    expect(s.beatSeq).toBe(1);
    expect(s.enemyBeats).toHaveLength(1);
  });

  it("kills the enemy and ends the battle with victory", () => {
    start();
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((e) => ({ ...e, hp: 2 })),
      dice: s.dice.map((d, i) => (i === 0 ? { ...d, value: 5 } : d)),
    }));
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().placeDie(uid, "weaponA");
    useBattleStore.getState().endTurn();
    const s = useBattleStore.getState();
    expect(s.phase).toBe("ended");
    expect(s.outcome).toBe("victory");
    expect(s.enemies[0]?.hp).toBe(0);
    expect(s.beats).toHaveLength(1);
    expect(s.hull).toBe(30);
  });

  it("loses when hull reaches 0", () => {
    start();
    useBattleStore.setState({ hull: 3 });
    useBattleStore.getState().endTurn();
    const s = useBattleStore.getState();
    expect(s.phase).toBe("ended");
    expect(s.outcome).toBe("defeat");
    expect(s.hull).toBe(0);
  });

  it("applies debugNextRoll to the next roll then clears it", () => {
    start();
    useBattleStore.setState({ debugNextRoll: [1, 2, 3, 4, 4] });
    useBattleStore.getState().endTurn();
    const s = useBattleStore.getState();
    expect(s.dice.map((d) => d.value)).toEqual([1, 2, 3, 4, 4]);
    expect(s.debugNextRoll).toBeNull();
  });

  it("does nothing outside the placement phase", () => {
    start();
    useBattleStore.setState({ phase: "ended" });
    const before = useBattleStore.getState().turn;
    useBattleStore.getState().endTurn();
    expect(useBattleStore.getState().turn).toBe(before);
  });
});
