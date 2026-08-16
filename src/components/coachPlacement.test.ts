import { describe, expect, it } from "vitest";
import { coachCardPlacement, type Bounds } from "@/components/coachPlacement";

const PHONE: Bounds = { top: 20, left: 12, right: 378, bottom: 820 };
const CARD = { w: 300, h: 148 };

describe("coach card placement", () => {
  it("sits under the anchor when there is room below", () => {
    const place = coachCardPlacement(
      { x: 100, y: 120, w: 80, h: 40 },
      CARD,
      PHONE,
    );
    expect(place.top).toBe(172);
  });

  it("flips above the anchor when the card would leave the safe area", () => {
    const place = coachCardPlacement(
      { x: 100, y: 700, w: 80, h: 40 },
      CARD,
      PHONE,
    );
    expect(place.top).toBe(700 - CARD.h - 12);
  });

  it("clamps inside the safe area when neither side fits", () => {
    const tight: Bounds = { top: 20, left: 12, right: 378, bottom: 200 };
    const place = coachCardPlacement(
      { x: 100, y: 60, w: 80, h: 40 },
      CARD,
      tight,
    );
    expect(place.top).toBeGreaterThanOrEqual(tight.top);
    expect(place.top + CARD.h).toBeLessThanOrEqual(tight.bottom + 0.001);
  });

  it("centres on the anchor and never crosses the side insets", () => {
    const centred = coachCardPlacement(
      { x: 150, y: 100, w: 80, h: 40 },
      CARD,
      PHONE,
    );
    expect(centred.left).toBe(150 + 40 - 150);

    const leftEdge = coachCardPlacement(
      { x: 0, y: 100, w: 40, h: 40 },
      CARD,
      PHONE,
    );
    expect(leftEdge.left).toBe(PHONE.left);

    const rightEdge = coachCardPlacement(
      { x: 360, y: 100, w: 40, h: 40 },
      CARD,
      PHONE,
    );
    expect(rightEdge.left + CARD.w).toBeLessThanOrEqual(PHONE.right + 0.001);
  });

  it("honours a taller card by moving it up, not by overflowing", () => {
    const tall = { w: 300, h: 320 };
    const place = coachCardPlacement(
      { x: 100, y: 560, w: 80, h: 40 },
      tall,
      PHONE,
    );
    expect(place.top + tall.h).toBeLessThanOrEqual(PHONE.bottom + 0.001);
  });
});
