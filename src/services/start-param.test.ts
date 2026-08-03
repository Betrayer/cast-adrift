import { describe, expect, it } from "vitest";
import { startTargetFor } from "@/services/start-param";

describe("telegram start param routing", () => {
  it("deep-opens the daily card", () => {
    expect(startTargetFor("daily")).toEqual({
      screen: "modes",
      params: { focus: "daily" },
    });
  });

  it("routes /play to the modes screen", () => {
    expect(startTargetFor("play")).toEqual({ screen: "modes" });
  });

  it("is case and whitespace tolerant", () => {
    expect(startTargetFor("  Daily ")).toEqual({
      screen: "modes",
      params: { focus: "daily" },
    });
  });

  it("ignores an unknown or absent param instead of guessing", () => {
    expect(startTargetFor("nonsense")).toBeNull();
    expect(startTargetFor("")).toBeNull();
    expect(startTargetFor(null)).toBeNull();
  });
});
