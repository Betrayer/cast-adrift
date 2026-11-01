import { beforeEach, describe, expect, it } from "vitest";
import { engravingsForDie } from "@/data/engravings";
import { FATE_DIE_ID } from "@/data/fate";
import {
  canBeSignature,
  forgeCost,
  forgeOptions,
  forgePartners,
  forgedDie,
  growthRefund,
  type ForgeDie,
} from "@/game/dice/forge";
import { dieFaces, dieTier, stepTier } from "@/game/dice/tier";
import { dealHand } from "@/game/battle/setup";
import { forgeInRun } from "@/game/run/forge";
import { createStreams } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const die = (uid: string, defId: string, extra: Partial<ForgeDie> = {}): ForgeDie => ({
  uid,
  defId,
  ...extra,
});

describe("forge eligibility", () => {
  it("pairs dice of one school and refuses two schools", () => {
    expect(forgeOptions(die("a", "ember"), die("b", "slug")).length).toBeGreaterThan(0);
    expect(forgeOptions(die("a", "ember"), die("b", "stillwater"))).toEqual([]);
  });

  it("pairs prismatic only with prismatic", () => {
    expect(forgeOptions(die("a", "coreshard"), die("b", "ember"))).toEqual([]);
    expect(forgeOptions(die("a", "coreshard"), die("b", "aurora")).length).toBeGreaterThan(0);
  });

  it("never lets the Fate die into the forge", () => {
    expect(forgeOptions(die("a", FATE_DIE_ID), die("b", "grey-d4"))).toEqual([]);
    expect(canBeSignature(die("a", FATE_DIE_ID))).toBe(false);
  });

  it("refuses a die paired with itself", () => {
    expect(forgeOptions(die("a", "ember"), die("a", "ember"))).toEqual([]);
  });

  it("lists only same-school partners", () => {
    const hand = [die("a", "ember"), die("b", "slug"), die("c", "stillwater"), die("d", "cinder")];
    expect(forgePartners(hand, "a").sort()).toEqual(["b", "d"]);
    expect(forgePartners(hand, "c")).toEqual([]);
  });
});

describe("the signature", () => {
  it("offers either die as the signature and keeps the chosen one's identity", () => {
    const options = forgeOptions(die("a", "ember"), die("b", "slug"));
    const colour = options.filter((option) => option.kind === "colour");
    expect(colour.map((option) => option.kind === "colour" && option.signature).sort()).toEqual([
      "a",
      "b",
    ]);
    const forged = forgedDie(die("a", "ember", { growthBonus: 2 }), die("b", "slug"));
    expect(forged.uid).toBe("a");
    expect(forged.defId).toBe("ember");
    expect(forged.growthBonus).toBe(2);
    expect(forged.fusion).toEqual({ level: 1, consumed: ["slug"] });
  });

  it("steps the effective tier one rung and caps at d20, never producing d100", () => {
    expect(dieTier(die("a", "ember"))).toBe(6);
    expect(dieTier(die("a", "ember", { fusion: { level: 1, consumed: ["x"] } }))).toBe(8);
    expect(dieTier(die("a", "ember", { fusion: { level: 2, consumed: ["x", "y"] } }))).toBe(10);
    expect(stepTier(12, 1)).toBe(20);
    expect(stepTier(20, 1)).toBe(20);
    expect(stepTier(100, 1)).toBe(100);
  });

  it("forges a second time and then stops taking the signature role", () => {
    const once = forgedDie(die("a", "ember"), die("b", "cinder"));
    expect(canBeSignature(once)).toBe(true);
    const twice = forgedDie(once, die("c", "flare"));
    expect(twice.fusion).toEqual({ level: 2, consumed: ["cinder", "flare"] });
    expect(canBeSignature(twice)).toBe(false);
    const options = forgeOptions(twice, die("d", "cinder"));
    expect(options.every((option) => option.kind !== "colour" || option.signature === "d")).toBe(true);
  });

  it("will not raise a d20 but will melt it into another die", () => {
    const options = forgeOptions(die("a", "lancehead"), die("b", "ember"));
    expect(options.map((option) => option.kind === "colour" && option.signature)).toEqual(["b"]);
  });
});

describe("faces", () => {
  it("extends custom faces by two greater faces per level", () => {
    const once = die("a", "stillwater", { fusion: { level: 1, consumed: ["x"] } });
    expect(dieFaces(once)).toEqual([3, 3, 4, 4, 5, 5, 6, 6]);
    const twice = die("a", "stillwater", { fusion: { level: 2, consumed: ["x", "y"] } });
    expect(dieFaces(twice)).toEqual([3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
    expect(Math.max(...(dieFaces(twice) ?? []))).toBeLessThanOrEqual(dieTier(twice));
  });

  it("leaves a plain die to roll the new size", () => {
    expect(dieFaces(die("a", "ember", { fusion: { level: 1, consumed: ["x"] } }))).toBeUndefined();
  });

  it("carries the forged size and faces into the battle", () => {
    const dealt = dealHand(
      [
        { defId: "stillwater", fusion: { level: 1, consumed: ["x"] } },
        { defId: "ember", fusion: { level: 2, consumed: ["x", "y"] } },
      ],
      createStreams(3),
    );
    expect(dealt[0]?.tier).toBe(8);
    expect(dealt[0]?.faces).toEqual([3, 3, 4, 4, 5, 5, 6, 6]);
    expect(dealt[0]?.fusion).toBe(1);
    expect(dealt[1]?.tier).toBe(10);
    expect(dealt[1]?.faces).toBeUndefined();
  });
});

describe("cost and carry", () => {
  it("charges forty, then eighty for a die already forged once", () => {
    expect(forgeCost(die("a", "ember"))).toBe(40);
    expect(forgeCost(die("a", "ember", { fusion: { level: 1, consumed: ["x"] } }))).toBe(80);
  });

  it("refunds a consumed die's growth at the sell rate", () => {
    expect(growthRefund(die("b", "sprout"))).toBe(0);
    expect(growthRefund(die("b", "sprout", { growthBonus: 3 }))).toBe(24);
  });

  it("keeps the signature's engravings because it keeps its definition", () => {
    const engravings = { ember: ["keen"] };
    const forged = forgedDie(die("a", "ember"), die("b", "slug"));
    expect(engravingsForDie(engravings, forged.defId)).toEqual(["keen"]);
  });
});

describe("named recipes", () => {
  it("offers the authored fused die beside the colour forge for an identical pair", () => {
    const options = forgeOptions(die("a", "red-d6"), die("b", "red-d6"));
    expect(options[0]).toEqual({
      kind: "recipe",
      first: "a",
      second: "b",
      result: "fused-emberforge",
      cost: 40,
    });
    expect(options.filter((option) => option.kind === "colour")).toHaveLength(2);
  });

  it("does not offer a recipe for a pair that has already been forged", () => {
    const options = forgeOptions(
      die("a", "red-d6", { fusion: { level: 1, consumed: ["x"] } }),
      die("b", "red-d6"),
    );
    expect(options.some((option) => option.kind === "recipe")).toBe(false);
  });
});

describe("forging in a run", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    useMetaStore.setState({ codex: [] });
  });

  const seed = (defIds: readonly string[], scrap: number): string[] => {
    const run = useRunStore.getState();
    const uids = defIds.map((defId) => run.addDie(defId));
    useRunStore.setState({ scrap });
    return uids;
  };

  it("replaces the signature in place, drops the other, spends the price and logs the school", () => {
    const [a, b, c] = seed(["ember", "stillwater", "slug"], 100);
    if (a === undefined || b === undefined || c === undefined) throw new Error("seed");
    expect(
      forgeInRun({ kind: "colour", signature: a, consumed: c, level: 1, cost: 40 }),
    ).toBe(true);
    const deck = useRunStore.getState().deck;
    expect(deck.map((d) => d.uid)).toEqual([a, b]);
    expect(deck[0]?.fusion).toEqual({ level: 1, consumed: ["slug"] });
    expect(useRunStore.getState().scrap).toBe(60);
    expect(useMetaStore.getState().codex).toContain("forge-red");
  });

  it("refuses a forge the rules do not allow, and one the player cannot pay for", () => {
    const [a, b] = seed(["ember", "stillwater"], 100);
    if (a === undefined || b === undefined) throw new Error("seed");
    expect(
      forgeInRun({ kind: "colour", signature: a, consumed: b, level: 1, cost: 40 }),
    ).toBe(false);
    const [c, d] = seed(["ember", "slug"], 10);
    if (c === undefined || d === undefined) throw new Error("seed");
    expect(
      forgeInRun({ kind: "colour", signature: c, consumed: d, level: 1, cost: 40 }),
    ).toBe(false);
    expect(useRunStore.getState().scrap).toBe(10);
  });

  it("runs the named recipe into the authored fused die", () => {
    const [a, b] = seed(["red-d6", "red-d6"], 50);
    if (a === undefined || b === undefined) throw new Error("seed");
    expect(
      forgeInRun({ kind: "recipe", first: a, second: b, result: "fused-emberforge", cost: 40 }),
    ).toBe(true);
    expect(useRunStore.getState().deck.map((d) => d.defId)).toEqual(["fused-emberforge"]);
    expect(useRunStore.getState().scrap).toBe(10);
  });
});
