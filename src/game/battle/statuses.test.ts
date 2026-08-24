import { describe, expect, it } from "vitest";
import {
  applyStatus,
  clearMark,
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
    expect(statuses).toEqual({ mark: 2, jam: 1, charge: 1 });
  });

  it("mark carries a magnitude and keeps the larger one", () => {
    const statuses: Statuses = {};
    applyStatus(statuses, "mark", 3);
    expect(statuses.mark).toBe(3);
    applyStatus(statuses, "mark", 1);
    expect(statuses.mark).toBe(3);
    applyStatus(statuses, "mark", 5);
    expect(statuses.mark).toBe(5);
  });
});

describe("consumeStatus", () => {
  it("returns true once and removes the flag", () => {
    const statuses: Statuses = { jam: 1 };
    expect(consumeStatus(statuses, "jam")).toBe(true);
    expect(statuses.jam).toBeUndefined();
    expect(consumeStatus(statuses, "jam")).toBe(false);
  });
});

describe("clearMark", () => {
  it("drops the vulnerability outright", () => {
    const statuses: Statuses = { mark: 4, burn: 2 };
    clearMark(statuses);
    expect(statuses).toEqual({ burn: 2 });
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
