import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BARE_VIEW,
  litShipModel,
  loadShipModel,
  PINNED_VIEW,
  masteryNumeral,
  modelPartNames,
  shipModelPins,
} from "@/components/shipModel";
import { SHIP_PERK_IDS } from "@/data/perks/ship";
import { PLAYABLE_SHIPS } from "@/data/ships";
import { readSource } from "@/app/sourceFiles";

const raw = (art: string): string => readSource("art", "ships", `${art}.svg`);

const partsOf = (svg: string): string[] =>
  [...svg.matchAll(/data-part="([^"]+)"/g)].map((found) => found[1] ?? "");

describe("the ship model files", () => {
  it.each(PLAYABLE_SHIPS.map((ship) => ship.id))(
    "%s carries the hull, five mastery groups and all sixteen perk groups",
    (id) => {
      expect(partsOf(raw(id)).sort()).toEqual(
        [
          "hull",
          ...["I", "II", "III", "IV", "V"].map((n) => `mastery-${n}`),
          ...SHIP_PERK_IDS.map((perk) => `perk-${perk}`),
        ].sort(),
      );
    },
  );

  it.each(PLAYABLE_SHIPS.map((ship) => ship))(
    "$id has a pin inside the frame for every slot",
    (ship) => {
      const pins = shipModelPins(raw(ship.id));
      for (const slot of Object.keys(ship.slots)) {
        const pin = pins[slot as keyof typeof pins];
        expect(pin, slot).toBeDefined();
        expect(parseFloat(pin?.left ?? "")).toBeGreaterThan(0);
        expect(parseFloat(pin?.left ?? "")).toBeLessThan(100);
        expect(parseFloat(pin?.top ?? "")).toBeGreaterThan(0);
        expect(parseFloat(pin?.top ?? "")).toBeLessThan(100);
      }
    },
  );

  it("loads the ram's art for the debug hull", async () => {
    expect(await loadShipModel("ram-proto")).toBe(await loadShipModel("ram"));
    expect(await loadShipModel("ram")).toBe(readFileSync(new URL("../art/ships/ram.svg", import.meta.url), "utf8"));
  });
});

describe("which parts are lit", () => {
  it("lights the hull alone at rank zero with no perks", () => {
    expect(modelPartNames(0, [])).toEqual(["hull"]);
  });

  it("lights one mastery group per rank and stops at five", () => {
    expect(modelPartNames(2, [])).toEqual(["hull", "mastery-I", "mastery-II"]);
    expect(modelPartNames(9, [])).toHaveLength(6);
  });

  it("lights ship perks and ignores every other perk", () => {
    expect(modelPartNames(0, ["shipTurret", "mastery-ram-1", "emberHeart"])).toEqual([
      "hull",
      "perk-shipTurret",
    ]);
  });

  it("marks only the lit parts on and only the fresh ones fresh", () => {
    const svg = '<g data-part="hull"></g><g data-part="perk-a"></g><g data-part="perk-b"></g>';
    expect(
      litShipModel(svg, new Set(["hull", "perk-a"]), new Set(["perk-a"])),
    ).toBe(
      '<g data-part="hull" data-on="1"></g><g data-part="perk-a" data-on="1" data-fresh="1"></g><g data-part="perk-b"></g>',
    );
  });

  it("numbers mastery in roman numerals, with zero as a plain zero", () => {
    expect([0, 1, 3, 5].map(masteryNumeral)).toEqual(["0", "I", "III", "V"]);
  });
});

describe("the model frame", () => {
  it("frames the model tightly without pins and with room for them when pinned", () => {
    const svg = '<svg viewBox="-30 -66 330 302"><g data-part="hull"></g></svg>';
    expect(litShipModel(svg, new Set(["hull"]), new Set(), BARE_VIEW)).toContain('viewBox="-30 2 330 166"');
    expect(litShipModel(svg, new Set(["hull"]), new Set(), PINNED_VIEW)).toContain('viewBox="-30 -66 330 302"');
  });

  it.each(PLAYABLE_SHIPS.map((ship) => ship.id))("%s keeps its pins out of the hull band", (id) => {
    const svg = raw(id);
    for (const found of svg.matchAll(/data-pin="[^"]+" cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g)) {
      const y = Number(found[2]);
      expect(y < BARE_VIEW.top || y > BARE_VIEW.top + BARE_VIEW.height, String(y)).toBe(true);
    }
  });
});
