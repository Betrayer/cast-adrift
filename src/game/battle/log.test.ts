import { describe, expect, it } from "vitest";
import { A6_ELITE_SUBSYSTEM } from "@/data/ascension";
import { harnessEnemy, harnessSnap } from "@/game/battle/battleHarness";
import {
  enemyFixture,
  registerEnemyFixtures,
} from "@/game/battle/enemyFixtures";
import {
  appendLog,
  BATTLE_LOG_CAP,
  logEntriesFrom,
  logTurns,
} from "@/game/battle/log";
import type { BattleLogEntry, ResolutionBundle } from "@/types/battle";

const snap = harnessSnap([]);

const bundle = (over: Partial<ResolutionBundle> = {}): ResolutionBundle => ({
  beats: [],
  enemyBeats: [],
  final: snap,
  finalPhase: "placement",
  ...over,
});

const ctx = (turn = 3, seq = 1) => ({
  turn,
  seq,
  enemies: [harnessEnemy()],
});

describe("battle log entries", () => {
  it("keeps the player beats first and stamps them with the turn", () => {
    const entries = logEntriesFrom(
      bundle({
        beats: [
          { slot: "weaponA", kind: "damage", amount: 7, after: snap },
          { slot: "shields", kind: "shield", amount: 4, after: snap },
        ],
        enemyBeats: [
          {
            enemyId: "enemy-0",
            kind: "attack",
            amount: 5,
            hullDamage: 3,
            shieldDamage: 2,
            after: snap,
          },
        ],
      }),
      ctx(),
    );
    expect(entries.map((entry) => entry.side)).toEqual(["you", "you", "foe"]);
    expect(entries.map((entry) => entry.turn)).toEqual([3, 3, 3]);
    expect(entries[0]?.actor).toBe("weaponA");
    expect(entries[2]?.actor).toBe("raider");
    expect(entries[2]?.hull).toBe(3);
    expect(entries[2]?.shield).toBe(2);
  });

  it("names an enemy that died inside the resolution from the after snapshot", () => {
    const dead = harnessEnemy({ id: "enemy-9", defId: "scavDrone" });
    const entries = logEntriesFrom(
      bundle({
        enemyBeats: [
          {
            enemyId: "enemy-9",
            kind: "burnTick",
            amount: 2,
            hullDamage: 0,
            shieldDamage: 0,
            after: { ...snap, enemies: [dead] },
          },
        ],
      }),
      { turn: 1, seq: 4, enemies: [] },
    );
    expect(entries[0]?.actor).toBe("scavDrone");
  });

  it("gives every entry of one resolution a distinct id", () => {
    const entries = logEntriesFrom(
      bundle({
        beats: [
          { slot: "weaponA", kind: "damage", amount: 1, after: snap },
          { slot: "weaponB", kind: "damage", amount: 1, after: snap },
        ],
        enemyBeats: [
          {
            enemyId: "enemy-0",
            kind: "attack",
            amount: 1,
            hullDamage: 1,
            shieldDamage: 0,
            after: snap,
          },
        ],
      }),
      ctx(),
    );
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });
});

const entry = (turn: number, index: number): BattleLogEntry => ({
  id: `${String(turn)}-${String(index)}`,
  turn,
  side: "you",
  kind: "damage",
  actor: "weaponA",
  amount: 1,
  hull: 0,
  shield: 0,
  dodged: 0,
  glanced: 0,
});

describe("battle log accumulation", () => {
  it("keeps the newest entries once the cap is reached", () => {
    let log: BattleLogEntry[] = [];
    for (let turn = 1; turn <= 60; turn += 1) {
      log = appendLog(log, [entry(turn, 0), entry(turn, 1)]);
    }
    expect(log).toHaveLength(BATTLE_LOG_CAP);
    expect(log[log.length - 1]?.turn).toBe(60);
    expect(log[0]?.turn).toBe(60 - BATTLE_LOG_CAP / 2 + 1);
  });

  it("groups consecutive entries by turn without reordering them", () => {
    const groups = logTurns([
      entry(1, 0),
      entry(1, 1),
      entry(2, 0),
      entry(3, 0),
      entry(3, 1),
    ]);
    expect(groups.map((group) => group.turn)).toEqual([1, 2, 3]);
    expect(groups.map((group) => group.entries.length)).toEqual([2, 1, 2]);
  });
});

registerEnemyFixtures([
  enemyFixture({
    id: "logHarnessBoss",
    shell: true,
    coreLockAt: 1,
    subsystems: [
      { id: "valveA", name: "content:enemies.logHarnessBoss-valveA", hp: 8 },
    ],
  }),
]);

describe("a downed part in the journal", () => {
  const downedSnap = (partKey: string) => {
    const enemy = harnessEnemy({
      defId: "logHarnessBoss",
      subsystems: [
        {
          id: `enemy-0:${partKey}`,
          key: partKey,
          hp: 0,
          hpMax: 8,
        },
      ],
    });
    return { ...snap, enemies: [enemy] };
  };

  it("names the part the break belonged to", () => {
    const after = downedSnap("valveA");
    const entries = logEntriesFrom(
      bundle({
        beats: [
          {
            slot: "weaponA",
            kind: "partDown",
            amount: 0,
            targetId: "enemy-0:valveA",
            after,
          },
        ],
      }),
      { turn: 2, seq: 5, enemies: after.enemies },
    );
    expect(entries[0]?.targetName).toBe(
      "content:enemies.logHarnessBoss-valveA",
    );
  });

  it("names the ascension part that no enemy def declares", () => {
    const after = downedSnap(A6_ELITE_SUBSYSTEM.id);
    const entries = logEntriesFrom(
      bundle({
        beats: [
          {
            slot: "weaponB",
            kind: "partDown",
            amount: 0,
            targetId: `enemy-0:${A6_ELITE_SUBSYSTEM.id}`,
            after,
          },
        ],
      }),
      { turn: 2, seq: 6, enemies: [] },
    );
    expect(entries[0]?.targetName).toBe(A6_ELITE_SUBSYSTEM.name);
  });

  it("leaves an ordinary beat without a target name", () => {
    const entries = logEntriesFrom(
      bundle({
        beats: [{ slot: "weaponA", kind: "damage", amount: 4, after: snap }],
      }),
      ctx(),
    );
    expect(entries[0]?.targetName).toBeUndefined();
  });
});
