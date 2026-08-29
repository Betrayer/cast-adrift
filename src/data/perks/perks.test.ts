import { beforeEach, describe, expect, it } from "vitest";
import { harnessDie, harnessEnemy, harnessSnap, place } from "@/game/battle/battleHarness";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import { computeCensus } from "@/game/battle/resonance";
import {
  isConditional,
  normalizedBody,
  referencedTagsOf,
} from "@/data/contentShape";
import { ALL_PERKS, PERK_BY_ID } from "@/data/perks";
import { SCHOOL_TAGS } from "@/data/tags";
import { computePerkMods, hasTrait, perkChargeCap } from "@/game/run/perkMods";
import { createStream } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import type { BattleSnapshot, RolledDie, SlotId } from "@/types/battle";

const build = (
  perks: string[],
  dice: RolledDie[],
  placements: Partial<Record<SlotId, string>> = {},
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => {
  const snap = harnessSnap(dice, { perks, ...over });
  for (const [slotId, uid] of Object.entries(placements) as [SlotId, string][]) {
    place(snap, uid, slotId);
  }
  return snap;
};

const enemyHp = (snap: BattleSnapshot, id = "enemy-0"): number =>
  snap.enemies.find((e) => e.id === id)?.hp ?? -1;

const PERK_TOTAL = 180;
const RARITY_SPLIT: Record<string, number> = {
  common: 90,
  uncommon: 63,
  rare: 27,
};
const POOL_SPLIT: Record<string, number> = {
  red: 26,
  blue: 26,
  green: 26,
  yellow: 25,
  black: 26,
  grey: 26,
  systems: 25,
};

describe("perk pool shape", () => {
  it("holds exactly the authored counts", () => {
    expect(ALL_PERKS).toHaveLength(PERK_TOTAL);
    for (const [rarity, want] of Object.entries(RARITY_SPLIT)) {
      expect(ALL_PERKS.filter((p) => p.rarity === rarity)).toHaveLength(want);
    }
    for (const [pool, want] of Object.entries(POOL_SPLIT)) {
      expect(ALL_PERKS.filter((p) => p.pool === pool)).toHaveLength(want);
    }
  });

  it("has no duplicate ids and no duplicate bodies", () => {
    expect(new Set(ALL_PERKS.map((p) => p.id)).size).toBe(ALL_PERKS.length);
    const bodies = new Map<string, string[]>();
    for (const perk of ALL_PERKS) {
      const key = normalizedBody(perk);
      bodies.set(key, [...(bodies.get(key) ?? []), perk.id]);
    }
    const clashes = [...bodies.values()].filter((ids) => ids.length > 1);
    expect(clashes).toEqual([]);
  });

  it("tags every perk and never with a school tag", () => {
    const schoolTags = new Set<string>(SCHOOL_TAGS);
    for (const perk of ALL_PERKS) {
      expect(perk.tags ?? []).not.toHaveLength(0);
      for (const tag of perk.tags ?? []) {
        expect(schoolTags.has(tag)).toBe(false);
      }
    }
  });

  it("gives every rare a synergy tag", () => {
    for (const perk of ALL_PERKS.filter((p) => p.rarity === "rare")) {
      expect(perk.synergy ?? []).not.toHaveLength(0);
    }
  });

  it("keeps at least 60% of perks conditional or synergistic", () => {
    const deep = ALL_PERKS.filter(isConditional).length;
    expect((deep / ALL_PERKS.length) * 100).toBeGreaterThanOrEqual(60);
  });

  it("has at least ten rares that mechanically consume their own synergy tag", () => {
    const consumers = ALL_PERKS.filter(
      (perk) =>
        perk.rarity === "rare" &&
        referencedTagsOf(perk).some((tag) => (perk.synergy ?? []).includes(tag)),
    );
    expect(consumers.length).toBeGreaterThanOrEqual(10);
  });

  it("carries each engine trait on exactly one perk", () => {
    const carriers = new Map<string, string[]>();
    for (const perk of ALL_PERKS) {
      for (const trait of perk.traits ?? []) {
        carriers.set(trait, [...(carriers.get(trait) ?? []), perk.id]);
      }
    }
    for (const trait of [
      "bloodReactor",
      "sacrifice",
      "ricochet",
      "burnDouble",
      "stabilizer",
      "spareLowest",
      "compost",
      "reflectDodge",
      "dodgeCharge",
      "obsidianPact",
      "overflowShield",
      "firstHitPierce",
      "escapePod",
      "recycler",
    ]) {
      expect(carriers.get(trait) ?? []).toHaveLength(1);
    }
  });
});

describe("perk mods", () => {
  it("sums each declared modifier across owned perks", () => {
    for (const perk of ALL_PERKS) {
      if (perk.mods === undefined) continue;
      const summed = computePerkMods([perk.id]);
      for (const [key, value] of Object.entries(perk.mods)) {
        expect(summed[key as keyof typeof summed]).toBe(value);
      }
    }
  });

  it("adds the modifiers of two perks together", () => {
    const both = computePerkMods(["bulkhead", "regen"]);
    expect(both.hullMaxDelta).toBe(
      (PERK_BY_ID.get("bulkhead")?.mods?.hullMaxDelta ?? 0),
    );
    expect(both.battleEndHeal).toBe(
      (PERK_BY_ID.get("regen")?.mods?.battleEndHeal ?? 0),
    );
  });

  it("coldFusion lifts the reactor charge cap", () => {
    expect(perkChargeCap([])).toBe(10);
    expect(perkChargeCap(["coldFusion"])).toBe(14);
  });
});

describe("effect perks", () => {
  it("ice-circuit adds +2 shield value at 6+", () => {
    const base = resolvePlayerPhase(
      build([], [harnessDie("s", "frostplate", 6)], { shields: "s" }),
    );
    const boosted = resolvePlayerPhase(
      build(["ice-circuit"], [harnessDie("s", "frostplate", 6)], { shields: "s" }),
    );
    expect(boosted.next.shield - base.next.shield).toBe(2);
  });

  it("warmup only pays from turn 3", () => {
    const early = resolvePlayerPhase(
      build(["warmup"], [harnessDie("w", "ember", 4)], { weaponA: "w" }, { turn: 2 }),
    );
    const late = resolvePlayerPhase(
      build(["warmup"], [harnessDie("w", "ember", 4)], { weaponA: "w" }, { turn: 3 }),
    );
    expect(enemyHp(early.next) - enemyHp(late.next)).toBe(3);
  });

  it("hot-charge only pays while charge is banked", () => {
    const cold = resolvePlayerPhase(
      build(["hot-charge"], [harnessDie("w", "ember", 4)], { weaponA: "w" }, { charge: 0 }),
    );
    const hot = resolvePlayerPhase(
      build(["hot-charge"], [harnessDie("w", "ember", 4)], { weaponA: "w" }, { charge: 6 }),
    );
    expect(enemyHp(cold.next) - enemyHp(hot.next)).toBe(2);
  });

  it("on-edge adds +1 when hull is below 30%", () => {
    const low = resolvePlayerPhase(
      build(["on-edge"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, { hull: 8 }),
    );
    const high = resolvePlayerPhase(
      build(["on-edge"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, { hull: 30 }),
    );
    expect(enemyHp(high.next) - enemyHp(low.next)).toBe(1);
  });

  it("back-door grants scrap on a min-face black roll", () => {
    const res = resolvePlayerPhase(
      build(["back-door"], [harnessDie("r", "black-d6", 1)], { reactor: "r" }),
    );
    expect(res.next.scrap).toBe(6);
  });

  it("echo grants +1 charge on a repeated value", () => {
    const snap = harnessSnap(
      [{ ...harnessDie("d", "green-d4", 3), lastValue: 3 }],
      { perks: ["echo"] },
    );
    const ctx = new BattleCtx(snap);
    const sources = buildSources(snap);
    ctx.subjectDie = snap.dice[0] ?? null;
    emit(sources, "rolled", ctx);
    expect(snap.charge).toBe(1);
  });

  it("targeter deepens the vulnerability sensors applies", () => {
    const marked = (perks: string[]) =>
      build(
        perks,
        [harnessDie("s", "grey-d4", 3), harnessDie("w", "ember", 5)],
        { sensors: "s", weaponA: "w" },
        { enemies: [harnessEnemy()] },
      );
    const withT = resolvePlayerPhase(marked(["targeter"]));
    const without = resolvePlayerPhase(marked([]));
    expect(enemyHp(without.next) - enemyHp(withT.next)).toBe(1);
  });
});

describe("tag-conditioned perks", () => {
  it("fortune only grants a reroll once the deck is yellow enough", () => {
    const withYellow = harnessSnap(
      ["yellow-d6", "yellow-d6", "yellow-d6"].map((defId, i) =>
        harnessDie(`y${String(i)}`, defId, 3),
      ),
      { perks: ["fortune"] },
    );
    const withoutYellow = harnessSnap(
      ["ember", "ember", "ember"].map((defId, i) =>
        harnessDie(`r${String(i)}`, defId, 3),
      ),
      { perks: ["fortune"] },
    );
    emit(buildSources(withYellow), "battleStart", new BattleCtx(withYellow));
    emit(buildSources(withoutYellow), "battleStart", new BattleCtx(withoutYellow));
    expect(withYellow.grants?.rerollUses ?? 0).toBe(1);
    expect(withoutYellow.grants?.rerollUses ?? 0).toBe(0);
  });
});

describe("trait perks", () => {
  it("stabilizer floors the first blue die at 2", () => {
    const dice = [harnessDie("b", "frostplate", 1)];
    applyRollFloors(dice, computeCensus(dice), true);
    expect(dice[0]?.value).toBe(2);
  });

  it("spareLowest bumps the lowest tray die", () => {
    const dice = [harnessDie("a", "ember", 5), harnessDie("b", "grey-d4", 2)];
    applySpareLowest(dice);
    expect(dice[1]?.value).toBe(3);
  });

  it("compost turns burned dice into scrap", () => {
    const res = resolvePlayerPhase(
      build(["compost"], [harnessDie("a", "ember", 4), harnessDie("b", "ember", 4)]),
    );
    expect(res.next.scrap).toBe(2);
  });

  it("burnDouble doubles the first burn only", () => {
    const snap = harnessSnap([], { perks: ["double-fuse"] });
    const ctx = new BattleCtx(snap);
    ctx.addStatus("burn", 2);
    ctx.addStatus("burn", 2);
    expect(snap.enemies[0]?.statuses.burn).toBe(6);
    expect(snap.burnDoubleUsed).toBe(true);
  });

  it("afterburner raises the evasion percentages", () => {
    const base = resolvePlayerPhase(
      build([], [harnessDie("e", "frostplate", 3)], { engines: "e" }),
    );
    const boosted = resolvePlayerPhase(
      build(["afterburner"], [harnessDie("e", "frostplate", 3)], { engines: "e" }),
    );
    expect(base.next.evasion).toEqual({
      dodgePct: 5,
      glancingPct: 11,
      intercept: false,
    });
    expect(boosted.next.evasion).toEqual({
      dodgePct: 7,
      glancingPct: 12,
      intercept: false,
    });
  });

  it("ricochet carries overkill to the next enemy", () => {
    const snap = () =>
      build(["ricochet"], [harnessDie("w", "ember", 6)], { weaponA: "w" }, {
        enemies: [
          harnessEnemy({ id: "enemy-0", hp: 3, hpMax: 3 }),
          harnessEnemy({ id: "enemy-1", hp: 40, hpMax: 40 }),
        ],
        targetId: "enemy-0",
      });
    const res = resolvePlayerPhase(snap());
    expect(enemyHp(res.next, "enemy-1")).toBeLessThan(40);
  });

  it("mirrorLattice deals damage back on a dodge", () => {
    const res = resolveEnemyPhase(
      build(["mirrorLattice"], [], {}, {
        evasion: { dodgePct: 100, glancingPct: 0, intercept: false },
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 }, hp: 20, hpMax: 20 })],
      }),
      createStream(1),
    );
    expect(enemyHp(res.next)).toBeLessThan(20);
  });

  it("tug grants charge on a dodge", () => {
    const res = resolveEnemyPhase(
      build(["tug"], [], {}, {
        evasion: { dodgePct: 100, glancingPct: 0, intercept: false },
        charge: 0,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 } })],
      }),
      createStream(1),
    );
    expect(res.next.charge).toBe(1);
  });

  it("jammer-plus deepens the jam penalty", () => {
    const jammed = () =>
      harnessEnemy({ statuses: { jam: 1 }, nextIntent: { t: "attack", n: 10 } });
    const withJ = resolveEnemyPhase(
      build(["jammer-plus"], [], {}, { enemies: [jammed()], hull: 30 }),
      createStream(1),
    );
    const noJ = resolveEnemyPhase(
      build([], [], {}, { enemies: [jammed()], hull: 30 }),
      createStream(1),
    );
    expect(withJ.next.hull - noJ.next.hull).toBe(2);
  });
});

describe("active perk store actions", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it("blood reactor trades 2 hull for 3 charge once per turn", () => {
    useBattleStore.setState({
      phase: "placement",
      perks: ["blood-reactor"],
      hull: 20,
      charge: 0,
      chargeCap: 10,
      bloodReactorUsed: false,
    });
    useBattleStore.getState().bloodReactor();
    expect(useBattleStore.getState().hull).toBe(18);
    expect(useBattleStore.getState().charge).toBe(3);
    useBattleStore.getState().bloodReactor();
    expect(useBattleStore.getState().hull).toBe(18);
    useBattleStore.getState().reset();
  });

  it("sacrifice burns a die into the pool", () => {
    useBattleStore.setState({
      phase: "placement",
      perks: ["sacrifice"],
      dice: [harnessDie("x", "ember", 4)],
      sacrificePool: 0,
    });
    useBattleStore.getState().sacrificeDie("x");
    expect(useBattleStore.getState().sacrificePool).toBe(4);
    expect(useBattleStore.getState().dice[0]?.state).toBe("burned");
    useBattleStore.getState().reset();
  });

  it("blood reactor and sacrifice traits gate the actions", () => {
    expect(hasTrait(["blood-reactor"], "bloodReactor")).toBe(true);
    expect(hasTrait(["sacrifice"], "sacrifice")).toBe(true);
    expect(hasTrait(["widerGrip"], "bloodReactor")).toBe(false);
  });
});
