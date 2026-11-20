import { describe, expect, it } from "vitest";
import { aliveOnBoard, enemySeatCount, enemySeatOf, nextEnemySeat, seatOccupants } from "@/game/battle/seats";

const body = (hp: number, seat?: number) => (seat === undefined ? { hp } : { hp, seat });

describe("enemy seats", () => {
  it("keeps the bodies a fight starts with on their own seats", () => {
    const enemies = [body(5), body(5), body(5)];
    expect(enemies.map((enemy, index) => enemySeatOf(enemy, index))).toEqual([0, 1, 2]);
    expect(enemySeatCount(enemies)).toBe(3);
  });

  it("gives a newcomer the lowest seat no living enemy holds", () => {
    expect(nextEnemySeat([body(5), body(0), body(5)])).toBe(1);
    expect(nextEnemySeat([body(0), body(0), body(5)])).toBe(0);
  });

  it("adds a seat when every seat is held, as a fight that starts small grows", () => {
    expect(nextEnemySeat([body(5), body(5)])).toBe(2);
    expect(enemySeatCount([body(5), body(5), body(5, 2)])).toBe(3);
  });

  it("keeps a newcomer on its seat when an enemy to its left dies later", () => {
    const enemies = [body(0), body(0), body(5), body(5, 1)];
    expect(enemySeatOf(enemies[3] ?? body(0), 3)).toBe(1);
    expect(enemySeatCount(enemies)).toBe(3);
    expect(nextEnemySeat(enemies)).toBe(0);
  });

  it("lists the living left to right by seat, the list order breaking ties", () => {
    const enemies = [
      { id: "a", hp: 0 },
      { id: "b", hp: 5 },
      { id: "c", hp: 5 },
      { id: "n", hp: 5, seat: 0 },
    ];
    expect(aliveOnBoard(enemies).map((enemy) => enemy.id)).toEqual(["n", "b", "c"]);
    expect(aliveOnBoard([{ id: "x", hp: 5 }, { id: "y", hp: 5 }]).map((enemy) => enemy.id)).toEqual(["x", "y"]);
  });

  it("draws only the latest occupant of each seat", () => {
    expect(seatOccupants([body(0), body(5), body(5), body(5, 0)])).toEqual([1, 2, 3]);
    expect(seatOccupants([body(0), body(0), body(5), body(0, 0), body(5, 1), body(5, 0)])).toEqual([2, 4, 5]);
  });
});
