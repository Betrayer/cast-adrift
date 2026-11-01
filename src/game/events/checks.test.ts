import { describe, expect, it } from "vitest";
import { createStream, deriveSeed } from "@/services/rng";
import {
  checkOdds,
  checkPassed,
  checkRollOutcome,
  checkTotal,
  deckRefFor,
  eligibleForCheck,
  rollCheck,
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

  it("topDiceForCheck keeps the forge level of a forged die", () => {
    const deck = [
      { defId: "grey-d4", tier: 4 as const },
      {
        defId: "stillwater",
        tier: 8 as const,
        faces: [3, 3, 4, 4, 5, 5, 6, 6],
        fusion: 1,
      },
    ];
    const [forged, plain] = topDiceForCheck(deck, 2);
    expect(forged?.fusion).toBe(1);
    expect(forged?.faces).toEqual([3, 3, 4, 4, 5, 5, 6, 6]);
    expect(plain?.defId).toBe("grey-d4");
    expect(plain).not.toHaveProperty("fusion");
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

describe("deckRefFor", () => {
  it("carries a forged die's level, size and faces into the check", () => {
    const ref = deckRefFor({ defId: "cinderblack", fusion: { level: 1, consumed: ["x"] } });
    expect(ref.fusion).toBe(1);
    expect(ref.tier).toBe(6);
    expect(ref.faces).toEqual([1, 1, 4, 4, 5, 5]);
  });

  it("marks a forged standard die by its level and size alone", () => {
    const ref = deckRefFor({ defId: "ember", fusion: { level: 1, consumed: ["cinder"] } });
    expect(ref.fusion).toBe(1);
    expect(ref.tier).toBe(8);
    expect(ref).not.toHaveProperty("faces");
  });

  it("leaves an unforged die without a forge level or a face list of its own", () => {
    const ref = deckRefFor({ defId: "ember" });
    expect(ref).not.toHaveProperty("fusion");
    expect(ref).not.toHaveProperty("faces");
    expect(ref.tier).toBe(6);
  });
});

describe("narrowed checks (R7)", () => {
  const deck = [
    { defId: "black-d6", tier: 6 as const, school: "black" as const },
    { defId: "blue-d8", tier: 8 as const, school: "blue" as const },
    { defId: "red-d12", tier: 12 as const, school: "red" as const },
    { defId: "grey-d4", tier: 4 as const, school: "grey" as const },
  ];

  it("a school check rolls only that school", () => {
    const pool = eligibleForCheck(deck, { school: "blue" });
    expect(pool.map((d) => d.defId)).toEqual(["blue-d8"]);
  });

  it("a tier band drops the dice outside it", () => {
    expect(
      eligibleForCheck(deck, { tierAtLeast: 8 }).map((d) => d.defId),
    ).toEqual(["blue-d8", "red-d12"]);
    expect(
      eligibleForCheck(deck, { tierAtMost: 6 }).map((d) => d.defId),
    ).toEqual(["black-d6", "grey-d4"]);
  });

  it("a narrowed pool rolls fewer dice rather than borrowing", () => {
    const faces = topDiceForCheck(deck, 3, { school: "blue" });
    expect(faces).toHaveLength(1);
  });

  it("a lowest check passes only when every die stays under the cap", () => {
    const faces = topDiceForCheck(deck, 2, { tierAtMost: 6 });
    expect(checkOdds(faces, "lowest", 6)).toBe(1);
    expect(checkOdds(faces, "lowest", 1)).toBeLessThan(0.3);
    expect(checkPassed(2, "lowest", 3)).toBe(true);
    expect(checkPassed(5, "lowest", 3)).toBe(false);
    expect(checkPassed(5, "sum", 3)).toBe(true);
  });
});

describe("checkRollOutcome", () => {
  it("fails a narrowed check that no die could take, even on a lowest pick", () => {
    const empty = checkRollOutcome([], { pick: "lowest", target: 3 });
    expect(empty.success).toBe(false);
    expect(empty.total).toBe(0);
    expect(empty.values).toEqual([]);
  });

  it("fails an empty roll on every pick", () => {
    expect(checkRollOutcome([], { pick: "highest", target: 0 }).success).toBe(false);
    expect(checkRollOutcome([], { pick: "sum", target: 0 }).success).toBe(false);
  });

  it("passes a lowest pick when every die stays at or under the target", () => {
    const roll = checkRollOutcome([2, 3], { pick: "lowest", target: 3 });
    expect(roll.total).toBe(3);
    expect(roll.success).toBe(true);
  });

  it("reports the sum it judged", () => {
    const roll = checkRollOutcome([4, 5], { pick: "sum", target: 10 });
    expect(roll.total).toBe(9);
    expect(roll.success).toBe(false);
  });
});

describe("rollCheck", () => {
  it("draws exactly what rollCheckDice draws and seeds the presentation from the state before the draw", () => {
    const faces = [d(6), d(8)];
    const check = { pick: "sum" as const, target: 9 };
    const reference = createStream(4242);
    const seed = deriveSeed(reference.state(), "check:present");
    const values = rollCheckDice(faces, reference);
    const stream = createStream(4242);
    expect(rollCheck(faces, check, stream)).toEqual({
      ...checkRollOutcome(values, check),
      seed,
    });
    expect(stream.state()).toBe(reference.state());
  });
});
