import type { EnemyDef } from "@/types/content";

export const SECTOR1_ENEMIES: readonly EnemyDef[] = [
  {
    id: "raider",
    name: "content:enemies.raider",
    hp: 18,
    pattern: [
      { t: "attack", n: 5 },
      { t: "attack", n: 7 },
      { t: "shield", n: 5 },
    ],
  },
];

export const ENEMY_BY_ID: ReadonlyMap<string, EnemyDef> = new Map(
  SECTOR1_ENEMIES.map((def) => [def.id, def]),
);
