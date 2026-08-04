import { describe, expect, it } from "vitest";
import { bandInsets, type BodyRect } from "@/app/bands";

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
