import { describe, expect, it } from "vitest";
import {
  ALL_ENEMIES,
  BASE_ENEMIES,
  BOSSES,
  ELITE_ENEMIES,
  MINIBOSSES,
  SECTOR_ROSTERS,
} from "@/data/enemies";
import { SECTORS, sectorDef } from "@/data/sectors";
import { ascensionMods } from "@/data/ascension";
import {
  patternFor,
  phaseIndexForHp,
  spawnEnemy,
} from "@/game/battle/setup";
import { pickBoss, pickMiniboss } from "@/game/run/encounter";
import { createStream } from "@/services/rng";
import {
  claimKey,
  intentsOfStep,
  isFlatPattern,
  specialClaimCount,
  trueClaimsOf,
} from "@/types/content";
import enContent from "@/i18n/en/content.json";

const stream = () => createStream(31337);

const content = enContent as unknown as Record<string, Record<string, string>>;

describe("roster counts", () => {
  it("holds 63 base, 14 elites, 14 mini-bosses and 12 bosses", () => {
    expect(BASE_ENEMIES).toHaveLength(63);
    expect(ELITE_ENEMIES).toHaveLength(14);
    expect(MINIBOSSES).toHaveLength(14);
    expect(BOSSES).toHaveLength(12);
    expect(ALL_ENEMIES).toHaveLength(103);
  });

  it("gives every campaign sector ten bespoke base enemies and S6 eight", () => {
    expect(SECTOR_ROSTERS.map((r) => r.length)).toEqual([10, 10, 10, 10, 10, 8]);
  });

  it("gives every base enemy a role the composer can draw", () => {
    for (const def of BASE_ENEMIES) {
      expect(def.role, `${def.id} role`).toBeDefined();
    }
  });
});

describe("signatures are mechanically true", () => {
  it("only claims what the def carries", () => {
    for (const def of ALL_ENEMIES) {
      const truth = trueClaimsOf(def);
      for (const claim of def.claims) {
        expect(
          truth.has(claimKey(claim)),
          `${def.id} claims ${claimKey(claim)}`,
        ).toBe(true);
      }
    }
  });

  it("has an en signature line and a dossier line for every def", () => {
    for (const def of ALL_ENEMIES) {
      expect(def.signature).toBe(`content:signature.${def.id}`);
      expect(content.signature?.[def.id], `${def.id} signature`).toBeTruthy();
      expect(content.dossier?.[def.id], `${def.id} dossier`).toBeTruthy();
    }
  });

  it("keeps the silhouette budget: base ≤2 special claims, everything else ≤3", () => {
    for (const def of ALL_ENEMIES) {
      const budget =
        def.elite === true || def.miniboss === true || def.boss === true ? 3 : 2;
      expect(specialClaimCount(def), `${def.id} claim budget`).toBeLessThanOrEqual(
        budget,
      );
    }
  });
});

describe("pattern variety", () => {
  it("keeps flat loops to sector 1 and the drifters, under a fifth of the roster", () => {
    const flat = BASE_ENEMIES.filter(isFlatPattern);
    expect(flat.length / BASE_ENEMIES.length).toBeLessThanOrEqual(0.2);
    const sector1 = new Set(SECTOR_ROSTERS[0]?.map((d) => d.id) ?? []);
    const sectored = new Set(SECTOR_ROSTERS.flat().map((d) => d.id));
    for (const def of flat) {
      expect(
        sector1.has(def.id) || !sectored.has(def.id),
        `${def.id} is flat outside sector 1`,
      ).toBe(true);
    }
  });

  it("branches on at least 30% of the base roster", () => {
    const varied = BASE_ENEMIES.filter((def) =>
      def.pattern.some((step) => "pick" in step || "when" in step),
    );
    expect(varied.length / BASE_ENEMIES.length).toBeGreaterThanOrEqual(0.3);
  });

  it("gives every elite a subsystem, so A6 has something to overclock", () => {
    for (const def of ELITE_ENEMIES) {
      expect(def.subsystems?.length ?? 0, `${def.id} subsystems`).toBeGreaterThan(0);
    }
  });

  it("bolts the A6 overclock module onto all fourteen elites", () => {
    expect(ascensionMods(6).eliteSubsystem).toBe(true);
    for (const def of ELITE_ENEMIES) {
      const plain = spawnEnemy(def.id, "e", stream());
      const ascended = spawnEnemy(def.id, "e", stream(), { ascension: 6 });
      expect(ascended.subsystems.length, `${def.id} A6`).toBe(
        plain.subsystems.length + 1,
      );
    }
  });
});

describe("boss layer", () => {
  it("gives all ten bosses two subsystems and at least two phases", () => {
    for (const def of BOSSES) {
      expect(def.subsystems.length, `${def.id} subsystems`).toBeGreaterThanOrEqual(2);
      expect(def.phases.length, `${def.id} phases`).toBeGreaterThanOrEqual(2);
    }
  });

  it("A5 opens every boss in its later phase", () => {
    for (const def of BOSSES) {
      expect(phaseIndexForHp(def, def.hp, def.hp, 0), `${def.id} A0`).toBe(0);
      expect(phaseIndexForHp(def, def.hp, def.hp, 5), `${def.id} A5`).toBe(1);
    }
  });

  it("A8 inserts one extra beat into every boss phase", () => {
    expect(ascensionMods(8).bossPatternInsert).toBe(true);
    for (const def of BOSSES) {
      def.phases.forEach((_phase, index) => {
        const plain = patternFor(def, index, 0);
        const ascended = patternFor(def, index, 8);
        expect(ascended.length, `${def.id} phase ${String(index)}`).toBe(
          plain.length + 1,
        );
      });
    }
  });
});

describe("rotation pools", () => {
  it("gives every sector two bosses and at least three gate fights", () => {
    for (const def of SECTORS) {
      expect(def.bossPool, `sector ${String(def.id)} bosses`).toHaveLength(2);
      expect(def.minibossPool.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("actually rotates the boss across seeds", () => {
    for (const def of SECTORS) {
      const drawn = new Set(
        Array.from({ length: 60 }, (_, seed) => pickBoss(def.id, seed)),
      );
      expect(drawn, `sector ${String(def.id)} rotation`).toEqual(
        new Set(def.bossPool),
      );
    }
  });

  it("never repeats a gate fight while the pool has a fresh member", () => {
    for (const def of SECTORS) {
      const rng = createStream(def.id * 17);
      const used: string[] = [];
      for (let i = 0; i < def.minibossPool.length; i += 1) {
        const id = pickMiniboss(def.id, rng, used);
        expect(used, `sector ${String(def.id)} repeat`).not.toContain(id);
        used.push(id);
      }
    }
  });

  it("places every elite, gate fight and boss in some sector pool", () => {
    const pooled = new Set(
      SECTORS.flatMap((def) => [
        ...def.elitePool,
        ...def.minibossPool,
        ...def.bossPool,
      ]),
    );
    for (const def of [...ELITE_ENEMIES, ...MINIBOSSES, ...BOSSES]) {
      expect(pooled.has(def.id), `${def.id} is unreachable`).toBe(true);
    }
  });

  it("draws at least eight bespoke base enemies in every sector pool", () => {
    SECTOR_ROSTERS.forEach((roster, index) => {
      const ids = new Set(roster.map((d) => d.id));
      const inPool = sectorDef(index + 1).enemyPool.filter(([id]) =>
        ids.has(id),
      );
      expect(inPool.length, `sector ${String(index + 1)} pool`).toBeGreaterThanOrEqual(8);
    });
  });

  it("keeps every composer role populated in every sector", () => {
    for (const def of SECTORS) {
      const roles = new Set(
        def.enemyPool
          .map(([id]) => ALL_ENEMIES.find((e) => e.id === id)?.role)
          .filter(Boolean),
      );
      expect(roles.size, `sector ${String(def.id)} roles`).toBe(5);
    }
  });
});

describe("summons", () => {
  it("only summons enemies that exist and are cheap enough to be spawned", () => {
    const ids = new Set(ALL_ENEMIES.map((d) => d.id));
    for (const def of ALL_ENEMIES) {
      const steps = [
        ...def.pattern,
        ...(def.phases ?? []).flatMap((p) => [...p.pattern, ...(p.everyTurn ?? [])]),
      ];
      for (const step of steps) {
        for (const intent of intentsOfStep(step)) {
          if (intent.t !== "summon") continue;
          expect(ids.has(intent.id), `${def.id} summons ${intent.id}`).toBe(true);
          const summoned = ALL_ENEMIES.find((e) => e.id === intent.id);
          expect(summoned?.boss, `${def.id} summons a boss`).not.toBe(true);
          expect(summoned?.miniboss, `${def.id} summons a gate fight`).not.toBe(true);
        }
      }
    }
  });
});
