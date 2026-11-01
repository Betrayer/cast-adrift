import { describe, expect, it } from "vitest";
import { rolledBetween, type RollMarks } from "@/pixi/battle/rolls";

const marks = (over: Partial<RollMarks> = {}): RollMarks => ({
  turn: 2,
  rollSeq: 0,
  rolledUids: [],
  dice: [{ uid: "a" }, { uid: "b" }],
  ...over,
});

describe("rolledBetween", () => {
  it("reports nothing across a turn change", () => {
    const prev = marks();
    const state = marks({
      turn: 3,
      rollSeq: 1,
      rolledUids: ["a"],
      dice: [...prev.dice, { uid: "t", temp: true }],
    });
    const change = rolledBetween(state, prev);
    expect([...change.rolled]).toEqual([]);
    expect(change.summoned).toEqual([]);
  });

  it("adds exactly the rolled uids when the roll marker moves", () => {
    const prev = marks();
    const state = marks({ rollSeq: 1, rolledUids: ["b"], dice: prev.dice });
    const change = rolledBetween(state, prev);
    expect([...change.rolled]).toEqual(["b"]);
    expect(change.summoned).toEqual([]);
  });

  it("reports nothing when neither the marker nor the dice changed", () => {
    const prev = marks({ rollSeq: 4, rolledUids: ["a"] });
    const state = marks({ rollSeq: 4, rolledUids: ["a"], dice: prev.dice });
    const change = rolledBetween(state, prev);
    expect(change.rolled.size).toBe(0);
    expect(change.summoned).toEqual([]);
  });

  it("counts a temp die born this change as rolled and summoned", () => {
    const prev = marks();
    const state = marks({ dice: [...prev.dice, { uid: "t", temp: true }] });
    const change = rolledBetween(state, prev);
    expect([...change.rolled]).toEqual(["t"]);
    expect(change.summoned).toEqual(["t"]);
  });

  it("ignores a new die that is not temp", () => {
    const prev = marks();
    const state = marks({ dice: [...prev.dice, { uid: "c" }] });
    const change = rolledBetween(state, prev);
    expect(change.rolled.size).toBe(0);
    expect(change.summoned).toEqual([]);
  });

  it("ignores a temp die that was already on the table", () => {
    const prev = marks({ dice: [{ uid: "a" }, { uid: "t", temp: true }] });
    const state = marks({ dice: [{ uid: "a" }, { uid: "t", temp: true }] });
    const change = rolledBetween(state, prev);
    expect(change.rolled.size).toBe(0);
    expect(change.summoned).toEqual([]);
  });

  it("lists a summoned die that was also rolled once in each set", () => {
    const prev = marks();
    const state = marks({
      rollSeq: 1,
      rolledUids: ["t"],
      dice: [...prev.dice, { uid: "t", temp: true }],
    });
    const change = rolledBetween(state, prev);
    expect([...change.rolled]).toEqual(["t"]);
    expect(change.summoned).toEqual(["t"]);
  });
});
