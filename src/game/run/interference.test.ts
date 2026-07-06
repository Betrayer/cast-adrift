import { beforeEach, describe, expect, it } from "vitest";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import {
  INTERFERENCE_STREAK_THRESHOLD,
  interferenceImminent,
  interferenceStacksForStreak,
} from "@/game/run/interference";
import { createStream, createStreams } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";

describe("interference stack curve", () => {
  it("adds one stack per unsolved anomaly beyond the threshold", () => {
    expect(interferenceStacksForStreak(0)).toBe(0);
    expect(interferenceStacksForStreak(1)).toBe(0);
    expect(interferenceStacksForStreak(2)).toBe(0);
    expect(interferenceStacksForStreak(INTERFERENCE_STREAK_THRESHOLD)).toBe(1);
    expect(interferenceStacksForStreak(4)).toBe(2);
    expect(interferenceStacksForStreak(5)).toBe(3);
  });

  it("warns once the next miss would trigger interference", () => {
    expect(interferenceImminent(0)).toBe(false);
    expect(interferenceImminent(1)).toBe(false);
    expect(interferenceImminent(2)).toBe(true);
    expect(interferenceImminent(3)).toBe(true);
  });
});

describe("runStore anomaly streak", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("accrues stacks only from the third consecutive miss", () => {
    const run = useRunStore.getState();
    run.recordAnomalyUnsolved();
    run.recordAnomalyUnsolved();
    expect(useRunStore.getState().anomalyStreak).toBe(2);
    expect(useRunStore.getState().interferenceStacks).toBe(0);
    run.recordAnomalyUnsolved();
    expect(useRunStore.getState().anomalyStreak).toBe(3);
    expect(useRunStore.getState().interferenceStacks).toBe(1);
    run.recordAnomalyUnsolved();
    expect(useRunStore.getState().interferenceStacks).toBe(2);
  });

  it("solving any anomaly clears the streak and all stacks", () => {
    const run = useRunStore.getState();
    run.recordAnomalyUnsolved();
    run.recordAnomalyUnsolved();
    run.recordAnomalyUnsolved();
    run.recordAnomalyUnsolved();
    expect(useRunStore.getState().interferenceStacks).toBe(2);
    run.recordAnomalySolved();
    expect(useRunStore.getState().anomalyStreak).toBe(0);
    expect(useRunStore.getState().interferenceStacks).toBe(0);
  });
});

describe("interference in combat", () => {
  const hullAfterAttack = (interference: number): number => {
    const streams = createStreams(7);
    const enemyStream = createEnemyStream(streams);
    const snap = buildBattleSnapshot(
      "wanderer",
      ["ember"],
      ["scavDrone"],
      streams,
      enemyStream,
      {},
      { hull: 30, hullMax: 30, interference },
    );
    const enemy = snap.enemies[0];
    if (enemy === undefined) throw new Error("no enemy");
    enemy.nextIntent = { t: "attack", n: 3 };
    return resolveEnemyPhase(snap, createStream(1)).next.hull;
  };

  it("adds its stacks to every enemy attack, like tide", () => {
    const base = hullAfterAttack(0);
    const stacked = hullAfterAttack(2);
    expect(base - stacked).toBe(2);
  });
});
