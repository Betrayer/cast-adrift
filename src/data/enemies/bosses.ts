import type { BossDef } from "@/types/content";

// Act bosses (DESIGN §2). HP figures are the A0 baseline; ascension scaling is a
// run modifier, never baked here. Phases are ordered high hp% → low; the first
// phase whose `untilHpPct` the boss is still above owns the pattern.
export const BOSSES: readonly BossDef[] = [
  {
    id: "quarantineWarden",
    name: "content:enemies.quarantineWarden",
    hp: 66,
    boss: true,
    subsystems: [
      { id: "lance", name: "content:enemies.quarantineWarden-lance", hp: 14, aura: "atk+3" },
      { id: "aegis", name: "content:enemies.quarantineWarden-aegis", hp: 14, aura: "shieldSelf6" },
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
  },
  {
    id: "breakerBarge",
    name: "content:enemies.breakerBarge",
    hp: 84,
    boss: true,
    stealOnHit: 6,
    subsystems: [
      { id: "grinder", name: "content:enemies.breakerBarge-grinder", hp: 16, aura: "stealOnHit6" },
      { id: "crane", name: "content:enemies.breakerBarge-crane", hp: 16, aura: "lockEvery3" },
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
  },
  {
    id: "riftMaw",
    name: "content:enemies.riftMaw",
    hp: 88,
    boss: true,
    subsystems: [
      { id: "eyeA", name: "content:enemies.riftMaw-eyeA", hp: 16, aura: "twistEachTurn" },
      { id: "eyeB", name: "content:enemies.riftMaw-eyeB", hp: 16, aura: "twistEachTurn" },
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
  },
  {
    id: "choirFlagship",
    name: "content:enemies.choirFlagship",
    hp: 112,
    boss: true,
    subsystems: [
      { id: "spire", name: "content:enemies.choirFlagship-spire", hp: 20, aura: "chargeAllies" },
      { id: "voice", name: "content:enemies.choirFlagship-voice", hp: 20, aura: "summonEvery4" },
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
  },
  {
    id: "coreHeart",
    name: "content:enemies.coreHeart",
    hp: 132,
    boss: true,
    shell: true,
    subsystems: [
      { id: "valveA", name: "content:enemies.coreHeart-valveA", hp: 20, aura: "shieldSelf6" },
      { id: "valveB", name: "content:enemies.coreHeart-valveB", hp: 20, aura: "twistEachTurn" },
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
  },
];

export const BOSS_BY_ID: ReadonlyMap<string, BossDef> = new Map(
  BOSSES.map((def) => [def.id, def]),
);
