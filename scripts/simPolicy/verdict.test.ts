import { describe, expect, it } from "vitest";
import { economyFailureLines } from "./verdict";

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
