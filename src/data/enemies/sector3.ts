import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

// Sector 3 attacks the dice rather than the hull: caps shrink, faces twist,
// values swap and curses ride a die for two turns. Nothing here out-damages
// sector 2 — it makes the deck you built stop being the deck you play.
export const SECTOR3_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "riftling",
    hp: 18,
    role: "harrier",
    claims: [
      { k: "intent", t: "capShrink" },
      { k: "intent", t: "twistDie" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      {
        pick: [
          [{ t: "capShrink" }, 3],
          [{ t: "twistDie" }, 2],
        ],
      },
      { t: "multi", n: 4, k: 3 },
    ],
  }),
  enemy({
    id: "echoShade",
    hp: 20,
    role: "harrier",
    claims: [{ k: "intent", t: "mirrorHalf" }],
    pattern: [
      { t: "mirrorHalf" },
      { t: "attack", n: 5 },
      { t: "shield", n: 5 },
    ],
  }),
  enemy({
    id: "unstableCore",
    hp: 14,
    role: "swarm",
    claims: [{ k: "onDeath", t: "explode" }],
    onDeath: { t: "explode", n: 6 },
    pattern: [
      { t: "attack", n: 6 },
      { t: "multi", n: 2, k: 2 },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "foldWorm",
    hp: 18,
    role: "harrier",
    claims: [{ k: "intent", t: "twistDie" }],
    pattern: [
      { t: "twistDie" },
      { t: "multi", n: 4, k: 3 },
      { t: "attack", n: 6 },
    ],
  }),
  enemy({
    id: "nullEcho",
    hp: 16,
    role: "harrier",
    claims: [
      { k: "intent", t: "mirrorHalf" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "playerHullPctLt", n: 50 },
        then: { t: "mirrorHalf" },
        else: { t: "twistDie" },
      },
      { t: "attack", n: 4 },
    ],
  }),
  enemy({
    id: "riftAnchor",
    hp: 21,
    role: "anchor",
    claims: [{ k: "intent", t: "capShrink" }],
    pattern: [
      { t: "capShrink" },
      { t: "attack", n: 6 },
      { t: "shield", n: 5 },
    ],
  }),
  enemy({
    id: "capWraith",
    hp: 19,
    role: "harrier",
    claims: [{ k: "intent", t: "curseDie" }],
    pattern: [
      { t: "curseDie", n: 3 },
      { t: "multi", n: 4, k: 3 },
      { t: "attack", n: 6 },
    ],
  }),
  enemy({
    id: "slotMirror",
    hp: 22,
    role: "anchor",
    claims: [{ k: "intent", t: "mirrorSchool" }],
    pattern: [
      { t: "mirrorSchool" },
      { t: "shield", n: 6 },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "paradoxHusk",
    hp: 20,
    role: "harrier",
    claims: [
      { k: "intent", t: "swapValues" },
      { k: "intent", t: "storm" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "swapValues" },
      {
        when: { c: "turnGte", n: 3 },
        then: { t: "storm" },
        else: { t: "multi", n: 4, k: 3 },
      },
    ],
  }),
  enemy({
    id: "riftWidow",
    hp: 23,
    role: "support",
    claims: [
      { k: "onDeath", t: "curseDie" },
      { k: "intent", t: "summon" },
    ],
    onDeath: { t: "curseDie", n: 3 },
    pattern: [
      { t: "summon", id: "riftWasp" },
      { t: "multi", n: 4, k: 3 },
      { t: "shield", n: 5 },
    ],
  }),
];
