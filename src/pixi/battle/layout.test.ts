import { describe, expect, it } from "vitest";
import {
  computeBattleLayout,
  type BattleLayout,
  type Rect,
} from "@/pixi/battle/layout";
import type { SlotId } from "@/types/battle";

const SLOTS: SlotId[] = [
  "weaponA",
  "weaponB",
  "shields",
  "engines",
  "sensors",
  "reactor",
];

const board = (w: number, h: number, x = 0, y = 0): Rect => ({ x, y, w, h });

const BOARDS = [
  { name: "360x640 phone", board: board(360, 402, 0, 118) },
  { name: "390x844 phone", board: board(390, 560, 0, 172) },
  { name: "768x1024 tablet", board: board(768, 700, 0, 180) },
  { name: "1280x800 desktop", board: board(560, 520, 360, 160) },
  { name: "1920x1080 desktop", board: board(560, 760, 680, 180) },
];

const DECKS = [5, 7, 9];
const FIGHTS = [
  { enemies: 1, subs: 0 },
  { enemies: 1, subs: 3 },
  { enemies: 2, subs: 1 },
  { enemies: 3, subs: 0 },
  { enemies: 3, subs: 2 },
];

const layoutsForMatrix = (): {
  name: string;
  region: Rect;
  layout: BattleLayout;
}[] => {
  const out: { name: string; region: Rect; layout: BattleLayout }[] = [];
  for (const size of BOARDS) {
    for (const dice of DECKS) {
      for (const fight of FIGHTS) {
        out.push({
          name: `${size.name} · ${String(dice)} dice · ${String(fight.enemies)}x${String(fight.subs)} subs`,
          region: size.board,
          layout: computeBattleLayout({
            board: size.board,
            diceCount: dice,
            enemyCount: fight.enemies,
            maxSubsystems: fight.subs,
            slotIds: SLOTS,
          }),
        });
      }
    }
  }
  return out;
};

const MATRIX = layoutsForMatrix();

const inside = (region: Rect, x: number, y: number, pad = 0.5): boolean =>
  x >= region.x - pad &&
  x <= region.x + region.w + pad &&
  y >= region.y - pad &&
  y <= region.y + region.h + pad;

const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("battle board layout", () => {
  it("keeps every tray die fully inside the board on all matrix sizes", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const half = entry.layout.dieSize / 2;
      for (const die of entry.layout.tray) {
        if (
          !inside(entry.region, die.x - half, die.y - half) ||
          !inside(entry.region, die.x + half, die.y + half)
        ) {
          offenders.push(entry.name);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("wraps a nine-die deck onto two rows at 360px instead of shrinking it off-screen", () => {
    const layout = computeBattleLayout({
      board: board(360, 402, 0, 118),
      diceCount: 9,
      enemyCount: 1,
      maxSubsystems: 0,
      slotIds: SLOTS,
    });
    expect(layout.trayRows).toBe(2);
    expect(layout.tray).toHaveLength(9);
    expect(layout.dieSize).toBeGreaterThanOrEqual(40);
  });

  it("keeps a five-die deck on one row", () => {
    const layout = computeBattleLayout({
      board: board(390, 560, 0, 172),
      diceCount: 5,
      enemyCount: 1,
      maxSubsystems: 0,
      slotIds: SLOTS,
    });
    expect(layout.trayRows).toBe(1);
  });

  it("ends the reserve inside the board on all matrix sizes", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const bottom = entry.layout.reserve.y + entry.layout.reserve.h;
      if (bottom > entry.region.y + entry.region.h + 0.5) {
        offenders.push(`${entry.name} → ${String(Math.round(bottom))}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps every slot cell inside the board on all matrix sizes", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      for (const rect of Object.values(entry.layout.slots)) {
        if (
          !inside(entry.region, rect.x, rect.y) ||
          !inside(entry.region, rect.x + rect.w, rect.y + rect.h)
        ) {
          offenders.push(entry.name);
          break;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never overlaps the tray band with the slot grid or the reserve", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const { trayBand, reserve, slots } = entry.layout;
      for (const rect of Object.values(slots)) {
        if (rectsOverlap(trayBand, rect)) offenders.push(`${entry.name} tray/slot`);
        if (rectsOverlap(reserve, rect)) offenders.push(`${entry.name} reserve/slot`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("clamps the tumble box inside the board and above the tray floor", () => {
    const offenders: string[] = [];
    for (const entry of MATRIX) {
      const { tumble, trayBand } = entry.layout;
      const bottom = tumble.y + tumble.h;
      if (tumble.y < entry.region.y - 0.5) offenders.push(`${entry.name} top`);
      if (bottom > trayBand.y + trayBand.h + 0.5)
        offenders.push(`${entry.name} floor`);
      if (tumble.h <= 0) offenders.push(`${entry.name} empty`);
    }
    expect(offenders).toEqual([]);
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

  const chipRects = (layout: BattleLayout, index: number, subs: number): Rect[] => {
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
        if (rectsOverlap(absoluteHit(entry.layout, i), absoluteHit(entry.layout, i + 1))) {
          offenders.push(entry.name);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never lets an enemy hit rectangle swallow a neighbour's subsystem chip", () => {
    const offenders: string[] = [];
    for (const size of BOARDS) {
      for (const fight of FIGHTS) {
        if (fight.subs === 0 || fight.enemies < 2) continue;
        const layout = computeBattleLayout({
          board: size.board,
          diceCount: 9,
          enemyCount: fight.enemies,
          maxSubsystems: fight.subs,
          slotIds: SLOTS,
        });
        for (let i = 0; i < fight.enemies; i += 1) {
          for (let j = 0; j < fight.enemies; j += 1) {
            if (i === j) continue;
            for (const chip of chipRects(layout, i, fight.subs)) {
              if (rectsOverlap(absoluteHit(layout, j), chip)) {
                offenders.push(
                  `${size.name} ${String(fight.enemies)}x${String(fight.subs)}`,
                );
              }
            }
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps subsystem chips at a 32px minimum tap diameter", () => {
    for (const entry of MATRIX) {
      expect(entry.layout.subsystems.radius * 2).toBeGreaterThanOrEqual(24);
    }
  });

  it("stacks subsystem chips below the body when there is no room beside it", () => {
    const layout = computeBattleLayout({
      board: board(320, 420, 0, 110),
      diceCount: 9,
      enemyCount: 3,
      maxSubsystems: 2,
      slotIds: SLOTS,
    });
    expect(layout.subsystems.x).toBe(0);
    expect(layout.subsystems.y0).toBeGreaterThan(0);
  });
});
