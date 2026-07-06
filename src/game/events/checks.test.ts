import { describe, expect, it } from "vitest";
import { createStream } from "@/services/rng";
import {
  checkOdds,
  checkTotal,
  rollCheckDice,
  topDiceForCheck,
  type FaceDie,
} from "@/game/events/checks";
import type { CheckPick } from "@/types/events";

const brute = (
  dice: readonly FaceDie[],
  pick: CheckPick,
  target: number,
): number => {
  let total = 0;
  let success = 0;
  const walk = (index: number, values: number[]): void => {
    if (index === dice.length) {
      total += 1;
      if (checkTotal(values, pick) >= target) success += 1;
      return;
    }
    for (const face of dice[index]?.faces ?? []) {
      walk(index + 1, [...values, face]);
    }
  };
  walk(0, []);
  return success / total;
};

const d = (tier: FaceDie["tier"], faces?: number[]): FaceDie => ({
  defId: `d${String(tier)}`,
  tier,
  faces: faces ?? Array.from({ length: tier }, (_, i) => i + 1),
});

describe("checkOdds vs brute force", () => {
  const cases: { dice: FaceDie[]; pick: CheckPick; target: number }[] = [
    { dice: [d(6), d(6)], pick: "sum", target: 7 },
    { dice: [d(6), d(6), d(6)], pick: "sum", target: 11 },
    { dice: [d(8), d(4)], pick: "sum", target: 8 },
    { dice: [d(20)], pick: "highest", target: 6 },
    { dice: [d(6), d(8)], pick: "highest", target: 7 },
    { dice: [d(8, [1, 8]), d(6)], pick: "sum", target: 9 },
  ];

  it("matches enumeration for every case", () => {
    for (const c of cases) {
      const odds = checkOdds(c.dice, c.pick, c.target);
      expect(odds).toBeCloseTo(brute(c.dice, c.pick, c.target), 10);
    }
  });
});

describe("check rolls", () => {
  it("same seed produces the same roll", () => {
    const dice = [d(6), d(8)];
    const a = rollCheckDice(dice, createStream(42));
    const b = rollCheckDice(dice, createStream(42));
    expect(a).toEqual(b);
  });

  it("topDiceForCheck takes the highest tiers", () => {
    const deck = [
      { defId: "grey-d4", tier: 4 as const },
      { defId: "coreshard", tier: 10 as const },
      { defId: "ember", tier: 6 as const },
    ];
    const top = topDiceForCheck(deck, 2);
    expect(top.map((x) => x.tier)).toEqual([10, 6]);
  });

  it("rolled values fall within face bounds", () => {
    const dice = [d(8, [1, 8])];
    const stream = createStream(3);
    for (let i = 0; i < 50; i += 1) {
      const [value] = rollCheckDice(dice, stream);
      expect(value === 1 || value === 8).toBe(true);
    }
  });
});
