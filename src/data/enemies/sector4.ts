import type { EnemyDef } from "@/types/content";

export const SECTOR4_ENEMIES: readonly EnemyDef[] = [
  {
    id: "choirAcolyte",
    name: "content:enemies.choirAcolyte",
    hp: 18,
    role: "support",
    pattern: [
      { t: "healAllies", n: 4 },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "hymnTurret",
    name: "content:enemies.hymnTurret",
    hp: 20,
    role: "bruiser",
    pattern: [
      { t: "attack", n: 6 },
      {
        pick: [
          [{ t: "charge" }, 3],
          [{ t: "shieldAll", n: 4 }, 2],
        ],
      },
    ],
  },
  {
    id: "zealotRam",
    name: "content:enemies.zealotRam",
    hp: 22,
    role: "bruiser",
    pattern: [
      { t: "attack", n: 10, self: 2 },
      { t: "multi", n: 3, k: 2 },
    ],
  },
];
