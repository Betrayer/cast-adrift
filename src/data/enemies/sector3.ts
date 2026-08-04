import type { EnemyDef } from "@/types/content";

export const SECTOR3_ENEMIES: readonly EnemyDef[] = [
  {
    id: "riftling",
    name: "content:enemies.riftling",
    hp: 18,
    role: "harrier",
    pattern: [
      {
        pick: [
          [{ t: "capShrink" }, 3],
          [{ t: "twistDie" }, 2],
        ],
      },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "echoShade",
    name: "content:enemies.echoShade",
    hp: 20,
    role: "harrier",
    pattern: [
      { t: "mirrorHalf" },
      { t: "attack", n: 5 },
    ],
  },
  {
    id: "unstableCore",
    name: "content:enemies.unstableCore",
    hp: 14,
    role: "swarm",
    onDeath: { t: "explode", n: 6 },
    pattern: [{ t: "attack", n: 6 }],
  },
];
