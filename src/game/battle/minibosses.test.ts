import { describe, expect, it } from "vitest";
import { harnessDie, harnessSnap } from "@/game/battle/battleHarness";
import { applyWeaponDamage } from "@/game/battle/damage";
import { advanceTurn, resolveEnemyPhase } from "@/game/battle/resolver";
import {
  effectiveCap,
  spawnEnemy,
} from "@/game/battle/setup";
import { sectorDef } from "@/data/sectors";
import { sectorHpPct } from "@/game/run/encounter";
import { createStream, createStreams } from "@/services/rng";
import type { BattleSnapshot, EnemyState } from "@/types/battle";

const stream = () => createStream(777);

const gate = (id: string): EnemyState => spawnEnemy(id, "enemy-0", stream());

const withEnemy = (
  enemy: EnemyState,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap([], { enemies: [enemy], targetId: enemy.id, ...over });

describe("Convoy Alpha — kill order", () => {
  it("the flagship is immune until every escort is dead", () => {
    const enemy = gate("convoyAlpha");
    const snap = withEnemy(enemy);
    const before = enemy.hp;
    expect(applyWeaponDamage(snap, { enemy }, 20)).toBe(0);
    expect(enemy.hp).toBe(before);

    for (const sub of enemy.subsystems) sub.hp = 0;
    expect(applyWeaponDamage(snap, { enemy }, 20)).toBe(20);
    expect(enemy.hp).toBe(Math.max(0, before - 20));
  });
});

describe("Warden Fragment — weak to mark", () => {
  it("takes double the mark bonus", () => {
    const marked = gate("wardenFragment");
    marked.statuses.mark = 1;
    const markedSnap = withEnemy(marked);
    const markedDealt = applyWeaponDamage(markedSnap, { enemy: marked }, 5, false, 2);

    const plain = spawnEnemy("raider", "enemy-0", stream());
    plain.statuses.mark = 1;
    const plainSnap = withEnemy(plain);
    const plainDealt = applyWeaponDamage(plainSnap, { enemy: plain }, 5, false, 2);

    expect(plainDealt).toBe(7);
    expect(markedDealt).toBe(9);
  });
});

describe("Leech Queen — mass die-lock", () => {
  it("locks a tray die every turn on top of its pattern", () => {
    const enemy = gate("leechQueen");
    const snap = harnessSnap(
      [harnessDie("d0", "red-d6", 5), harnessDie("d1", "blue-d6", 3)],
      { enemies: [enemy], targetId: enemy.id, hull: 60, hullMax: 60 },
    );
    const result = resolveEnemyPhase(snap, stream());
    expect(result.next.lockedDice.length).toBeGreaterThanOrEqual(1);
  });

  it("summons a skiff once it drops below half", () => {
    const enemy = gate("leechQueen");
    enemy.hp = Math.floor(enemy.hpMax * 0.4);
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(result.next.enemies[0]?.phase).toBe(1);
  });
});

describe("Mine Tyrant", () => {
  it("spawns a mine every turn", () => {
    const enemy = gate("mineTyrant");
    const result = resolveEnemyPhase(
      withEnemy(enemy, { hull: 60, hullMax: 60 }),
      stream(),
    );
    expect(result.next.enemies.some((e) => e.defId === "mine")).toBe(true);
  });
});

describe("Mirror Hull — anti-burst", () => {
  it("reflects half of last turn's player damage", () => {
    const enemy = gate("mirrorHull");
    enemy.nextIntent = { t: "mirrorHalf" };
    const snap = withEnemy(enemy, {
      hull: 60,
      hullMax: 60,
      lastPlayerDamage: 14,
      tide: 0,
    });
    const result = resolveEnemyPhase(snap, stream());
    expect(60 - result.next.hull).toBe(7);
  });

  it("is capped so it cannot one-shot a full hull", () => {
    const enemy = gate("mirrorHull");
    enemy.nextIntent = { t: "mirrorHalf" };
    const snap = withEnemy(enemy, {
      hull: 60,
      hullMax: 60,
      lastPlayerDamage: 400,
      tide: 0,
    });
    const result = resolveEnemyPhase(snap, stream());
    expect(60 - result.next.hull).toBe(12);
  });
});

describe("cap shrink", () => {
  it("drops a slot one tier for exactly one turn", () => {
    const enemy = spawnEnemy("riftling", "enemy-0", stream());
    enemy.nextIntent = { t: "capShrink" };
    const snap = withEnemy(enemy, { hull: 60, hullMax: 60 });
    const result = resolveEnemyPhase(snap, stream());
    const shrunk = result.next.shrunkSlots[0];
    expect(shrunk).toBeDefined();
    if (shrunk === undefined) return;

    const slot = result.next.slots[shrunk.slot];
    expect(slot).toBeDefined();
    if (slot === undefined) return;
    expect(effectiveCap(result.next, shrunk.slot, slot)).toBeLessThan(slot.cap);

    const nextTurn = advanceTurn(result.next, createStreams(5));
    expect(effectiveCap(nextTurn, shrunk.slot, slot)).toBeLessThan(slot.cap);
    const turnAfter = advanceTurn(nextTurn, createStreams(6));
    expect(effectiveCap(turnAfter, shrunk.slot, slot)).toBe(slot.cap);
  });
});

describe("sector curve", () => {
  it("scales every enemy with the sector it spawns in", () => {
    expect(sectorHpPct({ sector: 1 })).toBe(0);
    expect(sectorHpPct({ sector: 5 })).toBe(sectorDef(5).scaling.hpPct);
    const lateMult = 1 + sectorDef(5).scaling.hpPct / 100;
    const early = spawnEnemy("mirrorHull", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 1 }),
    });
    const late = spawnEnemy("mirrorHull", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 5 }),
    });
    expect(late.hpMax).toBe(Math.round(early.hpMax * lateMult));

    const bossEarly = spawnEnemy("coreHeart", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 1 }),
    });
    const bossLate = spawnEnemy("coreHeart", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 5 }),
    });
    expect(bossLate.hpMax).toBe(Math.round(bossEarly.hpMax * lateMult));
  });

  it("adds the pocket surcharge on top of the sector curve", () => {
    expect(sectorHpPct({ sector: 3, pocket: true })).toBe(
      sectorDef(3).scaling.hpPct + sectorDef(3).scaling.pocketPct,
    );
    const plain = spawnEnemy("riftling", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 3 }),
    });
    const pocket = spawnEnemy("riftling", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 3, pocket: true }),
    });
    expect(pocket.hpMax).toBeGreaterThan(plain.hpMax);
  });
});

describe("sector-5 signatures", () => {
  it("Core Fragment is immune while another enemy lives", () => {
    const fragment = spawnEnemy("coreFragment", "enemy-0", stream());
    const escort = spawnEnemy("nullDrone", "enemy-1", stream());
    const snap = harnessSnap([], {
      enemies: [fragment, escort],
      targetId: fragment.id,
    });
    expect(applyWeaponDamage(snap, { enemy: fragment }, 15)).toBe(0);
    escort.hp = 0;
    expect(applyWeaponDamage(snap, { enemy: fragment }, 15)).toBe(15);
  });

  it("Probability Knot swaps the tray's highest and lowest values", () => {
    const enemy = spawnEnemy("probabilityKnot", "enemy-0", stream());
    enemy.nextIntent = { t: "swapValues" };
    const snap = harnessSnap(
      [harnessDie("d0", "red-d6", 6), harnessDie("d1", "blue-d6", 1)],
      { enemies: [enemy], targetId: enemy.id, hull: 60, hullMax: 60 },
    );
    const result = resolveEnemyPhase(snap, stream());
    expect(result.next.pendingSwap).toBe(1);
  });

  it("Unstable Core explodes for 6 when it dies", () => {
    const enemy = spawnEnemy("unstableCore", "enemy-0", stream());
    enemy.hp = 4;
    const snap = withEnemy(enemy, { hull: 30, hullMax: 30, shield: 0 });
    applyWeaponDamage(snap, { enemy }, 10);
    expect(enemy.hp).toBe(0);
    expect(snap.hull).toBe(24);
  });
});
