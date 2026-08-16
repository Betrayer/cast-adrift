import { enemy, sub } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

export const SECTOR6_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "retroEcho",
    hp: 22,
    role: "harrier",
    claims: [
      { k: "intent", t: "echoTotal" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "echoTotal", cap: 14 },
      { t: "attack", n: 5 },
      {
        when: { c: "playerShielded" },
        then: { t: "echoTotal", cap: 14 },
        else: { t: "multi", n: 4, k: 2 },
      },
    ],
  }),
  enemy({
    id: "foldWraith",
    hp: 24,
    role: "harrier",
    claims: [
      { k: "intent", t: "foldOrder" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      { t: "foldOrder" },
      { t: "multi", n: 5, k: 2 },
      {
        pick: [
          [{ t: "foldOrder" }, 2],
          [{ t: "attack", n: 9 }, 3],
        ],
      },
    ],
  }),
  enemy({
    id: "slowStrider",
    hp: 30,
    role: "anchor",
    guarded: true,
    claims: [
      { k: "trait", is: "guarded" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "turnGte", n: 4 },
        then: { t: "shieldGate", n: 9 },
        else: { t: "shield", n: 6 },
      },
      { t: "attack", n: 8 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  enemy({
    id: "oddsEater",
    hp: 26,
    role: "bruiser",
    claims: [{ k: "intent", t: "devourDie" }],
    pattern: [
      { t: "devourDie" },
      { t: "attack", n: 10 },
      { t: "devourDie" },
      { t: "multi", n: 5, k: 2 },
    ],
  }),
  enemy({
    id: "causalSplinter",
    hp: 14,
    role: "swarm",
    onDeath: { t: "curseDie", n: 2 },
    claims: [
      { k: "onDeath", t: "curseDie" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      { t: "multi", n: 3, k: 3 },
      {
        pick: [
          [{ t: "attack", n: 7 }, 3],
          [{ t: "curseDie", n: 2 }, 1],
        ],
      },
      { t: "attack", n: 5 },
    ],
  }),
  enemy({
    id: "preEcho",
    hp: 24,
    role: "support",
    claims: [
      { k: "intent", t: "storm" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "storm" },
      { t: "shieldAll", n: 6 },
      {
        when: { c: "alliesAtLeast", n: 2 },
        then: { t: "healAllies", n: 5 },
        else: { t: "attack", n: 9 },
      },
    ],
  }),
  enemy({
    id: "hushHerald",
    hp: 25,
    role: "support",
    claims: [
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "jamSlot", k: 2 },
      { t: "attack", n: 7 },
      {
        when: { c: "playerChargeAtLeast", n: 6 },
        then: { t: "drainCharge", n: 6 },
        else: { t: "jamSlot" },
      },
    ],
  }),
  enemy({
    id: "paradoxLoom",
    hp: 28,
    role: "anchor",
    claims: [
      { k: "aura", is: "twistEachTurn" },
      { k: "intent", t: "mirrorSchool" },
    ],
    subsystems: [sub("paradoxLoom", "shuttle", 12, "twistEachTurn")],
    pattern: [
      { t: "mirrorSchool" },
      { t: "shield", n: 7 },
      { t: "attack", n: 9 },
    ],
  }),
];
