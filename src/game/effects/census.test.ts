import { describe, expect, it } from "vitest";
import { harnessDie, harnessSnap, place } from "@/game/battle/battleHarness";
import { loadoutCensus } from "@/game/effects/census";
import { BattleCtx } from "@/game/effects/context";
import { applyDefs } from "@/game/effects/evaluate";
import type { EffectDef } from "@/game/effects/types";

describe("loadout census", () => {
  it("counts a die's school implicitly", () => {
    const census = loadoutCensus({
      deckDefIds: ["red-d6", "red-d6", "blue-d6"],
      perks: [],
      modules: [],
    });
    expect(census.red).toBe(2);
    expect(census.blue).toBe(1);
    expect(census.green).toBeUndefined();
  });

  it("counts module category tags and explicit tags together", () => {
    const census = loadoutCensus({
      deckDefIds: [],
      perks: [],
      modules: ["emberInjector", "piercer"],
    });
    expect(census.weapons).toBe(2);
    expect(census.burn).toBe(1);
    expect(census.pierce).toBe(1);
  });

  it("counts engraving tags per engraved die", () => {
    const bare = loadoutCensus({
      deckDefIds: ["red-d6", "blue-d6"],
      perks: [],
      modules: [],
    });
    const engraved = loadoutCensus({
      deckDefIds: ["red-d6", "blue-d6"],
      perks: [],
      modules: [],
      engravings: { "red-d6": ["flame"], "blue-d6": ["frost"] },
    });
    expect((engraved.burn ?? 0) - (bare.burn ?? 0)).toBe(1);
    expect((engraved.shields ?? 0) - (bare.shields ?? 0)).toBe(1);
  });

  it("counts perk tags", () => {
    const census = loadoutCensus({
      deckDefIds: [],
      perks: ["hullWeld"],
      modules: [],
    });
    expect(census.repairBay).toBe(1);
  });
});

describe("tag conditions in battle", () => {
  const burnPerk: EffectDef = {
    on: "beforeResolveSlot",
    if: [{ c: "countTag", tag: "burn", n: 2 }],
    do: [{ a: "modDieValue", n: 1 }],
  };

  it("a demo perk fires only when the loadout carries two burn items", () => {
    const oneBurn = harnessSnap([harnessDie("a", "grey-d4", 3)], {
      modules: ["emberInjector"],
    });
    place(oneBurn, "a", "weaponA");
    const lowCtx = new BattleCtx(oneBurn);
    lowCtx.scope = {
      slotId: "weaponA",
      slot: { cap: 8, mk: 1 },
      die: oneBurn.dice[0] ?? harnessDie("a", "grey-d4", 3),
      value: 3,
      chargeMult: 1,
      crit: false,
      repeat: false,
    };
    applyDefs([burnPerk], "beforeResolveSlot", lowCtx, oneBurn.dice[0] ?? null);
    expect(lowCtx.scope.value).toBe(3);

    const twoBurn = harnessSnap([harnessDie("a", "grey-d4", 3)], {
      modules: ["emberInjector"],
      engravings: { "grey-d4": ["flame"] },
    });
    const highCtx = new BattleCtx(twoBurn);
    highCtx.scope = {
      slotId: "weaponA",
      slot: { cap: 8, mk: 1 },
      die: twoBurn.dice[0] ?? harnessDie("a", "grey-d4", 3),
      value: 3,
      chargeMult: 1,
      crit: false,
      repeat: false,
    };
    applyDefs([burnPerk], "beforeResolveSlot", highCtx, twoBurn.dice[0] ?? null);
    expect(highCtx.scope.value).toBe(4);
  });

  it("tagCount reads modules, schools and absent tags", () => {
    const snap = harnessSnap([harnessDie("a", "red-d6", 3)], {
      modules: ["piercer"],
    });
    place(snap, "a", "weaponA");
    const ctx = new BattleCtx(snap);
    expect(ctx.tagCount("pierce")).toBe(1);
    expect(ctx.tagCount("red")).toBe(1);
    expect(ctx.tagCount("growth")).toBe(0);
  });

  it("hasTag fires only for a loadout that carries the tag", () => {
    const hasBurn: EffectDef = {
      on: "turnEnd",
      if: [{ c: "hasTag", tag: "burn" }],
      do: [{ a: "scrap", n: 5 }],
    };
    const withBurn = harnessSnap([harnessDie("a", "red-d6", 3)], {
      modules: ["emberInjector"],
    });
    applyDefs([hasBurn], "turnEnd", new BattleCtx(withBurn), null);
    expect(withBurn.scrap).toBe(5);

    const without = harnessSnap([harnessDie("a", "red-d6", 3)], {
      modules: ["piercer"],
    });
    applyDefs([hasBurn], "turnEnd", new BattleCtx(without), null);
    expect(without.scrap).toBe(0);
  });

  it("the census follows a temp die joining and leaving the same context", () => {
    const snap = harnessSnap([harnessDie("a", "red-d6", 3)]);
    const ctx = new BattleCtx(snap);
    expect(ctx.tagCount("red")).toBe(1);
    ctx.addTempDie("red-d6");
    expect(ctx.tagCount("red")).toBe(2);
    ctx.removeTempDice();
    expect(ctx.tagCount("red")).toBe(1);
  });
});
