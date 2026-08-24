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
  ship: Rect | null;
  dieSize: number;
  trayRows: number;
  tray: Point[];
  trayBand: Rect;
  enemies: Point[];
  enemySize: number;
  enemyPitch: number;
  enemyHit: Rect;
  subsystems: SubsystemPlacement;
  tumble: Rect;
  playerHit: Point;
}

export interface BattleLayoutInput {
  enemyBand: Rect;
  trayBand: Rect;
  dockBand: Rect;
  shipBand?: Rect | null;
  diceCount: number;
  enemyCount: number;
  maxSubsystems: number;
}

const TRAY_GAP = 8;
const TRAY_MAX_ROWS = 3;
const DIE_TAPPABLE = 40;
const DIE_MAX = 56;
const DIE_FLOOR = 26;
const ENEMY_MIN = 30;
const ENEMY_MAX = 60;
const WIDE_BAND = 480;
const DIE_MAX_WIDE = 68;
const ENEMY_MAX_WIDE = 78;
const ENEMY_HIT_PAD = 6;
const RING_REACH = 0.72;
const ENEMY_GAP = 10;
const SUB_CHIP_GAP = 20;
const INTENT_HEADROOM = 16;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const dieCeilingFor = (bandWidth: number): number =>
  bandWidth >= WIDE_BAND ? DIE_MAX_WIDE : DIE_MAX;

export const enemyCeilingFor = (bandWidth: number): number =>
  bandWidth >= WIDE_BAND ? ENEMY_MAX_WIDE : ENEMY_MAX;

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
  const sideReach = enemySize * RING_REACH + SUB_CHIP_GAP + radius;
  const sideFits =
    subs === 0 || pitch >= sideReach + enemySize * RING_REACH + ENEMY_GAP;
  const subsystems: SubsystemPlacement = sideFits
    ? {
        x: enemySize * RING_REACH + SUB_CHIP_GAP,
        y0: -enemySize / 4,
        pitch: chipPitch,
        radius,
      }
    : {
        x: 0,
        y0: enemySize * RING_REACH + radius + 4,
        pitch: chipPitch,
        radius,
      };
  const lastChipY =
    subs === 0 ? 0 : subsystems.y0 + (subs - 1) * subsystems.pitch;
  const extentUp = enemySize * RING_REACH + INTENT_HEADROOM;
  const extentDown =
    subs === 0
      ? enemySize * RING_REACH
      : Math.max(enemySize * RING_REACH, lastChipY + radius);
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
  (availWidth - (perRow - 1) * TRAY_GAP) / perRow;

const trayRowsFor = (
  availWidth: number,
  availHeight: number,
  diceCount: number,
): number => {
  for (let rows = 1; rows <= TRAY_MAX_ROWS; rows += 1) {
    const perRow = Math.ceil(diceCount / rows);
    const byWidth = dieSizeFor(availWidth, perRow);
    const byHeight = (availHeight - (rows - 1) * TRAY_GAP) / rows;
    if (Math.min(byWidth, byHeight) >= DIE_TAPPABLE) return rows;
  }
  const byHeightRows = Math.max(
    1,
    Math.min(
      TRAY_MAX_ROWS,
      Math.floor((availHeight + TRAY_GAP) / (DIE_FLOOR + TRAY_GAP)),
    ),
  );
  return byHeightRows;
};

export const computeBattleLayout = (
  input: BattleLayoutInput,
): BattleLayout => {
  const diceCount = Math.max(input.diceCount, 1);
  const enemyCount = Math.max(input.enemyCount, 1);
  const subs = Math.max(input.maxSubsystems, 0);
  const { enemyBand, trayBand, dockBand } = input;
  const shipBand =
    input.shipBand !== undefined &&
    input.shipBand !== null &&
    input.shipBand.w > 0 &&
    input.shipBand.h > 0
      ? input.shipBand
      : null;

  const counts = rowCountsFor(
    diceCount,
    trayRowsFor(trayBand.w, trayBand.h, diceCount),
  );
  const rowsUsed = Math.max(1, counts.length);
  const widestRow = Math.max(1, ...counts);
  const dieSize = clamp(
    Math.min(
      dieSizeFor(trayBand.w, widestRow),
      (trayBand.h - (rowsUsed - 1) * TRAY_GAP) / rowsUsed,
    ),
    DIE_FLOOR,
    dieCeilingFor(trayBand.w),
  );

  const trayHeight = rowsUsed * dieSize + (rowsUsed - 1) * TRAY_GAP;
  const trayTop = trayBand.y + Math.max(0, (trayBand.h - trayHeight) / 2);
  const tray: Point[] = [];
  counts.forEach((count, row) => {
    const rowWidth = count * dieSize + (count - 1) * TRAY_GAP;
    const start = trayBand.x + (trayBand.w - rowWidth) / 2 + dieSize / 2;
    const centreY = trayTop + dieSize / 2 + row * (dieSize + TRAY_GAP);
    for (let i = 0; i < count; i += 1) {
      tray.push({ x: start + i * (dieSize + TRAY_GAP), y: centreY });
    }
  });

  const enemyPitch = enemyBand.w / (enemyCount + 1);
  const chipReach = subs > 0 ? SUB_CHIP_GAP + 18 : 0;
  let enemySize = clamp(
    enemyPitch - chipReach - ENEMY_GAP,
    ENEMY_MIN,
    enemyCeilingFor(enemyBand.w),
  );
  let block = enemyBlockFor(enemySize, subs, enemyPitch);
  if (block.height > enemyBand.h && block.height > 0) {
    enemySize = Math.max(16, enemySize * (enemyBand.h / block.height));
    block = enemyBlockFor(enemySize, subs, enemyPitch);
  }
  const enemyCenterY =
    enemyBand.y +
    Math.max(0, (enemyBand.h - block.height) / 2) +
    block.extentUp;

  const enemies: Point[] = Array.from({ length: enemyCount }, (_, i) => ({
    x: enemyBand.x + (enemyBand.w * (i + 1)) / (enemyCount + 1),
    y: enemyCenterY,
  }));

  const trayBottom = trayTop + trayHeight;
  const tumbleTop = Math.max(
    enemyCenterY + block.extentDown + 6,
    trayBottom - dieSize * 3.2,
  );

  return {
    ship: shipBand,
    dieSize,
    trayRows: rowsUsed,
    tray,
    trayBand: { x: trayBand.x, y: trayTop, w: trayBand.w, h: trayHeight },
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
      x: trayBand.x,
      y: Math.min(tumbleTop, trayBottom - dieSize),
      w: trayBand.w,
      h: Math.max(dieSize, trayBottom - Math.min(tumbleTop, trayBottom - dieSize)),
    },
    playerHit:
      shipBand === null
        ? {
            x: dockBand.x + dockBand.w / 2,
            y: dockBand.y + Math.min(28, dockBand.h / 2),
          }
        : { x: shipBand.x + shipBand.w / 2, y: shipBand.y + shipBand.h / 2 },
  };
};
