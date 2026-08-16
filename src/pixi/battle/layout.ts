import type { SlotId } from "@/types/battle";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SubsystemPlacement {
  x: number;
  y0: number;
  pitch: number;
  radius: number;
}

export interface BattleLayout {
  dieSize: number;
  slotDieSize: number;
  compactCells: boolean;
  trayRows: number;
  tray: Point[];
  trayBand: Rect;
  slots: Partial<Record<SlotId, Rect>>;
  reserve: Rect;
  enemies: Point[];
  enemySize: number;
  enemyPitch: number;
  enemyHit: Rect;
  subsystems: SubsystemPlacement;
  tumble: Rect;
  playerHit: Point;
}

export interface BattleLayoutInput {
  board: Rect;
  diceCount: number;
  enemyCount: number;
  maxSubsystems: number;
  slotIds: readonly SlotId[];
}

export const SLOT_GRID: Partial<Record<SlotId, { row: number; col: number }>> = {
  weaponA: { row: 0, col: 0 },
  weaponB: { row: 0, col: 1 },
  shieldsB: { row: 0, col: 1 },
  shields: { row: 1, col: 0 },
  engines: { row: 1, col: 1 },
  sensors: { row: 2, col: 0 },
  spinal: { row: 2, col: 0 },
  repairBay: { row: 2, col: 0 },
  reactor: { row: 2, col: 1 },
};

const MARGIN = 12;
const GAP = 10;
const TRAY_ROW_GAP = 8;
const TRAY_MAX_ROWS = 3;
const DIE_TAPPABLE = 40;
const DIE_MAX = 56;
const DIE_FLOOR = 30;
const ENEMY_MIN = 34;
const ENEMY_MAX = 56;
const ENEMY_HIT_PAD = 6;
const ENEMY_BAND_SHARE = 0.4;
const SUB_CHIP_GAP = 20;
const RESERVE_H = 46;
const RESERVE_MIN_H = 30;
const CELL_H_MAX = 56;
const CELL_H_EXPAND = 84;
const CELL_H_MIN = 32;
const CELL_COMPACT_H = 50;
const SURPLUS_ABOVE = 0.35;
const GRID_ROWS = 3;
const STACK_GAPS = 3 * GAP;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

interface EnemyBlock {
  extentUp: number;
  extentDown: number;
  height: number;
  subsystems: SubsystemPlacement;
}

const enemyBlockFor = (
  enemySize: number,
  subs: number,
  pitch: number,
): EnemyBlock => {
  const radius = clamp(enemySize * 0.34, 12, 18);
  const chipPitch = Math.max(2 * radius + 2, enemySize * 0.7);
  const sideReach = enemySize / 2 + SUB_CHIP_GAP + radius;
  const sideFits = subs === 0 || pitch >= sideReach + enemySize / 2 + GAP;
  const subsystems: SubsystemPlacement = sideFits
    ? {
        x: enemySize / 2 + SUB_CHIP_GAP,
        y0: -enemySize / 4,
        pitch: chipPitch,
        radius,
      }
    : {
        x: 0,
        y0: enemySize / 2 + radius + 4,
        pitch: chipPitch,
        radius,
      };
  const lastChipY =
    subs === 0 ? 0 : subsystems.y0 + (subs - 1) * subsystems.pitch;
  const extentUp = enemySize / 2;
  const extentDown =
    subs === 0
      ? enemySize / 2
      : Math.max(enemySize / 2, lastChipY + radius);
  return {
    extentUp,
    extentDown,
    height: extentUp + extentDown,
    subsystems,
  };
};

const rowCountsFor = (diceCount: number, rows: number): number[] => {
  const perRow = Math.ceil(diceCount / rows);
  const counts: number[] = [];
  let left = diceCount;
  for (let row = 0; row < rows; row += 1) {
    const take = Math.min(perRow, left);
    if (take > 0) counts.push(take);
    left -= take;
  }
  return counts;
};

const dieSizeFor = (availWidth: number, perRow: number): number =>
  (availWidth - (perRow - 1) * TRAY_ROW_GAP) / perRow;

const trayRowsFor = (availWidth: number, diceCount: number): number => {
  for (let rows = 1; rows <= TRAY_MAX_ROWS; rows += 1) {
    const perRow = Math.ceil(diceCount / rows);
    if (dieSizeFor(availWidth, perRow) >= DIE_TAPPABLE) return rows;
  }
  return TRAY_MAX_ROWS;
};

export const computeBattleLayout = (
  input: BattleLayoutInput,
): BattleLayout => {
  const { board } = input;
  const diceCount = Math.max(input.diceCount, 1);
  const enemyCount = Math.max(input.enemyCount, 1);
  const subs = Math.max(input.maxSubsystems, 0);

  const availW = Math.max(120, board.w - 2 * MARGIN);
  const left = board.x + MARGIN;
  const availH = Math.max(160, board.h - 2 * MARGIN);

  const counts = rowCountsFor(diceCount, trayRowsFor(availW, diceCount));
  const rowsUsed = counts.length;
  const widestRow = Math.max(...counts);
  const dieByWidth = clamp(dieSizeFor(availW, widestRow), DIE_FLOOR, DIE_MAX);

  const naturalTrayH = rowsUsed * dieByWidth + (rowsUsed - 1) * TRAY_ROW_GAP;
  const minTrayH = rowsUsed * DIE_FLOOR + (rowsUsed - 1) * TRAY_ROW_GAP;
  const naturalGridH = GRID_ROWS * CELL_H_MAX + (GRID_ROWS - 1) * GAP;
  const minGridH = GRID_ROWS * CELL_H_MIN + (GRID_ROWS - 1) * GAP;

  const enemyPitch = availW / (enemyCount + 1);
  const chipReach = subs > 0 ? SUB_CHIP_GAP + 18 : 0;
  let enemySize = clamp(enemyPitch - chipReach - GAP, ENEMY_MIN, ENEMY_MAX);
  let block = enemyBlockFor(enemySize, subs, enemyPitch);
  const minRest = minGridH + minTrayH + RESERVE_MIN_H + STACK_GAPS;
  const minEnemyH = enemyBlockFor(ENEMY_MIN, subs, enemyPitch).height;
  const enemyBudget = Math.max(
    minEnemyH,
    Math.min(block.height, availH - minRest, availH * ENEMY_BAND_SHARE),
  );
  if (block.height > enemyBudget) {
    enemySize = Math.max(16, enemySize * (enemyBudget / block.height));
    block = enemyBlockFor(enemySize, subs, enemyPitch);
  }

  const room = Math.max(60, availH - block.height - STACK_GAPS);
  let deficit = naturalGridH + naturalTrayH + RESERVE_H - room;
  const shrink = (value: number, min: number): number => {
    if (deficit <= 0) return value;
    const take = Math.min(deficit, Math.max(0, value - min));
    deficit -= take;
    return value - take;
  };

  let gridH = shrink(naturalGridH, minGridH);
  let reserveH = shrink(RESERVE_H, RESERVE_MIN_H);
  let trayH = shrink(naturalTrayH, minTrayH);
  if (deficit > 0) {
    const k = room / (gridH + trayH + reserveH);
    gridH *= k;
    trayH *= k;
    reserveH *= k;
  } else {
    gridH = Math.min(
      gridH - deficit,
      GRID_ROWS * CELL_H_EXPAND + (GRID_ROWS - 1) * GAP,
    );
  }

  const dieSize = clamp(
    (trayH - (rowsUsed - 1) * TRAY_ROW_GAP) / rowsUsed,
    4,
    dieByWidth,
  );

  const stackH = block.height + trayH + gridH + reserveH + 3 * GAP;
  let y = board.y + MARGIN + Math.max(0, availH - stackH) * SURPLUS_ABOVE;
  const enemyCenterY = y + block.extentUp;
  y += block.height + GAP;
  const trayTop = y;
  y += trayH + GAP;
  const gridTop = y;
  y += gridH + GAP;
  const reserveTop = y;

  const tray: Point[] = [];
  counts.forEach((count, row) => {
    const rowWidth = count * dieSize + (count - 1) * TRAY_ROW_GAP;
    const start = left + (availW - rowWidth) / 2 + dieSize / 2;
    const centreY = trayTop + dieSize / 2 + row * (dieSize + TRAY_ROW_GAP);
    for (let i = 0; i < count; i += 1) {
      tray.push({ x: start + i * (dieSize + TRAY_ROW_GAP), y: centreY });
    }
  });

  const cellW = (availW - GAP) / 2;
  const cellH = (gridH - (GRID_ROWS - 1) * GAP) / GRID_ROWS;
  const slots: Partial<Record<SlotId, Rect>> = {};
  for (const slotId of input.slotIds) {
    const pos = SLOT_GRID[slotId];
    if (pos === undefined) continue;
    slots[slotId] = {
      x: left + pos.col * (cellW + GAP),
      y: gridTop + pos.row * (cellH + GAP),
      w: cellW,
      h: cellH,
    };
  }

  const enemies: Point[] = Array.from({ length: enemyCount }, (_, i) => ({
    x: left + (availW * (i + 1)) / (enemyCount + 1),
    y: enemyCenterY,
  }));

  const trayBottom = trayTop + trayH;
  const tumbleTop = Math.max(
    board.y + 4,
    Math.min(enemyCenterY + block.extentDown + 4, trayBottom - dieSize * 2.4),
  );

  return {
    dieSize,
    slotDieSize: clamp(Math.min(dieSize, cellH - 10, cellW * 0.42), 22, DIE_MAX),
    compactCells: cellH < CELL_COMPACT_H,
    trayRows: rowsUsed,
    tray,
    trayBand: { x: left, y: trayTop, w: availW, h: trayH },
    slots,
    reserve: { x: left, y: reserveTop, w: cellW, h: reserveH },
    enemies,
    enemySize,
    enemyPitch,
    enemyHit: {
      x: -enemySize / 2 - ENEMY_HIT_PAD,
      y: -enemySize / 2 - ENEMY_HIT_PAD,
      w: enemySize + 2 * ENEMY_HIT_PAD,
      h: enemySize + 2 * ENEMY_HIT_PAD,
    },
    subsystems: block.subsystems,
    tumble: {
      x: left,
      y: tumbleTop,
      w: availW,
      h: trayBottom - tumbleTop,
    },
    playerHit: {
      x: board.x + board.w / 2,
      y: reserveTop + reserveH / 2,
    },
  };
};
