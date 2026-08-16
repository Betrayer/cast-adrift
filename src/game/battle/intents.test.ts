import { describe, expect, it } from "vitest";
import { ENEMY_BY_ID } from "@/data/enemies";
import { harnessDie, harnessSnap } from "@/game/battle/battleHarness";
import { applyWeaponDamage } from "@/game/battle/damage";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import {
  drawIntent,
  NEUTRAL_STEP_CONTEXT,
  spawnEnemy,
  stepCondHolds,
  stepContextFor,
} from "@/game/battle/setup";
import { createStream, createStreams } from "@/services/rng";
import type { BattleSnapshot, EnemyState } from "@/types/battle";
import type { Intent } from "@/types/content";

const stream = () => createStream(9090);

const armed = (defId: string, intent: Intent): EnemyState => ({
  ...spawnEnemy(defId, "enemy-0", stream()),
  nextIntent: intent,
});

const withEnemy = (
  enemy: EnemyState,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap([], {
    enemies: [enemy],
    targetId: enemy.id,
    hull: 60,
    hullMax: 60,
    ...over,
  });

describe("curseDie", () => {
  it("cuts the cursed die's roll for two turns and then lets go", () => {
    const enemy = armed("capWraith", { t: "curseDie", n: 3 });
    const snap = harnessSnap([harnessDie("d0", "red-d6", 6)], {
      enemies: [enemy],
      targetId: enemy.id,
      hull: 60,
      hullMax: 60,
    });
    const cursed = resolveEnemyPhase(snap, stream());
    expect(cursed.next.cursedDice).toHaveLength(1);
    expect(cursed.beats.some((b) => b.kind === "curse")).toBe(true);

    const t2 = advanceTurn(cursed.next, createStreams(3));
    const t3 = advanceTurn(t2, createStreams(4));
    const t4 = advanceTurn(t3, createStreams(5));
    expect(t4.cursedDice).toHaveLength(0);
  });

  it("never drives a face below 1", () => {
    const enemy = armed("capWraith", { t: "curseDie", n: 9 });
    const snap = harnessSnap([harnessDie("d0", "red-d6", 2)], {
      enemies: [enemy],
      targetId: enemy.id,
      hull: 60,
      hullMax: 60,
    });
    const cursed = resolveEnemyPhase(snap, stream());
    const rolled = advanceTurn(cursed.next, createStreams(11));
    expect(rolled.dice[0]?.value).toBe(1);
  });
});

describe("shieldGate", () => {
  it("absorbs a hit under the gate whole, and breaks on a hit that clears it", () => {
    const enemy = armed("anchorHulk", { t: "shieldGate", n: 6 });
    const gated = resolveEnemyPhase(withEnemy(enemy), stream());
    const live = gated.next.enemies[0];
    expect(live?.gate).toBe(6);
    if (live === undefined) return;

    const hpBefore = live.hp;
    expect(applyWeaponDamage(gated.next, { enemy: live }, 5)).toBe(0);
    expect(live.hp).toBe(hpBefore);

    expect(applyWeaponDamage(gated.next, { enemy: live }, 7)).toBe(7);
    expect(live.gate).toBe(0);
  });

  it("a mark reads straight past the gate", () => {
    const enemy = armed("anchorHulk", { t: "shieldGate", n: 6 });
    const gated = resolveEnemyPhase(withEnemy(enemy), stream());
    const live = gated.next.enemies[0];
    if (live === undefined) throw new Error("no enemy");
    live.statuses.mark = 1;
    expect(applyWeaponDamage(gated.next, { enemy: live }, 3)).toBe(5);
    expect(live.gate).toBe(6);
  });
});

describe("mirrorSchool", () => {
  it("hits for the size of the deepest single school, under the mirror cap", () => {
    const dice = [
      harnessDie("d0", "red-d6", 4),
      harnessDie("d1", "red-d6", 4),
      harnessDie("d2", "red-d6", 4),
      harnessDie("d3", "blue-d6", 4),
    ];
    const enemy = armed("slotMirror", { t: "mirrorSchool" });
    const snap = harnessSnap(dice, {
      enemies: [enemy],
      targetId: enemy.id,
      hull: 60,
      hullMax: 60,
    });
    const result = resolveEnemyPhase(snap, stream());
    expect(60 - result.next.hull).toBe(3);
  });
});

describe("drainCharge", () => {
  it("takes the charge and charges itself only when the player was holding it", () => {
    const hoarding = armed("capacitorWraith", { t: "drainCharge", n: 5 });
    const drained = resolveEnemyPhase(
      withEnemy(hoarding, { charge: 8 }),
      stream(),
    );
    expect(drained.next.charge).toBe(3);
    expect(drained.next.enemies[0]?.statuses.charge).toBe(1);

    const empty = armed("capacitorWraith", { t: "drainCharge", n: 5 });
    const nothing = resolveEnemyPhase(withEnemy(empty, { charge: 2 }), stream());
    expect(nothing.next.charge).toBe(0);
    expect(nothing.next.enemies[0]?.statuses.charge).toBeUndefined();
  });
});

describe("siphonShield", () => {
  it("moves the player's shield onto the enemy and never takes more than there is", () => {
    const enemy = armed("causalWard", { t: "siphonShield", n: 8 });
    const result = resolveEnemyPhase(withEnemy(enemy, { shield: 5 }), stream());
    expect(result.next.shield).toBe(0);
    expect(result.next.enemies[0]?.shield).toBe(5);
  });
});

describe("bargain", () => {
  it("takes the scrap and heals when the player can pay", () => {
    const enemy = armed("usurer", { t: "bargain", n: 6, heal: 4 });
    enemy.hp = enemy.hpMax - 10;
    const paid = resolveEnemyPhase(withEnemy(enemy, { scrap: 9 }), stream());
    expect(paid.next.scrap).toBe(3);
    expect(paid.next.enemies[0]?.hp).toBe(enemy.hpMax - 6);
    expect(paid.next.hull).toBe(60);
  });

  it("bills the refusal for exactly what paying would have cost", () => {
    const enemy = armed("usurer", { t: "bargain", n: 6, heal: 4 });
    const unpaid = resolveEnemyPhase(withEnemy(enemy, { scrap: 1 }), stream());
    expect(unpaid.next.scrap).toBe(1);
    expect(60 - unpaid.next.hull).toBe(6);
  });

  it("pays out of the run purse when the battle pot is empty", () => {
    const enemy = armed("usurer", { t: "bargain", n: 6, heal: 4 });
    enemy.hp = enemy.hpMax - 10;
    const paid = resolveEnemyPhase(
      withEnemy(enemy, { scrap: 0, runScrap: 20 }),
      stream(),
    );
    expect(paid.next.runScrap).toBe(14);
    expect(paid.next.stolenScrap).toBe(6);
    expect(paid.next.hull).toBe(60);
  });
});

describe("enrage", () => {
  it("stacks onto every later hit, and a sensor jam clears it on the Colossus", () => {
    const enemy = armed("cantorColossus", { t: "enrage", n: 2 });
    const raging = resolveEnemyPhase(withEnemy(enemy), stream());
    const live = raging.next.enemies[0];
    expect(live?.rage).toBe(2);
    if (live === undefined) return;

    live.nextIntent = { t: "attack", n: 10 };
    const hit = resolveEnemyPhase(
      { ...raging.next, hull: 60, hullMax: 60 },
      stream(),
    );
    expect(60 - hit.next.hull).toBeGreaterThanOrEqual(12);
  });
});

describe("hijack", () => {
  it("pins the highest tray die into a slot on the next roll", () => {
    const enemy = armed("dragnet", { t: "hijack" });
    const snap = harnessSnap(
      [harnessDie("d0", "red-d6", 2), harnessDie("d1", "red-d6", 6)],
      { enemies: [enemy], targetId: enemy.id, hull: 60, hullMax: 60 },
    );
    const grabbed = resolveEnemyPhase(snap, stream());
    expect(grabbed.next.pendingHijack).toBe(1);

    const rolled = advanceTurn(grabbed.next, createStreams(21));
    const pinned = rolled.dice.filter((d) => d.pinned === true);
    expect(pinned).toHaveLength(1);
    expect(pinned[0]?.state).toBe("placed");
    expect(rolled.pendingHijack).toBe(0);
    const slotId = pinned[0]?.slot;
    expect(slotId).toBeDefined();
    if (slotId === undefined) return;
    expect(rolled.slots[slotId]?.dieUid).toBe(pinned[0]?.uid);
  });
});

describe("jamSlot with a count", () => {
  it("shuts two slots in one beat", () => {
    const enemy = armed("censerDrone", { t: "jamSlot", k: 2 });
    const result = resolveEnemyPhase(withEnemy(enemy), stream());
    expect(result.next.blockedSlots).toHaveLength(2);
  });
});

describe("lockDie targeting", () => {
  it("takes the highest tray face when the intent asks for it", () => {
    const enemy = armed("leechSkiff", { t: "lockDie", target: "highest" });
    const snap = harnessSnap(
      [harnessDie("d0", "red-d6", 2), harnessDie("d1", "red-d6", 6)],
      { enemies: [enemy], targetId: enemy.id, hull: 60, hullMax: 60 },
    );
    const result = resolveEnemyPhase(snap, stream());
    expect(result.next.lockedDice[0]?.uid).toBe("d1");
  });
});

describe("enemy traits", () => {
  it("spikeCap truncates a single hit and leaves spread alone", () => {
    const golem = spawnEnemy("slagGolem", "enemy-0", stream());
    const snap = withEnemy(golem);
    expect(applyWeaponDamage(snap, { enemy: golem }, 20)).toBe(8);
  });

  it("alternating hulls eat a repeat hit on the same subsystem", () => {
    const twin = spawnEnemy("quarantineTwin", "enemy-0", stream());
    const snap = withEnemy(twin);
    const first = twin.subsystems[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(applyWeaponDamage(snap, { enemy: twin, subsystem: first }, 6)).toBe(6);
    expect(applyWeaponDamage(snap, { enemy: twin, subsystem: first }, 6)).toBe(0);
    const second = twin.subsystems[1];
    if (second === undefined) return;
    expect(applyWeaponDamage(snap, { enemy: twin, subsystem: second }, 6)).toBe(6);
  });

  it("the ward halves the school it is holding out and nothing else", () => {
    const sliver = spawnEnemy("coreSliver", "enemy-0", stream());
    sliver.ward = "red";
    const snap = withEnemy(sliver);
    expect(applyWeaponDamage(snap, { enemy: sliver }, 8, false, 2, false, "red")).toBe(4);
    expect(applyWeaponDamage(snap, { enemy: sliver }, 8, false, 2, false, "blue")).toBe(8);
  });

  it("the ward rotates to a different school on the enemy turn", () => {
    const sliver = armed("coreSliver", { t: "attack", n: 4 });
    const before = sliver.ward;
    const result = resolveEnemyPhase(withEnemy(sliver), stream());
    expect(result.next.enemies[0]?.ward).not.toBe(before);
    expect(result.beats.some((b) => b.kind === "ward")).toBe(true);
  });

  it("a sensor jam clears every block the Silencer holds", () => {
    const silencer = armed("silencer", { t: "jamSlot", k: 2 });
    const blocked = resolveEnemyPhase(withEnemy(silencer), stream());
    expect(blocked.next.blockedSlots.length).toBeGreaterThan(0);

    const snap = blocked.next;
    const die = harnessDie("s0", "red-d6", 6);
    die.state = "placed";
    die.slot = "sensors";
    snap.dice = [die];
    snap.slots.sensors = { cap: 6, mk: 1, dieUid: "s0" };
    snap.targetId = snap.enemies[0]?.id ?? null;
    const jammed = resolvePlayerPhase(snap);
    expect(jammed.next.blockedSlots).toHaveLength(0);
  });

  it("every reroll charges the Tollmaster", () => {
    const def = ENEMY_BY_ID.get("tollmaster");
    expect(def?.feedsOnReroll).toBe(true);
  });
});

describe("on-death effects", () => {
  const killWith = (defId: string, over: Partial<BattleSnapshot> = {}) => {
    const dying = spawnEnemy(defId, "enemy-0", stream());
    const ally = spawnEnemy("scavDrone", "enemy-1", stream());
    ally.hp = 1;
    const snap = harnessSnap([harnessDie("d0", "red-d6", 6)], {
      enemies: [dying, ally],
      targetId: dying.id,
      hull: 60,
      hullMax: 60,
      ...over,
    });
    applyWeaponDamage(snap, { enemy: dying }, 999);
    return { snap, ally };
  };

  it("healAllies patches the survivors", () => {
    const { snap, ally } = killWith("salvageWarden");
    expect(snap.enemies[1]?.hp).toBeGreaterThan(1);
    expect(ally.hp).toBeGreaterThan(1);
  });

  it("shieldAllies armours the survivors", () => {
    const { snap } = killWith("martyrThurible");
    expect(snap.enemies[1]?.shield).toBe(8);
  });

  it("chargeAllies charges the survivors", () => {
    const { snap } = killWith("retrocausalMote");
    expect(snap.enemies[1]?.statuses.charge).toBe(1);
  });

  it("stealScrap takes the hold with it", () => {
    const { snap } = killWith("scrapKite", { scrap: 10 });
    expect(snap.scrap).toBe(4);
  });

  it("curseDie sours the best face left in the tray", () => {
    const { snap } = killWith("riftWidow");
    expect(snap.cursedDice).toHaveLength(1);
    expect(snap.cursedDice?.[0]?.n).toBe(3);
  });
});

describe("conditional pattern steps", () => {
  const cond = (over: Partial<Parameters<typeof stepCondHolds>[1]> = {}) => ({
    ...NEUTRAL_STEP_CONTEXT,
    ...over,
  });

  it("reads each condition off the battle state", () => {
    expect(stepCondHolds({ c: "selfHpPctLt", n: 40 }, cond({ selfHpPct: 30 }))).toBe(true);
    expect(stepCondHolds({ c: "selfHpPctLt", n: 40 }, cond({ selfHpPct: 55 }))).toBe(false);
    expect(stepCondHolds({ c: "selfShielded" }, cond({ selfShield: 4 }))).toBe(true);
    expect(stepCondHolds({ c: "playerShielded" }, cond({ playerShield: 0 }))).toBe(false);
    expect(
      stepCondHolds({ c: "playerChargeAtLeast", n: 5 }, cond({ playerCharge: 5 })),
    ).toBe(true);
    expect(
      stepCondHolds({ c: "playerHullPctLt", n: 50 }, cond({ playerHullPct: 49 })),
    ).toBe(true);
    expect(stepCondHolds({ c: "alliesAtLeast", n: 2 }, cond({ allies: 1 }))).toBe(false);
    expect(stepCondHolds({ c: "turnGte", n: 4 }, cond({ turn: 4 }))).toBe(true);
  });

  it("the Raider drops its shield beat below 40% hull", () => {
    const raider = ENEMY_BY_ID.get("raider");
    expect(raider).toBeDefined();
    if (raider === undefined) return;
    const healthy = spawnEnemy("raider", "enemy-0", stream());
    const hurt = spawnEnemy("raider", "enemy-0", stream());
    hurt.hp = Math.floor(hurt.hpMax * 0.2);
    const snap = withEnemy(healthy);

    const full = drawIntent(raider, 1, stream(), 0, 0, stepContextFor(snap, healthy));
    const bloodied = drawIntent(raider, 1, stream(), 0, 0, stepContextFor(snap, hurt));
    expect(full.t).toBe("shield");
    expect(bloodied.t).toBe("multi");
  });

  it("spawns on the neutral reading, so the first telegraph is honest", () => {
    const raider = ENEMY_BY_ID.get("raider");
    if (raider === undefined) return;
    expect(drawIntent(raider, 1, stream()).t).toBe("shield");
  });
});
