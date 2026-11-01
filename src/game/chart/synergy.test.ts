import { describe, expect, it } from "vitest";
import { CHART_NODES, CHART_NODE_BY_ID } from "@/data/chart";
import { computeCensus } from "@/game/battle/resonance";
import { chartNodeCost } from "@/game/chart/cost";
import { confluenceSteps } from "@/game/chart/engine";
import { activeChartEffects } from "@/game/effects/sources";
import { chartEffectsOf, computeChartMods } from "@/game/run/runMods";
import type { School } from "@/types/content";

const branch = (school: School): string[] =>
  CHART_NODES.filter((n) => n.constellation === school)
    .sort((a, b) => a.depth - b.depth)
    .map((n) => n.id);

const upTo = (school: School, points: number): string[] => {
  const picked: string[] = [];
  let spent = 0;
  for (const id of branch(school)) {
    if (spent >= points) break;
    picked.push(id);
    spent += chartNodeCost(id);
  }
  return picked;
};

describe("a confluence node is worth what its partner is worth", () => {
  const confluences = CHART_NODES.filter((n) => n.kind === "confluence");

  it("gives every one of the fourteen a partner and a ladder", () => {
    expect(confluences).toHaveLength(14);
    for (const node of confluences) {
      expect(node.scaledBy, node.id).toBeDefined();
      expect(node.scaledBy?.per, node.id).toBe(5);
      expect(node.scaledBy?.max, node.id).toBe(25);
      expect(node.scaledBy?.school, node.id).not.toBe(node.constellation);
    }
  });

  it("counts one step per five partner points and stops at five", () => {
    for (const node of confluences) {
      const partner = node.scaledBy?.school;
      expect(partner, node.id).toBeDefined();
      if (partner === undefined) continue;
      expect(confluenceSteps([node.id], node)).toBe(0);
      expect(confluenceSteps([node.id, ...upTo(partner, 5)], node)).toBe(1);
      expect(confluenceSteps([node.id, ...upTo(partner, 15)], node)).toBe(3);
      expect(confluenceSteps([node.id, ...branch(partner)], node)).toBe(5);
    }
  });

  it("pays nothing at all with a cold partner", () => {
    for (const node of confluences) {
      const mods = computeChartMods([node.id]);
      for (const value of Object.values(mods)) expect(value).toBe(0);
      expect(chartEffectsOf([node.id], node.id)).toEqual([]);
    }
  });

  it("multiplies its authored numbers, and only its magnitudes", () => {
    const node = CHART_NODE_BY_ID.get("blue-c1");
    expect(node?.scaledBy?.school).toBe("red");
    const authored = node?.effects?.[0];
    expect(authored).toBeDefined();
    if (authored === undefined) return;

    const picks = ["blue-c1", ...branch("red")];
    const scaled = chartEffectsOf(picks, "blue-c1")[0];
    expect(scaled).toBeDefined();
    if (scaled === undefined) return;
    expect(scaled.on).toBe(authored.on);
    expect(scaled.if).toEqual(authored.if);
    const before = authored.do[0];
    const after = scaled.do[0];
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    if (before === undefined || after === undefined) return;
    expect(after.a).toBe(before.a);
    if ("n" in before && "n" in after) {
      expect(typeof before.n).toBe("number");
      if (typeof before.n === "number") expect(after.n).toBe(before.n * 5);
    }
  });

  it("reaches the battle through the ordinary effect source", () => {
    const picks = ["blue-c1", ...branch("red")];
    const effects = activeChartEffects(picks);
    const authored = CHART_NODE_BY_ID.get("blue-c1")?.effects?.[0];
    expect(authored).toBeDefined();
    if (authored === undefined) return;
    expect(effects).not.toContainEqual(authored);
    expect(effects.length).toBeGreaterThan(0);
  });
});

describe("the nexus ultimates are real nodes", () => {
  const nexus = CHART_NODES.filter((n) => n.kind === "nexus");

  it("gives every one of the seven a payload and two requirements", () => {
    expect(nexus).toHaveLength(7);
    for (const node of nexus) {
      const carries =
        (node.effects?.length ?? 0) > 0 ||
        node.mods !== undefined ||
        (node.traits?.length ?? 0) > 0;
      expect(carries, node.id).toBe(true);
      expect(Object.keys(node.requires?.pointsIn ?? {}), node.id).toHaveLength(
        2,
      );
      expect(chartNodeCost(node.id), node.id).toBe(6);
    }
  });

  it("links each one to both of its branches' third notable", () => {
    for (const node of nexus) {
      const schools = Object.keys(node.requires?.pointsIn ?? {});
      expect(node.links.sort()).toEqual(
        schools.map((s) => `${s}-not3`).sort(),
      );
    }
  });
});

describe("the mechanics the synergy nodes needed", () => {
  it("lets a school count as another for a condition", () => {
    const grey = CHART_NODE_BY_ID.get("nexus-black-grey");
    expect(grey?.traits).toContain("greyIsBlack");
  });

  it("adds a resonance count to the leading real school and not to prismatic", () => {
    const dice = [
      { school: "red" as const },
      { school: "red" as const },
      { school: "blue" as const },
    ];
    expect(computeCensus(dice).counts.red).toBe(2);
    expect(computeCensus(dice, 1, 2).counts.red).toBe(4);
    expect(computeCensus(dice, 1, 2).counts.blue).toBe(1);
    expect(computeCensus(dice, 1, 2).counts.prismatic).toBe(0);
    expect(computeCensus([], 1, 0).counts.red).toBe(0);
  });

  it("keeps the shield-carry mod out of the lower-is-better set", () => {
    const permafrost = CHART_NODE_BY_ID.get("blue-c2");
    expect(permafrost?.mods?.shieldKeepPct).toBeGreaterThan(0);
  });

  it("turns every third grey die prismatic through one counter", () => {
    const facet = CHART_NODE_BY_ID.get("nexus-grey-prismatic");
    expect(facet?.effects).toHaveLength(2);
    const [count, turn] = facet?.effects ?? [];
    expect(count?.on).toBe("place");
    expect(turn?.do.some((a) => a.a === "setDieSchool")).toBe(true);
    expect(
      turn?.do.some((a) => a.a === "counter" && a.delta === -3),
    ).toBe(true);
  });

  it("splashes the first weapon hit of a turn onto the other enemies", () => {
    const nova = CHART_NODE_BY_ID.get("nexus-prismatic-red");
    const splash = nova?.effects?.[0]?.do[0];
    expect(splash?.a).toBe("dmg");
    if (splash?.a === "dmg") expect(splash.target).toBe("others");
  });
});

describe("the eight keystones keep their identity and gain a clause", () => {
  const keystones = CHART_NODES.filter((n) => n.kind === "keystone");

  it("still carries every warp DESIGN names", () => {
    const traits = keystones.flatMap((k) => k.traits ?? []);
    for (const warp of [
      "coldLogic",
      "obsidianPact",
      "singleCast",
      "fateTwice",
      "prismDouble",
    ]) {
      expect(traits, warp).toContain(warp);
    }
  });

  it("prices every keystone at six and gates it on forty-five", () => {
    for (const node of keystones) {
      expect(chartNodeCost(node.id), node.id).toBe(6);
      expect(
        node.requires?.pointsIn[node.constellation as School],
        node.id,
      ).toBe(45);
    }
  });

  it("keeps each drawback a drawback rather than hiding it", () => {
    const overgrowth = CHART_NODE_BY_ID.get("green-key1");
    expect(overgrowth?.mods?.hullMaxPct).toBeLessThan(0);
    const fate = CHART_NODE_BY_ID.get("prismatic-key1");
    expect(fate?.mods?.hullMaxPct).toBeLessThan(0);
    const cascade = CHART_NODE_BY_ID.get("prismatic-key2");
    expect(cascade?.budgetDelta).toBeLessThan(0);
    const doctrine = CHART_NODE_BY_ID.get("blue-key1");
    expect(doctrine?.slotTierDelta?.engines).toBeLessThan(0);
  });
});
