import { describe, expect, it } from "vitest";
import { harnessDie, harnessSnap, place } from "@/game/battle/battleHarness";
import { BattleCtx } from "@/game/effects/context";
import { applyDefs } from "@/game/effects/evaluate";
import { buildSources, emit } from "@/game/effects/pipeline";
import type { EffectDef } from "@/game/effects/types";
import type { RolledDie, SlotState } from "@/types/battle";

const scopeFor = (ctx: BattleCtx, die: RolledDie): void => {
  const slot: SlotState = { cap: 8, mk: 1 };
  ctx.scope = {
    slotId: "weaponA",
    slot,
    die,
    value: die.value,
    chargeMult: 1,
    thresholdBonus: 0,
    crit: false,
    repeat: false,
  };
};

describe("condition filtering", () => {
  it("valueGte gates the action", () => {
    const die = harnessDie("d0", "grey-d4", 3);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    const def: EffectDef = {
      on: "afterResolveSlot",
      if: [{ c: "valueGte", n: 4 }],
      do: [{ a: "scrap", n: 1 }],
    };
    applyDefs([def], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(0);
    die.value = 4;
    applyDefs([def], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(1);
  });

  it("slot 'weapons' matches weaponA but not shields", () => {
    const die = harnessDie("d0", "grey-d4", 4);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    scopeFor(ctx, die);
    const def: EffectDef = {
      on: "afterResolveSlot",
      if: [{ c: "slot", is: "weapons" }],
      do: [{ a: "scrap", n: 2 }],
    };
    applyDefs([def], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(2);
    if (ctx.scope !== null) ctx.scope.slotId = "shields";
    applyDefs([def], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(2);
  });

  it("isMaxFace and isMinFace read the die face bounds", () => {
    const die = harnessDie("d0", "grey-d4", 4);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    const max: EffectDef = {
      on: "afterResolveSlot",
      if: [{ c: "isMaxFace" }],
      do: [{ a: "scrap", n: 1 }],
    };
    applyDefs([max], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(1);
    die.value = 1;
    const min: EffectDef = {
      on: "afterResolveSlot",
      if: [{ c: "isMinFace" }],
      do: [{ a: "scrap", n: 5 }],
    };
    applyDefs([min], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(6);
  });

  it("prismatic satisfies any school condition", () => {
    const die = harnessDie("d0", "coreshard", 5);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    const def: EffectDef = {
      on: "afterResolveSlot",
      if: [{ c: "school", is: "red" }],
      do: [{ a: "scrap", n: 3 }],
    };
    applyDefs([def], "afterResolveSlot", ctx, die);
    expect(snap.scrap).toBe(3);
  });
});

describe("action application", () => {
  it("modDieValue in a slot scope adjusts the effective value, not the die", () => {
    const die = harnessDie("d0", "grey-d4", 3);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    scopeFor(ctx, die);
    applyDefs(
      [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 2 }] }],
      "beforeResolveSlot",
      ctx,
      die,
    );
    expect(ctx.scope?.value).toBe(5);
    expect(die.value).toBe(3);
  });

  it("addStatus applies to the current target enemy", () => {
    const die = harnessDie("d0", "grey-d4", 4);
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    applyDefs(
      [
        {
          on: "afterResolveSlot",
          do: [{ a: "addStatus", s: "burn", n: 2, target: "target" }],
        },
      ],
      "afterResolveSlot",
      ctx,
      die,
    );
    expect(snap.enemies[0]?.statuses.burn).toBe(2);
  });
});

describe("emit ordering and die scoping", () => {
  it("a die-sourced slot effect fires only for the die in the resolving slot", () => {
    const cinderA = harnessDie("a", "cinder", 4);
    const cinderB = harnessDie("b", "cinder", 4);
    const snap = harnessSnap([cinderA, cinderB]);
    place(snap, "a", "weaponA");
    const ctx = new BattleCtx(snap);
    const sources = buildSources(snap);
    const slotA = snap.slots.weaponA;
    if (slotA === undefined) throw new Error("no weaponA");
    ctx.scope = {
      slotId: "weaponA",
      slot: slotA,
      die: cinderA,
      value: 4,
      chargeMult: 1,
      thresholdBonus: 0,
      crit: false,
      repeat: false,
    };
    emit(sources, "afterResolveSlot", ctx);
    expect(snap.enemies[0]?.statuses.burn).toBe(1);
  });

  it("registers affinity, resonance and perk sources ahead of die sources", () => {
    const snap = harnessSnap([harnessDie("a", "cinder", 4)]);
    const sources = buildSources(snap);
    expect(sources[0]?.key).toBe("affinity");
    expect(sources[1]?.key).toBe("resonance");
    expect(sources[2]?.key).toBe("perks");
    expect(sources[3]?.key).toBe("die:a");
  });
});
