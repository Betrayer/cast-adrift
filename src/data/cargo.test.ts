import { describe, expect, it } from "vitest";
import {
  BASE_CARGO_HOLD,
  CARGO,
  CARGO_BY_ID,
  CARGO_IDS,
  CARGO_PAYOUT_RANGE,
  CARGO_PREFER_ROWS,
  cargoAxisShift,
  cargoChargeCapDelta,
  cargoDef,
  cargoDescVars,
  cargoHullPerNode,
  cargoName,
  cargoPayout,
  cargoSlotTierDelta,
} from "@/data/cargo";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { SECTORS } from "@/data/sectors";
import { PLAYABLE_SHIPS, SHIPS, SHIP_BY_ID } from "@/data/ships";
import { WEATHER_BY_ID } from "@/data/weather";
import { SURGE_COST } from "@/game/battle/resolver";
import { applySlotOverrides, buildShipSlots } from "@/game/battle/setup";
import { cargoDrawbackLands } from "@/game/run/cargo";
import { shipCargoHold } from "@/game/run/hold";
import { runChargeCap } from "@/game/run/runMods";
import enContent from "@/i18n/en/content.json";
import type { SlotId } from "@/types/content";

const TWO_HOLD_SHIPS: readonly string[] = ["ark", "foundry"];

describe("the cargo roster", () => {
  it("carries eight types with unique ids", () => {
    expect(CARGO).toHaveLength(8);
    expect(new Set(CARGO_IDS).size).toBe(8);
    for (const def of CARGO) {
      expect(CARGO_BY_ID.get(def.id)).toBe(def);
      expect(cargoDef(def.id)).toBe(def);
      expect(cargoName(def.id)).toBe(def.name);
    }
    expect(cargoDef("nothing")).toBeUndefined();
  });

  it("shares no id with a mutator or a weather condition", () => {
    for (const def of CARGO) {
      expect(MUTATOR_BY_ID.has(def.id)).toBe(false);
      expect(WEATHER_BY_ID.has(def.id)).toBe(false);
    }
  });

  it("names and describes every type in the source locale", () => {
    const copy = enContent.cargo as unknown as Record<
      string,
      Record<string, string> | undefined
    >;
    for (const def of CARGO) {
      const entry = copy[def.id];
      expect(entry, `${def.id} has no en copy`).toBeDefined();
      expect(entry?.name?.length ?? 0).toBeGreaterThan(0);
      expect(entry?.desc?.length ?? 0).toBeGreaterThan(0);
      expect(def.name).toBe(`content:cargo.${def.id}.name`);
      expect(def.desc).toBe(`content:cargo.${def.id}.desc`);
    }
  });

  it("states the drawback in the number the description prints", () => {
    const copy = enContent.cargo as unknown as Record<
      string,
      Record<string, string> | undefined
    >;
    for (const def of CARGO) {
      expect(copy[def.id]?.desc).toContain("{{n}}");
      expect(cargoDescVars(def).n).toBeGreaterThan(0);
    }
  });

  it("keeps the drawback vocabulary closed and every drawback live", () => {
    for (const def of CARGO) {
      const tier = cargoSlotTierDelta(def);
      const hull = cargoHullPerNode(def);
      const axis = cargoAxisShift(def);
      const touched =
        Object.keys(tier).length + (hull > 0 ? 1 : 0) + (axis !== 0 ? 1 : 0);
      expect(touched, `${def.id} carries no live drawback`).toBe(1);
      for (const [slot, delta] of Object.entries(tier)) {
        expect(delta, `${def.id}: ${slot} is not a cost`).toBeLessThan(0);
      }
    }
  });

  it("never prices surge out of the act", () => {
    for (const def of CARGO) {
      const cap = runChargeCap([]) + cargoChargeCapDelta(def);
      expect(
        cap,
        `${def.id}: a charge cap of ${String(cap)} deletes surge for the act`,
      ).toBeGreaterThanOrEqual(SURGE_COST);
    }
  });

  it("lowers a slot the hull actually carries, never all of them", () => {
    for (const def of CARGO) {
      const tier = cargoSlotTierDelta(def);
      const slots = Object.keys(tier) as SlotId[];
      if (slots.length === 0) continue;
      const owners = SHIPS.filter((ship) =>
        slots.every((slot) => ship.slots[slot] !== undefined),
      );
      expect(owners.length, `${def.id} lands on no hull`).toBeGreaterThan(0);
      for (const ship of owners) {
        const before = buildShipSlots(ship.id);
        const after = applySlotOverrides(before, tier);
        for (const slot of slots) {
          expect(after[slot]?.cap ?? 0).toBeLessThan(before[slot]?.cap ?? 0);
          expect(after[slot]?.cap ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });

  it("either bites the hull it is offered to or is not offered at all", () => {
    for (const def of CARGO) {
      for (const ship of PLAYABLE_SHIPS) {
        const tier = cargoSlotTierDelta(def);
        const slots = Object.keys(tier) as SlotId[];
        const lands = cargoDrawbackLands(def, ship.id);
        if (!lands) {
          expect(
            slots.some((slot) => ship.slots[slot] === undefined),
            `${def.id} is refused on ${ship.id} for no reason`,
          ).toBe(true);
          continue;
        }
        const before = buildShipSlots(ship.id);
        const after = applySlotOverrides(before, tier);
        for (const slot of slots) {
          expect(
            after[slot]?.cap ?? 0,
            `${def.id} costs ${ship.id} nothing`,
          ).toBeLessThan(before[slot]?.cap ?? 0);
        }
      }
    }
  });

  it("pays inside the authored band in every act", () => {
    const [lo, hi] = CARGO_PAYOUT_RANGE;
    for (const def of CARGO) {
      for (const sector of SECTORS) {
        const paid = cargoPayout(def, sector.scrapMult);
        expect(
          paid,
          `${def.id} pays ${String(paid)} in sector ${String(sector.id)}`,
        ).toBeGreaterThanOrEqual(lo);
        expect(paid).toBeLessThanOrEqual(hi);
      }
    }
  });

  it("prefers a drop three to five rows out", () => {
    expect(CARGO_PREFER_ROWS).toEqual([3, 5]);
  });
});

describe("the hold", () => {
  it("gives every hull a stated capacity, and two only to the Ark and the Forge", () => {
    expect(SHIPS).toHaveLength(7);
    for (const ship of SHIPS) {
      expect(
        ship.cargoHold,
        `${ship.id} states no hold`,
      ).toBeGreaterThanOrEqual(1);
      expect(shipCargoHold(ship.id)).toBe(ship.cargoHold);
      expect(ship.cargoHold).toBe(TWO_HOLD_SHIPS.includes(ship.id) ? 2 : 1);
    }
    expect(SHIP_BY_ID.get("ram-proto")?.cargoHold).toBe(BASE_CARGO_HOLD);
  });

  it("keeps the hold off the purchased module bay", () => {
    for (const ship of SHIPS) {
      if (ship.moduleSlots === undefined) continue;
      expect(ship.cargoHold).not.toBe(ship.moduleSlots);
    }
  });
});
