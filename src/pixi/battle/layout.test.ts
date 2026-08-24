import { describe, expect, it } from "vitest";
import {
  computeBattleLayout,
  dieCeilingFor,
  enemyCeilingFor,
  type BattleLayout,
  type BattleLayoutInput,
  type Rect,
} from "@/pixi/battle/layout";

const band = (x: number, y: number, w: number, h: number): Rect => ({
  x,
  y,
  w,
  h,
});

interface Frame {
  name: string;
  enemyBand: Rect;
  trayBand: Rect;
  dockBand: Rect;
}

const frameFor = (
  name: string,
  width: number,
  top: number,
  height: number,
): Frame => {
  const pad = 12;
  const inner = width - pad * 2;
  const dockH = Math.min(190, height * 0.42);
  const rest = height - dockH;
  const enemyH = rest * 0.55;
  return {
    name,
    enemyBand: band(pad, top, inner, enemyH),
    trayBand: band(pad, top + enemyH, inner, rest - enemyH),
    dockBand: band(pad, top + rest, inner, dockH),
  };
};

const FRAMES: readonly Frame[] = [
  frameFor("360x640 phone", 360, 118, 402),
  frameFor("390x844 phone", 390, 172, 560),
  frameFor("768x1024 tablet", 768, 180, 700),
  frameFor("1280x800 desktop", 560, 160, 520),
  frameFor("1920x1080 desktop", 560, 180, 760),
];

const DECKS = [5, 7, 9];
const FIGHTS = [
  { enemies: 1, subs: 0 },
  { enemies: 1, subs: 3 },
  { enemies: 2, subs: 1 },
  { enemies: 3, subs: 0 },
  { enemies: 3, subs: 2 },
];

const inputFor = (frame: Frame, dice: number, fight: (typeof FIGHTS)[number]): BattleLayoutInput => ({
  enemyBand: frame.enemyBand,
  trayBand: frame.trayBand,
  dockBand: frame.dockBand,
  diceCount: dice,
  enemyCount: fight.enemies,
  maxSubsystems: fight.subs,
});

interface Entry {
  name: string;
  frame: Frame;
  layout: BattleLayout;
}

const MATRIX: Entry[] = FRAMES.flatMap((frame) =>
  DECKS.flatMap((dice) =>
    FIGHTS.map((fight) => ({
      name: `${frame.name} · ${String(dice)} dice · ${String(fight.enemies)}x${String(fight.subs)} subs`,
      frame,
      layout: computeBattleLayout(inputFor(frame, dice, fight)),
    })),
  ),
);

const inside = (region: Rect, x: number, y: number, pad = 0.5): boolean =>
  x >= region.x - pad &&
  x <= region.x + region.w + pad &&
  y >= region.y - pad &&
  y <= region.y + region.h + pad;

const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("battle band layout", () => {
  it("keeps every tray die inside the tray band on all matrix sizes", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const half = entry.layout.dieSize / 2;
      for (const die of entry.layout.tray) {
        if (
          !inside(entry.frame.trayBand, die.x - half, die.y - half) ||
          !inside(entry.frame.trayBand, die.x + half, die.y + half)
        ) {
          offenders.push(entry.name);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("lays out one anchor per die", () => {
    for (const frame of FRAMES) {
      for (const dice of DECKS) {
        const layout = computeBattleLayout(inputFor(frame, dice, FIGHTS[0] ?? { enemies: 1, subs: 0 }));
        expect(layout.tray).toHaveLength(dice);
      }
    }
  });

  it("wraps a nine-die deck onto two rows at 360px instead of shrinking it off-screen", () => {
    const frame = FRAMES[0];
    expect(frame).toBeDefined();
    if (frame === undefined) return;
    const layout = computeBattleLayout(
      inputFor(frame, 9, { enemies: 1, subs: 0 }),
    );
    expect(layout.trayRows).toBe(2);
    expect(layout.dieSize).toBeGreaterThanOrEqual(40);
  });

  it("spends a desktop-wide band on bigger dice and a bigger enemy", () => {
    const phone = frameFor("phone", 390, 172, 560);
    const desktop = frameFor("desktop", 584, 172, 560);
    const fight = { enemies: 1, subs: 0 };
    const small = computeBattleLayout(inputFor(phone, 5, fight));
    const large = computeBattleLayout(inputFor(desktop, 5, fight));
    expect(dieCeilingFor(phone.trayBand.w)).toBeLessThan(
      dieCeilingFor(desktop.trayBand.w),
    );
    expect(enemyCeilingFor(phone.enemyBand.w)).toBeLessThan(
      enemyCeilingFor(desktop.enemyBand.w),
    );
    expect(large.dieSize).toBeGreaterThan(small.dieSize);
    expect(large.enemySize).toBeGreaterThan(small.enemySize);
  });

  it("keeps a five-die deck on one row", () => {
    const frame = FRAMES[1];
    if (frame === undefined) return;
    const layout = computeBattleLayout(
      inputFor(frame, 5, { enemies: 1, subs: 0 }),
    );
    expect(layout.trayRows).toBe(1);
  });

  it("never lets the tray band leave the tray region", () => {
    for (const entry of MATRIX) {
      const { trayBand } = entry.layout;
      expect(
        inside(entry.frame.trayBand, trayBand.x, trayBand.y) &&
          inside(
            entry.frame.trayBand,
            trayBand.x + trayBand.w,
            trayBand.y + trayBand.h,
          ),
      ).toBe(true);
    }
  });

  it("keeps enemies inside the enemy band and out of the tray", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      for (const anchor of entry.layout.enemies) {
        const half = entry.layout.enemySize / 2;
        if (!inside(entry.frame.enemyBand, anchor.x - half, anchor.y - half, 1)) {
          offenders.push(`${entry.name} top`);
        }
        if (anchor.y + half > entry.frame.trayBand.y + 1) {
          offenders.push(`${entry.name} tray`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("clamps the tumble box to the tray floor", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const { tumble, trayBand } = entry.layout;
      const bottom = tumble.y + tumble.h;
      if (bottom > trayBand.y + trayBand.h + 0.5) {
        offenders.push(`${entry.name} floor`);
      }
      if (tumble.h <= 0) offenders.push(`${entry.name} empty`);
    }
    expect(offenders).toEqual([]);
  });

  it("puts the player hit point at the top of the dock", () => {
    for (const entry of MATRIX) {
      const { playerHit } = entry.layout;
      expect(inside(entry.frame.dockBand, playerHit.x, playerHit.y, 1)).toBe(
        true,
      );
    }
  });
});

describe("enemy hit geometry", () => {
  const absoluteHit = (layout: BattleLayout, index: number): Rect => {
    const anchor = layout.enemies[index];
    if (anchor === undefined) throw new Error("missing enemy anchor");
    return {
      x: anchor.x + layout.enemyHit.x,
      y: anchor.y + layout.enemyHit.y,
      w: layout.enemyHit.w,
      h: layout.enemyHit.h,
    };
  };

  const chipRects = (
    layout: BattleLayout,
    index: number,
    subs: number,
  ): Rect[] => {
    const anchor = layout.enemies[index];
    if (anchor === undefined) throw new Error("missing enemy anchor");
    const { subsystems } = layout;
    return Array.from({ length: subs }, (_, i) => ({
      x: anchor.x + subsystems.x - subsystems.radius,
      y: anchor.y + subsystems.y0 + i * subsystems.pitch - subsystems.radius,
      w: subsystems.radius * 2,
      h: subsystems.radius * 2,
    }));
  };

  it("never lets two enemy hit rectangles touch", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const count = entry.layout.enemies.length;
      for (let i = 0; i + 1 < count; i += 1) {
        if (
          rectsOverlap(
            absoluteHit(entry.layout, i),
            absoluteHit(entry.layout, i + 1),
          )
        ) {
          offenders.push(entry.name);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never lets an enemy hit rectangle swallow a neighbour's subsystem chip", () => {
    const offenders: string[] = [];
    for (const frame of FRAMES) {
      for (const fight of FIGHTS) {
        if (fight.subs === 0 || fight.enemies < 2) continue;
        const layout = computeBattleLayout(inputFor(frame, 9, fight));
        for (let i = 0; i < fight.enemies; i += 1) {
          for (let j = 0; j < fight.enemies; j += 1) {
            if (i === j) continue;
            for (const chip of chipRects(layout, i, fight.subs)) {
              if (rectsOverlap(absoluteHit(layout, j), chip)) {
                offenders.push(
                  `${frame.name} ${String(fight.enemies)}x${String(fight.subs)}`,
                );
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps subsystem chips at a 24px minimum tap diameter", () => {
    for (const entry of MATRIX) {
      expect(entry.layout.subsystems.radius * 2).toBeGreaterThanOrEqual(24);
    }
  });

  it("stacks subsystem chips below the body when there is no room beside it", () => {
    const layout = computeBattleLayout({
      enemyBand: band(12, 110, 252, 150),
      trayBand: band(12, 260, 252, 110),
      dockBand: band(12, 370, 252, 160),
      diceCount: 9,
      enemyCount: 3,
      maxSubsystems: 2,
    });
    expect(layout.subsystems.x).toBe(0);
    expect(layout.subsystems.y0).toBeGreaterThan(0);
  });
});
