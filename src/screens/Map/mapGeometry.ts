import { pocketLaneFor, type MapNode, type MapShape } from "@/game/map/types";

export const LANE_GAP = 80;
export const SIDE_MARGIN = 64;
export const ROW_GAP = 62;
export const TOP_PAD = 42;
export const BOTTOM_PAD = 42;
export const NODE_RADIUS = 16;
export const BOSS_RADIUS = 22;

export interface MapGeometry {
  viewW: number;
  viewH: number;
  centerX: number;
  columns: number;
  laneX: (lane: number) => number;
  rowY: (row: number) => number;
  nodeX: (node: MapNode) => number;
  nodeY: (node: MapNode) => number;
  radius: (node: MapNode) => number;
}

export const mapGeometry = (shape: MapShape): MapGeometry => {
  const columns = pocketLaneFor(shape) + 1;
  const viewW = SIDE_MARGIN * 2 + (columns - 1) * LANE_GAP;
  const viewH = TOP_PAD + shape.bossRow * ROW_GAP + BOTTOM_PAD;
  const laneX = (lane: number): number =>
    SIDE_MARGIN + Math.max(0, Math.min(columns - 1, lane)) * LANE_GAP;
  const rowY = (row: number): number =>
    TOP_PAD + (shape.bossRow - row) * ROW_GAP;
  const centerX = SIDE_MARGIN + ((shape.lanes - 1) * LANE_GAP) / 2;
  return {
    viewW,
    viewH,
    centerX,
    columns,
    laneX,
    rowY,
    nodeX: (node) =>
      node.type === "start" || node.type === "boss" ? centerX : laneX(node.lane),
    nodeY: (node) => rowY(node.row),
    radius: (node) => (node.type === "boss" ? BOSS_RADIUS : NODE_RADIUS),
  };
};
