import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, tokens } from "@/app/theme";
import { CHART_NODE_BY_ID } from "@/data/chart";
import type { ChartNodeDef, ChartNodeKind } from "@/data/chart";
import { SCHOOL_IDS, schools } from "@/data/schools";
import { DEFAULT_THEME_ID, THEMES } from "@/data/themes";
import {
  backdropPalette,
  constellationColor,
  labelBelow,
  nodeStrokeWidth,
} from "@/screens/Chart/chartPresentation";

const nodeById = (id: string): ChartNodeDef => {
  const node = CHART_NODE_BY_ID.get(id);
  if (node === undefined) throw new Error(`missing chart node ${id}`);
  return node;
};

describe("constellation colours", () => {
  afterEach(() => {
    applyTheme(DEFAULT_THEME_ID);
  });

  it("follows a theme chosen after the chart module loaded", () => {
    const before = constellationColor("hub").stroke;
    applyTheme("terminal");
    expect(tokens.accent).not.toBe(before);
    expect(constellationColor("hub").stroke).toBe(tokens.accent);
    expect(constellationColor("nexus").stroke).toBe(tokens.amber);
    expect(constellationColor("red").stroke).toBe(schools.red.stroke);
  });

  it("keeps the hub and nexus fills fixed", () => {
    expect(constellationColor("hub").fill).toBe("#1E2340");
    expect(constellationColor("nexus").fill).toBe("#2A2413");
    expect(constellationColor("blue").fill).toBe(schools.blue.fill);
  });

  it("paints a school in its own stroke and fill", () => {
    expect(constellationColor("hub").stroke).toBe(tokens.accent);
    expect(constellationColor("nexus").stroke).toBe(tokens.amber);
    expect(constellationColor("red")).toEqual({
      stroke: schools.red.stroke,
      fill: schools.red.fill,
    });
  });
});

describe("backdrop palette", () => {
  afterEach(() => {
    applyTheme(DEFAULT_THEME_ID);
  });

  it("paints every theme in the colours the theme engine writes for it", () => {
    for (const theme of THEMES) {
      applyTheme(theme.id);
      const palette = backdropPalette(theme.id);
      expect(palette.core).toBe(tokens.accent);
      for (const id of SCHOOL_IDS) {
        expect(palette.schools[id]).toBe(schools[id].stroke);
      }
    }
  });

  it("gives a tinted theme a backdrop of its own", () => {
    const base = backdropPalette(DEFAULT_THEME_ID);
    const terminal = backdropPalette("terminal");
    expect(terminal.core).not.toBe(base.core);
    expect(terminal.schools.red).not.toBe(base.schools.red);
  });
});

describe("node labels", () => {
  it("puts prismatic's first keystone label above and its second below", () => {
    expect(labelBelow(nodeById("prismatic-key1"))).toBe(false);
    expect(labelBelow(nodeById("prismatic-key2"))).toBe(true);
  });
});

describe("node stroke width", () => {
  const expected: Readonly<Record<ChartNodeKind, number>> = {
    keystone: 2,
    nexus: 3,
    notable: 3,
    confluence: 2.5,
    gate: 1.5,
    small: 1.5,
  };

  it("follows the kind table when not highlighted", () => {
    for (const [kind, width] of Object.entries(expected)) {
      expect(nodeStrokeWidth(kind as ChartNodeKind, false)).toBe(width);
    }
  });

  it("is 3 for every kind when highlighted", () => {
    for (const kind of Object.keys(expected)) {
      expect(nodeStrokeWidth(kind as ChartNodeKind, true)).toBe(3);
    }
  });
});
