import { describe, expect, it } from "vitest";
import { SLOT_MK, slotCapForMk } from "@/data/slots";
import { harnessDie, harnessSnap, place } from "@/game/battle/battleHarness";
import { resolvePlayerPhase } from "@/game/battle/resolver";
import type { MkLevel } from "@/data/slots";
import type { SlotState } from "@/types/battle";

const weaponDamage = (defId: string, value: number, mk: MkLevel): number => {
  const die = harnessDie("d0", defId, value);
  const snap = harnessSnap([die]);
  const slot: SlotState = { cap: slotCapForMk("weaponA", mk), mk };
  snap.slots.weaponA = slot;
  place(snap, "d0", "weaponA");
  const { beats } = resolvePlayerPhase(snap);
  return beats.find((b) => b.slot === "weaponA" && b.kind === "damage")?.amount ?? 0;
};

describe("Mk table", () => {
  it("matches DESIGN §6.2 caps", () => {
    expect(SLOT_MK.weaponA).toEqual([8, 10, 12]);
    expect(SLOT_MK.shields).toEqual([8, 10, 12]);
    expect(SLOT_MK.engines).toEqual([6, 8, 10]);
    expect(SLOT_MK.sensors).toEqual([6, 8, 10]);
    expect(SLOT_MK.reactor).toEqual([10, 12, 20]);
    expect(SLOT_MK.spinal).toEqual([20, 20, 20]);
  });

  it("slotCapForMk raises the tier per Mk", () => {
    expect(slotCapForMk("weaponA", 1)).toBe(8);
    expect(slotCapForMk("weaponA", 2)).toBe(10);
    expect(slotCapForMk("weaponA", 3)).toBe(12);
    expect(slotCapForMk("reactor", 3)).toBe(20);
  });
});

describe("red → Weapons affinity", () => {
  it("adds +2/+3/+4 by Mk", () => {
    expect(weaponDamage("ember", 4, 1)).toBe(6);
    expect(weaponDamage("ember", 4, 2)).toBe(7);
    expect(weaponDamage("ember", 4, 3)).toBe(8);
  });

  it("prismatic dice inherit the slot's affinity (wildcard)", () => {
    expect(weaponDamage("coreshard", 5, 1)).toBe(7);
  });
});

describe("blue → Shields affinity", () => {
  it("mirrors weapon scaling on shield gain", () => {
    const die = harnessDie("d0", "frostplate", 4);
    const snap = harnessSnap([die]);
    snap.slots.shields = { cap: 8, mk: 1 };
    place(snap, "d0", "shields");
    const mk1 = resolvePlayerPhase(snap);
    expect(mk1.next.shield).toBe(6);

    const die2 = harnessDie("d0", "frostplate", 4);
    const snap2 = harnessSnap([die2]);
    snap2.slots.shields = { cap: 10, mk: 2 };
    place(snap2, "d0", "shields");
    expect(resolvePlayerPhase(snap2).next.shield).toBe(7);
  });
});

describe("green → Engines affinity", () => {
  it("shifts the engine threshold tier", () => {
    const die = harnessDie("d0", "sprout", 5);
    const snap = harnessSnap([die]);
    place(snap, "d0", "engines");
    expect(resolvePlayerPhase(snap).next.engineState).toBe("dodgePlus");
  });
});

describe("black → Reactor affinity", () => {
  it("multiplies stored charge by 1.5, rounded down", () => {
    const die = harnessDie("d0", "ashen", 4);
    const snap = harnessSnap([die]);
    place(snap, "d0", "reactor");
    const { next, beats } = resolvePlayerPhase(snap);
    expect(next.charge).toBe(6);
    expect(beats.find((b) => b.slot === "reactor")?.amount).toBe(6);

    const die2 = harnessDie("d0", "ashen", 5);
    const snap2 = harnessSnap([die2]);
    place(snap2, "d0", "reactor");
    expect(resolvePlayerPhase(snap2).next.charge).toBe(7);
  });
});
