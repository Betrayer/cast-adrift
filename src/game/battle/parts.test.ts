import { beforeEach, describe, expect, it } from "vitest";
import {
  harnessBoard,
  harnessDie,
  harnessSnap,
  place,
} from "@/game/battle/battleHarness";
import {
  applyWeaponDamage,
  isBodyImmune,
  reaimOffLockedCore,
} from "@/game/battle/damage";
import {
  enemyFixture,
  registerEnemyFixtures,
} from "@/game/battle/enemyFixtures";
import { logEntriesFrom } from "@/game/battle/log";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import {
  buildBattleSnapshot,
  MAX_ENEMIES,
  spawnEnemy,
} from "@/game/battle/setup";
import { enemyForecast } from "@/game/battle/view/forecast";
import { createStream, createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  hydrateBattle,
  serializeBattle,
  useBattleStore,
} from "@/stores/battleStore";
import type { BattleSnapshot, EnemyState } from "@/types/battle";
import type { EnemyDef } from "@/types/content";

const FIXTURES: readonly EnemyDef[] = [
  enemyFixture({
    id: "fxRig",
    hp: 40,
    shell: true,
    coreLockAt: 1,
    pattern: [{ t: "attack", n: 4 }],
    subsystems: [
      {
        id: "gun",
        name: "content:enemies.fxRig.sub.gun",
        hp: 6,
        intents: [
          { t: "attack", n: 3 },
          { t: "attack", n: 9 },
        ],
      },
      { id: "mount", name: "content:enemies.fxRig", hp: 4 },
      { id: "frame", name: "content:enemies.fxRig", hp: 8 },
    ],
  }),
  enemyFixture({
    id: "fxHatch",
    hp: 30,
    shell: true,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      {
        id: "hatch",
        name: "content:enemies.fxHatch",
        hp: 4,
        onDeath: { t: "openCore", turns: 2 },
      },
      { id: "strut", name: "content:enemies.fxHatch", hp: 4 },
    ],
  }),
  enemyFixture({
    id: "fxBoom",
    hp: 30,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      {
        id: "cell",
        name: "content:enemies.fxBoom",
        hp: 4,
        onDeath: { t: "explodePart", n: 6 },
      },
    ],
  }),
  enemyFixture({
    id: "fxNerve",
    hp: 30,
    pattern: [{ t: "attack", n: 3 }],
    subsystems: [
      {
        id: "nerve",
        name: "content:enemies.fxNerve",
        hp: 4,
        onDeath: { t: "enrageCore", n: 5 },
      },
    ],
  }),
  enemyFixture({
    id: "fxBay",
    hp: 30,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      {
        id: "bay",
        name: "content:enemies.fxBay",
        hp: 4,
        onDeath: { t: "spawnAdds", id: "raider" },
      },
    ],
  }),
  enemyFixture({
    id: "fxTwin",
    hp: 30,
    shell: true,
    alternating: true,
    coreLockAt: 1,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      { id: "left", name: "content:enemies.fxTwin", hp: 12 },
      { id: "right", name: "content:enemies.fxTwin", hp: 12 },
    ],
  }),
  enemyFixture({
    id: "fxMixed",
    hp: 30,
    shell: true,
    coreLockAt: 1,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      {
        id: "charge",
        name: "content:enemies.fxMixed",
        hp: 3,
        onDeath: { t: "explodePart", n: 6 },
      },
      { id: "strut", name: "content:enemies.fxMixed", hp: 4 },
      { id: "spar", name: "content:enemies.fxMixed", hp: 9 },
    ],
  }),
  enemyFixture({
    id: "fxFragile",
    hp: 8,
    pattern: [{ t: "attack", n: 1 }],
    subsystems: [
      {
        id: "pod",
        name: "content:enemies.fxFragile",
        hp: 6,
        onDeath: { t: "explodePart", n: 9 },
      },
    ],
  }),
];

registerEnemyFixtures(FIXTURES);

const stream = () => createStream(4242);

const spawned = (defId: string, index = 0): EnemyState =>
  spawnEnemy(defId, `enemy-${String(index)}`, stream());

const boardWith = (
  enemies: EnemyState[],
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessBoard(enemies, [], { hull: 200, hullMax: 200, ...over });

const bodyOf = (snap: BattleSnapshot): EnemyState => {
  const enemy = snap.enemies[0];
  if (enemy === undefined) throw new Error("bodyOf: the board is empty");
  return enemy;
};

const partOf = (enemy: EnemyState, key: string) => {
  const part = enemy.subsystems.find((s) => s.key === key);
  if (part === undefined) throw new Error(`partOf: no "${key}"`);
  return part;
};

describe("parts act", () => {
  it("resolves a part's own intent in the enemy phase and lands its damage", () => {
    const enemy = spawned("fxRig");
    const snap = boardWith([enemy]);
    const { next, beats } = resolveEnemyPhase(snap, stream());

    expect(snap.hull - next.hull).toBe(7);
    const shot = beats.find(
      (b) => b.kind === "attack" && b.partId !== undefined,
    );
    expect(shot?.enemyId).toBe("enemy-0");
    expect(shot?.partId).toBe("enemy-0:gun");
    expect(
      beats.every((b) => !b.enemyId.includes(":")),
      "a beat actor is always a body, never a part instance",
    ).toBe(true);
  });

  it("names the acting part in the journal and keeps the enemy as the actor", () => {
    const snap = boardWith([spawned("fxRig")]);
    const bundle = resolveEnemyPhase(snap, stream());
    const entries = logEntriesFrom(
      {
        beats: [],
        enemyBeats: bundle.beats,
        final: bundle.next,
        finalPhase: "placement",
      },
      { turn: 1, seq: 1, enemies: snap.enemies },
    );
    const rows = entries.filter((e) => e.kind === "attack" && e.side === "foe");
    expect(rows.every((e) => e.actor === "fxRig")).toBe(true);
    expect(rows.map((e) => e.targetName)).toContain(
      "content:enemies.fxRig.sub.gun",
    );
  });

  it("advances the part's own pattern independently of the body", () => {
    const first = resolveEnemyPhase(boardWith([spawned("fxRig")]), stream());
    const second = resolveEnemyPhase(first.next, stream());

    expect(first.next.hull - second.next.hull).toBe(13);
  });

  it("keeps a dead body's parts silent while a live body's part acts", () => {
    const live = spawned("fxRig", 0);
    const wreck = spawned("fxRig", 1);
    wreck.hp = 0;
    const snap = boardWith([live, wreck]);
    const { next, beats } = resolveEnemyPhase(snap, stream());

    const resolvedWreck = next.enemies.find((e) => e.id === wreck.id);
    if (resolvedWreck === undefined) throw new Error("wreck left the board");
    expect(partOf(resolvedWreck, "gun").hp).toBeGreaterThan(0);
    expect(snap.hull - next.hull).toBe(7);
    expect(beats.some((b) => b.partId === "enemy-1:gun")).toBe(false);
  });
});

describe("forecast", () => {
  it("counts every living part's intent in the incoming sum", () => {
    const snap = boardWith([spawned("fxRig")]);
    const forecast = enemyForecast(snap);
    const { next } = resolvePlayerPhase(snap);
    const realised = resolveEnemyPhase(next, stream());

    expect(forecast.incoming).toBe(7);
    expect(forecast.incoming).toBe(next.hull - realised.next.hull);
  });
});

describe("core lock", () => {
  it("keeps the body shut while more than coreLockAt core parts live", () => {
    const enemy = spawned("fxRig");
    const snap = boardWith([enemy]);

    expect(isBodyImmune(snap, enemy)).toBe(true);
    expect(applyWeaponDamage(snap, { enemy }, 10)).toBe(0);

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "gun") }, 20);
    expect(isBodyImmune(snap, enemy)).toBe(true);

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "mount") }, 20);
    expect(isBodyImmune(snap, enemy)).toBe(false);
    expect(applyWeaponDamage(snap, { enemy }, 10)).toBe(10);
    expect(enemy.hp).toBe(30);
  });

  it("openCore opens the body for exactly N turns, counting the one it broke on", () => {
    const enemy = spawned("fxHatch");
    const snap = boardWith([enemy]);
    snap.turn = 1;

    expect(isBodyImmune(snap, enemy)).toBe(true);
    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "hatch") }, 20);

    expect(partOf(enemy, "strut").hp).toBeGreaterThan(0);
    expect(isBodyImmune(snap, enemy)).toBe(false);
    snap.turn = 2;
    expect(isBodyImmune(snap, enemy)).toBe(false);
    snap.turn = 3;
    expect(isBodyImmune(snap, enemy)).toBe(true);
  });

  it("retargets to the next living part while locked and to the body once open", () => {
    const enemy = spawned("fxRig");
    const snap = boardWith([enemy]);

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "gun") }, 20);
    expect(snap.targetId).toBe("enemy-0:mount");

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "mount") }, 20);
    expect(snap.targetId).toBe("enemy-0");
  });
});

describe("part death effects", () => {
  it("explodePart spends the shield before the hull", () => {
    const enemy = spawned("fxBoom");
    const snap = boardWith([enemy], { hull: 30, hullMax: 30, shield: 4 });

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "cell") }, 9);

    expect(snap.shield).toBe(0);
    expect(snap.hull).toBe(28);
  });

  it("enrageCore raises every later hit the body lands", () => {
    const enemy = spawned("fxNerve");
    const snap = boardWith([enemy], { hull: 60, hullMax: 60 });

    const before = resolveEnemyPhase(snap, stream());
    expect(snap.hull - before.next.hull).toBe(3);

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "nerve") }, 9);
    const after = resolveEnemyPhase(snap, stream());
    expect(snap.hull - after.next.hull).toBe(8);
  });

  it("spawnAdds lands a body on the next enemy phase", () => {
    const enemy = spawned("fxBay");
    const snap = boardWith([enemy]);

    applyWeaponDamage(snap, { enemy, subsystem: partOf(enemy, "bay") }, 9);
    expect(snap.enemies).toHaveLength(1);

    const { next } = resolveEnemyPhase(snap, stream());
    expect(next.enemies).toHaveLength(2);
    expect(next.enemies[1]?.defId).toBe("raider");
  });

  it("spawnAdds fills the last free slot and drops the add on a full board", () => {
    const withRoom = spawned("fxBay");
    const roomy = boardWith([withRoom, spawned("raider", 1)]);
    applyWeaponDamage(
      roomy,
      { enemy: withRoom, subsystem: partOf(withRoom, "bay") },
      9,
    );
    const filled = resolveEnemyPhase(roomy, stream());
    expect(filled.next.enemies).toHaveLength(MAX_ENEMIES);

    const crowded = spawned("fxBay");
    const full = boardWith([crowded, spawned("raider", 1), spawned("raider", 2)]);
    expect(full.enemies).toHaveLength(MAX_ENEMIES);
    applyWeaponDamage(
      full,
      { enemy: crowded, subsystem: partOf(crowded, "bay") },
      9,
    );
    const capped = resolveEnemyPhase(full, stream());

    expect(capped.next.enemies).toHaveLength(MAX_ENEMIES);
    expect(capped.next.pendingAdds ?? []).toHaveLength(0);
  });

  it("fires on a shot that kills the part and stays silent when the body dies", () => {
    const shot = spawned("fxFragile");
    const aimed = boardWith([shot], { hull: 30, hullMax: 30, shield: 0 });
    applyWeaponDamage(aimed, { enemy: shot, subsystem: partOf(shot, "pod") }, 20);
    expect(aimed.hull).toBe(21);
    expect(aimed.partsDowned ?? []).toHaveLength(1);

    const enemy = spawned("fxFragile");
    const snap = boardWith([enemy], { hull: 30, hullMax: 30, shield: 0 });
    applyWeaponDamage(snap, { enemy }, 20);

    expect(enemy.hp).toBe(0);
    expect(partOf(enemy, "pod").hp).toBe(0);
    expect(snap.hull).toBe(30);
    expect(snap.partsDowned ?? []).toHaveLength(0);
  });
});

describe("partDown beat", () => {
  it("reaches the player phase carrying the part's id", () => {
    const enemy = spawned("fxBoom");
    const die = harnessDie("d0", "ember", 6);
    const snap = harnessSnap([die], {
      enemies: [enemy],
      targetId: partOf(enemy, "cell").id,
      hull: 60,
      hullMax: 60,
    });
    place(snap, "d0", "weaponA");

    const { next, beats } = resolvePlayerPhase(snap);
    const beat = beats.find((b) => b.kind === "partDown");

    expect(beat?.targetId).toBe("enemy-0:cell");
    expect(beat?.slot).toBe("weaponA");
    expect(next.partsDowned ?? []).toHaveLength(0);
  });
});

describe("persistence", () => {
  beforeEach(() => {
    useBattleStore.setState(useBattleStore.getInitialState(), true);
    useBattleStore.setState(createInitialBattleValues());
  });

  it("backfills the new snapshot fields and leaves an intent-less part inert", () => {
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["fxHatch"] }, ["ember"], createStreams(7));
    const save = serializeBattle();
    if (save === null) throw new Error("serializeBattle: no live battle");

    const aged = {
      ...save,
      values: { ...save.values },
    };
    delete (aged.values as Partial<typeof save.values>).pendingAdds;
    delete (aged.values as Partial<typeof save.values>).partsDowned;
    hydrateBattle(aged);

    const state = useBattleStore.getState();
    expect(state.pendingAdds).toEqual([]);
    expect(state.partsDowned).toEqual([]);

    const enemy = state.enemies[0];
    if (enemy === undefined) throw new Error("no enemy hydrated");
    expect(partOf(enemy, "strut").nextIntent).toBeUndefined();

    const snap = boardWith([enemy], { hull: 60, hullMax: 60 });
    const { next } = resolveEnemyPhase(snap, stream());
    expect(snap.hull - next.hull).toBe(1);
  });
});

describe("the reticle never stays on a core that re-sealed", () => {
  it("moves to a living part on the turn the open window closes", () => {
    const snap = boardWith([spawned("fxHatch")], { turn: 1 });
    const body = bodyOf(snap);
    applyWeaponDamage(snap, { enemy: body, subsystem: partOf(body, "hatch") }, 99);

    expect(partOf(bodyOf(snap), "hatch").hp).toBe(0);
    expect(snap.targetId, "the window opened, so the body is fair game").toBe(
      "enemy-0",
    );

    const held = advanceTurn(snap, createStreams(9));
    expect(isBodyImmune(held, bodyOf(held))).toBe(false);
    expect(held.targetId).toBe("enemy-0");

    const resealed = advanceTurn(held, createStreams(9));
    expect(isBodyImmune(resealed, bodyOf(resealed))).toBe(true);
    expect(
      resealed.targetId,
      "a sealed core must not keep the reticle and eat the turn",
    ).toBe("enemy-0:strut");
  });
});

describe("burn respects the core lock", () => {
  it("holds on a sealed core instead of burning through it", () => {
    const snap = boardWith([spawned("fxRig")], { turn: 1 });
    bodyOf(snap).statuses.burn = 3;
    const before = bodyOf(snap).hp;

    const { next } = resolveEnemyPhase(snap, stream());

    expect(bodyOf(next).hp, "a sealed hull takes no burn").toBe(before);
    expect(
      bodyOf(next).statuses.burn,
      "and the stack still ticks, so it cannot be banked",
    ).toBe(2);
  });

  it("bites as soon as the last part is gone", () => {
    const snap = boardWith([spawned("fxRig")], { turn: 1 });
    const body = bodyOf(snap);
    for (const part of body.subsystems) part.hp = 0;
    body.statuses.burn = 3;
    const before = body.hp;

    const { next } = resolveEnemyPhase(snap, stream());

    expect(bodyOf(next).hp).toBeLessThan(before);
  });
});

describe("the reticle the engine places is one the player can use", () => {
  it("never opens a shell fight aimed at the sealed core", () => {
    const snap = boardWith([spawned("fxRig")], { turn: 1 });
    expect(isBodyImmune(snap, bodyOf(snap))).toBe(true);
    expect(snap.targetId, "harness boards are hand-aimed").toBe("enemy-0");

    const fresh = buildBattleSnapshot(
      "wanderer",
      ["slug"],
      ["fxRig"],
      createStreams(5),
      createStream(5),
    );
    expect(
      fresh.targetId,
      "a real spawn must not open aimed at an immune hull",
    ).not.toBe("enemy-0");
    expect(fresh.targetId?.startsWith("enemy-0:")).toBe(true);
  });

  it("does not park on a sealed core when another body dies mid-phase", () => {
    const boss = spawned("fxRig", 0);
    const escort = spawned("fxBoom", 1);
    escort.hp = 4;
    escort.subsystems = [];
    const snap = boardWith([boss, escort], { turn: 1 });
    snap.targetId = escort.id;

    applyWeaponDamage(snap, { enemy: escort }, 20);

    expect(escort.hp).toBe(0);
    expect(
      snap.targetId,
      "half the turn would resolve for zero on a sealed hull",
    ).not.toBe("enemy-0");
  });

  it("skips the part the alternating rule refuses", () => {
    const snap = boardWith([spawned("fxTwin")], { turn: 1 });
    const body = bodyOf(snap);
    applyWeaponDamage(snap, { enemy: body, subsystem: partOf(body, "left") }, 4);
    expect(body.lastHitKey).toBe("left");
    expect(partOf(body, "left").hp).toBeLessThan(partOf(body, "right").hp);

    snap.targetId = "enemy-0";
    reaimOffLockedCore(snap);

    expect(
      snap.targetId,
      "the weakest part is the one that would resolve for zero",
    ).toBe("enemy-0:right");
  });

  it("prefers a part whose death does not cost the player", () => {
    const snap = boardWith([spawned("fxMixed")], { turn: 1 });
    snap.targetId = "enemy-0";
    reaimOffLockedCore(snap);

    expect(
      snap.targetId,
      "charge is weakest but explodes for 6 hull",
    ).toBe("enemy-0:strut");
  });
});

describe("burn behind a seal is refused, not stockpiled", () => {
  it("decays while the core is locked instead of banking up", () => {
    let snap = boardWith([spawned("fxRig")], { turn: 1 });
    bodyOf(snap).statuses.burn = 6;
    const before = bodyOf(snap).hp;

    for (let turn = 0; turn < 3; turn += 1) {
      snap = resolveEnemyPhase(snap, stream()).next;
      snap = advanceTurn(snap, createStreams(9));
    }

    const held = bodyOf(snap).statuses.burn ?? 0;
    expect(bodyOf(snap).hp, "a sealed hull still takes nothing").toBe(before);
    expect(held, "three sealed turns must burn the stack down").toBe(3);
  });
});
