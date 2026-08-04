import { describe, expect, it } from "vitest";
import { PUZZLES, type PuzzleDef } from "@/data/puzzles";
import {
  advanceMultiTurn,
  enumeratePlacements,
  initialMultiTurnState,
  multiTurnSatisfied,
  placementSatisfied,
  scorePlacement,
} from "@/game/puzzles/evaluate";
import { solutionsOnBoard } from "@/game/puzzles/difficulty";

const byId = (id: string): PuzzleDef => {
  const p = PUZZLES.find((x) => x.id === id);
  if (p === undefined) throw new Error(`no puzzle ${id}`);
  return p;
};

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
    const ceiling = [6, 6, 4];
    const best = (state: ReturnType<typeof initialMultiTurnState>) =>
      enumeratePlacements(p).reduce(
        (acc, placement) => {
          const next = advanceMultiTurn(p, state, ceiling, placement);
          return next.carry.charge > acc.carry.charge ? next : acc;
        },
        advanceMultiTurn(p, state, ceiling, {}),
      );
    let state = best(initialMultiTurnState(p));
    expect(multiTurnSatisfied(p, state)).toBe(false);
    for (let turn = 1; turn < 3; turn += 1) state = best(state);
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
    const roll = [...(p.fixedRoll ?? [])];
    const winners = enumeratePlacements(p).filter((placement) =>
      placementSatisfied(p, roll, placement),
    );
    expect(winners).toHaveLength(1);
    expect(solutionsOnBoard(p, roll)).toBe(1);
    expect(Object.keys(winners[0] ?? {}).length).toBeGreaterThan(1);
  });

  it("parity forces odd weapons and even shields", () => {
    const p = byId("parity");
    const roll = [...(p.fixedRoll ?? [])];
    const winners = enumeratePlacements(p).filter((placement) =>
      placementSatisfied(p, roll, placement),
    );
    expect(winners).toHaveLength(1);
    const solution = winners[0] ?? {};
    const score = scorePlacement(p, roll, solution);
    expect((score.slotValues.weaponA ?? 0) % 2).toBe(1);
    expect((score.slotValues.shields ?? 0) % 2).toBe(0);
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
