import { describe, expect, it } from "vitest";
import { rolledBetween, sceneChange, type RollMarks, type SceneMarks } from "@/pixi/battle/rolls";

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

const seated = (count: number): SceneMarks["dice"] =>
  Array.from({ length: count }, (_, index) => ({
    uid: `d${String(index)}`,
    state: "tray" as const,
    seat: index,
    defId: "red-d6",
  }));

const scene = (over: Partial<SceneMarks> = {}): SceneMarks => ({
  turn: 2,
  ascension: 0,
  enemies: [{}, {}],
  slots: { weaponA: {}, shield: {} },
  dice: seated(7),
  ...over,
});

describe("sceneChange", () => {
  it("relayouts when a temp die takes an eighth seat", () => {
    const prev = scene();
    const state = scene({ dice: [...prev.dice, { uid: "t", state: "tray", temp: true, defId: "red-d6" }] });
    expect(sceneChange(state, prev)).toBe("relayout");
  });

  it("rebuilds on a turn, an enemy count or a slot count change", () => {
    const prev = scene();
    expect(sceneChange(scene({ turn: 3 }), prev)).toBe("rebuild");
    expect(sceneChange(scene({ enemies: [{}] }), prev)).toBe("rebuild");
    expect(sceneChange(scene({ slots: { weaponA: {} } }), prev)).toBe("rebuild");
  });

  it("only syncs when the dice change without changing the seat count", () => {
    const prev = scene();
    expect(sceneChange(scene({ dice: seated(7) }), prev)).toBe("sync");
    expect(sceneChange(prev, prev)).toBe("sync");
  });

  it("reads the seat count against the table the ascension leaves", () => {
    const grown = [...seated(6), { uid: "d6", state: "tray" as const, seat: 6, defId: "red-d6" }];
    expect(sceneChange(scene({ ascension: 11, dice: grown }), scene({ ascension: 11, dice: seated(6) }))).toBe("relayout");
    expect(sceneChange(scene({ dice: grown }), scene({ dice: seated(6) }))).toBe("sync");
  });
});
