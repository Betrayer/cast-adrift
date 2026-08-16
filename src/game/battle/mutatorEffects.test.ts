import { describe, expect, it } from "vitest";
import { harnessDie, harnessEnemy, harnessSnap, place } from "@/game/battle/battleHarness";
import {
  resolveEnemyPhase,
  resolvePlayerPhase,
  scaleDamage,
} from "@/game/battle/resolver";
import {
  applySlotOverrides,
  buildBattleSnapshot,
  buildShipSlots,
  createEnemyStream,
} from "@/game/battle/setup";
import { resonanceAtLeast } from "@/game/battle/resonance";
import {
  DROP_WEIGHTS,
  bumpRarity,
  shiftWeights,
} from "@/game/economy/rewards";
import { createStream, createStreams } from "@/services/rng";

describe("«Стеклянный флот» — damage ×1.5 both ways", () => {
  it("scales a number by the mutator percentage", () => {
    expect(scaleDamage(10, 0)).toBe(10);
    expect(scaleDamage(10, 50)).toBe(15);
    expect(scaleDamage(7, 50)).toBe(11);
  });

  it("raises the damage a weapon deals, affinity bonus included", () => {
    const dealtWith = (mutators: string[]): number => {
      const dice = [harnessDie("d0", "red-d6", 6)];
      const snap = harnessSnap(dice, {
        mutators,
        enemies: [harnessEnemy({ hp: 200, hpMax: 200 })],
      });
      place(snap, "d0", "weaponA");
      const after = resolvePlayerPhase(snap).next;
      return 200 - (after.enemies[0]?.hp ?? 0);
    };
    const base = dealtWith([]);
    expect(base).toBe(8);
    expect(dealtWith(["glassFleet"])).toBe(scaleDamage(base, 50));
  });

  it("raises the damage an enemy lands", () => {
    const takenWith = (mutators: string[]): number => {
      const snap = harnessSnap([], {
        mutators,
        hull: 40,
        hullMax: 40,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 6 } })],
      });
      return 40 - resolveEnemyPhase(snap, createStream(3)).next.hull;
    };
    expect(takenWith([])).toBe(6);
    expect(takenWith(["glassFleet"])).toBe(9);
  });
});

describe("«Хрупкие щиты» — the shield sags before the enemy acts", () => {
  it("halves the standing shield at the start of the enemy phase", () => {
    const hullAfter = (mutators: string[]): number => {
      const snap = harnessSnap([], {
        mutators,
        hull: 40,
        hullMax: 40,
        shield: 10,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 10 } })],
      });
      return resolveEnemyPhase(snap, createStream(5)).next.hull;
    };
    expect(hullAfter([])).toBe(40);
    expect(hullAfter(["brittleShields"])).toBe(35);
  });

  it("leaves an empty shield alone", () => {
    const snap = harnessSnap([], {
      mutators: ["brittleShields"],
      shield: 0,
      enemies: [harnessEnemy({ nextIntent: { t: "shield", n: 1 } })],
    });
    expect(resolveEnemyPhase(snap, createStream(5)).next.shield).toBe(0);
  });
});

describe("«Резонансный шторм» — a school counts higher", () => {
  it("lifts one school's census by the boost at battle build time", () => {
    const deck = ["red-d6", "red-d6", "grey-d4"];
    const build = (boost?: { school: "red"; n: number }) => {
      const streams = createStreams(11);
      return buildBattleSnapshot(
        "wanderer",
        deck,
        ["raider"],
        streams,
        createEnemyStream(streams),
        {},
        boost === undefined ? {} : { resonanceBoost: boost },
      );
    };
    expect(resonanceAtLeast(build().resonance, "red", 4)).toBe(false);
    expect(
      resonanceAtLeast(build({ school: "red", n: 2 }).resonance, "red", 4),
    ).toBe(true);
  });
});

describe("«Радиомолчание» / «Слепой прыжок» — system overrides", () => {
  it("shrinks a slot cap one tier per negative step", () => {
    const base = buildShipSlots("wanderer");
    expect(base.sensors?.cap).toBe(6);
    const shrunk = applySlotOverrides(base, { sensors: -1 });
    expect(shrunk.sensors?.cap).toBe(4);
  });

  it("removes a disabled slot entirely", () => {
    const slots = applySlotOverrides(buildShipSlots("wanderer"), {}, ["sensors"]);
    expect(slots.sensors).toBeUndefined();
    expect(slots.weaponA).toBeDefined();
  });

  it("leaves the untouched slots identical", () => {
    const base = buildShipSlots("wanderer");
    const out = applySlotOverrides(base, { sensors: -1 });
    expect(out.weaponA).toEqual(base.weaponA);
    expect(out.reactor).toEqual(base.reactor);
  });
});

describe("«Жирный лут» — the drop table climbs a rung", () => {
  it("shifts each rarity's weight up one step, piling the overflow on legendary", () => {
    expect(shiftWeights(DROP_WEIGHTS.battle, 0)).toEqual(DROP_WEIGHTS.battle);
    expect(shiftWeights(DROP_WEIGHTS.battle, 1)).toEqual({
      common: 0,
      uncommon: 60,
      rare: 28,
      legendary: 12,
    });
  });

  it("keeps the total weight constant", () => {
    const sum = (w: Record<string, number>): number =>
      Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum(shiftWeights(DROP_WEIGHTS.elite, 1))).toBe(
      sum(DROP_WEIGHTS.elite),
    );
  });

  it("bumps a named rarity and stops at legendary", () => {
    expect(bumpRarity("common", 1)).toBe("uncommon");
    expect(bumpRarity("rare", 1)).toBe("legendary");
    expect(bumpRarity("legendary", 1)).toBe("legendary");
    expect(bumpRarity("common", 0)).toBe("common");
  });
});
