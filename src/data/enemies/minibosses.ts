import type { EnemyDef } from "@/types/content";

// The six gate fights (DESIGN §6.4). Row 8 of every sector routes through one of
// these; a campaign never repeats one. Each carries a single signature idea.
export const MINIBOSSES: readonly EnemyDef[] = [
  {
    id: "convoyAlpha",
    name: "content:enemies.convoyAlpha",
    hp: 42,
    miniboss: true,
    shell: true,
    subsystems: [
      { id: "escortA", name: "content:enemies.convoyAlpha-escortA", hp: 12, aura: "atk+2" },
      { id: "escortB", name: "content:enemies.convoyAlpha-escortB", hp: 12, aura: "shieldAllies3" },
      { id: "escortC", name: "content:enemies.convoyAlpha-escortC", hp: 12, aura: "lockEvery3" },
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "shield", n: 8 },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "wardenFragment",
    name: "content:enemies.wardenFragment",
    hp: 58,
    miniboss: true,
    markVulnerable: true,
    subsystems: [
      { id: "plate", name: "content:enemies.wardenFragment-plate", hp: 18, aura: "shieldSelf6" },
    ],
    pattern: [
      { t: "shield", n: 8 },
      { t: "multi", n: 4, k: 2 },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "leechQueen",
    name: "content:enemies.leechQueen",
    hp: 44,
    miniboss: true,
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "attack", n: 7 },
          { t: "multi", n: 4, k: 2 },
        ],
        everyTurn: [{ t: "lockDie" }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "summon", id: "leechSkiff" },
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 8 },
        ],
        everyTurn: [{ t: "lockDie" }],
      },
    ],
    pattern: [
      { t: "attack", n: 7 },
      { t: "multi", n: 4, k: 2 },
    ],
  },
  {
    id: "mineTyrant",
    name: "content:enemies.mineTyrant",
    hp: 48,
    miniboss: true,
    phases: [
      {
        untilHpPct: 0,
        pattern: [
          { t: "attack", n: 9 },
          { t: "multi", n: 5, k: 2 },
        ],
        everyTurn: [{ t: "summon", id: "mine" }],
      },
    ],
    pattern: [
      { t: "attack", n: 9 },
      { t: "multi", n: 5, k: 2 },
    ],
  },
  {
    id: "choirHerald",
    name: "content:enemies.choirHerald",
    hp: 60,
    miniboss: true,
    pattern: [
      { t: "charge" },
      { t: "jamSlot" },
      { t: "multi", n: 4, k: 2 },
      { t: "charge" },
      { t: "attack", n: 8 },
    ],
  },
  {
    id: "mirrorHull",
    name: "content:enemies.mirrorHull",
    hp: 46,
    miniboss: true,
    pattern: [
      { t: "mirrorHalf" },
      { t: "shield", n: 6 },
      { t: "mirrorHalf" },
      { t: "attack", n: 6 },
    ],
  },
];
