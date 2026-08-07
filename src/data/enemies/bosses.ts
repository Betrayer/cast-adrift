import { bossDef, sub } from "@/data/enemies/builder";
import type { BossDef } from "@/types/content";

// Ten act bosses, two per sector, drawn from `bossPool` by the run seed. HP is
// the sector-1 baseline (DESIGN §9.5); the sector curve, tide and ascension all
// scale at spawn. Phases are ordered high hp% → low; the first phase whose
// `untilHpPct` the boss is still above owns the pattern. Each pair is a
// contrast, not a variant: the alternate tests the axis the incumbent ignores.
export const BOSSES: readonly BossDef[] = [
  bossDef({
    id: "quarantineWarden",
    hp: 66,
    boss: true,
    claims: [
      { k: "aura", is: "shieldSelf6" },
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("quarantineWarden", "lance", 14, "atk+3"),
      sub("quarantineWarden", "aegis", 14, "shieldSelf6"),
    ],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "shield", n: 6 },
          { t: "attack", n: 8 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "shield", n: 6 },
          { t: "attack", n: 8 },
          { t: "jamSlot" },
        ],
        onEnter: [{ t: "shield", n: 8 }],
      },
    ],
    pattern: [
      { t: "shield", n: 6 },
      { t: "attack", n: 8 },
    ],
  }),
  bossDef({
    id: "beaconTrap",
    hp: 70,
    boss: true,
    claims: [
      { k: "intent", t: "shieldGate" },
      { k: "intent", t: "siphonShield" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("beaconTrap", "lensA", 14, "shieldSelf6"),
      sub("beaconTrap", "lensB", 14, "shieldAllies3"),
    ],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "shieldGate", n: 6 },
          { t: "siphonShield", n: 5 },
          { t: "attack", n: 8 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "shieldGate", n: 8 },
          { t: "multi", n: 5, k: 2 },
          { t: "siphonShield", n: 6 },
        ],
        onEnter: [{ t: "shieldGate", n: 10 }],
        everyTurn: [{ t: "siphonShield", n: 3 }],
      },
    ],
    pattern: [
      { t: "shieldGate", n: 6 },
      { t: "siphonShield", n: 5 },
      { t: "attack", n: 8 },
    ],
  }),
  bossDef({
    id: "breakerBarge",
    hp: 73,
    boss: true,
    stealOnHit: 6,
    claims: [
      { k: "trait", is: "stealOnHit" },
      { k: "aura", is: "lockEvery3" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("breakerBarge", "grinder", 14, "stealOnHit6"),
      sub("breakerBarge", "crane", 14, "lockEvery3"),
    ],
    phases: [
      {
        untilHpPct: 40,
        pattern: [
          { t: "attack", n: 8 },
          { t: "stealScrap", n: 6 },
          { t: "multi", n: 4, k: 2 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "multi", n: 5, k: 2 },
          { t: "attack", n: 9 },
          { t: "stealScrap", n: 6 },
        ],
        onEnter: [{ t: "charge" }],
      },
    ],
    pattern: [
      { t: "attack", n: 8 },
      { t: "stealScrap", n: 6 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  bossDef({
    id: "auctionCorvette",
    hp: 90,
    boss: true,
    stealOnHit: 5,
    claims: [
      { k: "intent", t: "bargain" },
      { k: "trait", is: "stealOnHit" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("auctionCorvette", "gavel", 14, "stealOnHit6"),
      sub("auctionCorvette", "ledger", 14, "atk+2"),
    ],
    phases: [
      {
        untilHpPct: 45,
        pattern: [
          { t: "bargain", n: 7, heal: 4 },
          { t: "attack", n: 11 },
          { t: "multi", n: 5, k: 2 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "bargain", n: 9, heal: 6 },
          { t: "multi", n: 6, k: 2 },
          { t: "drainCharge", n: 6 },
        ],
        onEnter: [{ t: "charge" }],
      },
    ],
    pattern: [
      { t: "bargain", n: 7, heal: 4 },
      { t: "attack", n: 11 },
      { t: "multi", n: 5, k: 2 },
    ],
  }),
  bossDef({
    id: "riftMaw",
    hp: 68,
    boss: true,
    claims: [
      { k: "aura", is: "twistEachTurn" },
      { k: "intent", t: "capShrink" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("riftMaw", "eyeA", 12, "twistEachTurn"),
      sub("riftMaw", "eyeB", 12, "twistEachTurn"),
    ],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 10 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 10 },
        ],
        everyTurn: [{ t: "capShrink" }],
        onEnter: [{ t: "capShrink" }],
      },
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "attack", n: 10 },
    ],
  }),
  bossDef({
    id: "riftBranch",
    hp: 55,
    boss: true,
    claims: [
      { k: "intent", t: "capShrink" },
      { k: "intent", t: "curseDie" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("riftBranch", "budA", 12, "twistEachTurn"),
      sub("riftBranch", "budB", 12, "shieldSelf6"),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "capShrink" },
          { t: "multi", n: 4, k: 3 },
          { t: "curseDie", n: 3 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "curseDie", n: 3 },
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 9 },
        ],
        everyTurn: [{ t: "capShrink" }],
        onEnter: [{ t: "curseDie", n: 3 }],
      },
    ],
    pattern: [
      { t: "capShrink" },
      { t: "multi", n: 4, k: 3 },
      { t: "curseDie", n: 3 },
    ],
  }),
  bossDef({
    id: "choirFlagship",
    hp: 77,
    boss: true,
    claims: [
      { k: "aura", is: "chargeAllies" },
      { k: "aura", is: "summonEvery4" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("choirFlagship", "spire", 14, "chargeAllies"),
      sub("choirFlagship", "voice", 14, "summonEvery4"),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "multi", n: 4, k: 2 },
          { t: "charge" },
          { t: "attack", n: 9 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "charge" },
          { t: "multi", n: 5, k: 2 },
          { t: "healAllies", n: 6 },
        ],
        onEnter: [{ t: "shieldAll", n: 8 }],
      },
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "charge" },
      { t: "attack", n: 9 },
    ],
  }),
  bossDef({
    id: "cantorColossus",
    hp: 49,
    boss: true,
    jamClearsRage: true,
    claims: [
      { k: "trait", is: "jamClearsRage" },
      { k: "intent", t: "enrage" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("cantorColossus", "lungA", 16, "atk+3"),
      sub("cantorColossus", "lungB", 16, "shieldSelf6"),
    ],
    phases: [
      {
        untilHpPct: 45,
        pattern: [
          { t: "enrage", n: 2 },
          { t: "attack", n: 10 },
          { t: "shield", n: 7 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "attack", n: 10 },
          { t: "multi", n: 4, k: 2 },
        ],
        everyTurn: [{ t: "enrage", n: 1 }],
        onEnter: [{ t: "shield", n: 8 }],
      },
    ],
    pattern: [
      { t: "enrage", n: 2 },
      { t: "attack", n: 10 },
      { t: "shield", n: 7 },
    ],
  }),
  bossDef({
    id: "coreHeart",
    hp: 82,
    boss: true,
    shell: true,
    claims: [
      { k: "trait", is: "shell" },
      { k: "intent", t: "storm" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("coreHeart", "valveA", 12, "shieldSelf6"),
      sub("coreHeart", "valveB", 12, "twistEachTurn"),
    ],
    phases: [
      {
        untilHpPct: 70,
        pattern: [
          { t: "shield", n: 8 },
          { t: "multi", n: 5, k: 2 },
        ],
      },
      {
        untilHpPct: 25,
        pattern: [
          { t: "attack", n: 10 },
          { t: "multi", n: 5, k: 2 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "storm" }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "charge" },
          { t: "attack", n: 12 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "shield", n: 10 }],
      },
    ],
    pattern: [
      { t: "shield", n: 8 },
      { t: "multi", n: 5, k: 2 },
    ],
  }),
  bossDef({
    id: "mirrorHeart",
    hp: 58,
    boss: true,
    shell: true,
    claims: [
      { k: "intent", t: "mirrorSchool" },
      { k: "trait", is: "shell" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("mirrorHeart", "faceA", 12, "twistEachTurn"),
      sub("mirrorHeart", "faceB", 12, "shieldSelf6"),
    ],
    phases: [
      {
        untilHpPct: 60,
        pattern: [
          { t: "shield", n: 8 },
          { t: "mirrorSchool" },
          { t: "multi", n: 4, k: 2 },
        ],
      },
      {
        untilHpPct: 25,
        pattern: [
          { t: "shield", n: 8 },
          { t: "mirrorSchool" },
          { t: "multi", n: 4, k: 2 },
        ],
        onEnter: [{ t: "storm" }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "shield", n: 10 },
          { t: "mirrorSchool" },
          { t: "attack", n: 10 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "shield", n: 10 }],
      },
    ],
    pattern: [
      { t: "shield", n: 8 },
      { t: "mirrorSchool" },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
];

export const BOSS_BY_ID: ReadonlyMap<string, BossDef> = new Map(
  BOSSES.map((def) => [def.id, def]),
);
