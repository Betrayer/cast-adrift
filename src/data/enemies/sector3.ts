import type { EnemyDef } from "@/types/content";

// Sector 3 — The Rift. Stats baked at ×1.30 over the sector-1 baseline.
export const SECTOR3_ENEMIES: readonly EnemyDef[] = [
  {
    id: "riftling",
    name: "content:enemies.riftling",
    hp: 23,
    pattern: [
      { t: "capShrink" },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "echoShade",
    name: "content:enemies.echoShade",
    hp: 26,
    pattern: [
      { t: "mirrorHalf" },
      { t: "attack", n: 5 },
    ],
  },
  {
    id: "unstableCore",
    name: "content:enemies.unstableCore",
    hp: 18,
    onDeath: { t: "explode", n: 6 },
    pattern: [{ t: "attack", n: 6 }],
  },
];
