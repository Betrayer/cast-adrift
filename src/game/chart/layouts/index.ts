import type { ChartNodeDef } from "@/data/chart/types";
import { fnv1a } from "@/services/rng";
import type { ChartLayoutId } from "@/types";
import { constellationsLayout } from "./constellations";
import { BOUNDS_PAD, LAYOUT_CENTRE, boundsOf, rounded } from "./geometry";
import { nebulaeLayout } from "./nebulae";
import { ringsLayout } from "./rings";
import { chartSkeleton, type ChartSkeleton } from "./skeleton";
import { spiralLayout } from "./spiral";
import type { ChartLayout, LayoutParts, Point } from "./types";

export type { ChartDecor, ChartLayout, Point, SchoolRegion, Box } from "./types";
export { NODE_RADIUS, MIN_SEPARATION, clearance, fmtPoint } from "./geometry";
export { CONSTELLATION_SEEDS } from "./constellations";
export {
  CHART_LAYOUT_IDS,
  DEFAULT_CHART_LAYOUT,
  isChartLayoutId,
} from "@/data/chartLayouts";

const STRATEGIES: Readonly<
  Record<ChartLayoutId, (skeleton: ChartSkeleton) => LayoutParts>
> = {
  spiral: spiralLayout,
  rings: ringsLayout,
  constellations: constellationsLayout,
  nebulae: nebulaeLayout,
};

export const graphHash = (nodes: readonly ChartNodeDef[]): number =>
  fnv1a(
    nodes
      .map(
        (node) =>
          `${node.id}:${node.constellation}:${node.kind}:${String(node.depth)}:${node.links.join(",")}`,
      )
      .join("|"),
  );

const memo = new Map<string, ChartLayout>();

const LABEL_HALF_WIDTH = 70;

const labelAnchors = (parts: LayoutParts): Point[] =>
  parts.decor.flatMap((item) =>
    item.kind === "label"
      ? [
          { x: item.at.x - LABEL_HALF_WIDTH, y: item.at.y },
          { x: item.at.x + LABEL_HALF_WIDTH, y: item.at.y },
        ]
      : [],
  );

export const layoutChart = (
  nodes: readonly ChartNodeDef[],
  id: ChartLayoutId,
): ChartLayout => {
  const key = `${String(graphHash(nodes))}:${id}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;
  const parts = STRATEGIES[id](chartSkeleton(nodes));
  const pos = new Map<string, Point>();
  for (const node of nodes) {
    const point = parts.pos.get(node.id);
    if (point !== undefined) pos.set(node.id, rounded(point));
  }
  const layout: ChartLayout = {
    id,
    centre: LAYOUT_CENTRE,
    pos,
    bounds: boundsOf([...pos.values(), ...labelAnchors(parts)], BOUNDS_PAD),
    decor: parts.decor,
    regions: parts.regions,
  };
  memo.set(key, layout);
  return layout;
};
