import { afterEach, describe, expect, it, vi } from "vitest";
import { bandInsets, publishEnemyNeed, type BodyRect } from "@/app/bands";

const PHONE = { w: 390, h: 844 };

const battleBody: BodyRect = { x: 0, y: 172, w: 390, h: 528 };

describe("band insets", () => {
  it("reads back the header and footer heights the shell measured", () => {
    const insets = bandInsets(battleBody, PHONE.w, PHONE.h);
    expect(insets.top).toBe(172);
    expect(insets.bottom).toBe(844 - 700);
    expect(insets.left).toBe(0);
    expect(insets.right).toBe(0);
  });

  it("reports the gutters of a centred desktop column", () => {
    const insets = bandInsets({ x: 660, y: 24, w: 560, h: 1000 }, 1920, 1080);
    expect(insets.left).toBe(660);
    expect(insets.right).toBe(1920 - 660 - 560);
  });

  it("never reports a negative inset when a band overflows the viewport", () => {
    const insets = bandInsets({ x: -10, y: -8, w: 420, h: 900 }, 390, 844);
    expect(insets.top).toBe(0);
    expect(insets.bottom).toBe(0);
    expect(insets.left).toBe(0);
    expect(insets.right).toBe(0);
  });
});

describe("toast host geometry", () => {
  const toastRect = (
    body: BodyRect,
    toastHeight: number,
    gap: number,
  ): { top: number; bottom: number } => {
    const insets = bandInsets(body, PHONE.w, PHONE.h);
    const bottom = PHONE.h - insets.bottom - gap;
    return { top: bottom - toastHeight, bottom };
  };

  it("keeps a bottom toast above the footer band that owns End Turn", () => {
    const footerTop = battleBody.y + battleBody.h;
    const toast = toastRect(battleBody, 40, 8);
    expect(toast.bottom).toBeLessThanOrEqual(footerTop);
  });

  it("moves with the footer when the footer grows", () => {
    const taller: BodyRect = { x: 0, y: 172, w: 390, h: 428 };
    const toast = toastRect(taller, 40, 8);
    expect(toast.bottom).toBeLessThanOrEqual(taller.y + taller.h);
    expect(toast.bottom).toBeLessThan(toastRect(battleBody, 40, 8).bottom);
  });
});

describe("publishEnemyNeed", () => {
  const stubRootStyle = (): { writes: string[]; values: Map<string, string> } => {
    const writes: string[] = [];
    const values = new Map<string, string>();
    vi.stubGlobal("document", {
      documentElement: {
        style: {
          getPropertyValue: (name: string): string => values.get(name) ?? "",
          setProperty: (name: string, value: string): void => {
            writes.push(`set ${name} ${value}`);
            values.set(name, value);
          },
          removeProperty: (name: string): string => {
            writes.push(`remove ${name}`);
            const previous = values.get(name) ?? "";
            values.delete(name);
            return previous;
          },
        },
      },
    });
    return { writes, values };
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes --ca-enemy-need once per distinct value and removes it on null", () => {
    const { writes, values } = stubRootStyle();
    publishEnemyNeed(null);
    publishEnemyNeed(102.4);
    publishEnemyNeed(102.4);
    publishEnemyNeed(102.43);
    expect(values.get("--ca-enemy-need")).toBe("102.4px");
    publishEnemyNeed(146.2);
    expect(values.get("--ca-enemy-need")).toBe("146.2px");
    publishEnemyNeed(null);
    publishEnemyNeed(null);
    expect(values.has("--ca-enemy-need")).toBe(false);
    expect(writes).toEqual([
      "set --ca-enemy-need 102.4px",
      "set --ca-enemy-need 146.2px",
      "remove --ca-enemy-need",
    ]);
  });

  it("rounds to a tenth of a pixel", () => {
    const { values } = stubRootStyle();
    publishEnemyNeed(128.32);
    expect(values.get("--ca-enemy-need")).toBe("128.3px");
    publishEnemyNeed(146.25);
    expect(values.get("--ca-enemy-need")).toBe("146.3px");
  });

  it("does nothing without a document", () => {
    expect(() => {
      publishEnemyNeed(102.4);
    }).not.toThrow();
  });
});
