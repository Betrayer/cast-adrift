import { bossDef, sub } from "@/data/enemies/builder";
import type { BossDef } from "@/types/content";

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
          { t: "attack", n: 7 },
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
      { t: "attack", n: 7 },
    ],
  }),
  bossDef({
    id: "breakerBarge",
    hp: 59,
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
          { t: "attack", n: 7 },
          { t: "stealScrap", n: 6 },
          { t: "multi", n: 4, k: 2 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 8 },
          { t: "stealScrap", n: 6 },
        ],
        onEnter: [{ t: "charge" }],
      },
    ],
    pattern: [
      { t: "attack", n: 7 },
      { t: "stealScrap", n: 6 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  bossDef({
    id: "auctionCorvette",
    hp: 104,
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
          { t: "attack", n: 10 },
          { t: "multi", n: 4, k: 2 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "bargain", n: 8, heal: 5 },
          { t: "multi", n: 5, k: 2 },
          { t: "drainCharge", n: 6 },
        ],
        onEnter: [{ t: "charge" }],
      },
    ],
    pattern: [
      { t: "bargain", n: 7, heal: 4 },
      { t: "attack", n: 10 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  bossDef({
    id: "riftMaw",
    hp: 78,
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
          { t: "attack", n: 5 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 6 },
        ],
        everyTurn: [{ t: "capShrink" }],
        onEnter: [{ t: "capShrink" }],
      },
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "attack", n: 5 },
    ],
  }),
  bossDef({
    id: "riftBranch",
    hp: 68,
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
          { t: "multi", n: 5, k: 3 },
          { t: "curseDie", n: 3 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "curseDie", n: 3 },
          { t: "multi", n: 5, k: 2 },
          { t: "attack", n: 11 },
        ],
        everyTurn: [{ t: "capShrink" }],
        onEnter: [{ t: "curseDie", n: 3 }],
      },
    ],
    pattern: [
      { t: "capShrink" },
      { t: "multi", n: 5, k: 3 },
      { t: "curseDie", n: 3 },
    ],
  }),
  bossDef({
    id: "choirFlagship",
    hp: 81,
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
    hp: 45,
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
          { t: "attack", n: 7 },
          { t: "shield", n: 7 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "attack", n: 7 },
          { t: "multi", n: 4, k: 2 },
        ],
        everyTurn: [{ t: "enrage", n: 1 }],
        onEnter: [{ t: "shield", n: 8 }],
      },
    ],
    pattern: [
      { t: "enrage", n: 2 },
      { t: "attack", n: 7 },
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
    hp: 76,
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
          { t: "multi", n: 5, k: 2 },
        ],
      },
      {
        untilHpPct: 25,
        pattern: [
          { t: "attack", n: 11 },
          { t: "mirrorSchool" },
          { t: "multi", n: 5, k: 2 },
        ],
        onEnter: [{ t: "storm" }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "shield", n: 10 },
          { t: "mirrorSchool" },
          { t: "attack", n: 13 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "shield", n: 10 }],
      },
    ],
    pattern: [
      { t: "shield", n: 8 },
      { t: "mirrorSchool" },
      { t: "multi", n: 5, k: 2 },
    ],
  }),
  bossDef({
    id: "theHush",
    hp: 51,
    boss: true,
    jamReleasesBlocks: true,
    claims: [
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "phases" },
      { k: "trait", is: "jamReleasesBlocks" },
    ],
    subsystems: [
      sub("theHush", "throat", 16, "shieldSelf6"),
      sub("theHush", "bell", 16, "atk+3"),
    ],
    phases: [
      {
        untilHpPct: 66,
        pattern: [
          { t: "jamSlot" },
          { t: "shield", n: 8 },
          { t: "attack", n: 10 },
        ],
      },
      {
        untilHpPct: 33,
        pattern: [
          { t: "jamSlot" },
          { t: "multi", n: 5, k: 2 },
          { t: "capShrink" },
        ],
        everyTurn: [{ t: "jamSlot" }],
        onEnter: [{ t: "jamSlot", k: 2 }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "attack", n: 11 },
          { t: "devourDie" },
          { t: "multi", n: 5, k: 2 },
        ],
        onEnter: [{ t: "shield", n: 10 }],
      },
    ],
    pattern: [
      { t: "jamSlot" },
      { t: "shield", n: 8 },
      { t: "attack", n: 10 },
    ],
  }),
  bossDef({
    id: "echoFleet",
    hp: 126,
    boss: true,
    claims: [
      { k: "trait", is: "phases" },
      { k: "aura", is: "twistEachTurn" },
      { k: "aura", is: "lockEvery3" },
    ],
    subsystems: [
      sub("echoFleet", "wake", 14, "twistEachTurn"),
      sub("echoFleet", "chorus", 14, "lockEvery3"),
    ],
    phases: [
      {
        untilHpPct: 66,
        pattern: [
          { t: "shieldGate", n: 10 },
          { t: "stealScrap", n: 8 },
          { t: "multi", n: 6, k: 2 },
          { t: "siphonShield", n: 6 },
        ],
      },
      {
        untilHpPct: 33,
        pattern: [
          { t: "capShrink" },
          { t: "charge" },
          { t: "multi", n: 6, k: 2 },
        ],
        onEnter: [{ t: "shieldAll", n: 8 }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "mirrorSchool" },
          { t: "attack", n: 9 },
          { t: "echoTotal", cap: 16 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "shield", n: 12 }],
      },
    ],
    pattern: [
      { t: "shieldGate", n: 8 },
      { t: "stealScrap", n: 8 },
      { t: "siphonShield", n: 6 },
    ],
  }),
];

export const BOSS_BY_ID: ReadonlyMap<string, BossDef> = new Map(
  BOSSES.map((def) => [def.id, def]),
);
