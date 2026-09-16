import {
  enemy,
  PART_HP,
  partCycle,
  phasedEnemy,
  sub,
} from "@/data/enemies/builder";
import type { EnemyDef } from "@/types/content";

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
  phasedEnemy({
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
  }),
  phasedEnemy({
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
    hp: 32,
    miniboss: true,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "intent", t: "mirrorSchool" },
      { k: "aura", is: "shieldSelf6" },
      { k: "trait", is: "coreLock" },
    ],
    subsystems: [
      sub("resonator", "coil", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("resonator", "chord", PART_HP, undefined, {
        onDeath: { t: "explodePart", n: 4 },
      }),
    ],
    pattern: [
      { t: "mirrorSchool" },
      { t: "multi", n: 5, k: 3 },
      { t: "mirrorSchool" },
      { t: "attack", n: 11 },
    ],
  }),
  enemy({
    id: "quarantineTwin",
    hp: 47,
    miniboss: true,
    shell: true,
    alternating: true,
    claims: [
      { k: "trait", is: "alternating" },
      { k: "trait", is: "shell" },
    ],
    subsystems: [
      sub("quarantineTwin", "twinA", 12, "atk+2"),
      sub("quarantineTwin", "twinB", 12, "shieldAllies3"),
    ],
    pattern: [
      { t: "multi", n: 4, k: 2 },
      { t: "shield", n: 6 },
      { t: "attack", n: 8 },
    ],
  }),
  enemy({
    id: "usurer",
    hp: 48,
    miniboss: true,
    shell: true,
    coreLockAt: 1,
    claims: [
      { k: "intent", t: "bargain" },
      { k: "aura", is: "stealOnHit6" },
      { k: "trait", is: "coreLock" },
    ],
    subsystems: [
      sub("usurer", "vault", PART_HP, "stealOnHit6", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("usurer", "writ", PART_HP, undefined, {
        onDeath: { t: "openCore", turns: 2 },
      }),
    ],
    pattern: [
      { t: "bargain", n: 6, heal: 4 },
      { t: "multi", n: 5, k: 3 },
      { t: "bargain", n: 6, heal: 4 },
      { t: "attack", n: 10 },
    ],
  }),
  phasedEnemy({
    id: "silencer",
    hp: 34,
    miniboss: true,
    shell: true,
    coreLockAt: 1,
    jamReleasesBlocks: true,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "jamReleasesBlocks" },
      { k: "intent", t: "jamSlot" },
      { k: "partIntent", t: "jamSlot" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("silencer", "emitter", PART_HP, "atk+2", {
        onDeath: { t: "enrageCore", n: 2 },
      }),
      sub("silencer", "damper", PART_HP, undefined, {
        intents: partCycle({ t: "jamSlot" }),
        onDeath: { t: "openCore", turns: 2 },
      }),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "idle" },
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
  }),
  enemy({
    id: "coreSliver",
    hp: 40,
    miniboss: true,
    shell: true,
    coreLockAt: 1,
    ward: true,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "ward" },
      { k: "aura", is: "twistEachTurn" },
    ],
    subsystems: [
      sub("coreSliver", "facet", PART_HP, "twistEachTurn", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("coreSliver", "edge", PART_HP, undefined, {
        intents: partCycle({ t: "shield", n: 6 }),
        onDeath: { t: "explodePart", n: 4 },
      }),
    ],
    pattern: [
      { t: "multi", n: 5, k: 3 },
      { t: "shield", n: 6 },
      { t: "attack", n: 11 },
    ],
  }),
  phasedEnemy({
    id: "foldTyrant",
    hp: 62,
    miniboss: true,
    claims: [
      { k: "intent", t: "foldOrder" },
      { k: "trait", is: "phases" },
      { k: "aura", is: "twistEachTurn" },
    ],
    subsystems: [sub("foldTyrant", "pleat", 14, "twistEachTurn")],
    phases: [
      {
        untilHpPct: 50,
        pattern: [
          { t: "foldOrder" },
          { t: "multi", n: 5, k: 3 },
          { t: "attack", n: 10 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "foldOrder" },
          { t: "attack", n: 12 },
          { t: "devourDie" },
        ],
        onEnter: [{ t: "foldOrder" }],
      },
    ],
  }),
  phasedEnemy({
    id: "hushWarden",
    hp: 54,
    miniboss: true,
    shell: true,
    coreLockAt: 1,
    jamReleasesBlocks: true,
    claims: [
      { k: "trait", is: "coreLock" },
      { k: "trait", is: "jamReleasesBlocks" },
      { k: "intent", t: "jamSlot" },
      { k: "partIntent", t: "jamSlot" },
      { k: "trait", is: "phases" },
    ],
    subsystems: [
      sub("hushWarden", "muffle", PART_HP, "shieldSelf6", {
        onDeath: { t: "openCore", turns: 2 },
      }),
      sub("hushWarden", "gag", PART_HP, undefined, {
        intents: partCycle({ t: "jamSlot" }),
        onDeath: { t: "enrageCore", n: 2 },
      }),
    ],
    phases: [
      {
        untilHpPct: 55,
        pattern: [
          { t: "idle" },
          { t: "shield", n: 8 },
          { t: "attack", n: 10 },
        ],
      },
      {
        untilHpPct: 0,
        pattern: [
          { t: "jamSlot", k: 2 },
          { t: "capShrink" },
          { t: "multi", n: 7, k: 2 },
        ],
        onEnter: [{ t: "jamSlot", k: 2 }],
      },
    ],
  }),
];
