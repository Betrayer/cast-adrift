import { describe, expect, it } from "vitest";
import { layoutVerdict } from "./verdict";

describe("layoutVerdict", () => {
  it("fails the run when one shot failed and counts it in the line", () => {
    const verdict = layoutVerdict([{ error: null }, { error: "Timeout 30000ms exceeded." }], 261, "out");
    expect(verdict.exitCode).toBe(1);
    expect(verdict.line).toContain("2 shots taken, 1 errors, 261 in the sidecar");
  });

  it("passes a clean run", () => {
    const verdict = layoutVerdict([{ error: null }, { error: null }], 2, "out");
    expect(verdict.exitCode).toBe(0);
    expect(verdict.line).toContain("0 errors");
  });

  it("passes an empty run, the --only typo the owner chose not to validate", () => {
    expect(layoutVerdict([], 0, "out").exitCode).toBe(0);
  });
});
