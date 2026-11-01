import { describe, expect, it } from "vitest";
import { CHART_NODE_BY_ID } from "@/data/chart";
import { chartRequirementLines, type Translate } from "@/game/chart/describe";

const t: Translate = (key, opts) => `${key} ${JSON.stringify(opts ?? {})}`;

describe("chart requirement lines", () => {
  it("names the unmet branch depth a keystone waits on", () => {
    const node = CHART_NODE_BY_ID.get("red-key1");
    expect(node).toBeDefined();
    if (node === undefined) return;
    const lines = chartRequirementLines(node, ["hub-i0"], t);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("meta:chart.requiresPoints");
    expect(lines[0]).toContain(`"n":${String(node.requires?.pointsIn.red)}`);
  });

  it("reports a confluence node's steps and invested points", () => {
    const node = CHART_NODE_BY_ID.get("red-c1");
    expect(node).toBeDefined();
    if (node === undefined) return;
    const lines = chartRequirementLines(node, ["hub-i0"], t);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("meta:chart.scaledBy");
    expect(lines[0]).toContain('"steps":0');
    expect(lines[0]).toContain('"points":0');
  });
});
