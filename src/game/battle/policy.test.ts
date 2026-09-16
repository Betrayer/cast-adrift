import { describe, expect, it } from "vitest";
import {
  applyEchoActive,
  applyOfficerActive,
  decidePlacements,
  decideReroll,
  echoLookUids,
  incomingEstimate,
  readyEcho,
  readyOfficers,
  secondLookGain,
} from "@/game/battle/policy";
import { echoToken, type EchoNodeId } from "@/data/echo";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import { createStreams } from "@/services/rng";
import type { FireModeId } from "@/data/fireModes";
import type { BattleSnapshot, SlotId } from "@/types/battle";

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

  it("does not spend the kill on a shelled body its parts still close", () => {
    const snapshot = makeSnapshot(["echoOfTheHeart"]);
    const body = snapshot.enemies[0];
    if (body === undefined) throw new Error("missing enemy");
    body.hp = 4;
    body.shield = 0;
    setValues(snapshot, [6, 6, 6, 4, 4]);
    const decision = decidePlacements(snapshot);
    expect(decision.targetId).toBe("enemy-0:valve");
  });

  it("passes over a guarded body while the enemy guarding it lives", () => {
    const snapshot = makeSnapshot(["coreFragment", "raider"]);
    const guarded = snapshot.enemies[0];
    const guard = snapshot.enemies[1];
    if (guarded === undefined || guard === undefined)
      throw new Error("missing enemy");
    guarded.hp = 5;
    guarded.shield = 0;
    guard.hp = 30;
    guard.shield = 0;
    setValues(snapshot, [2, 2, 1, 1, 1]);
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

describe("decidePlacements — fire modes", () => {
  const weaponsOnly = (snapshot: BattleSnapshot): void => {
    snapshot.slots = {
      weaponA: snapshot.slots.weaponA,
      weaponB: snapshot.slots.weaponB,
    };
  };

  const grant = (
    snapshot: BattleSnapshot,
    slotId: "weaponA" | "weaponB",
    modes: readonly FireModeId[],
  ): void => {
    const slot = snapshot.slots[slotId];
    if (slot === undefined) throw new Error(`missing ${slotId}`);
    snapshot.slots[slotId] = { ...slot, modes };
  };

  const modeIn = (
    decision: ReturnType<typeof decidePlacements>,
    slotId: SlotId,
  ): FireModeId | undefined =>
    decision.placements.find((p) => p.slot === slotId)?.mode;

  it("writes an explicit stance on every weapon placement", () => {
    const snapshot = makeSnapshot(["raider"]);
    weaponsOnly(snapshot);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    const decision = decidePlacements(snapshot);
    const weapons = decision.placements.filter(
      (p) => p.slot === "weaponA" || p.slot === "weaponB",
    );
    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((p) => p.mode === "direct")).toBe(true);
  });

  it("keeps «Прямой» while the chosen target can still absorb the whole die", () => {
    const snapshot = makeSnapshot(["raider", "raider"]);
    weaponsOnly(snapshot);
    for (const enemy of snapshot.enemies) {
      enemy.hp = 40;
      enemy.hpMax = 40;
      enemy.shield = 0;
      enemy.nextIntent = { t: "attack", n: 4 };
    }
    grant(snapshot, "weaponA", ["direct", "scatter"]);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(modeIn(decidePlacements(snapshot), "weaponA")).toBe("direct");
  });

  it("arms «Разлёт» once the focused hit would be thrown away", () => {
    const snapshot = makeSnapshot(["raider", "raider"]);
    weaponsOnly(snapshot);
    const [dying, healthy] = snapshot.enemies;
    if (dying === undefined || healthy === undefined) {
      throw new Error("missing enemies");
    }
    dying.hp = 2;
    dying.shield = 0;
    dying.nextIntent = { t: "attack", n: 4 };
    healthy.hp = 40;
    healthy.hpMax = 40;
    healthy.shield = 0;
    healthy.nextIntent = { t: "attack", n: 4 };
    grant(snapshot, "weaponA", ["direct", "scatter"]);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(modeIn(decidePlacements(snapshot), "weaponA")).toBe("scatter");
  });

  it("refuses «Разлёт» while only one enemy lives", () => {
    const snapshot = makeSnapshot(["raider"]);
    weaponsOnly(snapshot);
    grant(snapshot, "weaponA", ["direct", "scatter"]);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(modeIn(decidePlacements(snapshot), "weaponA")).toBe("direct");
  });

  it("arms «Дуплет» on an odd face and keeps «Прямой» on an even one", () => {
    const odd = makeSnapshot(["raider"], ["red-d6"]);
    weaponsOnly(odd);
    grant(odd, "weaponA", ["direct", "doublet"]);
    setValues(odd, [5]);
    expect(modeIn(decidePlacements(odd), "weaponA")).toBe("doublet");

    const even = makeSnapshot(["raider"], ["red-d6"]);
    weaponsOnly(even);
    grant(even, "weaponA", ["direct", "doublet"]);
    setValues(even, [6]);
    expect(modeIn(decidePlacements(even), "weaponA")).toBe("direct");
  });

  it("never arms «Шунт», because the score is this turn's damage only", () => {
    const snapshot = makeSnapshot(["raider"], ["red-d6"]);
    weaponsOnly(snapshot);
    snapshot.charge = 0;
    grant(snapshot, "weaponA", ["direct", "shunt"]);
    setValues(snapshot, [6]);
    expect(modeIn(decidePlacements(snapshot), "weaponA")).toBe("direct");
  });
});

describe("decidePlacements — officer actives", () => {
  const withOfficers = (
    snapshot: BattleSnapshot,
    officers: string[],
  ): BattleSnapshot => {
    snapshot.officers = officers;
    snapshot.charge = 10;
    return snapshot;
  };

  it("presses nothing when both cabins are empty", () => {
    const snapshot = makeSnapshot(["raider"]);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(decidePlacements(snapshot).active).toBeUndefined();
  });

  const marked = (): BattleSnapshot => {
    const snapshot = withOfficers(makeSnapshot(["raider"]), ["defector"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.hp = 60;
    enemy.hpMax = 60;
    enemy.subsystems = [];
    snapshot.targetId = enemy.id;
    setValues(snapshot, [6, 5, 4, 3, 2]);
    return snapshot;
  };

  it("presses «Целеуказание», because the mark shows up in the projection", () => {
    expect(decidePlacements(marked()).active).toBe("defector");
  });

  it("never presses the same officer twice in one battle", () => {
    expect(decidePlacements(marked(), ["defector"]).active).toBeUndefined();
  });

  it("refuses an active the reactor cannot pay for", () => {
    const snapshot = withOfficers(makeSnapshot(["raiderAlpha"]), ["scrapper"]);
    snapshot.hull = 4;
    snapshot.charge = 0;
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(readyOfficers(snapshot, [])).toHaveLength(0);
    expect(decidePlacements(snapshot).active).toBeUndefined();
  });

  it("refuses «Целеуказание» once the target is already marked past it", () => {
    const snapshot = withOfficers(makeSnapshot(["raiderAlpha"]), ["defector"]);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("missing enemy");
    enemy.statuses = { ...enemy.statuses, mark: 4 };
    snapshot.targetId = enemy.id;
    expect(readyOfficers(snapshot, [])).toHaveLength(0);
  });

  it("never presses «Перезапуск», whose reroll the drive loop cannot see", () => {
    const snapshot = withOfficers(makeSnapshot(["raiderAlpha"]), ["mechanic"]);
    setValues(snapshot, [6, 5, 4, 3, 2]);
    expect(readyOfficers(snapshot, [])).toHaveLength(1);
    expect(decidePlacements(snapshot).active).toBeUndefined();
  });

  it("applies «Аварийный ремонт» as hull for charge", () => {
    const snapshot = withOfficers(makeSnapshot(["raiderAlpha"]), ["scrapper"]);
    snapshot.hull = 10;
    snapshot.charge = 5;
    const after = applyOfficerActive(snapshot, "scrapper");
    expect(after.hull).toBe(11);
    expect(after.charge).toBe(4);
    expect(snapshot.hull).toBe(10);
  });
});


const withEcho = (
  snapshot: BattleSnapshot,
  echo: EchoNodeId,
): BattleSnapshot => ({ ...snapshot, echo });

describe("echo actives", () => {
  it("offers nothing when no node is equipped", () => {
    const snapshot = makeSnapshot(["raiderAlpha"]);
    expect(readyEcho(snapshot, [])).toBeUndefined();
    expect(echoLookUids(snapshot, [])).toEqual([]);
    expect(decidePlacements(snapshot).echo).toBeUndefined();
  });

  it("offers nothing for a node the battle never reads", () => {
    const snapshot = withEcho(makeSnapshot(["raiderAlpha"]), "reserve");
    expect(readyEcho(snapshot, [])).toBeUndefined();
    expect(echoLookUids(snapshot, [])).toEqual([]);
  });

  it("prices a second look at the exact expectation of keeping the better face", () => {
    const snapshot = makeSnapshot();
    setValues(snapshot, [1, 1, 6, 6, 6]);
    const lowest = snapshot.dice[0];
    if (lowest === undefined) throw new Error("missing die");
    expect(secondLookGain(lowest)).toBeCloseTo(
      (2 - 1 + (3 - 1) + (4 - 1) + (5 - 1) + (6 - 1)) / lowest.tier,
      6,
    );
    const topped = { ...lowest, value: lowest.tier };
    expect(secondLookGain(topped)).toBe(0);
  });

  it("takes the two lowest tray dice, and only while the look is worth a pip each", () => {
    const poor = withEcho(makeSnapshot(), "secondLook");
    setValues(poor, [1, 2, 6, 6, 6]);
    const uids = echoLookUids(poor, []);
    expect(uids).toHaveLength(2);
    expect(
      uids.map((uid) => poor.dice.find((d) => d.uid === uid)?.value),
    ).toEqual([1, 2]);

    const rich = withEcho(makeSnapshot(), "secondLook");
    setValues(rich, [6, 6, 6, 5, 5]);
    expect(echoLookUids(rich, [])).toEqual([]);
  });

  it("spends the look once per battle", () => {
    const snapshot = withEcho(makeSnapshot(), "secondLook");
    setValues(snapshot, [1, 1, 6, 6, 6]);
    expect(echoLookUids(snapshot, [])).toHaveLength(2);
    expect(echoLookUids(snapshot, [echoToken("secondLook")])).toEqual([]);
    expect(readyEcho(snapshot, [echoToken("secondLook")])).toBeUndefined();
  });

  it("carries «Расчёт» into the volley it is pressed for, without mutating the board", () => {
    const snapshot = withEcho(makeSnapshot(["raiderAlpha"]), "calculus");
    const after = applyEchoActive(snapshot, "calculus");
    expect(after.nextTurnMods.weapons).toBe(2);
    expect(snapshot.nextTurnMods.weapons).toBeUndefined();
  });

  it("leaves a board alone for a node that is not a placement-time active", () => {
    const snapshot = makeSnapshot(["raiderAlpha"]);
    expect(applyEchoActive(snapshot, "secondLook")).toBe(snapshot);
    expect(applyEchoActive(snapshot, "shieldEcho")).toBe(snapshot);
  });

  it("presses «Расчёт» when the extra pips still land on a living target", () => {
    const snapshot = withEcho(makeSnapshot(["raiderAlpha"]), "calculus");
    setValues(snapshot, [3, 3, 2, 2, 1]);
    expect(readyEcho(snapshot, [])).toBe("calculus");
    expect(decidePlacements(snapshot).echo).toBe("calculus");
  });

  it("declines «Расчёт» when the volley already empties the target", () => {
    const snapshot = withEcho(makeSnapshot(["scavDrone"]), "calculus");
    const target = snapshot.enemies[0];
    if (target === undefined) throw new Error("missing enemy");
    target.hp = 3;
    target.hpMax = 3;
    target.shield = 0;
    target.subsystems = [];
    target.nextIntent = { t: "attack", n: 1 };
    setValues(snapshot, [6, 6, 2, 1, 1]);
    expect(decidePlacements(snapshot).echo).toBeUndefined();
  });

  it("declines «Расчёт» once its token is spent", () => {
    const snapshot = withEcho(makeSnapshot(["raiderAlpha"]), "calculus");
    setValues(snapshot, [3, 3, 2, 2, 1]);
    expect(
      decidePlacements(snapshot, [echoToken("calculus")]).echo,
    ).toBeUndefined();
  });
});
