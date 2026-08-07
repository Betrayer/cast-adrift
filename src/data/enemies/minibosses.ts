import { enemy, sub } from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

// The twelve gate fights (DESIGN §6.4). Every sector routes its gate row through
// one of these, drawn from the sector's pool; a campaign never repeats one while
// the pool still has a fresh member. Each carries a single signature idea and
// enough hull to make the player solve it rather than out-race it.
export const MINIBOSSES: readonly EnemyDef[] = [
  enemy({
    id: "convoyAlpha",
    hp: 42,
    miniboss: true,
    shell: true,
    claims: [
      { k: "trait", is: "shell" },
      { k: "aura", is: "lockEvery3" },
    ],
    subsystems: [
      sub("convoyAlpha", "escortA", 12, "atk+2"),
      sub("convoyAlpha", "escortB", 12, "shieldAllies3"),
      sub("convoyAlpha", "escortC", 12, "lockEvery3"),
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "shield", n: 8 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "wardenFragment",
    hp: 58,
    miniboss: true,
    markVulnerable: true,
    claims: [
      { k: "trait", is: "markVulnerable" },
      { k: "aura", is: "shieldSelf6" },
    ],
    subsystems: [sub("wardenFragment", "plate", 18, "shieldSelf6")],
    pattern: [
      { t: "shield", n: 8 },
      { t: "multi", n: 4, k: 2 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "leechQueen",
    hp: 50,
    miniboss: true,
    claims: [
      { k: "intent", t: "lockDie" },
      { k: "intent", t: "summon" },
      { k: "trait", is: "phases" },
    ],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "attack", n: 7 },
          { t: "multi", n: 4, k: 2 },
        ],
        everyTurn: [{ t: "lockDie" }],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "summon", id: "leechSkiff" },
          { t: "multi", n: 4, k: 2 },
          { t: "attack", n: 8 },
        ],
        everyTurn: [{ t: "lockDie" }],
      },
    ],
    pattern: [
      { t: "attack", n: 7 },
      { t: "multi", n: 4, k: 2 },
    ],
  }),
  enemy({
    id: "mineTyrant",
    hp: 48,
    miniboss: true,
    claims: [
      { k: "intent", t: "summon" },
      { k: "trait", is: "phases" },
    ],
    phases: [
      {
        untilHpPct: 0,
        pattern: [
          { t: "attack", n: 9 },
          { t: "multi", n: 5, k: 2 },
        ],
        everyTurn: [{ t: "summon", id: "mine" }],
      },
    ],
    pattern: [
      { t: "attack", n: 9 },
      { t: "multi", n: 5, k: 2 },
    ],
  }),
  enemy({
    id: "choirHerald",
    hp: 60,
    miniboss: true,
    claims: [
      { k: "intent", t: "charge" },
      { k: "intent", t: "jamSlot" },
    ],
    pattern: [
      { t: "charge" },
      { t: "jamSlot" },
      { t: "multi", n: 4, k: 2 },
      { t: "charge" },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "mirrorHull",
    hp: 46,
    miniboss: true,
    claims: [{ k: "intent", t: "mirrorHalf" }],
    pattern: [
      { t: "mirrorHalf" },
      { t: "shield", n: 6 },
      { t: "mirrorHalf" },
      { t: "attack", n: 6 },
    ],
  }),

  // ── the six new gates ─────────────────────────────────────────────────────
  enemy({
    id: "dragnet",
    hp: 50,
    miniboss: true,
    claims: [
      { k: "intent", t: "hijack" },
      { k: "aura", is: "lockEvery3" },
    ],
    subsystems: [sub("dragnet", "winch", 14, "lockEvery3")],
    pattern: [
      { t: "hijack" },
      { t: "multi", n: 5, k: 3 },
      { t: "attack", n: 9 },
    ],
  }),
  enemy({
    id: "resonator",
    hp: 46,
    miniboss: true,
    claims: [
      { k: "intent", t: "mirrorSchool" },
      { k: "aura", is: "shieldSelf6" },
    ],
    subsystems: [sub("resonator", "coil", 14, "shieldSelf6")],
    pattern: [
      { t: "mirrorSchool" },
      { t: "multi", n: 4, k: 3 },
      { t: "mirrorSchool" },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "quarantineTwin",
    hp: 46,
    miniboss: true,
    shell: true,
    alternating: true,
    claims: [
      { k: "trait", is: "alternating" },
      { k: "trait", is: "shell" },
    ],
    subsystems: [
      sub("quarantineTwin", "twinA", 18, "atk+2"),
      sub("quarantineTwin", "twinB", 18, "shieldAllies3"),
    ],
    pattern: [
      { t: "multi", n: 4, k: 3 },
      { t: "shield", n: 7 },
      { t: "attack", n: 9 },
    ],
  }),
  enemy({
    id: "usurer",
    hp: 64,
    miniboss: true,
    claims: [
      { k: "intent", t: "bargain" },
      { k: "aura", is: "stealOnHit6" },
    ],
    subsystems: [sub("usurer", "vault", 14, "stealOnHit6")],
    pattern: [
      { t: "bargain", n: 6, heal: 4 },
      { t: "multi", n: 5, k: 3 },
      { t: "bargain", n: 6, heal: 4 },
      { t: "attack", n: 10 },
    ],
  }),
  enemy({
    id: "silencer",
    hp: 50,
    miniboss: true,
    jamReleasesBlocks: true,
    claims: [
      { k: "trait", is: "jamReleasesBlocks" },
      { k: "intent", t: "jamSlot" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [sub("silencer", "emitter", 14, "atk+2")],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "jamSlot" },
          { t: "multi", n: 4, k: 3 },
          { t: "attack", n: 8 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "jamSlot", k: 2 },
          { t: "multi", n: 5, k: 3 },
          { t: "attack", n: 9 },
        ],
        onEnter: [{ t: "jamSlot", k: 2 }],
      },
    ],
    pattern: [
      { t: "jamSlot" },
      { t: "multi", n: 4, k: 3 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "coreSliver",
    hp: 56,
    miniboss: true,
    ward: true,
    claims: [
      { k: "trait", is: "ward" },
      { k: "aura", is: "twistEachTurn" },
    ],
    subsystems: [sub("coreSliver", "facet", 12, "twistEachTurn")],
    pattern: [
      { t: "multi", n: 5, k: 3 },
      { t: "shield", n: 6 },
      { t: "attack", n: 11 },
    ],
  }),
];
