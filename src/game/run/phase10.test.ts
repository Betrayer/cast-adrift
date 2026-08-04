import { describe, expect, it } from "vitest";
import { ascensionMods } from "@/data/ascension";
import { ALL_DICE } from "@/data/dice";
import {
  dieHasGrant,
  ENGRAVINGS,
  engravingEffects,
  socketsForDie,
} from "@/data/engravings";
import { fateOutcomeFor, FATE_TABLE } from "@/data/fate";
import { ALL_MODULES, moduleSlots, MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { ALL_PERKS } from "@/data/perks";
import type { ContentTag } from "@/data/tags";
import { patternFor, spawnEnemy } from "@/game/battle/setup";
import { rollModule } from "@/game/economy/rewards";
import { generateShopModules } from "@/game/economy/shop";
import { computeModuleMods, moduleHasTrait } from "@/game/run/runMods";
import { createStream } from "@/services/rng";
import { ENEMY_BY_ID } from "@/data/enemies";

describe("modules", () => {
  it("aggregates mods across installed modules", () => {
    const mods = computeModuleMods(["ballastModule", "capacitorBank"]);
    expect(mods.hullMaxDelta).toBe(4);
    expect(mods.chargeCapDelta).toBe(3);
  });

  it("reads traits off installed modules", () => {
    expect(moduleHasTrait(["escapePod"], "escapePod")).toBe(true);
    expect(moduleHasTrait(["ballastModule"], "escapePod")).toBe(false);
  });

  it("caps the bay at two slots, three with the hub notable", () => {
    expect(moduleSlots(0)).toBe(2);
    expect(moduleSlots(1)).toBe(3);
    expect(moduleSlots(9)).toBe(3);
  });

  it("prices every module inside the DESIGN §9.3 band", () => {
    for (const def of ALL_MODULES) {
      expect(def.price).toBeGreaterThanOrEqual(40);
      expect(def.price).toBeLessThanOrEqual(90);
    }
  });

  it("never offers a module the ship already carries", () => {
    const owned = ALL_MODULES.filter((m) => m.rarity === "common").map(
      (m) => m.id,
    );
    const rng = createStream(11);
    for (let i = 0; i < 50; i += 1) {
      expect(owned).not.toContain(rollModule(rng, owned, "common"));
    }
  });

  it("stocks one or two distinct modules per shop", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const stock = generateShopModules(seed, `n${String(seed)}`, 0, 0);
      expect(stock.length).toBeGreaterThanOrEqual(1);
      expect(stock.length).toBeLessThanOrEqual(2);
      expect(new Set(stock.map((s) => s.moduleId)).size).toBe(stock.length);
      for (const item of stock) expect(MODULE_BY_ID.has(item.moduleId)).toBe(true);
    }
  });
});

describe("engravings", () => {
  it("gives rare and legendary dice two sockets, everything else one", () => {
    for (const die of ALL_DICE) {
      const expected = die.rarity === "rare" || die.rarity === "legendary" ? 2 : 1;
      expect(socketsForDie(die.id)).toBe(expected);
    }
  });

  it("resolves effects for the die they are fitted to and no other", () => {
    const map = { ember: ["sting"] };
    expect(engravingEffects(map, "ember")).toHaveLength(1);
    expect(engravingEffects(map, "cinder")).toHaveLength(0);
  });

  it("exposes the four engine grants", () => {
    const grants = ENGRAVINGS.filter((e) => e.grant !== undefined).map(
      (e) => e.grant,
    );
    expect(new Set(grants)).toEqual(
      new Set(["lockImmune", "blockImmune", "freeReroll", "freeNudge"]),
    );
    expect(dieHasGrant({ ember: ["anchor"] }, "ember", "lockImmune")).toBe(true);
    expect(dieHasGrant({ ember: ["anchor"] }, "ember", "freeReroll")).toBe(false);
  });

  it("gives every engraving either effects or a grant", () => {
    for (const def of ENGRAVINGS) {
      expect(def.effects !== undefined || def.grant !== undefined).toBe(true);
    }
  });
});

describe("the Fate die", () => {
  it("covers 1–100 exactly once", () => {
    const seen = new Set<number>();
    for (const band of FATE_TABLE) {
      for (let n = band.min; n <= band.max; n += 1) {
        expect(seen.has(n)).toBe(false);
        seen.add(n);
      }
    }
    expect(seen.size).toBe(100);
  });

  it("maps the DESIGN §7 band edges", () => {
    expect(fateOutcomeFor(1).band).toBe("catastrophe");
    expect(fateOutcomeFor(20).band).toBe("setback");
    expect(fateOutcomeFor(60).band).toBe("mixed");
    expect(fateOutcomeFor(95).band).toBe("boon");
    expect(fateOutcomeFor(100).band).toBe("miracle");
  });

  it("clamps rolls outside the table", () => {
    expect(fateOutcomeFor(0).id).toBe(fateOutcomeFor(1).id);
    expect(fateOutcomeFor(999).id).toBe(fateOutcomeFor(100).id);
  });
});

describe("ascension A6–A10", () => {
  it("bolts an extra subsystem onto elites from A6", () => {
    const def = ENEMY_BY_ID.get("raiderAlpha");
    expect(def?.elite).toBe(true);
    const before = spawnEnemy("raiderAlpha", "e0", createStream(3), {
      ascension: 5,
    });
    const after = spawnEnemy("raiderAlpha", "e0", createStream(3), {
      ascension: 6,
    });
    expect(after.subsystems.length).toBe(before.subsystems.length + 1);
  });

  it("inserts one extra boss beat from A8 and leaves other enemies alone", () => {
    const boss = ENEMY_BY_ID.get("quarantineWarden");
    if (boss === undefined) throw new Error("missing boss");
    const base = patternFor(boss, 0, 7).length;
    expect(patternFor(boss, 0, 8).length).toBe(base + 1);
    const grunt = ENEMY_BY_ID.get("raider");
    if (grunt === undefined) throw new Error("missing enemy");
    expect(patternFor(grunt, 0, 10).length).toBe(patternFor(grunt, 0, 0).length);
  });

  it("stacks the full A10 modifier set", () => {
    const mods = ascensionMods(10);
    expect(mods.tideCapDelta).toBe(2);
    expect(mods.shopPricePct).toBe(45);
    expect(mods.hullPct).toBe(-15);
    expect(mods.eliteSubsystem).toBe(true);
    expect(mods.bossPatternInsert).toBe(true);
  });
});

describe("perk synergy tags", () => {
  it("gives every rare a synergy tag some content carries", () => {
    const carried = new Set<ContentTag>();
    for (const die of ALL_DICE) {
      carried.add(die.school);
      for (const tag of die.tags ?? []) carried.add(tag);
    }
    for (const def of ALL_MODULES) {
      for (const tag of moduleTags(def)) carried.add(tag);
    }
    for (const def of ENGRAVINGS) {
      for (const tag of def.tags ?? []) carried.add(tag);
    }
    for (const def of ALL_PERKS) {
      for (const tag of def.tags ?? []) carried.add(tag);
    }
    for (const perk of ALL_PERKS.filter((p) => p.rarity === "rare")) {
      const syn = perk.synergy;
      expect(syn).toBeDefined();
      for (const tag of syn ?? []) expect(carried.has(tag)).toBe(true);
    }
  });
});
