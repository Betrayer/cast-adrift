import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

// Sector 5 is causality: order of operations is the weapon. Swaps land before
// the volley, storms land after the roll, shells and guards decide what may be
// hit at all, and half the pool reads the player's own state before it acts.
export const SECTOR5_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "coreFragment",
    hp: 18,
    role: "anchor",
    guarded: true,
    claims: [
      { k: "trait", is: "guarded" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "attack", n: 7 },
      {
        when: { c: "alliesAtLeast", n: 2 },
        then: { t: "shield", n: 6 },
        else: { t: "attack", n: 10 },
      },
    ],
  }),
  enemy({
    id: "probabilityKnot",
    hp: 20,
    role: "harrier",
    claims: [
      { k: "intent", t: "swapValues" },
      { k: "intent", t: "storm" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      {
        pick: [
          [{ t: "swapValues" }, 3],
          [{ t: "storm" }, 1],
        ],
      },
      { t: "multi", n: 4, k: 3 },
    ],
  }),
  enemy({
    id: "nullDrone",
    hp: 16,
    role: "harrier",
    claims: [{ k: "intent", t: "jamSlot" }],
    pattern: [
      { t: "attack", n: 3 },
      { t: "jamSlot" },
      { t: "multi", n: 3, k: 2 },
    ],
  }),
  enemy({
    id: "causalityLoop",
    hp: 24,
    role: "harrier",
    claims: [{ k: "intent", t: "swapValues" }],
    pattern: [
      { t: "swapValues" },
      { t: "multi", n: 6, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "voidWarden",
    hp: 25,
    role: "bruiser",
    claims: [{ k: "intent", t: "lockDie" }],
    pattern: [
      { t: "lockDie" },
      { t: "attack", n: 10 },
      { t: "shield", n: 7 },
    ],
  }),
  enemy({
    id: "quietEngine",
    hp: 22,
    role: "harrier",
    claims: [{ k: "intent", t: "storm" }],
    pattern: [
      { t: "storm" },
      { t: "multi", n: 6, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "echoOfTheHeart",
    hp: 26,
    role: "anchor",
    shell: true,
    claims: [
      { k: "trait", is: "shell" },
      { k: "aura", is: "shieldSelf6" },
    ],
    subsystems: [
      {
        id: "valve",
        name: "content:enemies.echoOfTheHeart-valve",
        hp: 10,
        aura: "shieldSelf6",
      },
    ],
    pattern: [
      { t: "shield", n: 7 },
      { t: "attack", n: 8 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  enemy({
    id: "retrocausalMote",
    hp: 15,
    role: "swarm",
    claims: [
      { k: "onDeath", t: "chargeAllies" },
      { k: "intent", t: "multi" },
    ],
    onDeath: { t: "chargeAllies" },
    pattern: [
      { t: "multi", n: 3, k: 3 },
      { t: "attack", n: 5 },
      { t: "multi", n: 2, k: 2 },
    ],
  }),
  enemy({
    id: "stormChanter",
    hp: 23,
    role: "support",
    claims: [
      { k: "intent", t: "storm" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "playerHullPctLt", n: 40 },
        then: { t: "storm" },
        else: { t: "shieldAll", n: 5 },
      },
      { t: "multi", n: 5, k: 3 },
    ],
  }),
  enemy({
    id: "causalWard",
    hp: 27,
    role: "anchor",
    claims: [
      { k: "intent", t: "siphonShield" },
      { k: "intent", t: "shieldGate" },
    ],
    pattern: [
      { t: "shieldGate", n: 6 },
      { t: "siphonShield", n: 6 },
      { t: "attack", n: 9 },
    ],
  }),
];
