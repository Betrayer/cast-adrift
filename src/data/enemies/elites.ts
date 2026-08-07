import { enemy, sub } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

// Fourteen elites, each a named test of one build axis. Every one carries a
// subsystem so A6's overclock module has something to bolt onto, and every one
// states its test in its signature line: an elite the player cannot read is just
// a bigger base enemy.
export const ELITE_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "raiderAlpha",
    hp: 30,
    role: "bruiser",
    elite: true,
    claims: [
      { k: "trait", is: "pick" },
      { k: "aura", is: "atk+2" },
    ],
    subsystems: [sub("raiderAlpha", "turret", 10, "atk+2")],
    pattern: [
      { t: "multi", n: 4, k: 4 },
      {
        pick: [
          [{ t: "multi", n: 4, k: 3 }, 2],
          [{ t: "shield", n: 6 }, 1],
        ],
      },
      {
        pick: [
          [{ t: "multi", n: 4, k: 4 }, 1],
          [{ t: "multi", n: 3, k: 4 }, 1],
        ],
      },
    ],
  }),
  enemy({
    id: "bountyHuntress",
    hp: 34,
    role: "harrier",
    elite: true,
    claims: [
      { k: "intent", t: "lockDie" },
      { k: "aura", is: "lockEvery3" },
    ],
    subsystems: [sub("bountyHuntress", "scope", 10, "lockEvery3")],
    pattern: [
      { t: "multi", n: 5, k: 3 },
      { t: "lockDie", target: "highest" },
      { t: "multi", n: 6, k: 2 },
    ],
  }),
  enemy({
    id: "clanBreaker",
    hp: 33,
    role: "bruiser",
    elite: true,
    stealOnHit: 6,
    claims: [
      { k: "trait", is: "stealOnHit" },
      { k: "aura", is: "stealOnHit6" },
    ],
    subsystems: [sub("clanBreaker", "claw", 10, "stealOnHit6")],
    pattern: [
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
      { t: "shield", n: 7 },
    ],
  }),
  enemy({
    id: "riftTyrant",
    hp: 31,
    role: "harrier",
    elite: true,
    claims: [
      { k: "intent", t: "capShrink" },
      { k: "aura", is: "twistEachTurn" },
    ],
    subsystems: [sub("riftTyrant", "eye", 10, "twistEachTurn")],
    pattern: [
      { t: "capShrink" },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
    ],
  }),
  enemy({
    id: "choirCantor",
    hp: 29,
    role: "support",
    elite: true,
    claims: [
      { k: "intent", t: "healAllies" },
      { k: "aura", is: "chargeAllies" },
    ],
    subsystems: [sub("choirCantor", "hymn", 9, "chargeAllies")],
    pattern: [
      { t: "healAllies", n: 6 },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "coreSentinel",
    hp: 28,
    role: "anchor",
    elite: true,
    claims: [
      { k: "intent", t: "swapValues" },
      { k: "aura", is: "shieldSelf6" },
    ],
    subsystems: [sub("coreSentinel", "lattice", 9, "shieldSelf6")],
    pattern: [
      { t: "swapValues" },
      { t: "attack", n: 10 },
      { t: "multi", n: 5, k: 3 },
    ],
  }),
  enemy({
    id: "leechPrince",
    hp: 28,
    role: "harrier",
    elite: true,
    claims: [
      { k: "aura", is: "lockEachTurn" },
      { k: "intent", t: "lockDie" },
    ],
    subsystems: [sub("leechPrince", "siphon", 9, "lockEachTurn")],
    pattern: [
      { t: "lockDie" },
      { t: "multi", n: 4, k: 4 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "mineBaron",
    hp: 34,
    role: "support",
    elite: true,
    claims: [
      { k: "intent", t: "summon" },
      { k: "onDeath", t: "explode" },
    ],
    onDeath: { t: "explode", n: 8 },
    subsystems: [sub("mineBaron", "rack", 10, "summonEvery4")],
    pattern: [
      { t: "summon", id: "mine" },
      { t: "multi", n: 4, k: 4 },
      { t: "attack", n: 9 },
    ],
  }),

  // ── the six build-tests ───────────────────────────────────────────────────
  enemy({
    id: "slagGolem",
    hp: 36,
    role: "anchor",
    elite: true,
    spikeCap: 8,
    claims: [
      { k: "trait", is: "spikeCap" },
      { k: "aura", is: "shieldSelf6" },
    ],
    subsystems: [sub("slagGolem", "mass", 12, "shieldSelf6")],
    pattern: [
      { t: "shield", n: 8 },
      { t: "multi", n: 4, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "tollmaster",
    hp: 30,
    role: "support",
    elite: true,
    feedsOnReroll: true,
    claims: [
      { k: "trait", is: "feedsOnReroll" },
      { k: "aura", is: "atk+2" },
    ],
    subsystems: [sub("tollmaster", "ledger", 10, "atk+2")],
    pattern: [
      { t: "attack", n: 8 },
      { t: "bargain", n: 6, heal: 4 },
      { t: "multi", n: 4, k: 3 },
    ],
  }),
  enemy({
    id: "brineSiphon",
    hp: 29,
    role: "harrier",
    elite: true,
    claims: [
      { k: "intent", t: "siphonShield" },
      { k: "aura", is: "shieldAllies3" },
    ],
    subsystems: [sub("brineSiphon", "intake", 9, "shieldAllies3")],
    pattern: [
      { t: "siphonShield", n: 8 },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "capacitorWraith",
    hp: 28,
    role: "harrier",
    elite: true,
    claims: [
      { k: "intent", t: "drainCharge" },
      { k: "aura", is: "chargeAllies" },
    ],
    subsystems: [sub("capacitorWraith", "coil", 9, "chargeAllies")],
    pattern: [
      { t: "drainCharge", n: 5 },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
    ],
  }),
  enemy({
    id: "blightVine",
    hp: 32,
    role: "anchor",
    elite: true,
    claims: [
      { k: "intent", t: "curseDie" },
      { k: "aura", is: "twistEachTurn" },
    ],
    subsystems: [sub("blightVine", "root", 11, "twistEachTurn")],
    pattern: [
      { t: "curseDie", n: 3 },
      { t: "attack", n: 9 },
      { t: "multi", n: 4, k: 3 },
    ],
  }),
  enemy({
    id: "bailiff",
    hp: 31,
    role: "support",
    elite: true,
    stealOnHit: 5,
    claims: [
      { k: "intent", t: "bargain" },
      { k: "trait", is: "stealOnHit" },
      { k: "aura", is: "stealOnHit6" },
    ],
    subsystems: [sub("bailiff", "writ", 10, "stealOnHit6")],
    pattern: [
      { t: "bargain", n: 6, heal: 4 },
      { t: "stealScrap", n: 6 },
      { t: "multi", n: 5, k: 3 },
    ],
  }),
];
