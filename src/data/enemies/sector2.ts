import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

export const SECTOR2_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "breakerDrone",
    hp: 17,
    role: "bruiser",
    claims: [
      { k: "intent", t: "attack" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "multi", n: 4, k: 3 },
      {
        when: { c: "playerShielded" },
        then: { t: "multi", n: 3, k: 3 },
        else: { t: "attack", n: 8 },
      },
    ],
  }),
  enemy({
    id: "magnetTug",
    hp: 22,
    role: "harrier",
    stealOnHit: 5,
    claims: [
      { k: "trait", is: "stealOnHit" },
      { k: "intent", t: "stealScrap" },
    ],
    pattern: [
      { t: "attack", n: 6 },
      { t: "stealScrap", n: 5 },
      { t: "multi", n: 3, k: 2 },
    ],
  }),
  enemy({
    id: "minelayer",
    hp: 20,
    role: "support",
    claims: [
      { k: "intent", t: "summon" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "alliesAtLeast", n: 3 },
        then: { t: "attack", n: 7 },
        else: { t: "summon", id: "mine" },
      },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  enemy({
    id: "hookTug",
    hp: 17,
    role: "harrier",
    claims: [
      { k: "intent", t: "drainCharge" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "playerChargeAtLeast", n: 5 },
        then: { t: "drainCharge", n: 4 },
        else: { t: "attack", n: 5 },
      },
      { t: "multi", n: 3, k: 2 },
    ],
  }),
  enemy({
    id: "slagHauler",
    hp: 26,
    role: "anchor",
    claims: [
      { k: "intent", t: "shield" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "selfShielded" },
        then: { t: "attack", n: 9 },
        else: { t: "shield", n: 8 },
      },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "scrapKite",
    hp: 14,
    role: "swarm",
    claims: [
      { k: "onDeath", t: "stealScrap" },
      { k: "intent", t: "multi" },
    ],
    onDeath: { t: "stealScrap", n: 6 },
    pattern: [
      {
        when: { c: "playerShielded" },
        then: { t: "multi", n: 2, k: 4 },
        else: { t: "attack", n: 7 },
      },
      { t: "multi", n: 2, k: 3 },
    ],
  }),
  enemy({
    id: "convoyShell",
    hp: 22,
    role: "anchor",
    guarded: true,
    claims: [
      { k: "trait", is: "guarded" },
      { k: "trait", is: "conditional" },
      { k: "intent", t: "shieldAll" },
    ],
    pattern: [
      {
        when: { c: "alliesAtLeast", n: 2 },
        then: { t: "shieldAll", n: 6 },
        else: { t: "attack", n: 9 },
      },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "tollBarge",
    hp: 25,
    role: "support",
    claims: [{ k: "intent", t: "bargain" }],
    pattern: [
      { t: "bargain", n: 5, heal: 4 },
      { t: "multi", n: 4, k: 2 },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "ripperTug",
    hp: 20,
    role: "bruiser",
    claims: [
      { k: "intent", t: "enrage" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "turnGte", n: 4 },
        then: { t: "enrage", n: 2 },
        else: { t: "multi", n: 4, k: 3 },
      },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "mineTender",
    hp: 18,
    role: "support",
    claims: [
      { k: "onDeath", t: "shieldAllies" },
      { k: "intent", t: "summon" },
    ],
    onDeath: { t: "shieldAllies", n: 6 },
    pattern: [
      { t: "summon", id: "mine" },
      { t: "attack", n: 5 },
      { t: "multi", n: 3, k: 2 },
    ],
  }),
];
