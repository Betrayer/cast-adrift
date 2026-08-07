import { describe, expect, it } from "vitest";
import { ALL_ENEMIES, ENEMY_BY_ID } from "@/data/enemies";
import { SECTORS } from "@/data/sectors";
import { spawnEnemy } from "@/game/battle/setup";
import { scaleEnemyHp, sectorHpPct } from "@/game/run/encounter";
import { createStream } from "@/services/rng";

const stream = () => createStream(4242);

const LEGACY_HOME_SECTOR: Readonly<Record<string, number>> = {
  breakerDrone: 2,
  magnetTug: 2,
  minelayer: 2,
  hookTug: 2,
  slagHauler: 2,
  chaffSwarm: 2,
  clanBreaker: 2,
  mineBaron: 2,
  breakerBarge: 2,
  riftling: 3,
  echoShade: 3,
  unstableCore: 3,
  foldWorm: 3,
  nullEcho: 3,
  riftAnchor: 3,
  breachDrone: 3,
  riftTyrant: 3,
  leechPrince: 3,
  riftMaw: 3,
  choirAcolyte: 4,
  hymnTurret: 4,
  zealotRam: 4,
  hymnCantor: 4,
  pyreDeacon: 4,
  reliquary: 4,
  choirCantor: 4,
  choirFlagship: 4,
  coreFragment: 5,
  probabilityKnot: 5,
  nullDrone: 5,
  causalityLoop: 5,
  voidWarden: 5,
  quietEngine: 5,
  sparkMote: 5,
  coreSentinel: 5,
  coreHeart: 5,
};

const LEGACY_EFFECTIVE_HP: Readonly<Record<string, number>> = {
  scavDrone: 10,
  raider: 32,
  shieldWarden: 26,
  mine: 2,
  jammerCorvette: 24,
  leechSkiff: 22,
  choirZealot: 22,
  riftWasp: 18,
  bountyHuntress: 34,
  raiderAlpha: 30,
  hullGnat: 14,
  breakerDrone: 20,
  magnetTug: 25,
  minelayer: 23,
  hookTug: 20,
  slagHauler: 30,
  chaffSwarm: 12,
  clanBreaker: 38,
  mineBaron: 39,
  breakerBarge: 84,
  riftling: 23,
  echoShade: 26,
  unstableCore: 18,
  foldWorm: 24,
  nullEcho: 21,
  riftAnchor: 28,
  breachDrone: 16,
  riftTyrant: 40,
  leechPrince: 36,
  riftMaw: 88,
  choirAcolyte: 26,
  hymnTurret: 29,
  zealotRam: 32,
  hymnCantor: 31,
  pyreDeacon: 33,
  reliquary: 36,
  choirCantor: 42,
  choirFlagship: 112,
  coreFragment: 29,
  probabilityKnot: 32,
  nullDrone: 26,
  causalityLoop: 38,
  voidWarden: 40,
  quietEngine: 35,
  sparkMote: 8,
  coreSentinel: 45,
  coreHeart: 132,
  convoyAlpha: 42,
  wardenFragment: 58,
  leechQueen: 44,
  mineTyrant: 48,
  choirHerald: 60,
  mirrorHull: 46,
  quarantineWarden: 66,
};

const NO_INTEGER_PREIMAGE: readonly string[] = [
  "foldWorm",
  "riftAnchor",
  "hymnCantor",
  "coreHeart",
];

// Defs whose HP was deliberately re-authored after the R3 rebase. The rebase
// evidence below is about the ladder, not about balance being frozen: a def that
// has since been retuned no longer has a legacy pre-image to match, and saying so
// here is what keeps the rest of the table honest.
const RETUNED_SINCE_REBASE: Readonly<Record<string, string>> = {
  leechQueen: "R6 raised the gate-fight floor: 44 → 50",
};

const LEGACY_CURVE_PCT: Readonly<Record<number, number>> = {
  1: 0,
  2: 15,
  3: 30,
  4: 45,
  5: 60,
};

const homeSectorOf = (id: string): number => LEGACY_HOME_SECTOR[id] ?? 1;

const legacyPctOf = (id: string): number =>
  LEGACY_CURVE_PCT[homeSectorOf(id)] ?? 0;

const spawnHp = (id: string, sector: number, tide: number, ascension: number) =>
  spawnEnemy(id, "e", stream(), {
    tide,
    sectorHpPct: sectorHpPct({ sector }),
    hpBonusPct: ascension,
  }).hpMax;

const legacyHp = (id: string, tide: number, ascension: number) =>
  spawnEnemy(id, "e", stream(), {
    tide,
    sectorHpPct: legacyPctOf(id),
    hpBonusPct: ascension,
  }).hpMax;

describe("enemy scaling", () => {
  it("rebases every def losslessly against the ladder its old number was baked on", () => {
    for (const [id, legacy] of Object.entries(LEGACY_EFFECTIVE_HP)) {
      if (RETUNED_SINCE_REBASE[id] !== undefined) continue;
      const hp = legacyHp(id, 0, 0);
      const slack = NO_INTEGER_PREIMAGE.includes(id) ? 1 : 0;
      expect(Math.abs(hp - legacy), `${id} rebase`).toBeLessThanOrEqual(slack);
    }
  });

  it("names every def that was retuned away from its rebase number", () => {
    for (const [id, why] of Object.entries(RETUNED_SINCE_REBASE)) {
      expect(LEGACY_EFFECTIVE_HP[id], `${id} was never rebased`).toBeGreaterThan(0);
      expect(legacyHp(id, 0, 0), `${id}: ${why}`).not.toBe(LEGACY_EFFECTIVE_HP[id]);
    }
  });

  it("never drifts more than 2 HP from the pre-rebase curve at any tide or ascension", () => {
    for (const [id, legacy] of Object.entries(LEGACY_EFFECTIVE_HP)) {
      if (RETUNED_SINCE_REBASE[id] !== undefined) continue;
      for (const tide of [0, 1, 2, 3, 4, 5]) {
        for (const ascension of [0, 15, 30]) {
          const before = Math.max(
            1,
            Math.round(
              Math.round(legacy * (1 + 0.1 * tide)) * (1 + ascension / 100),
            ),
          );
          const after = legacyHp(id, tide, ascension);
          expect(
            Math.abs(after - before),
            `${id} legacy ladder tide ${String(tide)} asc ${String(ascension)}`,
          ).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("keeps the live ramp monotone across the five sectors", () => {
    const curve = SECTORS.map((def) => def.scaling.hpPct);
    expect(curve[0]).toBe(0);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i], `sector ${String(i + 1)} ramp`).toBeGreaterThan(
        curve[i - 1] ?? 0,
      );
    }
  });

  // The table is R3's rebase evidence: it holds the defs whose HP number was
  // baked on the old per-sector ladder. R6's roster was authored directly on the
  // rebased curve and has no legacy pre-image, so the invariant is that no
  // rebased def has silently left the roster — not that every def is in here.
  it("keeps every rebased def in the roster", () => {
    const ids = new Set(ALL_ENEMIES.map((def) => def.id));
    for (const id of Object.keys(LEGACY_EFFECTIVE_HP)) {
      expect(ids.has(id), `${id} left the roster`).toBe(true);
    }
  });

  it("authors post-rebase defs without a legacy number", () => {
    const rebased = new Set(Object.keys(LEGACY_EFFECTIVE_HP));
    const fresh = ALL_ENEMIES.filter((def) => !rebased.has(def.id));
    expect(fresh.length).toBeGreaterThan(0);
    for (const def of fresh) {
      expect(LEGACY_HOME_SECTOR[def.id], `${def.id} legacy home`).toBeUndefined();
    }
  });

  it("makes the same def tougher in a later sector", () => {
    for (const def of ALL_ENEMIES) {
      const first = spawnHp(def.id, 1, 0, 0);
      const last = spawnHp(def.id, 5, 0, 0);
      expect(last, `${def.id} across sectors`).toBeGreaterThanOrEqual(first);
    }
  });

  it("reads the ramp from sector data alone", () => {
    for (const sector of SECTORS) {
      expect(sectorHpPct({ sector: sector.id })).toBe(sector.scaling.hpPct);
      expect(sectorHpPct({ sector: sector.id, pocket: true })).toBe(
        sector.scaling.hpPct + sector.scaling.pocketPct,
      );
    }
  });

  it("scales subsystems on the same curve as the body", () => {
    const def = ENEMY_BY_ID.get("coreSentinel");
    expect(def?.subsystems?.length).toBe(1);
    const sub = def?.subsystems?.[0];
    expect(sub).toBeDefined();
    if (sub === undefined) return;
    const spawned = spawnEnemy("coreSentinel", "e", stream(), {
      sectorHpPct: sectorHpPct({ sector: 5 }),
    });
    expect(spawned.subsystems[0]?.hpMax).toBe(
      scaleEnemyHp(sub.hp, { sectorHpPct: sectorHpPct({ sector: 5 }) }),
    );
  });
});
