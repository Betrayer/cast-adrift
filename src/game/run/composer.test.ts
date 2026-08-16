import { describe, expect, it } from "vitest";
import { ALL_ENEMIES, ENEMY_BY_ID, expandEncounterIds } from "@/data/enemies";
import { SECTORS, sectorDef } from "@/data/sectors";
import { MAX_ENEMIES, shipHullMax, spawnEnemy } from "@/game/battle/setup";
import {
  buildEncounterIds,
  composeEncounter,
  encounterThreat,
  pickBoss,
  pickMiniboss,
  sectorHpPct,
} from "@/game/run/encounter";
import { createStream } from "@/services/rng";

const stream = (seed: number) => createStream(seed);

const encounterHp = (ids: readonly string[], sector: number): number =>
  expandEncounterIds(ids).reduce(
    (sum, id) =>
      sum +
      spawnEnemy(id, "e", stream(1), {
        sectorHpPct: sectorHpPct({ sector }),
      }).hpMax,
    0,
  );

const MAX_ENCOUNTER_HP = 220;

describe("encounter composer", () => {
  it("is deterministic per seed", () => {
    for (const def of SECTORS) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const a = composeEncounter(def.id, stream(seed));
        const b = composeEncounter(def.id, stream(seed));
        expect(b).toEqual(a);
      }
    }
  });

  it("varies run to run with a fixed roster", () => {
    for (const def of SECTORS) {
      const shapes = new Set<string>();
      for (let seed = 1; seed <= 20; seed += 1) {
        shapes.add(composeEncounter(def.id, stream(seed)).join("+"));
      }
      expect(shapes.size, `S${String(def.id)} variety`).toBeGreaterThan(5);
    }
  });

  it("never composes more enemies than the sector allows or the board fits", () => {
    for (const def of SECTORS) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const ids = composeEncounter(def.id, stream(seed));
        expect(ids.length, `S${String(def.id)} seed ${String(seed)}`).toBeLessThanOrEqual(
          def.encounter.sizeWeights.length,
        );
        expect(expandEncounterIds(ids).length).toBeLessThanOrEqual(MAX_ENEMIES);
        for (const id of ids) expect(ENEMY_BY_ID.get(id)).toBeDefined();
      }
    }
  });

  it("draws every composed enemy from the sector's own pool or its pairs", () => {
    for (const def of SECTORS) {
      const allowed = new Set([
        ...def.enemyPool.map(([id]) => id),
        ...def.pairPool.flat(),
      ]);
      for (let seed = 1; seed <= 60; seed += 1) {
        for (const id of composeEncounter(def.id, stream(seed))) {
          expect(allowed.has(id), `S${String(def.id)} ${id}`).toBe(true);
        }
      }
    }
  });

  it("keeps composed fights inside plausible threat and hp bands", () => {
    for (const def of SECTORS) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const ids = composeEncounter(def.id, stream(seed));
        const label = `S${String(def.id)} seed ${String(seed)} ${ids.join("+")}`;
        expect(encounterThreat(ids), label).toBeLessThanOrEqual(
          def.encounter.threatCap,
        );
        expect(encounterHp(ids, def.id), label).toBeLessThanOrEqual(
          MAX_ENCOUNTER_HP,
        );
        expect(encounterHp(ids, def.id), label).toBeGreaterThan(0);
      }
    }
  });

  it("never composes a sector-1 fight that could one-shot a full starter hull", () => {
    const hull = shipHullMax("wanderer");
    for (let seed = 1; seed <= 200; seed += 1) {
      const ids = composeEncounter(1, stream(seed));
      expect(
        encounterThreat(ids),
        `seed ${String(seed)} ${ids.join("+")}`,
      ).toBeLessThan(hull);
    }
  });

  it("uses the templates rather than only the bespoke pairs", () => {
    const pairs = new Set(sectorDef(3).pairPool.map((p) => p.join("+")));
    let composed = 0;
    for (let seed = 1; seed <= 60; seed += 1) {
      const ids = composeEncounter(3, stream(seed));
      if (!pairs.has(ids.join("+"))) composed += 1;
    }
    expect(composed).toBeGreaterThan(30);
  });

  it("gives every base enemy a role so no template falls back blindly", () => {
    for (const def of SECTORS) {
      for (const [id] of def.enemyPool) {
        expect(ENEMY_BY_ID.get(id)?.role, `${id} role`).toBeDefined();
      }
    }
    const roleless = ALL_ENEMIES.filter(
      (def) =>
        def.role === undefined &&
        def.miniboss !== true &&
        def.boss !== true &&
        def.id !== "mine",
    );
    expect(roleless.map((d) => d.id)).toEqual([]);
  });
});

describe("rotation pools", () => {
  it("picks the boss once per run, stable across calls", () => {
    for (const def of SECTORS) {
      for (const seed of [1, 77, 4242]) {
        const first = pickBoss(def.id, seed);
        expect(pickBoss(def.id, seed)).toBe(first);
        expect(def.bossPool).toContain(first);
      }
    }
  });

  it("never repeats a mini-boss while the pool has a fresh member", () => {
    for (const def of SECTORS) {
      expect(def.minibossPool.length).toBeGreaterThanOrEqual(3);
      const used: string[] = [];
      for (let gate = 0; gate < def.minibossPool.length; gate += 1) {
        const id = pickMiniboss(def.id, stream(gate + 1), used);
        expect(used, `S${String(def.id)} gate ${String(gate)}`).not.toContain(id);
        used.push(id);
      }
    }
  });

  it("routes boss nodes through the pool and gate nodes through the rotation", () => {
    const boss = buildEncounterIds("boss", stream(5), { sector: 4, seed: 9 });
    expect(boss).toEqual([pickBoss(4, 9)]);
    const gate = buildEncounterIds("miniboss", stream(5), {
      sector: 4,
      usedMinibosses: ["choirHerald"],
    });
    expect(gate[0]).not.toBe("choirHerald");
  });

  it("still honours the bounty consequence over the composer", () => {
    const ids = buildEncounterIds("elite", stream(3), {
      sector: 2,
      flags: { hunterMark: true },
    });
    expect(ids).toEqual(["bountyHuntress"]);
  });
});
