import type { SlotId } from "@/types/battle";

export interface AnchorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnchorPoint {
  x: number;
  y: number;
}

export interface SlotAnchor {
  rect: AnchorRect;
  well: AnchorRect;
}

export type BoardRegion = "enemies" | "tray" | "dock" | "ship";

export interface DieAnchor {
  x: number;
  y: number;
  size: number;
}

export interface BattleAnchors {
  dice: (AnchorPoint & { uid: string; size: number })[];
  slots: (AnchorRect & { id: SlotId })[];
  reserve: AnchorRect;
  tray: AnchorRect;
}

const slots = new Map<SlotId, SlotAnchor>();
const regions = new Map<BoardRegion, AnchorRect>();
const listeners = new Set<() => void>();

let reserve: SlotAnchor | null = null;
let selection: DieAnchor | null = null;
let reserveWells: AnchorRect[] = [];
let battle: BattleAnchors | null = null;
let scheduled = false;

const sameRect = (a: AnchorRect | undefined, b: AnchorRect): boolean =>
  a !== undefined && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

const notify = (): void => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    for (const listener of [...listeners]) listener();
  });
};

export const subscribeAnchors = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const publishSlotAnchor = (
  id: SlotId,
  anchor: SlotAnchor | null,
): void => {
  if (anchor === null) {
    if (slots.delete(id)) notify();
    return;
  }
  const current = slots.get(id);
  if (sameRect(current?.rect, anchor.rect) && sameRect(current?.well, anchor.well)) {
    return;
  }
  slots.set(id, anchor);
  notify();
};

export const publishReserveAnchor = (
  anchor: SlotAnchor | null,
  wells: readonly AnchorRect[] = [],
): void => {
  if (anchor === null) {
    if (reserve !== null || reserveWells.length > 0) {
      reserve = null;
      reserveWells = [];
      notify();
    }
    return;
  }
  const stable =
    sameRect(reserve?.rect, anchor.rect) &&
    reserveWells.length === wells.length &&
    wells.every((well, i) => sameRect(reserveWells[i], well));
  if (stable) return;
  reserve = anchor;
  reserveWells = [...wells];
  notify();
};

export const publishSelectionAnchor = (anchor: DieAnchor | null): void => {
  if (anchor === null) {
    if (selection === null) return;
    selection = null;
    notify();
    return;
  }
  if (
    selection !== null &&
    selection.x === anchor.x &&
    selection.y === anchor.y &&
    selection.size === anchor.size
  ) {
    return;
  }
  selection = anchor;
  notify();
};

export const selectionAnchor = (): DieAnchor | null => selection;

export const publishRegion = (
  name: BoardRegion,
  rect: AnchorRect | null,
): void => {
  if (rect === null) {
    if (regions.delete(name)) notify();
    return;
  }
  if (sameRect(regions.get(name), rect)) return;
  regions.set(name, rect);
  notify();
};

export const slotAnchor = (id: SlotId): SlotAnchor | undefined => slots.get(id);

export const reserveAnchor = (): SlotAnchor | null => reserve;

export const reserveWellAt = (index: number): AnchorRect | undefined =>
  reserveWells[index] ?? reserveWells[reserveWells.length - 1];

export const boardRegion = (name: BoardRegion): AnchorRect | undefined =>
  regions.get(name);

export const publishBattleAnchors = (anchors: BattleAnchors | null): void => {
  battle = anchors;
};

export const battleAnchors = (): BattleAnchors | null => battle;
