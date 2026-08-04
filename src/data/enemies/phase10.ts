import type { EnemyDef } from "@/types/content";

// Phase-10 roster fill to the DESIGN §14 target of 35 base enemies + 8 elites.
// Signatures, one line each:
//   S2  hookTug — steals scrap on every hit · slagHauler — shields itself, hits slow
//       chaffSwarm — cheap multi-hit filler
//   S3  foldWorm — twists dice · nullEcho — mirrors half, no shield
//       riftAnchor — shrinks a slot cap every other turn
//   S4  hymnCantor — charges allies · pyreDeacon — heals the choir
//       reliquary — guarded shell that shields the pack
//   S5  causalityLoop — swaps values, then multi-hits · voidWarden — locks a die
//       quietEngine — storm every other turn
//   plus three cross-sector fillers (breachDrone, sparkMote, hullGnat)
// Elites: one per pool, each with a single aura twist on the shared elite frame.
export const PHASE10_ENEMIES: readonly EnemyDef[] = [
  // ── sector 2 fill ─────────────────────────────────────────────────────────
  {
    id: "hookTug",
    name: "content:enemies.hookTug",
    hp: 17,
    role: "harrier",
    stealOnHit: 4,
    pattern: [
      { t: "attack", n: 5 },
      { t: "multi", n: 3, k: 2 },
    ],
  },
  {
    id: "slagHauler",
    name: "content:enemies.slagHauler",
    hp: 26,
    role: "anchor",
    pattern: [
      { t: "shield", n: 8 },
      { t: "attack", n: 7 },
    ],
  },
  {
    id: "chaffSwarm",
    name: "content:enemies.chaffSwarm",
    hp: 10,
    role: "swarm",
    pattern: [{ t: "multi", n: 2, k: 4 }],
  },

  // ── sector 3 fill ─────────────────────────────────────────────────────────
  {
    id: "foldWorm",
    name: "content:enemies.foldWorm",
    hp: 18,
    role: "harrier",
    pattern: [
      { t: "twistDie" },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "nullEcho",
    name: "content:enemies.nullEcho",
    hp: 16,
    role: "harrier",
    pattern: [
      { t: "mirrorHalf" },
      { t: "attack", n: 4 },
      { t: "twistDie" },
    ],
  },
  {
    id: "riftAnchor",
    name: "content:enemies.riftAnchor",
    hp: 21,
    role: "anchor",
    pattern: [
      { t: "capShrink" },
      { t: "attack", n: 6 },
      { t: "shield", n: 5 },
    ],
  },

  // ── sector 4 fill ─────────────────────────────────────────────────────────
  {
    id: "hymnCantor",
    name: "content:enemies.hymnCantor",
    hp: 21,
    role: "support",
    pattern: [
      { t: "charge" },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "pyreDeacon",
    name: "content:enemies.pyreDeacon",
    hp: 23,
    role: "support",
    pattern: [
      { t: "healAllies", n: 5 },
      { t: "multi", n: 5, k: 3 },
    ],
  },
  {
    id: "reliquary",
    name: "content:enemies.reliquary",
    hp: 25,
    role: "anchor",
    guarded: true,
    pattern: [
      { t: "shieldAll", n: 6 },
      { t: "attack", n: 8 },
    ],
  },

  // ── sector 5 fill ─────────────────────────────────────────────────────────
  {
    id: "causalityLoop",
    name: "content:enemies.causalityLoop",
    hp: 24,
    role: "harrier",
    pattern: [
      { t: "swapValues" },
      { t: "multi", n: 6, k: 3 },
    ],
  },
  {
    id: "voidWarden",
    name: "content:enemies.voidWarden",
    hp: 25,
    role: "bruiser",
    pattern: [
      { t: "lockDie" },
      { t: "attack", n: 10 },
      { t: "shield", n: 7 },
    ],
  },
  {
    id: "quietEngine",
    name: "content:enemies.quietEngine",
    hp: 22,
    role: "harrier",
    pattern: [
      { t: "storm" },
      { t: "multi", n: 6, k: 3 },
    ],
  },

  // ── cross-sector fillers ──────────────────────────────────────────────────
  {
    id: "breachDrone",
    name: "content:enemies.breachDrone",
    hp: 12,
    role: "swarm",
    onDeath: { t: "explode", n: 4 },
    pattern: [{ t: "attack", n: 5 }],
  },
  {
    id: "sparkMote",
    name: "content:enemies.sparkMote",
    hp: 5,
    role: "swarm",
    env: true,
    pattern: [{ t: "attack", n: 2 }],
  },
  {
    id: "hullGnat",
    name: "content:enemies.hullGnat",
    hp: 14,
    role: "swarm",
    pattern: [
      { t: "multi", n: 2, k: 3 },
      { t: "attack", n: 4 },
    ],
  },

  // ── elites (raiderAlpha + bountyHuntress already exist; +6 to reach 8) ─────
  {
    id: "clanBreaker",
    name: "content:enemies.clanBreaker",
    hp: 33,
    role: "bruiser",
    elite: true,
    stealOnHit: 6,
    subsystems: [
      {
        id: "claw",
        name: "content:enemies.clanBreaker-claw",
        hp: 10,
        aura: "stealOnHit6",
      },
    ],
    pattern: [
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
      { t: "shield", n: 7 },
    ],
  },
  {
    id: "riftTyrant",
    name: "content:enemies.riftTyrant",
    hp: 31,
    role: "harrier",
    elite: true,
    subsystems: [
      {
        id: "eye",
        name: "content:enemies.riftTyrant-eye",
        hp: 10,
        aura: "twistEachTurn",
      },
    ],
    pattern: [
      { t: "capShrink" },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
    ],
  },
  {
    id: "choirCantor",
    name: "content:enemies.choirCantor",
    hp: 29,
    role: "support",
    elite: true,
    subsystems: [
      {
        id: "hymn",
        name: "content:enemies.choirCantor-hymn",
        hp: 9,
        aura: "chargeAllies",
      },
    ],
    pattern: [
      { t: "healAllies", n: 6 },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "coreSentinel",
    name: "content:enemies.coreSentinel",
    hp: 28,
    role: "anchor",
    elite: true,
    subsystems: [
      {
        id: "lattice",
        name: "content:enemies.coreSentinel-lattice",
        hp: 9,
        aura: "shieldSelf6",
      },
    ],
    pattern: [
      { t: "swapValues" },
      { t: "attack", n: 10 },
      { t: "multi", n: 5, k: 3 },
    ],
  },
  {
    id: "leechPrince",
    name: "content:enemies.leechPrince",
    hp: 28,
    role: "harrier",
    elite: true,
    subsystems: [
      {
        id: "siphon",
        name: "content:enemies.leechPrince-siphon",
        hp: 9,
        aura: "lockEachTurn",
      },
    ],
    pattern: [
      { t: "lockDie" },
      { t: "multi", n: 4, k: 4 },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "mineBaron",
    name: "content:enemies.mineBaron",
    hp: 34,
    role: "support",
    elite: true,
    onDeath: { t: "explode", n: 8 },
    subsystems: [
      {
        id: "rack",
        name: "content:enemies.mineBaron-rack",
        hp: 10,
        aura: "summonEvery4",
      },
    ],
    pattern: [
      { t: "summon", id: "mine" },
      { t: "multi", n: 4, k: 4 },
      { t: "attack", n: 9 },
    ],
  },
];
