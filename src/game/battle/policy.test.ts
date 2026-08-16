import { describe, expect, it } from "vitest";
import {
  decidePlacements,
  decideReroll,
  incomingEstimate,
} from "@/game/battle/policy";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import { createStreams } from "@/services/rng";
import type { BattleSnapshot } from "@/types/battle";

const makeSnapshot = (
  enemyIds: string[] = ["raider"],
  deck: string[] = ["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"],
): BattleSnapshot => {
  const streams = createStreams(21);
  const enemyStream = createEnemyStream(streams);
  return buildBattleSnapshot(
    "wanderer",
    deck,
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

  it("front-loads an aura subsystem before the core when not lethal", () => {
    const snapshot = makeSnapshot(["raiderAlpha"]);
    setValues(snapshot, [2, 2, 1, 1, 1]);
    const decision = decidePlacements(snapshot);
    expect(decision.targetId).toBe("enemy-0:turret");
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

  it("adds the tide and interference the resolver adds per hit", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.nextIntent = { t: "attack", n: 4 };
    const flat = incomingEstimate(snapshot);
    snapshot.tide = 2;
    snapshot.interference = 3;
    expect(incomingEstimate(snapshot)).toBe(flat + 5);
  });

  it("counts rage the way applyAttack counts it", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.nextIntent = { t: "multi", n: 2, k: 3 };
    const flat = incomingEstimate(snapshot);
    enemy.rage = 2;
    expect(incomingEstimate(snapshot)).toBe(flat + 6);
  });

  it("reads an echo intent off the last player turn", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.nextIntent = { t: "echoTotal", cap: 9 };
    snapshot.lastPlayerDamage = 14;
    expect(incomingEstimate(snapshot)).toBe(9);
    snapshot.lastPlayerDamage = 4;
    expect(incomingEstimate(snapshot)).toBe(4);
  });

  it("bills a bargain only when the purse cannot pay it", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.nextIntent = { t: "bargain", n: 20, heal: 5 };
    snapshot.scrap = 0;
    snapshot.runScrap = 40;
    expect(incomingEstimate(snapshot)).toBe(0);
    snapshot.runScrap = 5;
    expect(incomingEstimate(snapshot)).toBe(20);
  });
});

describe("decidePlacements — R11 fidelity", () => {
  it("does not feed shields into a siphon", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    snapshot.hull = 12;
    enemy.nextIntent = { t: "attack", n: 6 };
    setValues(snapshot, [2, 2, 2, 1, 1]);
    expect(
      decidePlacements(snapshot).placements.some((p) => p.slot === "shields"),
    ).toBe(true);
    enemy.nextIntent = { t: "siphonShield", n: 6 };
    expect(
      decidePlacements(snapshot).placements.some((p) => p.slot === "shields"),
    ).toBe(false);
  });

  it("commits its best die instead of reserving it against a devourer", () => {
    const snapshot = makeSnapshot(
      ["raider"],
      [
        "red-d6",
        "red-d6",
        "blue-d6",
        "grey-d4",
        "green-d4",
        "red-d6",
        "blue-d6",
        "grey-d4",
      ],
    );
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.hp = 60;
    enemy.hpMax = 60;
    setValues(snapshot, [6, 6, 6, 4, 4, 6, 6, 4]);
    expect(decidePlacements(snapshot).reserveUid).toBeDefined();
    enemy.nextIntent = { t: "devourDie" };
    expect(decidePlacements(snapshot).reserveUid).toBeUndefined();
  });

  it("reverses the weapon order under an inverted resolution", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.hp = 60;
    enemy.hpMax = 60;
    setValues(snapshot, [6, 5, 4, 3, 2]);
    const straight = decidePlacements(snapshot).placements.find(
      (p) => p.slot === "weaponA",
    );
    snapshot.inverted = true;
    const inverted = decidePlacements(snapshot).placements.find(
      (p) => p.slot === "weaponB",
    );
    const valueOf = (uid: string | undefined): number =>
      snapshot.dice.find((d) => d.uid === uid)?.value ?? 0;
    expect(valueOf(straight?.uid)).toBe(valueOf(inverted?.uid));
  });

  it("does not read a gate it cannot break as lethal", () => {
    const snapshot = makeSnapshot(["raider"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.hp = 8;
    enemy.hpMax = 8;
    enemy.shield = 0;
    enemy.nextIntent = { t: "attack", n: 1 };
    setValues(snapshot, [5, 5, 1, 1, 1]);
    expect(decidePlacements(snapshot).targetId).toBe(enemy.id);
    enemy.gate = 6;
    const gated = decidePlacements(snapshot);
    const weaponValue = gated.placements
      .filter((p) => p.slot === "weaponA" || p.slot === "weaponB")
      .reduce(
        (sum, p) =>
          sum + (snapshot.dice.find((d) => d.uid === p.uid)?.value ?? 0),
        0,
      );
    expect(weaponValue).toBeGreaterThan(0);
  });

  it("keeps a lethal margin back under a probability storm", () => {
    const snapshot = makeSnapshot(["scavDrone"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.hp = 11;
    enemy.hpMax = 11;
    enemy.shield = 0;
    enemy.nextIntent = { t: "attack", n: 1 };
    setValues(snapshot, [6, 5, 1, 1, 1]);
    const calm = decidePlacements(snapshot);
    snapshot.nodeStorm = true;
    const stormy = decidePlacements(snapshot);
    expect(calm.targetId).toBe(enemy.id);
    expect(stormy.placements.length).toBeGreaterThan(0);
  });
});
