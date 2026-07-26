import { describe, expect, it } from "vitest";
import { harnessDie, harnessSnap } from "@/game/battle/battleHarness";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import {
  phaseIndexForHp,
  spawnEnemy,
  type SpawnInit,
} from "@/game/battle/setup";
import { BOSS_BY_ID } from "@/data/enemies";
import { createStream, createStreams } from "@/services/rng";
import type { BattleSnapshot, EnemyState } from "@/types/battle";

const stream = () => createStream(4242);

const boss = (id: string, init: SpawnInit = {}): EnemyState =>
  spawnEnemy(id, "enemy-0", stream(), init);

const withEnemy = (
  enemy: EnemyState,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap([], { enemies: [enemy], targetId: enemy.id, ...over });

const killSubsystem = (enemy: EnemyState, key: string): void => {
  const sub = enemy.subsystems.find((s) => s.key === key);
  if (sub === undefined) throw new Error(`no subsystem ${key}`);
  sub.hp = 0;
};

const hullLost = (snap: BattleSnapshot, after: BattleSnapshot): number =>
  snap.hull - after.hull;

describe("Quarantine Warden", () => {
  it("Lance aura adds +3 to its attack and stops when the lance dies", () => {
    const armed = boss("quarantineWarden");
    armed.nextIntent = { t: "attack", n: 8 };
    const withLance = resolveEnemyPhase(
      withEnemy(armed, { hull: 60, hullMax: 60 }),
      stream(),
    );

    const stripped = boss("quarantineWarden");
    stripped.nextIntent = { t: "attack", n: 8 };
    killSubsystem(stripped, "lance");
    const withoutLance = resolveEnemyPhase(
      withEnemy(stripped, { hull: 60, hullMax: 60 }),
      stream(),
    );

    const armedDamage = 60 - withLance.next.hull;
    const strippedDamage = 60 - withoutLance.next.hull;
    expect(armedDamage - strippedDamage).toBe(3);
  });

  it("Aegis aura shields the boss every enemy turn", () => {
    const enemy = boss("quarantineWarden");
    enemy.nextIntent = { t: "charge" };
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(result.next.enemies[0]?.shield).toBe(6);
  });

  it("drops into the jam phase below 50% hp and shields on entry", () => {
    const def = BOSS_BY_ID.get("quarantineWarden");
    expect(def).toBeDefined();
    const enemy = boss("quarantineWarden");
    expect(enemy.phase).toBe(0);
    enemy.hp = Math.floor(enemy.hpMax * 0.4);
    killSubsystem(enemy, "aegis");
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    const after = result.next.enemies[0];
    expect(after?.phase).toBe(1);
    expect(result.beats.some((b) => b.kind === "phase")).toBe(true);
    expect(after?.shield).toBeGreaterThanOrEqual(8);
  });
});

describe("Breaker Barge", () => {
  it("Grinder aura steals scrap when its attack lands", () => {
    const enemy = boss("breakerBarge");
    enemy.nextIntent = { t: "attack", n: 8 };
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60, scrap: 2 }),
      stream(),
    );
    expect(result.beats.some((b) => b.kind === "steal")).toBe(true);
    expect(result.next.scrap).toBe(0);
    expect(result.next.stolenScrap).toBe(4);
  });

  it("Crane aura locks a tray die on every third turn", () => {
    const enemy = boss("breakerBarge");
    enemy.nextIntent = { t: "charge" };
    const dice = [harnessDie("d0", "red-d6", 4)];
    const quiet = resolveEnemyPhase(
      harnessSnap(dice, { turn: 2, enemies: [enemy], targetId: enemy.id }),
      stream(),
    );
    expect(quiet.next.lockedDice).toHaveLength(0);

    const enemy3 = boss("breakerBarge");
    enemy3.nextIntent = { t: "charge" };
    const locked = resolveEnemyPhase(
      harnessSnap([harnessDie("d0", "red-d6", 4)], {
        turn: 3,
        enemies: [enemy3],
        targetId: enemy3.id,
      }),
      stream(),
    );
    expect(locked.next.lockedDice).toHaveLength(1);
  });
});

describe("Rift Maw", () => {
  it("both Maw-Eyes queue a twist each turn, and the twist keeps the worse roll", () => {
    const enemy = boss("riftMaw");
    enemy.nextIntent = { t: "charge" };
    const snap = harnessSnap([harnessDie("d0", "red-d6", 6)], {
      enemies: [enemy],
      targetId: enemy.id,
    });
    const result = resolveEnemyPhase(snap, stream());
    expect(result.next.pendingTwist).toBe(2);

    const advanced = advanceTurn(result.next, createStreams(99));
    const die = advanced.dice[0];
    expect(die).toBeDefined();
    expect(advanced.pendingTwist).toBe(0);
    expect(die?.value).toBeLessThanOrEqual(6);
  });

  it("phase 2 shrinks a slot cap for one turn", () => {
    const enemy = boss("riftMaw");
    enemy.hp = Math.floor(enemy.hpMax * 0.3);
    for (const sub of enemy.subsystems) sub.hp = 0;
    enemy.nextIntent = { t: "charge" };
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(result.next.enemies[0]?.phase).toBe(1);
    expect(result.next.shrunkSlots.length).toBeGreaterThan(0);
    const shrunk = result.next.shrunkSlots[0];
    expect(shrunk?.untilTurn).toBe(result.next.turn + 1);
  });
});

describe("Choir Flagship", () => {
  it("the Voice summons an acolyte on every fourth turn", () => {
    const enemy = boss("choirFlagship");
    enemy.nextIntent = { t: "charge" };
    const result = resolveEnemyPhase(
      harnessSnap([], { turn: 4, enemies: [enemy], targetId: enemy.id }),
      stream(),
    );
    expect(result.next.enemies.some((e) => e.defId === "choirAcolyte")).toBe(
      true,
    );
  });

  it("the Hymn Spire charges every third turn, not every turn", () => {
    const quietEnemy = boss("choirFlagship");
    quietEnemy.nextIntent = { t: "attack", n: 9 };
    const quiet = resolveEnemyPhase(
      harnessSnap([], { turn: 2, enemies: [quietEnemy], targetId: quietEnemy.id, hull: 60, hullMax: 60 }),
      stream(),
    );

    const hymnEnemy = boss("choirFlagship");
    hymnEnemy.nextIntent = { t: "attack", n: 9 };
    const hymn = resolveEnemyPhase(
      harnessSnap([], { turn: 3, enemies: [hymnEnemy], targetId: hymnEnemy.id, hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(60 - hymn.next.hull).toBeGreaterThan(60 - quiet.next.hull);
  });
});

describe("The Core Heart", () => {
  it("the shell keeps the body immune while a valve lives", () => {
    const enemy = boss("coreHeart");
    const snap = withEnemy(enemy, { hull: 60, hullMax: 60 });
    const placed = harnessDie("d0", "red-d6", 6);
    placed.state = "placed";
    placed.slot = "weaponA";
    snap.dice = [placed];
    snap.slots.weaponA = { cap: 8, mk: 1, dieUid: "d0" };
    snap.targetId = enemy.id;
    const before = snap.enemies[0]?.hp ?? 0;
    const result = resolvePlayerPhase(snap);
    expect(result.next.enemies[0]?.hp).toBe(before);

    for (const sub of snap.enemies[0]?.subsystems ?? []) sub.hp = 0;
    const cracked = resolvePlayerPhase(snap);
    expect(cracked.next.enemies[0]?.hp).toBeLessThan(before);
  });

  it("phase 3 storms the tray: two dice get nudged on the next roll", () => {
    const enemy = boss("coreHeart");
    enemy.hp = Math.floor(enemy.hpMax * 0.1);
    for (const sub of enemy.subsystems) sub.hp = 0;
    enemy.nextIntent = { t: "charge" };
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(result.next.enemies[0]?.phase).toBe(2);
    expect(result.next.pendingStorm).toBeGreaterThan(0);
  });
});

describe("phase selection", () => {
  it("maps hp% to the first phase still above its floor", () => {
    const def = BOSS_BY_ID.get("coreHeart");
    expect(def).toBeDefined();
    if (def === undefined) return;
    expect(phaseIndexForHp(def, 100, 100)).toBe(0);
    expect(phaseIndexForHp(def, 50, 100)).toBe(1);
    expect(phaseIndexForHp(def, 10, 100)).toBe(2);
  });

  it("A5 opens bosses in their late-fight pattern", () => {
    const plain = boss("quarantineWarden");
    const ascended = boss("quarantineWarden", { ascension: 5 });
    expect(plain.phase).toBe(0);
    expect(ascended.phase).toBe(1);
  });

  it("A1 inflates enemy hull by the requested percentage", () => {
    const plain = boss("quarantineWarden");
    const ascended = boss("quarantineWarden", { hpBonusPct: 10 });
    expect(ascended.hpMax).toBe(Math.round(plain.hpMax * 1.1));
  });
});

describe("hull accounting sanity", () => {
  it("a boss attack removes hull, not more than it deals", () => {
    const enemy = boss("quarantineWarden");
    killSubsystem(enemy, "lance");
    enemy.nextIntent = { t: "attack", n: 8 };
    const snap = withEnemy(enemy, { hull: 60, hullMax: 60 });
    const result = resolveEnemyPhase(snap, stream());
    expect(hullLost(snap, result.next)).toBe(8);
  });
});
