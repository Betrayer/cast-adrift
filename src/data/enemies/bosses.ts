import { bossDef, PART_HP, partCycle, sub } from "@/data/enemies/builder";
import type { BossDef } from "@/types/content";

export const BOSSES: readonly BossDef[] = [
  bossDef({
    id: "quarantineWarden",
    hp: 42,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "aura", is: "shieldSelf6" },
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("quarantineWarden", "lance", PART_HP, "atk+3", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("quarantineWarden", "aegis", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("quarantineWarden", "siren", PART_HP, undefined, {
        intents: partCycle({ t: "shield", n: 6 }),
      }),
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
  }),
  bossDef({
    id: "beaconTrap",
    hp: 50,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "intent", t: "shieldGate" },
      { k: "intent", t: "siphonShield" },
      { k: "partIntent", t: "siphonShield" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("beaconTrap", "lensA", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("beaconTrap", "lensB", PART_HP, undefined, {
        intents: partCycle({ t: "siphonShield", n: 5 }),
      }),
      sub("beaconTrap", "prism", PART_HP, "lockEvery3", {
        onDeath: { t: "explodePart", n: 5 },
      }),
    ],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "shieldGate", n: 6 },
          { t: "idle" },
          { t: "attack", n: 7 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "shieldGate", n: 8 },
          { t: "multi", n: 4, k: 2 },
          { t: "siphonShield", n: 6 },
        ],
        onEnter: [{ t: "shieldGate", n: 10 }],
        everyTurn: [{ t: "siphonShield", n: 3 }],
      },
    ],
  }),
  bossDef({
    id: "breakerBarge",
    hp: 36,
    shell: true,
    coreLockAt: 1,
    stealOnHit: 3,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "stealOnHit" },
      { k: "aura", is: "lockEvery3" },
      { k: "intent", t: "stealScrap" },
    ],
    subsystems: [
      sub("breakerBarge", "grinder", PART_HP, "stealOnHit6"),
      sub("breakerBarge", "crane", PART_HP, "lockEvery3", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("breakerBarge", "maw", PART_HP, undefined, {
        intents: partCycle({ t: "stealScrap", n: 6 }),
        onDeath: { t: "explodePart", n: 4 },
      }),
    ],
    phases: [
      {
        untilHpPct: 40,
        pattern: [
          { t: "attack", n: 6 },
          { t: "idle" },
          { t: "multi", n: 3, k: 2 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "multi", n: 3, k: 2 },
          { t: "attack", n: 7 },
          { t: "stealScrap", n: 6 },
        ],
        onEnter: [{ t: "charge" }],
      },
    ],
  }),
  bossDef({
    id: "auctionCorvette",
    hp: 93,
    shell: true,
    coreLockAt: 1,
    stealOnHit: 5,
    claims: [
      { k: "intent", t: "bargain" },
      { k: "trait", is: "stealOnHit" },
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("auctionCorvette", "gavel", PART_HP, "stealOnHit6", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("auctionCorvette", "ledger", PART_HP, "atk+2", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("auctionCorvette", "podium", PART_HP, undefined, {
        onDeath: { t: "shieldCore", n: 8 },
      }),
    ],
    phases: [
      {
        untilHpPct: 45,
        pattern: [
          { t: "bargain", n: 7, heal: 4 },
          { t: "attack", n: 11 },
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
  }),
  bossDef({
    id: "riftMaw",
    hp: 44,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "aura", is: "twistEachTurn" },
      { k: "intent", t: "capShrink" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("riftMaw", "eyeA", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("riftMaw", "eyeB", PART_HP, "twistEachTurn"),
      sub("riftMaw", "gullet", PART_HP, undefined, {
        onDeath: { t: "explodePart", n: 5 },
      }),
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
  }),
  bossDef({
    id: "riftBranch",
    hp: 55,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "intent", t: "capShrink" },
      { k: "intent", t: "curseDie" },
      { k: "partIntent", t: "curseDie" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("riftBranch", "budA", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("riftBranch", "budB", PART_HP, "shieldSelf6"),
      sub("riftBranch", "thorn", PART_HP, undefined, {
        intents: partCycle({ t: "curseDie", n: 3 }),
        onDeath: { t: "spawnAdds", id: "riftling" },
      }),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "capShrink" },
          { t: "multi", n: 5, k: 3 },
          { t: "idle" },
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
  }),
  bossDef({
    id: "choirFlagship",
    hp: 57,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "aura", is: "chargeAllies" },
      { k: "aura", is: "summonEvery4" },
    ],
    subsystems: [
      sub("choirFlagship", "spire", PART_HP, "chargeAllies", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("choirFlagship", "voice", PART_HP, "summonEvery4"),
      sub("choirFlagship", "censer", PART_HP, undefined, {
        intents: partCycle({ t: "charge" }),
        onDeath: { t: "openCore", turns: 2 },
      }),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "multi", n: 3, k: 2 },
          { t: "idle" },
          { t: "attack", n: 7 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "charge" },
          { t: "multi", n: 4, k: 2 },
          { t: "healAllies", n: 6 },
        ],
        onEnter: [{ t: "shieldAll", n: 8 }],
      },
    ],
  }),
  bossDef({
    id: "cantorColossus",
    hp: 42,
    shell: true,
    coreLockAt: 1,
    jamClearsRage: true,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "jamClearsRage" },
      { k: "intent", t: "enrage" },
      { k: "partIntent", t: "enrage" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("cantorColossus", "lungA", PART_HP, "atk+3", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("cantorColossus", "lungB", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("cantorColossus", "diaphragm", PART_HP, undefined, {
        intents: partCycle({ t: "enrage", n: 2 }),
      }),
    ],
    phases: [
      {
        untilHpPct: 45,
        pattern: [
          { t: "idle" },
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
  }),
  bossDef({
    id: "coreHeart",
    hp: 73,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "intent", t: "storm" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("coreHeart", "valveA", PART_HP, "shieldSelf6", {
        onDeath: { t: "shieldCore", n: 8 },
      }),
      sub("coreHeart", "valveB", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("coreHeart", "vent", PART_HP, undefined, {
        intents: partCycle({ t: "shield", n: 8 }),
      }),
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
  }),
  bossDef({
    id: "mirrorHeart",
    hp: 46,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "intent", t: "mirrorSchool" },
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("mirrorHeart", "faceA", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("mirrorHeart", "faceB", PART_HP, "shieldSelf6"),
      sub("mirrorHeart", "pane", PART_HP, undefined, {
        intents: partCycle({ t: "shield", n: 8 }),
        onDeath: { t: "explodePart", n: 6 },
      }),
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
  }),
  bossDef({
    id: "theHush",
    hp: 30,
    shell: true,
    coreLockAt: 1,
    jamReleasesBlocks: true,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "intent", t: "jamSlot" },
      { k: "partIntent", t: "jamSlot" },
      { k: "trait", is: "phases" },
      { k: "trait", is: "jamReleasesBlocks" },
    ],
    subsystems: [
      sub("theHush", "throat", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("theHush", "bell", PART_HP, "atk+3", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("theHush", "muffler", PART_HP, undefined, {
        intents: partCycle({ t: "jamSlot" }),
      }),
    ],
    phases: [
      {
        untilHpPct: 66,
        pattern: [
          { t: "idle" },
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
  }),
  bossDef({
    id: "echoFleet",
    hp: 86,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "phases" },
      { k: "aura", is: "lockEvery3" },
    ],
    subsystems: [
      sub("echoFleet", "wake", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("echoFleet", "chorus", PART_HP, "lockEvery3"),
      sub("echoFleet", "ghost", PART_HP, undefined, {
        intents: partCycle({ t: "siphonShield", n: 6 }),
        onDeath: { t: "explodePart", n: 6 },
      }),
    ],
    phases: [
      {
        untilHpPct: 66,
        pattern: [
          { t: "shieldGate", n: 10 },
          { t: "stealScrap", n: 8 },
          { t: "multi", n: 3, k: 2 },
          { t: "idle" },
        ],
      },
      {
        untilHpPct: 33,
        pattern: [
          { t: "capShrink" },
          { t: "charge" },
          { t: "multi", n: 3, k: 2 },
        ],
        onEnter: [{ t: "shieldAll", n: 8 }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "mirrorSchool" },
          { t: "attack", n: 6 },
          { t: "echoTotal", cap: 16 },
        ],
        everyTurn: [{ t: "storm" }],
        onEnter: [{ t: "shield", n: 12 }],
      },
    ],
    pattern: [
      { t: "shieldGate", n: 8 },
      { t: "stealScrap", n: 8 },
      { t: "idle" },
    ],
  }),
];

export const BOSS_BY_ID: ReadonlyMap<string, BossDef> = new Map(
  BOSSES.map((def) => [def.id, def]),
);
