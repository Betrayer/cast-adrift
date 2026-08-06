import { describe, expect, it } from "vitest";
import { shapeKey } from "@/data/contentShape";
import { ALL_PERKS, PERK_BY_ID } from "@/data/perks";
import {
  COMMON_FLOOR_SECTOR,
  PERK_DRAFT_SIZE,
  PITY_DRAFTS,
  rollPerkChoices,
  skipScrapFor,
  SKIP_SCRAP_BASE,
  type DraftContext,
} from "@/game/run/perkDraft";
import { createStream } from "@/services/rng";

const MONO_RED = ["ember", "ember", "red-d6", "red-d6", "red-d6", "ember"];
const MONO_BLUE = [
  "frostplate",
  "frostplate",
  "blue-d6",
  "blue-d6",
  "blue-d6",
  "frostplate",
];

const ctx = (over: Partial<DraftContext> = {}): DraftContext => ({
  owned: [],
  banished: [],
  sector: 1,
  deckDefIds: MONO_RED,
  modules: [],
  shipId: "wanderer",
  draftsSinceRare: 0,
  ...over,
});

const drafts = (
  count: number,
  over: Partial<DraftContext> = {},
): string[][] =>
  Array.from({ length: count }, (_, i) =>
    rollPerkChoices(createStream(1000 + i), ctx(over)),
  );

const poolShare = (rolls: string[][], pool: string): number => {
  const flat = rolls.flat();
  const hits = flat.filter((id) => PERK_BY_ID.get(id)?.pool === pool).length;
  return hits / Math.max(1, flat.length);
};

describe("perk draft v2", () => {
  it("offers three distinct, unowned perks", () => {
    const choices = rollPerkChoices(createStream(3), ctx());
    expect(choices).toHaveLength(PERK_DRAFT_SIZE);
    expect(new Set(choices).size).toBe(PERK_DRAFT_SIZE);
    const owning = rollPerkChoices(createStream(3), ctx({ owned: choices }));
    for (const id of choices) expect(owning).not.toContain(id);
  });

  it("is deterministic for the same seed and context", () => {
    expect(rollPerkChoices(createStream(77), ctx())).toEqual(
      rollPerkChoices(createStream(77), ctx()),
    );
  });

  it("shifts offers toward the deck's school", () => {
    const red = poolShare(drafts(300, { deckDefIds: MONO_RED }), "red");
    const blue = poolShare(drafts(300, { deckDefIds: MONO_BLUE }), "red");
    expect(red).toBeGreaterThan(blue);
    expect(red).toBeGreaterThan(0.2);
    expect(blue).toBeLessThan(0.16);
  });

  it("weights toward owned tags", () => {
    const burnPerks = ALL_PERKS.filter((p) => (p.tags ?? []).includes("burn"));
    expect(burnPerks.length).toBeGreaterThan(0);
    const withBurn = drafts(300, {
      deckDefIds: ["cinder", "cinder", "cinder", "magma", "ember", "ember"],
    })
      .flat()
      .filter((id) => (PERK_BY_ID.get(id)?.tags ?? []).includes("burn")).length;
    const withoutBurn = drafts(300, { deckDefIds: MONO_BLUE })
      .flat()
      .filter((id) => (PERK_BY_ID.get(id)?.tags ?? []).includes("burn")).length;
    expect(withBurn).toBeGreaterThan(withoutBurn);
  });

  it("guarantees a rare inside the pity window", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const choices = rollPerkChoices(
        createStream(seed),
        ctx({ draftsSinceRare: PITY_DRAFTS - 1 }),
      );
      expect(
        choices.some((id) => PERK_BY_ID.get(id)?.rarity === "rare"),
      ).toBe(true);
    }
  });

  it("does not force a rare before the pity window", () => {
    const rolls = drafts(60, { draftsSinceRare: 0 });
    const allRare = rolls.every((choices) =>
      choices.some((id) => PERK_BY_ID.get(id)?.rarity === "rare"),
    );
    expect(allRare).toBe(false);
  });

  it("halves the common weight from sector 4", () => {
    const early = drafts(300, { sector: 1 })
      .flat()
      .filter((id) => PERK_BY_ID.get(id)?.rarity === "common").length;
    const late = drafts(300, { sector: COMMON_FLOOR_SECTOR })
      .flat()
      .filter((id) => PERK_BY_ID.get(id)?.rarity === "common").length;
    expect(late).toBeLessThan(early);
  });

  it("honours a rarity floor", () => {
    const choices = rollPerkChoices(
      createStream(9),
      ctx({ floor: "uncommon" }),
    );
    for (const id of choices) {
      expect(PERK_BY_ID.get(id)?.rarity).not.toBe("common");
    }
  });

  it("banishing removes the card and its shape from the run", () => {
    const victim = ALL_PERKS[0];
    expect(victim).toBeDefined();
    if (victim === undefined) return;
    const sameShape = ALL_PERKS.filter(
      (p) => shapeKey(p) === shapeKey(victim),
    ).map((p) => p.id);
    const rolls = drafts(200, { banished: [victim.id] }).flat();
    for (const id of sameShape) expect(rolls).not.toContain(id);
  });

  it("never offers two cards of the same shape in one draft", () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const shapes = rollPerkChoices(createStream(seed), ctx())
        .map((id) => PERK_BY_ID.get(id))
        .filter((def) => def !== undefined)
        .map(shapeKey);
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });

  it("offers every perk in the pool — no dead cards", () => {
    const decks = [MONO_RED, MONO_BLUE, ["black-d6", "black-d6", "ashen", "obsidian", "pitch", "eclipse"]];
    const offered = new Set<string>();
    for (const deckDefIds of decks) {
      for (let sector = 1; sector <= 5; sector += 1) {
        for (let seed = 0; seed < 260; seed += 1) {
          for (const id of rollPerkChoices(
            createStream(seed * 31 + sector),
            ctx({ deckDefIds, sector, draftsSinceRare: seed % PITY_DRAFTS }),
          )) {
            offered.add(id);
          }
        }
      }
    }
    const missing = ALL_PERKS.filter((p) => !offered.has(p.id)).map((p) => p.id);
    expect(missing).toEqual([]);
  });

  it("prices the skip by sector", () => {
    expect(skipScrapFor(1)).toBe(SKIP_SCRAP_BASE + 5);
    expect(skipScrapFor(5)).toBe(SKIP_SCRAP_BASE + 25);
    expect(skipScrapFor(5)).toBeGreaterThan(skipScrapFor(1));
  });
});
