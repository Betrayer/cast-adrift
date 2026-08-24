import { describe, expect, it } from "vitest";
import { ALL_DICE, DIE_BY_ID } from "@/data/dice";
import { FATE_DIE_ID } from "@/data/fate";
import { dieCardModel, dieFaceModel, evLabel } from "@/game/dice/card";

const defOf = (id: string) => {
  const def = DIE_BY_ID.get(id);
  if (def === undefined) throw new Error(`unknown die ${id}`);
  return def;
};

describe("die face model", () => {
  it("spans 1..tier for a standard die", () => {
    const model = dieFaceModel(defOf("red-d6"));
    expect(model.custom).toBe(false);
    expect(model.min).toBe(1);
    expect(model.max).toBe(6);
    expect(model.ev).toBe(3.5);
  });

  it("averages the authored faces of a custom die", () => {
    const model = dieFaceModel(defOf("flare"));
    expect(model.custom).toBe(true);
    expect([...model.faces]).toEqual([1, 2, 4, 4]);
    expect(model.min).toBe(1);
    expect(model.max).toBe(4);
    expect(model.ev).toBe(2.75);
  });

  it("labels an average to one decimal", () => {
    expect(evLabel(3.5)).toBe("3.5");
    expect(evLabel(2.75)).toBe("2.8");
    expect(evLabel(4)).toBe("4.0");
  });

  it("never reports a face outside the roll range", () => {
    for (const def of ALL_DICE) {
      const model = dieFaceModel(def);
      expect(model.min).toBeGreaterThanOrEqual(1);
      expect(model.ev).toBeGreaterThanOrEqual(model.min);
      expect(model.ev).toBeLessThanOrEqual(model.max);
    }
  });
});

describe("die card model", () => {
  it("returns null for an unknown id", () => {
    expect(dieCardModel({ defId: "nope" })).toBeNull();
  });

  it("badges a custom-faced die", () => {
    const model = dieCardModel({ defId: "flare" });
    expect(model?.badges).toContain("faces");
    expect(model?.badges).not.toContain("active");
  });

  it("badges an active and lists nothing else", () => {
    const model = dieCardModel({ defId: "crucible" });
    expect(model?.badges).toEqual(["active"]);
  });

  it("badges the fate die", () => {
    const model = dieCardModel({ defId: FATE_DIE_ID });
    expect(model?.badges).toContain("fate");
  });

  it("badges growth from the definition and from the instance", () => {
    expect(dieCardModel({ defId: "sprout" })?.badges).toContain("growth");
    expect(
      dieCardModel({ defId: "red-d6", growthBonus: 2 })?.badges,
    ).toContain("growth");
    expect(dieCardModel({ defId: "red-d6" })?.badges).not.toContain("growth");
  });

  it("resolves engravings from the map and badges them", () => {
    const model = dieCardModel({
      defId: "red-d6",
      engravings: { "red-d6": ["sting"] },
    });
    expect(model?.badges).toContain("engraved");
    expect(model?.engravings.map((e) => e.id)).toEqual(["sting"]);
  });

  it("adds the prismatic feature only for prism dice", () => {
    expect(dieCardModel({ defId: "glimmer" })?.features).toContain("prismatic");
    expect(dieCardModel({ defId: "red-d6" })?.features).not.toContain(
      "prismatic",
    );
  });
});
