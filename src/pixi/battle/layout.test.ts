import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeBattleLayout,
  stageOrigin,
  toStageRect,
  dieCeilingFor,
  enemyBandNeed,
  enemyCeilingFor,
  ENEMY_MIN,
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
  { enemies: 3, subs: 3 },
];

const RING_REACH = 0.72;

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
  fight: (typeof FIGHTS)[number];
  layout: BattleLayout;
}

const MATRIX: Entry[] = FRAMES.flatMap((frame) =>
  DECKS.flatMap((dice) =>
    FIGHTS.map((fight) => ({
      name: `${frame.name} · ${String(dice)} dice · ${String(fight.enemies)}x${String(fight.subs)} subs`,
      frame,
      fight,
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

  it("fits a conglomerate of one body and three chips at 360x640", () => {
    const frame = FRAMES[0];
    expect(frame).toBeDefined();
    if (frame === undefined) return;
    const layout = computeBattleLayout(
      inputFor(frame, 9, { enemies: 1, subs: 3 }),
    );
    const anchor = layout.enemies[0];
    expect(anchor).toBeDefined();
    if (anchor === undefined) return;
    const { subsystems } = layout;
    const column = {
      top: anchor.y + subsystems.y0 - subsystems.radius,
      bottom: anchor.y + subsystems.y0 + 2 * subsystems.pitch + subsystems.radius,
      right: anchor.x + subsystems.x + subsystems.radius,
    };
    expect(column.top).toBeGreaterThanOrEqual(frame.enemyBand.y - 0.5);
    expect(column.bottom).toBeLessThanOrEqual(
      frame.enemyBand.y + frame.enemyBand.h + 0.5,
    );
    expect(column.right).toBeLessThanOrEqual(
      frame.enemyBand.x + frame.enemyBand.w + 0.5,
    );
    expect(column.bottom).toBeLessThanOrEqual(frame.trayBand.y + 0.5);
    expect(layout.enemySize).toBeGreaterThanOrEqual(ENEMY_MIN);
    expect(subsystems.radius * 2).toBeGreaterThanOrEqual(24);
  });

  it("keeps the subsystem column out of the dice tray on every matrix board", () => {
    const offenders: string[] = [];
    for (const frame of FRAMES) {
      for (const fight of FIGHTS) {
        if (fight.subs === 0) continue;
        for (const dice of DECKS) {
          const layout = computeBattleLayout(inputFor(frame, dice, fight));
          const anchor = layout.enemies[0];
          if (anchor === undefined) continue;
          const { subsystems } = layout;
          const bottom =
            anchor.y +
            subsystems.y0 +
            (fight.subs - 1) * subsystems.pitch +
            subsystems.radius;
          if (bottom > frame.trayBand.y + 0.5) {
            offenders.push(
              `${frame.name} ${String(fight.enemies)}x${String(fight.subs)} ${String(dice)} dice`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never lets a part-intent label reach a neighbour's hull ring", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      if (entry.layout.enemies.length < 2 || entry.fight.subs === 0) continue;
      const { subsystems, partLabel, enemyPitch, enemySize } = entry.layout;
      const labelRight = subsystems.x + partLabel.x + partLabel.reach;
      if (labelRight > enemyPitch - enemySize * RING_REACH + 0.5) {
        offenders.push(entry.name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps a solo body's label inside the enemy band", () => {
    for (const entry of MATRIX) {
      if (entry.layout.enemies.length !== 1 || entry.fight.subs === 0) continue;
      const anchor = entry.layout.enemies[0];
      if (anchor === undefined) continue;
      const { subsystems, partLabel } = entry.layout;
      const labelRight =
        anchor.x + subsystems.x + partLabel.x + partLabel.reach;
      expect(labelRight).toBeLessThanOrEqual(
        entry.frame.enemyBand.x + entry.frame.enemyBand.w + 0.5,
      );
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

describe("enemy band need", () => {
  const NEED_CASES = [
    { name: "two raiders at 390", width: 390, enemies: 2, subs: 0 },
    { name: "one body with three chips at 390", width: 390, enemies: 1, subs: 3 },
    { name: "two raiders at 560", width: 560, enemies: 2, subs: 0 },
    { name: "three bodies with two chips at 366", width: 366, enemies: 3, subs: 2 },
  ];

  const needFor = (width: number, enemies: number, subs: number): number =>
    enemyBandNeed({ bandWidth: width, enemyCount: enemies, maxSubsystems: subs });

  const layoutIn = (
    width: number,
    height: number,
    enemies: number,
    subs: number,
  ): BattleLayout =>
    computeBattleLayout({
      enemyBand: band(12, 172, width, height),
      trayBand: band(12, 172 + height, width, 80),
      dockBand: band(12, 252 + height, width, 190),
      diceCount: 7,
      enemyCount: enemies,
      maxSubsystems: subs,
    });

  it("gives 102.4 px for two raiders at 390", () => {
    expect(needFor(390, 2, 0)).toBeCloseTo(102.4, 1);
  });

  it("gives 146.2 px for one body with three chips at 390", () => {
    expect(needFor(390, 1, 3)).toBeCloseTo(146.2, 1);
  });

  it("gives 128.3 px for two raiders at 560", () => {
    expect(needFor(560, 2, 0)).toBeCloseTo(128.3, 1);
  });

  it("treats an empty fight as one enemy with no chips", () => {
    expect(needFor(390, 0, -1)).toBe(needFor(390, 1, 0));
  });

  it("keeps the unbounded enemy size and ends the chip column inside a band of exactly that height", () => {
    for (const fight of NEED_CASES) {
      const need = needFor(fight.width, fight.enemies, fight.subs);
      const unbounded = layoutIn(fight.width, 1000, fight.enemies, fight.subs);
      const fitted = layoutIn(fight.width, need, fight.enemies, fight.subs);
      expect(fitted.enemySize, fight.name).toBe(unbounded.enemySize);
      const anchor = fitted.enemies[0];
      expect(anchor, fight.name).toBeDefined();
      if (anchor === undefined) continue;
      const { subsystems, enemySize } = fitted;
      const bottom =
        fight.subs === 0
          ? anchor.y + enemySize * RING_REACH
          : anchor.y +
            subsystems.y0 +
            (fight.subs - 1) * subsystems.pitch +
            subsystems.radius;
      expect(bottom, fight.name).toBeLessThanOrEqual(172 + need + 0.5);
      expect(anchor.y - enemySize * RING_REACH, fight.name).toBeGreaterThanOrEqual(
        172 - 0.5,
      );
    }
  });

  it("is the least height that keeps the enemies at full size", () => {
    for (const fight of NEED_CASES) {
      const need = needFor(fight.width, fight.enemies, fight.subs);
      const unbounded = layoutIn(fight.width, 1000, fight.enemies, fight.subs);
      const short = layoutIn(fight.width, need - 1, fight.enemies, fight.subs);
      expect(unbounded.enemySize, fight.name).toBeGreaterThan(ENEMY_MIN);
      expect(short.enemySize, fight.name).toBeLessThan(unbounded.enemySize);
    }
  });
});

describe("stageOrigin", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("takes the canvas rect as it is, whatever the visual viewport is scrolled or pinched to", () => {
    vi.stubGlobal("visualViewport", { offsetLeft: 40, offsetTop: 120, pageLeft: 40, pageTop: 120, scale: 1.5 });
    expect(stageOrigin({ left: 12, top: 300 })).toEqual({ left: 12, top: 300 });
  });

  it("moves an anchor rect into stage space by the origin alone", () => {
    expect(toStageRect({ x: 50, y: 420, w: 64, h: 32 }, { left: 12, top: 300 })).toEqual({ x: 38, y: 120, w: 64, h: 32 });
  });
});
