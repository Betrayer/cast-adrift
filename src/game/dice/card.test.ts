import { describe, expect, it } from "vitest";
import { ALL_DICE, DIE_BY_ID } from "@/data/dice";
import { FATE_DIE_ID } from "@/data/fate";
import {
  dieCardModel,
  dieFaceModel,
  evLabel,
  handDieCardProps,
} from "@/game/dice/card";
import { dieFaces, type ForgeLevel } from "@/game/dice/tier";
import { ptsForInstance } from "@/game/economy/prices";

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

  it("shows the same forged faces the hand rolls", () => {
    const levels: readonly ForgeLevel[] = [1, 2];
    for (const def of ALL_DICE) {
      for (const level of levels) {
        expect([...dieFaceModel(def, level).faces]).toEqual([
          ...(dieFaces({ defId: def.id, fusion: { level, consumed: [] } }) ?? []),
        ]);
      }
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

  it("prices a forged die at its forged size", () => {
    const model = dieCardModel({ defId: "ember", fusion: 1 });
    expect(model?.tier).toBe(8);
    expect(model?.pts).toBe(3);
    expect(model?.badges).toContain("forged");
    expect(dieCardModel({ defId: "ember", fusion: 2 })?.pts).toBe(4);
    expect(dieCardModel({ defId: "ember" })?.pts).toBe(2);
  });

  it("shows the same pts the economy pays for every die and level", () => {
    const levels: readonly ForgeLevel[] = [1, 2];
    for (const def of ALL_DICE) {
      expect(dieCardModel({ defId: def.id })?.pts).toBe(
        ptsForInstance({ defId: def.id }),
      );
      for (const level of levels) {
        expect(dieCardModel({ defId: def.id, fusion: level })?.pts).toBe(
          ptsForInstance({ defId: def.id, fusion: { level, consumed: [] } }),
        );
      }
    }
  });
});

describe("hand die card props", () => {
  it("carries the forge level and the growth of a run die", () => {
    expect(
      handDieCardProps({
        defId: "ember",
        fusion: { level: 1, consumed: ["cinder"] },
        growthBonus: 2,
      }),
    ).toEqual({ defId: "ember", fusion: 1, growthBonus: 2 });
    expect(handDieCardProps({ defId: "ember" })).toEqual({
      defId: "ember",
      fusion: 0,
      growthBonus: 0,
    });
  });

  it("feeds the card the forged size of a forged hand die", () => {
    const model = dieCardModel(
      handDieCardProps({
        defId: "stillwater",
        fusion: { level: 1, consumed: ["x"] },
      }),
    );
    expect(model?.tier).toBe(8);
    expect([...(model?.faces.faces ?? [])]).toEqual([3, 3, 4, 4, 5, 5, 6, 6]);
    expect(model?.faces.ev).toBe(4.5);
  });
});
