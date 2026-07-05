import { describe, expect, it } from "vitest";
import {
  decidePlacements,
  decideReroll,
  incomingEstimate,
} from "@/game/battle/policy";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import { createStreams } from "@/services/rng";
import type { BattleSnapshot } from "@/types/battle";

const makeSnapshot = (enemyIds: string[] = ["raider"]): BattleSnapshot => {
  const streams = createStreams(21);
  const enemyStream = createEnemyStream(streams);
  return buildBattleSnapshot(
    "wanderer",
    ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"],
    enemyIds,
    streams,
    enemyStream,
  );
};

const setValues = (snapshot: BattleSnapshot, values: number[]): void => {
  snapshot.dice = snapshot.dice.map((d, i) => ({
    ...d,
    value: values[i] ?? d.value,
  }));
};

describe("decideReroll", () => {
  it("rerolls the two lowest dice when the sum is below deck average", () => {
    const snapshot = makeSnapshot();
    setValues(snapshot, [1, 1, 2, 1, 1]);
    const uids = decideReroll(snapshot);
    expect(uids).toHaveLength(2);
    const values = uids.map(
      (uid) => snapshot.dice.find((d) => d.uid === uid)?.value,
    );
    expect(values).toEqual([1, 1]);
  });

  it("keeps a roll at or above deck average", () => {
    const snapshot = makeSnapshot();
    setValues(snapshot, [6, 6, 5, 4, 3]);
    expect(decideReroll(snapshot)).toEqual([]);
  });
});

describe("decidePlacements", () => {
  it("goes for the kill when weapons dice finish all enemies", () => {
    const snapshot = makeSnapshot(["scavDrone"]);
    const target = snapshot.enemies[0];
    if (target === undefined) throw new Error("missing enemy");
    target.hp = 7;
    target.hpMax = 7;
    target.shield = 0;
    target.nextIntent = { t: "attack", n: 1 };
    setValues(snapshot, [6, 5, 2, 1, 1]);
    const decision = decidePlacements(snapshot);
    const weaponPlacements = decision.placements.filter(
      (p) => p.slot === "weaponA" || p.slot === "weaponB",
    );
    const total = weaponPlacements.reduce(
      (sum, p) =>
        sum + (snapshot.dice.find((d) => d.uid === p.uid)?.value ?? 0),
      0,
    );
    expect(total).toBeGreaterThanOrEqual(7);
  });

  it("shields against heavy incoming damage", () => {
    const snapshot = makeSnapshot();
    snapshot.hull = 12;
    setValues(snapshot, [2, 2, 2, 1, 1]);
    const decision = decidePlacements(snapshot);
    expect(decision.placements.some((p) => p.slot === "shields")).toBe(true);
  });

  it("uses the lowest die for sensors", () => {
    const snapshot = makeSnapshot();
    setValues(snapshot, [6, 5, 4, 3, 1]);
    const decision = decidePlacements(snapshot);
    const sensor = decision.placements.find((p) => p.slot === "sensors");
    expect(sensor).toBeDefined();
    const die = snapshot.dice.find((d) => d.uid === sensor?.uid);
    expect(die?.value).toBe(1);
  });

  it("targets the enemy with the lowest effective hp", () => {
    const snapshot = makeSnapshot(["raider", "scavDrone"]);
    const decision = decidePlacements(snapshot);
    expect(decision.targetId).toBe("enemy-1");
  });

  it("never places into blocked slots or with locked dice", () => {
    const snapshot = makeSnapshot();
    snapshot.blockedSlots = [{ slot: "weaponA", untilTurn: snapshot.turn }];
    const firstUid = snapshot.dice[0]?.uid ?? "";
    snapshot.lockedDice = [{ uid: firstUid, untilTurn: snapshot.turn }];
    const decision = decidePlacements(snapshot);
    expect(decision.placements.every((p) => p.slot !== "weaponA")).toBe(true);
    expect(decision.placements.every((p) => p.uid !== firstUid)).toBe(true);
  });
});

describe("incomingEstimate", () => {
  it("accounts for multi hits, charge and the turret aura", () => {
    const snapshot = makeSnapshot(["raiderAlpha"]);
    const alpha = snapshot.enemies[0];
    expect(alpha).toBeDefined();
    if (alpha === undefined) return;
    alpha.nextIntent = { t: "multi", n: 3, k: 2 };
    alpha.statuses.charge = 1;
    expect(incomingEstimate(snapshot)).toBe(20);
  });
});
