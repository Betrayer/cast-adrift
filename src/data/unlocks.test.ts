import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_BY_ID } from "@/data/achievements";
import { CONTRACTS } from "@/data/contracts";
import { ALL_DICE } from "@/data/dice";
import { MILESTONES } from "@/data/milestones";
import {
  contractUnlockHints,
  dieGrantId,
  dieUnlockHints,
  EMPTY_UNLOCK_CONTEXT,
  hasFeature,
  OPEN_CONTRACTS,
  OPEN_DICE,
  resolveUnlocks,
  UNLOCKS,
  unlockedContracts,
  unlockedCosmetics,
  unlockedDice,
  type UnlockContext,
} from "@/data/unlocks";
import { contractRoutes, dieRoutes } from "@/game/meta/describeUnlock";

const ctx = (patch: Partial<UnlockContext> = {}): UnlockContext => ({
  ...EMPTY_UNLOCK_CONTEXT,
  ...patch,
});

describe("unlock wave tables", () => {
  it("partitions all 90 dice: 40 open, the rest in exactly one wave", () => {
    expect(OPEN_DICE).toHaveLength(40);
    const waved = UNLOCKS.flatMap((def) => def.dice ?? []);
    expect(new Set(waved).size).toBe(waved.length);
    for (const id of waved) expect(OPEN_DICE).not.toContain(id);
    const covered = new Set([...OPEN_DICE, ...waved]);
    expect(covered.size).toBe(ALL_DICE.length);
    for (const die of ALL_DICE) expect(covered.has(die.id)).toBe(true);
  });

  it("splits the level waves six ways and the achievement waves fourteen", () => {
    const level = UNLOCKS.filter(
      (def) => def.kind === "diceWave" && def.source.level !== undefined,
    );
    expect(level).toHaveLength(6);
    for (const wave of level) expect(wave.dice).toHaveLength(6);
    const achievement = UNLOCKS.filter(
      (def) => def.kind === "diceWave" && def.source.achievement !== undefined,
    ).flatMap((def) => def.dice ?? []);
    expect(achievement).toHaveLength(18);
  });

  it("partitions all 20 contracts", () => {
    expect(OPEN_CONTRACTS).toHaveLength(6);
    const waved = UNLOCKS.flatMap((def) => def.contracts ?? []);
    expect(new Set(waved).size).toBe(waved.length);
    const covered = new Set([...OPEN_CONTRACTS, ...waved]);
    expect(covered.size).toBe(CONTRACTS.length);
    for (const def of CONTRACTS) expect(covered.has(def.id)).toBe(true);
  });

  it("only names achievements that exist", () => {
    for (const def of UNLOCKS) {
      if (def.source.achievement === undefined) continue;
      expect(ACHIEVEMENT_BY_ID.has(def.source.achievement)).toBe(true);
    }
  });

  it("backs every milestone unlock id with a real unlock", () => {
    for (const milestone of MILESTONES) {
      if (milestone.unlockId === undefined) continue;
      expect(UNLOCKS.some((def) => def.id === milestone.unlockId)).toBe(true);
    }
  });
});

describe("unlock resolver", () => {
  it("opens nothing on a fresh profile beyond the open sets", () => {
    expect(resolveUnlocks(ctx()).size).toBe(0);
    expect(unlockedDice(ctx()).size).toBe(40);
    expect(unlockedContracts(ctx()).size).toBe(6);
    expect(unlockedCosmetics(ctx()).size).toBe(0);
  });

  it("opens a level wave exactly at its level", () => {
    expect(unlockedDice(ctx({ level: 7 })).has("crucible")).toBe(false);
    expect(unlockedDice(ctx({ level: 8 })).has("crucible")).toBe(true);
  });

  it("opens an achievement wave from the achievement alone", () => {
    const withAch = ctx({ achievements: ["sectorFive"] });
    expect(unlockedDice(withAch).has("aurora")).toBe(true);
    expect(unlockedDice(ctx()).has("aurora")).toBe(false);
  });

  it("opens the A5 contract and the ascension cosmetics by ascension", () => {
    expect(unlockedContracts(ctx({ ascension: 4 })).has("voidTithe")).toBe(false);
    expect(unlockedContracts(ctx({ ascension: 5 })).has("voidTithe")).toBe(true);
    expect(unlockedCosmetics(ctx({ ascension: 3 })).has("ashenSkin")).toBe(true);
    expect(unlockedCosmetics(ctx({ ascension: 9 })).has("emberglassSkin")).toBe(
      true,
    );
    expect(unlockedCosmetics(ctx({ ascension: 10 })).has("ascendant")).toBe(true);
  });

  it("treats a grant as a fifth source", () => {
    const granted = ctx({ granted: ["diceL46"] });
    expect(unlockedDice(granted).has("lancehead")).toBe(true);
    expect(hasFeature(ctx({ granted: ["featureFreeRespec"] }), "freeRespec")).toBe(
      true,
    );
  });

  it("opens a single die from a unique-drop grant", () => {
    const granted = ctx({ granted: [dieGrantId("voidmaw")] });
    expect(unlockedDice(granted).has("voidmaw")).toBe(true);
    expect(unlockedDice(granted).has("lancehead")).toBe(false);
  });

  it("gates the features the milestones promise", () => {
    expect(hasFeature(ctx({ level: 9 }), "shipRam")).toBe(false);
    expect(hasFeature(ctx({ level: 10 }), "shipRam")).toBe(true);
    expect(hasFeature(ctx({ level: 29 }), "engravingStation")).toBe(false);
    expect(hasFeature(ctx({ level: 30 }), "engravingStation")).toBe(true);
    expect(hasFeature(ctx({ level: 39 }), "dailyPreview")).toBe(false);
    expect(hasFeature(ctx({ level: 40 }), "dailyPreview")).toBe(true);
    expect(hasFeature(ctx({ level: 49 }), "freeRespec")).toBe(false);
    expect(hasFeature(ctx({ level: 50 }), "freeRespec")).toBe(true);
  });
});

describe("unlock hints", () => {
  it("says nothing for an open die and names the def's own source", () => {
    expect(dieUnlockHints("red-d6")).toHaveLength(0);
    expect(dieUnlockHints("magma")).toEqual([{ kind: "level", value: 22 }]);
    expect(dieUnlockHints("aurora")).toEqual([
      { kind: "achievement", value: 0, achievement: "sectorFive" },
    ]);
  });

  it("lists the achievement that grants a level wave alongside the level", () => {
    const magma = dieRoutes("magma");
    expect(magma.map((h) => h.kind).sort()).toEqual(["achievement", "level"]);
    expect(magma.find((h) => h.kind === "level")?.value).toBe(22);
    expect(magma.find((h) => h.kind === "achievement")?.achievement).toBe(
      "everyColour",
    );
  });

  it("falls back to «a unique drop» for a die no wave carries", () => {
    expect(dieRoutes("__nosuchdie__")).toEqual([{ kind: "drop", value: 0 }]);
  });

  it("names the ascension route for the A5 contract", () => {
    expect(contractUnlockHints("voidTithe")).toEqual([
      { kind: "ascension", value: 5 },
    ]);
    expect(contractUnlockHints("bareHull")).toHaveLength(0);
    expect(contractRoutes("voidTithe")).toEqual([
      { kind: "ascension", value: 5 },
    ]);
    expect(contractRoutes("prismWork").map((h) => h.kind).sort()).toEqual([
      "achievement",
      "level",
    ]);
  });
});
