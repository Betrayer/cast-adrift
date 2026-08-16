import { enemy } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

export const SECTOR4_ENEMIES: readonly EnemyDef[] = [
  enemy({
    id: "choirAcolyte",
    hp: 18,
    role: "support",
    claims: [{ k: "intent", t: "healAllies" }],
    pattern: [
      { t: "healAllies", n: 4 },
      { t: "multi", n: 4, k: 3 },
      { t: "shieldAll", n: 3 },
    ],
  }),
  enemy({
    id: "hymnTurret",
    hp: 20,
    role: "bruiser",
    claims: [
      { k: "intent", t: "charge" },
      { k: "trait", is: "pick" },
    ],
    pattern: [
      { t: "attack", n: 6 },
      {
        pick: [
          [{ t: "charge" }, 3],
          [{ t: "shieldAll", n: 4 }, 2],
        ],
      },
    ],
  }),
  enemy({
    id: "zealotRam",
    hp: 22,
    role: "bruiser",
    claims: [
      { k: "intent", t: "attack" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      { t: "attack", n: 10, self: 2 },
      {
        when: { c: "selfHpPctLt", n: 50 },
        then: { t: "attack", n: 12, self: 3 },
        else: { t: "multi", n: 3, k: 2 },
      },
    ],
  }),
  enemy({
    id: "hymnCantor",
    hp: 21,
    role: "support",
    claims: [
      { k: "intent", t: "charge" },
      { k: "trait", is: "conditional" },
    ],
    pattern: [
      {
        when: { c: "alliesAtLeast", n: 2 },
        then: { t: "charge" },
        else: { t: "attack", n: 8 },
      },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "pyreDeacon",
    hp: 23,
    role: "support",
    claims: [
      { k: "onDeath", t: "chargeAllies" },
      { k: "intent", t: "healAllies" },
    ],
    onDeath: { t: "chargeAllies" },
    pattern: [
      { t: "healAllies", n: 5 },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 7 },
    ],
  }),
  enemy({
    id: "reliquary",
    hp: 25,
    role: "anchor",
    guarded: true,
    claims: [
      { k: "trait", is: "guarded" },
      { k: "intent", t: "shieldAll" },
    ],
    pattern: [
      { t: "shieldAll", n: 6 },
      { t: "attack", n: 8 },
      { t: "healAllies", n: 5 },
    ],
  }),
  enemy({
    id: "antiphonChoir",
    hp: 20,
    role: "support",
    claims: [{ k: "intent", t: "summon" }],
    pattern: [
      { t: "summon", id: "choirAcolyte" },
      { t: "multi", n: 4, k: 3 },
      { t: "shieldAll", n: 4 },
    ],
  }),
  enemy({
    id: "censerDrone",
    hp: 16,
    role: "harrier",
    claims: [{ k: "intent", t: "jamSlot" }],
    pattern: [
      { t: "jamSlot", k: 2 },
      { t: "attack", n: 5 },
      { t: "multi", n: 3, k: 2 },
    ],
  }),
  enemy({
    id: "litanyWarden",
    hp: 26,
    role: "anchor",
    claims: [
      { k: "intent", t: "shieldGate" },
      { k: "intent", t: "healAllies" },
    ],
    pattern: [
      { t: "shieldGate", n: 6 },
      { t: "healAllies", n: 4 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "martyrThurible",
    hp: 19,
    role: "swarm",
    claims: [
      { k: "onDeath", t: "shieldAllies" },
      { k: "intent", t: "multi" },
    ],
    onDeath: { t: "shieldAllies", n: 8 },
    pattern: [
      { t: "multi", n: 3, k: 3 },
      { t: "attack", n: 5 },
      { t: "multi", n: 2, k: 3 },
    ],
  }),
];
