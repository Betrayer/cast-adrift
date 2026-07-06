import { describe, expect, it } from "vitest";
import { PUZZLES, type PuzzleDef } from "@/data/puzzles";
import {
  advanceMultiTurn,
  difficultyReport,
  enumeratePlacements,
  initialMultiTurnState,
  isAchievable,
  isTrivial,
  multiTurnSatisfied,
  placementSatisfied,
  scorePlacement,
  solutionCount,
  totalPlacements,
} from "@/game/puzzles/evaluate";

const byId = (id: string): PuzzleDef => {
  const p = PUZZLES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`no puzzle ${id}`);
  return p;
};

describe("puzzle set shape", () => {
  it("has exactly 12 puzzles", () => {
    expect(PUZZLES).toHaveLength(12);
  });

  it("matches the authored archetype spread", () => {
    const spread: Record<string, number> = {};
    for (const p of PUZZLES) spread[p.goal.g] = (spread[p.goal.g] ?? 0) + 1;
    expect(spread).toEqual({
      exact: 2,
      constraint: 3,
      order: 2,
      multiTurn: 2,
      deduction: 2,
      survivePlus: 1,
    });
  });

  it("gives every puzzle a unique id", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
  });
});

describe("solvability guarantees (every arm)", () => {
  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    "%s is achievable within its reroll budget",
    (_id, puzzle) => {
      expect(isAchievable(puzzle)).toBe(true);
    },
  );

  it.each(PUZZLES.map((p) => [p.id, p] as const))(
    "%s is never a free win",
    (_id, puzzle) => {
      expect(isTrivial(puzzle)).toBe(false);
    },
  );

  it.each(
    PUZZLES.filter((p) => p.goal.g === "deduction").map((p) => [p.id, p] as const),
  )("%s (deduction) has 1..3 unique solutions on its fixed roll", (_id, puzzle) => {
    const count = solutionCount(puzzle);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(3);
    expect(count).toBeLessThan(totalPlacements(puzzle));
    expect(puzzle.fixedRoll).toBeDefined();
  });

  it.each(
    PUZZLES.filter((p) => p.goal.g === "exact").map((p) => [p.id, p] as const),
  )("%s (exact) is landable and its value sits inside [floor, ceil]", (_id, puzzle) => {
    const r = difficultyReport(puzzle);
    expect(r.exactReachable).toBe(true);
    expect(r.target).toBeGreaterThan(r.floor);
    expect(r.target).toBeLessThanOrEqual(r.ceil);
  });
});

describe("scorePlacement extended bundle", () => {
  it("returns beats, slotValues, and wastedToCap", () => {
    const p = byId("cleanFit");
    // black overflows the cap-8 reactor at value 6 -> floor(6*1.5)=9, waste 1.
    const score = scorePlacement(p, [6, 5, 3], { reactor: 0 });
    expect(score.beats.length).toBeGreaterThan(0);
    expect(score.slotValues.reactor).toBe(9); // beat carries the pre-clamp stored charge
    expect(score.charge).toBe(8); // actual charge clamped to cap
    expect(score.wastedToCap).toBe(1); // 9 stored, 8 retained
  });

  it("scores nothing for an empty placement", () => {
    const p = byId("oreVein");
    const score = scorePlacement(p, [8, 6, 4], {});
    expect(score.damage).toBe(0);
    expect(placementSatisfied(p, [8, 6, 4], {})).toBe(false);
  });
});

describe("exact — overshoot fails", () => {
  it("oreVein rejects an over-cut and accepts an exact 14", () => {
    const p = byId("oreVein");
    // slug + ember reds. slug: v+1+2(aff)+1(red-2); ember: v+2+1.
    // slug=3 -> 7, ember=4 -> 7, together exactly 14 (leave the grey out).
    const hit = enumeratePlacements(p).some((pl) =>
      placementSatisfied(p, [3, 4, 1], pl),
    );
    expect(hit).toBe(true); // some placement of this roll lands 14
    // A roll whose only reachable weapon totals overshoot 14 is rejected.
    const over = scorePlacement(p, [8, 6, 1], { weaponA: 0, weaponB: 1 });
    expect(over.damage).toBeGreaterThan(14);
    expect(placementSatisfied(p,[8, 6, 1], { weaponA: 0, weaponB: 1 })).toBe(
      false,
    );
  });
});

describe("constraint — rules gate the win", () => {
  it("redRoute requires a red die in weaponA", () => {
    const p = byId("redRoute");
    // slug=8, ember=6, blue=6, grey=4. Put blue in weaponA -> schoolInSlot fails.
    const blueInWeaponA = { weaponA: 2, weaponB: 0 };
    expect(placementSatisfied(p,[8, 6, 6, 4], blueInWeaponA)).toBe(
      false,
    );
    const redInWeaponA = { weaponA: 0, weaponB: 1 };
    expect(placementSatisfied(p,[8, 6, 6, 4], redInWeaponA)).toBe(
      true,
    );
  });

  it("ignite needs Burn actually applied", () => {
    const p = byId("ignite");
    // cinder below max -> no burn -> fails even with high damage elsewhere.
    const noBurn = { weaponA: 1, weaponB: 2 };
    expect(placementSatisfied(p,[1, 6, 6], noBurn)).toBe(false);
    // cinder at max (4) in a weapon -> burn applied.
    const burn = { weaponA: 0, weaponB: 1 };
    const score = scorePlacement(p, [4, 6, 6], burn);
    expect(score.burnApplied).toBe(true);
    expect(placementSatisfied(p,[4, 6, 6], burn)).toBe(true);
  });
});

describe("order — every stage must fire", () => {
  it("pipeline needs a mark, enough marked damage, and no overflow", () => {
    const p = byId("pipeline");
    // grey->sensors (mark), ember->weaponA (marked), black->reactor small (no overflow).
    const good = { sensors: 0, weaponA: 1, reactor: 2 };
    expect(placementSatisfied(p,[4, 6, 4], good)).toBe(true);
    // no sensor placed -> mark step fails.
    const noMark = { weaponA: 1, reactor: 2 };
    expect(placementSatisfied(p,[4, 6, 4], noMark)).toBe(false);
    // black at 6 in reactor overflows cap 8.
    const overflow = { sensors: 0, weaponA: 1, reactor: 2 };
    expect(placementSatisfied(p,[4, 6, 6], overflow)).toBe(false);
  });
});

describe("multiTurn — state carries across turns", () => {
  it("capacitor cannot bank the target in one turn but can across turns", () => {
    const p = byId("capacitor");
    let state = initialMultiTurnState(p);
    // One max black die -> 9 charge, below 16.
    state = advanceMultiTurn(p, state, [6, 6, 4], { reactor: 0 });
    expect(multiTurnSatisfied(p, state)).toBe(false);
    // Second turn banks on top of the first.
    state = advanceMultiTurn(p, state, [6, 6, 4], { reactor: 1 });
    expect(state.carry.charge).toBeGreaterThanOrEqual(16);
    expect(multiTurnSatisfied(p, state)).toBe(true);
  });

  it("slowBurn accumulates weapon damage and burn ticks", () => {
    const p = byId("slowBurn");
    let state = initialMultiTurnState(p);
    state = advanceMultiTurn(p, state, [4, 4, 8], { weaponA: 0, weaponB: 1 });
    // burn applied by the two maxed cinders should have ticked at the boundary.
    expect(state.cumDamage).toBeGreaterThan(0);
    state = advanceMultiTurn(p, state, [4, 4, 8], { weaponA: 2, weaponB: 0 });
    expect(state.cumDamage).toBeGreaterThanOrEqual(26);
  });
});

describe("deduction — a wrong placement fails", () => {
  it("lockbox has a single correct routing", () => {
    const p = byId("lockbox");
    expect(solutionCount(p)).toBe(1);
    const roll = [...(p.fixedRoll ?? [])];
    // The intended lock: ember->weaponA, blue->shields, black->reactor.
    const right = { weaponA: 0, shields: 1, reactor: 2 };
    expect(placementSatisfied(p, roll, right)).toBe(true);
    // Swap ember and blue -> both damage and shield thresholds break.
    const wrong = { weaponA: 1, shields: 0, reactor: 2 };
    expect(placementSatisfied(p, roll, wrong)).toBe(false);
  });

  it("parity forces odd weapons and even shields", () => {
    const p = byId("parity");
    expect(solutionCount(p)).toBe(1);
    const roll = [...(p.fixedRoll ?? [])];
    const right = { weaponA: 0, shields: 1 }; // ember(5->7 odd), blue(4->6 even)
    expect(placementSatisfied(p, roll, right)).toBe(true);
    const wrong = { weaponA: 1, shields: 0 }; // blue(4 even) in weapons -> parity fails
    expect(placementSatisfied(p, roll, wrong)).toBe(false);
  });
});

describe("survivePlus — survive AND the clause", () => {
  it("bulwarkStand needs both survival and the shield clause", () => {
    const p = byId("bulwarkStand");
    // bulwark=8 -> shield 11, green=4 -> dodge; survives m5x3 with a big buffer.
    const strong = { shields: 0, engines: 1 };
    expect(placementSatisfied(p,[8, 4, 1], strong)).toBe(true);
    // bulwark=1 -> shield 4 (<6) and hull collapses -> fails.
    const weak = { shields: 0, engines: 1 };
    expect(placementSatisfied(p,[1, 1, 1], weak)).toBe(false);
  });
});
