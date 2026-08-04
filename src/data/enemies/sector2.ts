import type { EnemyDef } from "@/types/content";

export const SECTOR2_ENEMIES: readonly EnemyDef[] = [
  {
    id: "breakerDrone",
    name: "content:enemies.breakerDrone",
    hp: 17,
    role: "bruiser",
    pattern: [
      { t: "multi", n: 4, k: 3 },
      {
        pick: [
          [{ t: "attack", n: 7 }, 3],
          [{ t: "multi", n: 3, k: 3 }, 2],
        ],
      },
    ],
  },
  {
    id: "magnetTug",
    name: "content:enemies.magnetTug",
    hp: 22,
    role: "harrier",
    stealOnHit: 5,
    pattern: [
      { t: "attack", n: 6 },
      { t: "stealScrap", n: 5 },
    ],
  },
  {
    id: "minelayer",
    name: "content:enemies.minelayer",
    hp: 20,
    role: "support",
    pattern: [
      { t: "summon", id: "mine" },
      { t: "multi", n: 4, k: 2 },
    ],
  },
];
