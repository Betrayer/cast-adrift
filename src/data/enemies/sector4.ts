import type { EnemyDef } from "@/types/content";

// Sector 4 — The Choir. Stats baked at ×1.45 over the sector-1 baseline.
export const SECTOR4_ENEMIES: readonly EnemyDef[] = [
  {
    id: "choirAcolyte",
    name: "content:enemies.choirAcolyte",
    hp: 26,
    pattern: [
      { t: "healAllies", n: 4 },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "hymnTurret",
    name: "content:enemies.hymnTurret",
    hp: 29,
    pattern: [
      { t: "attack", n: 6 },
      { t: "charge" },
    ],
  },
  {
    id: "zealotRam",
    name: "content:enemies.zealotRam",
    hp: 32,
    pattern: [
      { t: "attack", n: 10, self: 2 },
      { t: "multi", n: 3, k: 2 },
    ],
  },
];
