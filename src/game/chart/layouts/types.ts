import type { School } from "@/types/content";
import type { ChartLayoutId } from "@/types";

export type { ChartLayoutId };

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SchoolRegion {
  school: School;
  angle: number;
  centre: Point;
  rx: number;
  ry: number;
  rotation: number;
  backbone: readonly Point[];
}

export type ChartDecor =
  | { kind: "dust"; school: School; points: readonly Point[] }
  | { kind: "orbit"; centre: Point; rx: number; ry: number; major: boolean }
  | { kind: "wedge"; school: School; path: string }
  | { kind: "figure"; school: School; from: Point; to: Point }
  | { kind: "label"; school: School; at: Point }
  | { kind: "spike"; school: School; at: Point; size: number }
  | { kind: "meridian"; from: Point; to: Point }
  | { kind: "thread"; from: Point; via: Point; to: Point }
  | { kind: "beam"; at: Point; length: number };

export interface ChartLayout {
  id: ChartLayoutId;
  centre: Point;
  pos: ReadonlyMap<string, Point>;
  bounds: Box;
  decor: readonly ChartDecor[];
  regions: readonly SchoolRegion[];
}

export interface LayoutParts {
  pos: Map<string, Point>;
  decor: ChartDecor[];
  regions: SchoolRegion[];
}
