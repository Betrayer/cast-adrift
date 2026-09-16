import { describe, expect, it } from "vitest";
import { MODULE_BY_ID, OFFENSE_MODULES } from "@/data/modules";
import {
  FIRE_MODE_BY_ID,
  FIRE_MODE_IDS,
  FIRE_MODES,
  MODULE_FIRE_MODE,
  SCATTER_MK,
  fireModeAllowed,
  fireModeDef,
  fireModesForSlot,
  splitDamage,
  type FireModeDef,
} from "@/data/fireModes";
import content from "@/i18n/en/content.json";

type Tree = { [key: string]: string | Tree };

const stringAt = (path: string): string | undefined => {
  let node: string | Tree | undefined = content as unknown as Tree;
  for (const seg of path.split(".")) {
    if (typeof node !== "object") return undefined;
    node = node[seg];
  }
  return typeof node === "string" ? node : undefined;
};

const numbersOf = (def: FireModeDef): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(def)) {
    if (typeof value === "number") out[key] = value;
  }
  return out;
};

describe("the fire mode registry", () => {
  it("holds the seven modes DESIGN 6.7 names, each id once", () => {
    expect(FIRE_MODES).toHaveLength(7);
    expect(new Set(FIRE_MODE_IDS).size).toBe(7);
    expect(FIRE_MODE_IDS[0]).toBe("direct");
    for (const id of FIRE_MODE_IDS) {
      expect(FIRE_MODE_BY_ID.get(id)?.id).toBe(id);
      expect(fireModeDef(id).id).toBe(id);
    }
  });

  it("names a translated string for every mode in the source language", () => {
    for (const def of FIRE_MODES) {
      expect(stringAt(def.name.replace("content:", ""))).toBeTypeOf("string");
      expect(stringAt(def.desc.replace("content:", ""))).toBeTypeOf("string");
      const short = stringAt(def.short.replace("content:", "")) ?? "";
      expect(short.length).toBeGreaterThan(0);
      expect(short.length).toBeLessThanOrEqual(3);
    }
  });

  it("interpolates its numbers into the copy instead of restating them", () => {
    for (const def of FIRE_MODES) {
      const desc = stringAt(def.desc.replace("content:", "")) ?? "";
      const numbers = numbersOf(def);
      const used = [...desc.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      for (const name of used) {
        expect(name === undefined ? "" : numbers[name]).toBeTypeOf("number");
      }
      expect(used).toHaveLength(Object.keys(numbers).length);
    }
  });
});

describe("which slot may fire which mode", () => {
  it("gives no mode to anything but the two weapon slots", () => {
    for (const slotId of [
      "spinal",
      "shields",
      "engines",
      "sensors",
      "reactor",
      "repairBay",
    ] as const) {
      expect(fireModesForSlot(slotId, 3, Object.keys(MODULE_FIRE_MODE))).toEqual(
        [],
      );
    }
  });

  it("offers only Direct on a bare Mk1 weapon", () => {
    expect(fireModesForSlot("weaponA", 1, [])).toEqual(["direct"]);
    expect(fireModesForSlot("weaponB", 2, [])).toEqual(["direct"]);
  });

  it("unlocks Scatter at Weapons Mk3 and nowhere else", () => {
    expect(fireModesForSlot("weaponA", SCATTER_MK - 1, [])).toEqual(["direct"]);
    expect(fireModesForSlot("weaponA", SCATTER_MK, [])).toEqual([
      "direct",
      "scatter",
    ]);
  });

  it("carries one mode per offense module and keeps registry order", () => {
    for (const [moduleId, mode] of Object.entries(MODULE_FIRE_MODE)) {
      expect(fireModesForSlot("weaponA", 1, [moduleId])).toEqual([
        "direct",
        mode,
      ]);
    }
    expect(
      fireModesForSlot("weaponA", 3, ["lanceCapacitor", "autoloader"]),
    ).toEqual(["direct", "scatter", "doublet", "shunt"]);
  });

  it("never repeats a mode when two sources grant the same one", () => {
    const modes = fireModesForSlot("weaponA", 3, [
      "autoloader",
      "autoloader",
      "unknownModule",
    ]);
    expect(modes).toEqual(["direct", "scatter", "doublet"]);
  });

  it("sources every acquired mode exactly once across Mk3 and the modules", () => {
    const sourced = new Set(Object.values(MODULE_FIRE_MODE));
    sourced.add("scatter");
    expect([...sourced].sort()).toEqual(
      FIRE_MODE_IDS.filter((id) => id !== "direct")
        .slice()
        .sort(),
    );
    expect(Object.keys(MODULE_FIRE_MODE)).toHaveLength(5);
  });

  it("hangs every mode on an offense module that still carries its own rules", () => {
    const offense = new Set(OFFENSE_MODULES.map((m) => m.id));
    for (const moduleId of Object.keys(MODULE_FIRE_MODE)) {
      expect(offense.has(moduleId)).toBe(true);
      const def = MODULE_BY_ID.get(moduleId);
      expect(
        (def?.effects?.length ?? 0) +
          Object.keys(def?.mods ?? {}).length +
          (def?.traits?.length ?? 0),
      ).toBeGreaterThan(0);
    }
  });
});

describe("mode legality and the scatter split", () => {
  it("blocks only Scatter, and only below two living enemies", () => {
    for (const id of FIRE_MODE_IDS) {
      expect(fireModeAllowed(id, 2)).toBe(true);
      expect(fireModeAllowed(id, 1)).toBe(id !== "scatter");
      expect(fireModeAllowed(id, 0)).toBe(id !== "scatter");
    }
  });

  it("keeps the split total-preserving and as even as integers allow", () => {
    for (let total = 0; total <= 40; total += 1) {
      for (let parts = 1; parts <= 4; parts += 1) {
        const shares = splitDamage(total, parts);
        expect(shares.reduce((sum, n) => sum + n, 0)).toBe(total);
        expect(Math.max(...shares) - Math.min(...shares)).toBeLessThanOrEqual(1);
        expect(Math.min(...shares)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("hands the leftover to the earliest fragments so the target is never shorted", () => {
    expect(splitDamage(7, 2)).toEqual([4, 3]);
    expect(splitDamage(7, 3)).toEqual([3, 2, 2]);
    expect(splitDamage(2, 3)).toEqual([1, 1, 0]);
    expect(splitDamage(-4, 2)).toEqual([0, 0]);
    expect(splitDamage(9, 0)).toEqual([]);
  });
});
