import { describe, expect, it } from "vitest";
import { harnessDie, harnessEnemy, harnessSnap } from "@/game/battle/battleHarness";
import { incomingEstimate, rerollValue } from "@/game/battle/policy";
import { incomingHits } from "@/game/battle/resolver";
import { createStream } from "@/services/rng";
import type { BattleSnapshot, EnemyState, RolledDie } from "@/types/battle";

const soleEnemy = (snapshot: BattleSnapshot): EnemyState => {
  const enemy = snapshot.enemies[0];
  if (enemy === undefined) throw new Error("missing enemy");
  return enemy;
};

const trueIncoming = (
  snapshot: BattleSnapshot,
  perHit: number,
  hits: number,
): number =>
  incomingHits(snapshot, soleEnemy(snapshot), perHit, hits).reduce(
    (sum, hit) => sum + hit,
    0,
  );

const boardWith = (
  defId: string,
  perHit: number,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap([], {
    enemies: [harnessEnemy({ defId, nextIntent: { t: "attack", n: perHit } })],
    ...over,
  });

describe("incomingEstimate mirrors incomingHits", () => {
  it("scales a base enemy by the sector damage multiplier", () => {
    const snapshot = boardWith("raider", 7, { sectorDmgPct: 62 });
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 7, 1));
    expect(incomingEstimate(snapshot)).toBe(11);
  });

  it("scales every hit of a multi intent, not the total", () => {
    const snapshot = harnessSnap([], {
      sectorDmgPct: 30,
      enemies: [harnessEnemy({ nextIntent: { t: "multi", n: 3, k: 3 } })],
    });
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 3, 3));
    expect(incomingEstimate(snapshot)).toBe(12);
  });

  it("leaves an authored enemy out of the sector multiplier", () => {
    const snapshot = boardWith("tollmaster", 7, { sectorDmgPct: 62 });
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 7, 1));
    expect(incomingEstimate(snapshot)).toBe(7);
  });

  it("adds the mutator damage multiplier the resolver adds", () => {
    const snapshot = boardWith("raider", 8, { mutators: ["glassFleet"] });
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 8, 1));
    expect(incomingEstimate(snapshot)).toBe(12);
  });

  it("clamps the tide on the sum the way the resolver clamps it", () => {
    const snapshot = boardWith("raider", 7, { tide: 1, perks: ["tideRoots"] });
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 7, 1));
    expect(incomingEstimate(snapshot)).toBe(7);
  });

  it("doubles a charged enemy before it scales the hit", () => {
    const snapshot = boardWith("raider", 7, { sectorDmgPct: 62 });
    soleEnemy(snapshot).statuses.charge = 1;
    expect(incomingEstimate(snapshot)).toBe(trueIncoming(snapshot, 7, 1));
    expect(incomingEstimate(snapshot)).toBe(23);
  });
});

const BLUE_WALL = [
  harnessDie("b0", "blue-d6", 3),
  harnessDie("b1", "blue-d6", 3),
  harnessDie("g0", "grey-d4", 2),
];

const LONE_BLUE = [
  harnessDie("b0", "blue-d6", 3),
  harnessDie("g0", "grey-d4", 2),
  harnessDie("g1", "grey-d4", 2),
];

const dieOf = (dice: readonly RolledDie[], uid: string): RolledDie => {
  const die = dice.find((d) => d.uid === uid);
  if (die === undefined) throw new Error(`missing die ${uid}`);
  return die;
};

const drawMany = (
  snapshot: BattleSnapshot,
  die: RolledDie,
  seed: number,
): number[] => {
  const rng = createStream(seed);
  return Array.from({ length: 200 }, () => rerollValue(die, snapshot, rng));
};

describe("rerollValue mirrors the shipped reroll", () => {
  it("holds a blue die at the resonance floor", () => {
    const snapshot = harnessSnap([...BLUE_WALL]);
    const values = drawMany(snapshot, dieOf(snapshot.dice, "b0"), 11);
    expect(Math.min(...values)).toBe(2);
  });

  it("leaves blue on the bare roll below the resonance threshold", () => {
    const snapshot = harnessSnap([...LONE_BLUE]);
    const values = drawMany(snapshot, dieOf(snapshot.dice, "b0"), 11);
    expect(Math.min(...values)).toBe(1);
  });

  it("leaves other schools on the bare roll at full resonance", () => {
    const snapshot = harnessSnap([...BLUE_WALL]);
    const values = drawMany(snapshot, dieOf(snapshot.dice, "g0"), 11);
    expect(Math.min(...values)).toBe(1);
  });

  it("keeps the growth bonus a bare reroll would drop", () => {
    const snapshot = harnessSnap([...LONE_BLUE]);
    const plain = dieOf(snapshot.dice, "g0");
    const grown: RolledDie = { ...plain, growth: 2 };
    expect(rerollValue(grown, snapshot, createStream(5))).toBe(
      rerollValue(plain, snapshot, createStream(5)) + 2,
    );
  });
});
