import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

export const SECTOR1_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "scavDrone",
    hp: 10,
    role: "swarm",
    claims: [{ k: "intent", t: "multi" }],
    pattern: [
      { t: "multi", n: 3, k: 3 },
      { t: "attack", n: 4 },
    ],
  }),
  enemy({
    id: "raider",
    hp: 32,
    role: "bruiser",
    claims: [
      { k: "intent", t: "multi" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "multi", n: 5, k: 4 },
      {
        when: { c: "selfHpPctLt", n: 40 },
        then: { t: "multi", n: 5, k: 4 },
        else: { t: "shield", n: 6 },
      },
      { t: "multi", n: 5, k: 3 },
    ],
  }),
  enemy({
    id: "shieldWarden",
    hp: 26,
    role: "anchor",
    claims: [
      { k: "intent", t: "siphonShield" },
      { k: "trait", is: "conditional" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      {
        when: { c: "playerShielded" },
        then: { t: "siphonShield", n: 5 },
        else: { t: "shieldAll", n: 6 },
      },
      {
        pick: [
          [{ t: "multi", n: 4, k: 4 }, 3],
          [{ t: "attack", n: 9 }, 2],
        ],
      },
    ],
  }),
  enemy({
    id: "jammerCorvette",
    hp: 24,
    role: "harrier",
    claims: [
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "turnGte", n: 4 },
        then: { t: "jamSlot", k: 2 },
        else: { t: "jamSlot" },
      },
      { t: "multi", n: 4, k: 4 },
    ],
  }),
  enemy({
    id: "leechSkiff",
    hp: 22,
    role: "harrier",
    claims: [{ k: "intent", t: "lockDie" }],
    pattern: [
      { t: "lockDie", target: "highest" },
      { t: "multi", n: 4, k: 3 },
    ],
  }),
  enemy({
    id: "choirZealot",
    hp: 22,
    role: "support",
    claims: [{ k: "intent", t: "charge" }],
    pattern: [
      { t: "charge" },
      { t: "multi", n: 3, k: 3 },
    ],
  }),
  enemy({
    id: "riftWasp",
    hp: 18,
    role: "harrier",
    claims: [
      { k: "onDeath", t: "blockSlot" },
      { k: "intent", t: "multi" },
    ],
    onDeath: { t: "blockSlot", slot: "weaponA" },
    pattern: [{ t: "multi", n: 3, k: 4 }],
  }),
  enemy({
    id: "anchorHulk",
    hp: 28,
    role: "anchor",
    claims: [{ k: "intent", t: "shieldGate" }],
    pattern: [
      { t: "shieldGate", n: 5 },
      { t: "attack", n: 7 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  enemy({
    id: "tetherDrone",
    hp: 16,
    role: "harrier",
    claims: [{ k: "intent", t: "curseDie" }],
    pattern: [
      { t: "curseDie", n: 2 },
      { t: "multi", n: 3, k: 3 },
    ],
  }),
  enemy({
    id: "salvageWarden",
    hp: 24,
    role: "support",
    claims: [
      { k: "onDeath", t: "healAllies" },
      { k: "intent", t: "healAllies" },
    ],
    onDeath: { t: "healAllies", n: 5 },
    pattern: [
      { t: "shieldAll", n: 5 },
      { t: "healAllies", n: 4 },
      { t: "attack", n: 6 },
    ],
  }),
];
