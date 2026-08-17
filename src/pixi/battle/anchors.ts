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

export interface BattleAnchors {
  dice: (AnchorPoint & { uid: string; size: number })[];
  slots: (AnchorRect & { id: SlotId })[];
  reserve: AnchorRect;
  tray: AnchorRect;
}

let tray: AnchorRect | null = null;
let battle: BattleAnchors | null = null;

export const publishTrayAnchor = (rect: AnchorRect | null): void => {
  tray = rect;
};

export const trayAnchorRect = (): AnchorRect | null => tray;

export const publishBattleAnchors = (anchors: BattleAnchors | null): void => {
  battle = anchors;
};

export const battleAnchors = (): BattleAnchors | null => battle;
