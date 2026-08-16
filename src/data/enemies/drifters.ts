import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

export const DRIFTER_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "mine",
    hp: 2,
    role: "swarm",
    env: true,
    claims: [{ k: "intent", t: "attack" }],
    pattern: [{ t: "attack", n: 1 }],
  }),
  enemy({
    id: "sparkMote",
    hp: 5,
    role: "swarm",
    env: true,
    claims: [{ k: "intent", t: "attack" }],
    pattern: [{ t: "attack", n: 2 }],
  }),
  enemy({
    id: "breachDrone",
    hp: 12,
    role: "swarm",
    claims: [{ k: "onDeath", t: "explode" }],
    onDeath: { t: "explode", n: 4 },
    pattern: [{ t: "attack", n: 5 }],
  }),
  enemy({
    id: "hullGnat",
    hp: 14,
    role: "swarm",
    claims: [{ k: "intent", t: "multi" }],
    pattern: [
      { t: "multi", n: 2, k: 3 },
      { t: "attack", n: 4 },
    ],
  }),
  enemy({
    id: "chaffSwarm",
    hp: 10,
    role: "swarm",
    claims: [{ k: "intent", t: "multi" }],
    pattern: [{ t: "multi", n: 2, k: 4 }],
  }),
];
