import { describe, expect, it } from "vitest";
import {
  applyStatus,
  consumeStatus,
  tickBurn,
  type Statuses,
} from "@/game/battle/statuses";

describe("applyStatus", () => {
  it("stacks burn additively", () => {
    const statuses: Statuses = {};
    applyStatus(statuses, "burn", 2);
    applyStatus(statuses, "burn", 3);
    expect(statuses.burn).toBe(5);
  });

  it("sets mark, jam and charge as flags", () => {
    const statuses: Statuses = {};
    applyStatus(statuses, "mark");
    applyStatus(statuses, "jam");
    applyStatus(statuses, "charge");
    applyStatus(statuses, "mark");
    expect(statuses).toEqual({ mark: 1, jam: 1, charge: 1 });
  });
});

describe("consumeStatus", () => {
  it("returns true once and removes the flag", () => {
    const statuses: Statuses = { mark: 1 };
    expect(consumeStatus(statuses, "mark")).toBe(true);
    expect(statuses.mark).toBeUndefined();
    expect(consumeStatus(statuses, "mark")).toBe(false);
  });
});

describe("tickBurn", () => {
  it("deals N then decays to N-1 until gone", () => {
    const statuses: Statuses = { burn: 3 };
    expect(tickBurn(statuses)).toBe(3);
    expect(statuses.burn).toBe(2);
    expect(tickBurn(statuses)).toBe(2);
    expect(statuses.burn).toBe(1);
    expect(tickBurn(statuses)).toBe(1);
    expect(statuses.burn).toBeUndefined();
    expect(tickBurn(statuses)).toBe(0);
  });
});
