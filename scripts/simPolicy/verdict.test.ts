import { describe, expect, it } from "vitest";
import { actRampSteps, chartLikeWithLike, economyFailureLines, halfParityPp, ladderOutOfBand } from "./verdict";

const SHARE_PCT = 8;

describe("the economy mode verdict", () => {
  it("says nothing when both bands hold", () => {
    expect(
      economyFailureLines({ envelopeRows: 0, cargoShareRows: 0 }, SHARE_PCT),
    ).toEqual([]);
  });

  it("names the cargo share band, not the scrap envelope", () => {
    const lines = economyFailureLines(
      { envelopeRows: 0, cargoShareRows: 8 },
      SHARE_PCT,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("cargo income share");
    expect(lines[0]).toContain("8 row(s)");
    expect(lines[0]).not.toContain("§9.3");
  });

  it("names the scrap envelope band on its own", () => {
    const lines = economyFailureLines(
      { envelopeRows: 3, cargoShareRows: 0 },
      SHARE_PCT,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("§9.3");
    expect(lines[0]).not.toContain("cargo");
  });

  it("reports both bands separately when both break", () => {
    const lines = economyFailureLines(
      { envelopeRows: 2, cargoShareRows: 5 },
      SHARE_PCT,
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("2 row(s)");
    expect(lines[1]).toContain("5 row(s)");
  });
});

const GAP_PP = 18;
const RISE_SE = 2;

describe("the act ramp read on the campaign's conditional clears", () => {
  it("passes a ramp whose steps stay inside the gap and never rise", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 597 },
        { entered: 597, cleared: 586 },
        { entered: 586, cleared: 477 },
        { entered: 477, cleared: 320 },
        { entered: 320, cleared: 192 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps.map((step) => step.cliff || step.rise)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(steps[0]?.gapPp).toBe(0);
  });

  it("flags a drop of more than 18 pp between adjacent acts as a cliff", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 540 },
        { entered: 540, cleared: 378 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.gapPp).toBeCloseTo(-20);
    expect(steps[1]?.cliff).toBe(true);
    expect(steps[1]?.rise).toBe(false);
  });

  it("lets a rise inside the sampling noise pass", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 588 },
        { entered: 588, cleared: 578 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.gapPp).toBeGreaterThan(0);
    expect(steps[1]?.rise).toBe(false);
  });

  it("flags a rise of more than 18 pp as a cliff as well", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 300 },
        { entered: 300, cleared: 290 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.cliff).toBe(true);
    expect(steps[1]?.rise).toBe(true);
  });

  it("reads the difference against the pooled standard error", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 540 },
        { entered: 540, cleared: 508 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.gapPp).toBeCloseTo(4.07, 2);
    expect(steps[1]?.sePp).toBeCloseTo(1.616, 2);
    expect(steps[1]?.rise).toBe(true);
    expect(actRampSteps([{ entered: 600, cleared: 540 }, { entered: 540, cleared: 508 }], GAP_PP, 3)[1]?.rise).toBe(false);
  });

  it("does not call a deathless act a rise on a handful of deaths before it", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 596 },
        { entered: 596, cleared: 596 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.rise).toBe(false);
  });

  it("reads no step into an act nobody entered", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 0 },
        { entered: 0, cleared: 0 },
        { entered: 0, cleared: 0 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps.map((step) => step.cliff || step.rise)).toEqual([false, false, false]);
    expect(steps.every((step) => Number.isFinite(step.sePp))).toBe(true);
  });

  it("flags an act easier than the one before beyond two standard errors", () => {
    const steps = actRampSteps(
      [
        { entered: 600, cleared: 420 },
        { entered: 420, cleared: 357 },
      ],
      GAP_PP,
      RISE_SE,
    );
    expect(steps[1]?.gapPp).toBeCloseTo(15);
    expect(steps[1]?.rise).toBe(true);
    expect(steps[1]?.cliff).toBe(false);
  });
});

describe("the ladder's checked cells", () => {
  const readings = [
    { sector: 3, winratePct: 74.6, target: 75 },
    { sector: 3, winratePct: 70.0, target: 76 },
    { sector: 4, winratePct: 40.0, target: 15 },
    { sector: 5, winratePct: 1.0, target: 10 },
    { sector: 6, winratePct: 50.0, target: null },
  ];

  it("counts an equipped cell more than the band away from its number", () => {
    expect(ladderOutOfBand(readings, 5, [])).toBe(3);
  });

  it("does not count the diagnostic acts", () => {
    expect(ladderOutOfBand(readings, 5, [4, 5])).toBe(1);
  });
});

describe("the chart mode verdict, like with like", () => {
  const archetypes = [
    { name: "mono-red", winrate: 0.835 },
    { name: "mono-blue", winrate: 0.792 },
    { name: "mono-green", winrate: 0.263 },
    { name: "mono-yellow", winrate: 0.17 },
    { name: "dual red+blue", winrate: 0.95 },
    { name: "spread red/blue+green", winrate: 0.99 },
    { name: "hub-heavy", winrate: 0.968 },
  ];

  it("reads the mono charts of the deck schools against each other and the multi-constellation charts against each other", () => {
    const groups = chartLikeWithLike(archetypes, ["red", "blue"]);
    expect(groups.monos).toEqual(["mono-red", "mono-blue"]);
    expect(groups.multis).toEqual(["dual red+blue", "spread red/blue+green", "hub-heavy"]);
    expect(groups.monoSpreadPp).toBeCloseTo(4.3, 5);
    expect(groups.multiSpreadPp).toBeCloseTo(4.0, 5);
    expect(groups.specialisingGapPp).toBeCloseTo(15.583, 2);
  });

  it("reads a half against the halves it is told to, not against every half", () => {
    const halves = [
      { name: "half-red", winrate: 0.11 },
      { name: "half-blue", winrate: 0.09 },
      { name: "half-green", winrate: 0.06 },
      { name: "half-yellow", winrate: 0.015 },
      { name: "half-black", winrate: 0.015 },
      { name: "half-grey", winrate: 0.023 },
      { name: "half-prismatic", winrate: 0.077 },
    ];
    expect(halfParityPp(halves, "blue", ["red"])).toBeCloseTo(-2.0, 5);
    expect(halfParityPp(halves, "blue", halves.map((row) => row.name.slice(5)))).toBeCloseTo(4.0, 5);
  });
});
