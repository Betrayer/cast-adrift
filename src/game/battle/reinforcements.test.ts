import { beforeEach, describe, expect, it } from "vitest";
import { aliveEnemies, resolveWeaponTarget, scatterTargets } from "@/game/battle/damage";
import { hiddenIntentIds } from "@/game/battle/intentVisibility";
import { aimedEnemy } from "@/game/battle/target";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import { finalizeOutcome } from "@/game/battle/resolveShared";
import { enemySeatCount } from "@/game/battle/seats";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import { abandonRun, startEventBattle, startRun } from "@/game/run/flow";
import { createStreams } from "@/services/rng";
import { hydrateBattle, serializeBattle, useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const HAND = ["red-d6", "red-d6", "blue-d6"];
const DRONES = ["scavDrone", "scavDrone", "scavDrone"];

const build = (enemyIds: readonly string[], reinforcements: readonly string[]) => {
  const streams = createStreams(7);
  const enemyStream = createEnemyStream(streams);
  const snap = buildBattleSnapshot("wanderer", HAND, enemyIds, streams, enemyStream, {}, { reinforcements, hull: 300, hullMax: 300 });
  return { snap, enemyStream };
};

describe("an enemy a penalty adds", () => {
  it("waits outside when the composed fight already fills the three seats", () => {
    const { snap } = build(DRONES, ["scavDrone"]);
    expect(snap.enemies).toHaveLength(3);
    expect(snap.reinforcements).toEqual(["scavDrone"]);
  });

  it("takes a free seat at once when the fight has room", () => {
    const { snap } = build(["scavDrone", "scavDrone"], ["scavDrone"]);
    expect(snap.enemies.map((enemy) => enemy.id)).toEqual(["enemy-0", "enemy-1", "enemy-2"]);
    expect(snap.reinforcements).toEqual([]);
  });

  it("joins at the end of the enemy phase once a seat frees, and only then", () => {
    const { snap, enemyStream } = build(DRONES, ["scavDrone"]);
    const crowded = resolveEnemyPhase(snap, enemyStream).next;
    expect(crowded.reinforcements).toEqual(["scavDrone"]);
    expect(crowded.enemies).toHaveLength(3);

    const freed = structuredClone(crowded);
    const first = freed.enemies[0];
    if (first === undefined) throw new Error("no enemy");
    first.hp = 0;
    const after = resolveEnemyPhase(freed, enemyStream);
    expect(after.next.reinforcements).toEqual([]);
    expect(aliveEnemies(after.next)).toHaveLength(3);
    expect(after.next.enemies.at(-1)?.defId).toBe("scavDrone");
    expect(after.next.enemies.at(-1)?.seat).toBe(0);
    expect(enemySeatCount(after.next.enemies)).toBe(3);
    expect(after.beats.at(-1)?.kind).toBe("summon");
  });

  it("keeps the fight unwon while one waits, then aims at the newcomer when nothing else stands", () => {
    const { snap, enemyStream } = build(DRONES, ["scavDrone"]);
    for (const enemy of snap.enemies) enemy.hp = 0;
    snap.targetId = null;
    finalizeOutcome(snap);
    expect(snap.outcome).toBeUndefined();

    const after = resolveEnemyPhase(snap, enemyStream).next;
    expect(after.outcome).toBeUndefined();
    expect(aliveEnemies(after)).toHaveLength(1);
    expect(after.targetId).toBe(aliveEnemies(after)[0]?.id);

    const empty = structuredClone(after);
    for (const enemy of empty.enemies) enemy.hp = 0;
    finalizeOutcome(empty);
    expect(empty.outcome).toBe("victory");
  });

  it("keeps the A13 hidden intent on the rearmost seat after a newcomer takes the front one", () => {
    const streams = createStreams(7);
    const enemyStream = createEnemyStream(streams);
    const snap = buildBattleSnapshot("wanderer", HAND, DRONES, streams, enemyStream, {}, {
      reinforcements: ["scavDrone"],
      hull: 300,
      hullMax: 300,
      ascension: 13,
    });
    expect([...hiddenIntentIds(snap)]).toEqual(["enemy-2"]);
    const first = snap.enemies[0];
    if (first === undefined) throw new Error("no enemy");
    first.hp = 0;
    const after = resolveEnemyPhase(snap, enemyStream).next;
    expect(after.enemies.at(-1)?.seat).toBe(0);
    expect([...hiddenIntentIds(after)]).toEqual(["enemy-2"]);
  });

  it("aims and scatters left to right by seat once a newcomer holds the front seat", () => {
    const { snap, enemyStream } = build(DRONES, ["scavDrone"]);
    const first = snap.enemies[0];
    if (first === undefined) throw new Error("no enemy");
    first.hp = 0;
    const board = resolveEnemyPhase(snap, enemyStream).next;
    const newcomer = board.enemies.at(-1)?.id;
    expect(aimedEnemy(board.enemies, null)?.id).toBe(newcomer);
    board.targetId = null;
    expect(resolveWeaponTarget(board)?.enemy.id).toBe(newcomer);
    expect(scatterTargets(board).map((enemy) => enemy.id)).toEqual([newcomer, "enemy-1", "enemy-2"]);
    board.targetId = "enemy-2";
    expect(scatterTargets(board).map((enemy) => enemy.id)).toEqual(["enemy-2", newcomer, "enemy-1"]);
  });

  it("still takes the freed seat when the escape pod saves the ship in the same phase", () => {
    const streams = createStreams(7);
    const enemyStream = createEnemyStream(streams);
    const snap = buildBattleSnapshot("wanderer", HAND, ["scavDrone", "scavDrone", "unstableCore"], streams, enemyStream, {}, {
      reinforcements: ["scavDrone"],
      hull: 1,
      hullMax: 300,
      modules: ["escapePod"],
    });
    const [first, second, core] = snap.enemies;
    if (first === undefined || second === undefined || core === undefined) throw new Error("three enemies expected");
    first.hp = 0;
    second.hp = 0;
    core.hp = 1;
    core.statuses.burn = 5;
    snap.shield = 0;
    const after = resolveEnemyPhase(snap, enemyStream).next;
    expect(after.survivedLethal).toBe(true);
    expect(after.hull).toBe(1);
    expect(after.reinforcements).toEqual([]);
    expect(aliveEnemies(after).map((enemy) => enemy.defId)).toEqual(["scavDrone"]);
    expect(after.outcome).toBeUndefined();
  });
});

describe("a battle launched from the run", () => {
  beforeEach(() => {
    abandonRun();
    startRun(7);
  });

  it("sends the event penalty's drone to the queue behind a full board", () => {
    useRunStore.getState().addBattleMod({ kind: "enemyPlus", value: 1, battlesLeft: 1 });
    startEventBattle({ enemyIds: DRONES });
    const battle = useBattleStore.getState();
    expect(battle.enemies).toHaveLength(3);
    expect(battle.reinforcements).toEqual(["scavDrone"]);
  });

  it("sends the doubles copy of the lead enemy the same way", () => {
    useRunStore.setState({ mutators: ["doubles"] });
    startEventBattle({ enemyIds: ["raider", "scavDrone", "scavDrone"] });
    expect(useBattleStore.getState().reinforcements).toEqual(["raider"]);
  });

  it("copies one member when the lead is an encounter group", () => {
    useRunStore.setState({ mutators: ["doubles"] });
    startEventBattle({ enemyIds: ["mineCluster"] });
    expect(useBattleStore.getState().enemies).toHaveLength(3);
    expect(useBattleStore.getState().reinforcements).toEqual(["mine"]);
  });

  it("restores a save written before the queue existed with an empty queue", () => {
    useRunStore.getState().addBattleMod({ kind: "enemyPlus", value: 1, battlesLeft: 1 });
    startEventBattle({ enemyIds: DRONES });
    expect(useBattleStore.getState().reinforcements).toEqual(["scavDrone"]);
    const save = serializeBattle();
    if (save === null) throw new Error("no battle to save");
    const older: Partial<typeof save.values> = { ...save.values };
    delete older.reinforcements;
    hydrateBattle({ ...save, values: older as typeof save.values });
    expect(useBattleStore.getState().reinforcements).toEqual([]);
  });
});
