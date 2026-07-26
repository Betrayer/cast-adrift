import type { EnemyDef } from "@/types/content";

// Sector 2 — The Drift Fields. Base stats are baked at ×1.15 over the sector-1
// baseline (Task 1 curve: ×(1 + 0.15×(sector−1))); nothing multiplies at runtime.
export const SECTOR2_ENEMIES: readonly EnemyDef[] = [
  {
    id: "breakerDrone",
    name: "content:enemies.breakerDrone",
    hp: 20,
    pattern: [
      { t: "multi", n: 4, k: 3 },
      { t: "attack", n: 7 },
    ],
  },
  {
    id: "magnetTug",
    name: "content:enemies.magnetTug",
    hp: 25,
    stealOnHit: 5,
    pattern: [
      { t: "attack", n: 6 },
      { t: "stealScrap", n: 5 },
    ],
  },
  {
    id: "minelayer",
    name: "content:enemies.minelayer",
    hp: 23,
    pattern: [
      { t: "summon", id: "mine" },
      { t: "multi", n: 4, k: 2 },
    ],
  },
];
