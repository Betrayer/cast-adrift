import { describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { harnessDie, harnessSnap, place } from "@/game/battle/battleHarness";
import { advanceTurn, resolvePlayerPhase } from "@/game/battle/resolver";
import { canPlaceDie, exceedCapGrantFor } from "@/game/battle/setup";
import { BattleCtx } from "@/game/effects/context";
import { applyActions } from "@/game/effects/evaluate";
import { injectEffectSource } from "@/game/effects/pipeline";
import { createStreams } from "@/services/rng";
import {
  battleSnapshot,
  hydrateBattle,
  serializeBattle,
  useBattleStore,
} from "@/stores/battleStore";
import type { Action } from "@/game/effects/types";
import type { BattleSnapshot } from "@/types/battle";

const run = (snap: BattleSnapshot, actions: Action[], subjectUid?: string) => {
  const ctx = new BattleCtx(snap, snap.flags);
  const subject =
    subjectUid === undefined
      ? null
      : (snap.dice.find((d) => d.uid === subjectUid) ?? null);
  applyActions(actions, ctx, subject);
  return ctx;
};

describe("selectors", () => {
  const threeDice = (): BattleSnapshot =>
    harnessSnap([
      harnessDie("a", "red-d6", 2),
      harnessDie("b", "blue-d6", 5),
      harnessDie("c", "grey-d4", 3),
    ]);

  it("defaults to the subject die", () => {
    const snap = threeDice();
    run(snap, [{ a: "modDieValue", n: 2 }], "a");
    expect(snap.dice.map((d) => d.value)).toEqual([4, 5, 3]);
  });

  it("lowestDie and highestDie pick by current value", () => {
    const snap = threeDice();
    run(snap, [{ a: "setDieValue", n: 9, sel: { s: "lowestDie" } }]);
    expect(snap.dice[0]?.value).toBe(9);
    const other = threeDice();
    run(other, [{ a: "setDieValue", n: 1, sel: { s: "highestDie" } }]);
    expect(other.dice[1]?.value).toBe(1);
  });

  it("dieInSlot finds the die placed in that slot", () => {
    const snap = threeDice();
    place(snap, "b", "shields");
    run(snap, [
      { a: "modDieValue", n: 1, sel: { s: "dieInSlot", slot: "shields" } },
    ]);
    expect(snap.dice[1]?.value).toBe(6);
    expect(snap.dice[0]?.value).toBe(2);
  });

  it("allOfSchool hits every die of the school and prismatic wildcards", () => {
    const snap = harnessSnap([
      harnessDie("a", "red-d6", 2),
      harnessDie("b", "red-d6", 3),
      harnessDie("c", "coreshard", 4),
      harnessDie("d", "blue-d6", 5),
    ]);
    run(snap, [
      { a: "modDieValue", n: 1, sel: { s: "allOfSchool", school: "red" } },
    ]);
    expect(snap.dice.map((d) => d.value)).toEqual([3, 4, 5, 5]);
  });

  it("randomOther never picks the subject and is seeded by the snapshot", () => {
    const first = threeDice();
    run(first, [{ a: "setDieValue", n: 9, sel: { s: "randomOther" } }], "a");
    const second = threeDice();
    run(second, [{ a: "setDieValue", n: 9, sel: { s: "randomOther" } }], "a");
    expect(first.dice.map((d) => d.value)).toEqual(
      second.dice.map((d) => d.value),
    );
    expect(first.dice[0]?.value).toBe(2);
    expect(first.dice.filter((d) => d.value === 9)).toHaveLength(1);
  });

  it("rerollDie rolls inside the die's own face range", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [{ a: "rerollDie" }], "a");
    const value = snap.dice[0]?.value ?? 0;
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(4);
  });
});

describe("counters", () => {
  it("battle and run counters accumulate separately and survive a turn", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [
      { a: "counter", scope: "battle", key: "hits", delta: 2 },
      { a: "counter", scope: "run", key: "hits", delta: 5 },
    ]);
    expect(snap.counters?.hits).toBe(2);
    expect(snap.runCounters?.hits).toBe(5);
    const next = advanceTurn(snap, createStreams(4));
    expect(next.counters?.hits).toBe(2);
    expect(next.runCounters?.hits).toBe(5);
  });
});

describe("scheduling", () => {
  it("nextTurn effects run at the end of the following turn and then expire", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    place(snap, "a", "weaponA");
    run(snap, [
      { a: "schedule", on: "nextTurn", do: [{ a: "scrap", n: 7 }] },
    ]);
    expect(snap.scheduled).toHaveLength(1);

    const sameTurn = resolvePlayerPhase(snap);
    expect(sameTurn.next.scrap).toBe(0);

    const later = advanceTurn(sameTurn.next, createStreams(4));
    const resolved = resolvePlayerPhase(later);
    expect(resolved.next.scrap).toBe(7);
    expect(resolved.next.scheduled).toHaveLength(0);
  });

  it("forTurns repeats for the requested span", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [
      { a: "schedule", on: "forTurns", turns: 3, do: [{ a: "scrap", n: 1 }] },
    ]);
    expect(snap.scheduled?.map((e) => e.turn)).toEqual([2, 3, 4]);
  });

  it("the chain guard refuses runaway scheduling across calls", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    const schedule: Action = {
      a: "schedule",
      on: "forTurns",
      turns: 8,
      do: [{ a: "scrap", n: 1 }],
    };
    run(snap, [schedule]);
    expect(snap.scheduled).toHaveLength(8);
    expect(() => {
      run(snap, [schedule]);
    }).toThrow(/MAX_EFFECT_CHAIN/);
  });

  it("the chain guard bounds a single oversized span", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    expect(() => {
      run(snap, [
        { a: "schedule", on: "forTurns", turns: 40, do: [{ a: "scrap", n: 1 }] },
      ]);
    }).toThrow(/MAX_EFFECT_CHAIN/);
    expect((snap.scheduled ?? []).length).toBeLessThanOrEqual(8);
  });
});

describe("snapshot round-trip", () => {
  it("carries counters, schedules, grants and cap grants through store and save", () => {
    const dispose = injectEffectSource({
      key: "round-trip-probe",
      run: (hook, ctx, subject) => {
        if (hook !== "place") return;
        applyActions(
          [
            { a: "counter", scope: "battle", key: "hits", delta: 3 },
            { a: "counter", scope: "run", key: "shops", delta: 1 },
            { a: "schedule", on: "nextTurn", do: [{ a: "scrap", n: 2 }] },
            { a: "grant", what: "rerollUses", n: 1 },
            { a: "allowExceedCap", school: "black", hullCost: 1 },
          ],
          ctx,
          subject,
        );
      },
    });
    try {
      useBattleStore
        .getState()
        .startBattle({ enemyIds: ["raider"] }, STARTER_DECK, createStreams(9));
      const die = useBattleStore.getState().dice[0];
      if (die === undefined) throw new Error("no die");
      useBattleStore.getState().placeDie(die.uid, "weaponA");

      const saved = serializeBattle();
      if (saved === null) throw new Error("battle did not serialize");
      useBattleStore.getState().reset();
      hydrateBattle(saved);

      const restored = useBattleStore.getState();
      expect(restored.counters.hits).toBe(3);
      expect(restored.runCounters.shops).toBe(1);
      expect(restored.scheduled).toHaveLength(1);
      expect(restored.grants.rerollUses).toBe(1);
      expect(restored.exceedCap).toHaveLength(1);
    } finally {
      dispose();
      useBattleStore.getState().reset();
    }
  });
});

describe("resonance grants through the store", () => {
  it("the drag path validates placement against the same snapshot the store uses", () => {
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"] },
        ["obsidian", "black-d6", "black-d6"],
        createStreams(12),
      );
    const state = useBattleStore.getState();
    const die = state.dice.find((d) => d.defId === "obsidian");
    if (die === undefined) throw new Error("no obsidian");
    const snapshot = battleSnapshot(state);
    expect(snapshot.exceedCap).toHaveLength(1);
    expect(snapshot.shipId).toBe(state.shipId);
    expect(canPlaceDie(snapshot, die.uid, "engines")).toBe(true);
    useBattleStore.getState().reset();
  });

  it("black-2 lets an over-cap black die into a shallow slot after startBattle", () => {
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"] },
        ["obsidian", "black-d6", "black-d6"],
        createStreams(12),
      );
    const state = useBattleStore.getState();
    expect(state.exceedCap).toHaveLength(1);
    const die = state.dice.find((d) => d.defId === "obsidian");
    if (die === undefined) throw new Error("no obsidian");
    state.placeDie(die.uid, "engines");
    expect(useBattleStore.getState().slots.engines?.dieUid).toBe(die.uid);
    useBattleStore.getState().reset();
  });
});

describe("new primitives", () => {
  it("grant reaches the store through the snapshot", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [
      { a: "grant", what: "rerollUses", n: 2 },
      { a: "grant", what: "reserve", n: 1 },
    ]);
    expect(snap.grants?.rerollUses).toBe(2);
    expect(snap.grants?.reserve).toBe(1);
  });

  it("allowExceedCap makes an over-cap die placeable and bills the hull", () => {
    const snap = harnessSnap([harnessDie("a", "obsidian", 8)], {
      slots: { weaponA: { cap: 6, mk: 1 } },
    });
    expect(canPlaceDie(snap, "a", "weaponA")).toBe(false);
    run(snap, [{ a: "allowExceedCap", school: "black", hullCost: 1 }]);
    expect(exceedCapGrantFor(snap, { school: "black" }, "weaponA")).toEqual({
      school: "black",
      hullCost: 1,
    });
    expect(canPlaceDie(snap, "a", "weaponA")).toBe(true);
    place(snap, "a", "weaponA");
    const before = snap.hull;
    const { next } = resolvePlayerPhase(snap);
    expect(next.hull).toBe(before - 1);
  });

  it("addTempDie joins the tray and removeTempDie clears it", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [{ a: "addTempDie", defId: "red-d6", turns: 1 }]);
    expect(snap.dice).toHaveLength(2);
    expect(snap.dice[1]?.temp).toBe(true);
    run(snap, [{ a: "removeTempDie" }]);
    expect(snap.dice).toHaveLength(1);
  });

  it("a temp die with a turn budget expires on the turn after it lapses", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [{ a: "addTempDie", defId: "red-d6", turns: 1 }]);
    const next = advanceTurn(snap, createStreams(4));
    expect(next.dice).toHaveLength(2);
    const later = advanceTurn(next, createStreams(4));
    expect(later.dice).toHaveLength(1);
  });

  it("addStatus reaches the target enemy for every status key", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    run(snap, [
      { a: "addStatus", s: "jam", n: 1 },
      { a: "addStatus", s: "mark", n: 1 },
      { a: "addStatus", s: "burn", n: 3 },
    ]);
    expect(snap.enemies[0]?.statuses).toMatchObject({
      jam: 1,
      mark: 1,
      burn: 3,
    });
  });
});
