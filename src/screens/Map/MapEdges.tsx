import { mixHex } from "@/app/color";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import {
  edgeKey,
  edgeMarkFor,
  type EdgeMark,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { nodePoint, type MapGeometry } from "./mapGeometry";
import { isDrawableEdge } from "./spot";
import { pathStyle } from "./travel";
import type { EdgePair } from "./vantage";
import styles from "./MapScreen.module.css";

const PATH_HIGHLIGHT_WIDTH = 5;

const PATH_HIGHLIGHT_OPACITY = 0.55;

interface EdgeLook {
  stroke: string;
  width: number;
  dash: string | undefined;
}

const edgeLook = (mark: EdgeMark | undefined): EdgeLook => {
  if (mark === undefined) {
    return {
      stroke: mixHex(tokens.line, tokens.faint, 0.35),
      width: 1.2,
      dash: undefined,
    };
  }
  switch (mark) {
    case "mine":
      return { stroke: schools.red.text, width: 1.8, dash: "5 4" };
    case "pocket":
      return { stroke: tokens.amber, width: 1.8, dash: "5 4" };
    case "wormhole":
      return { stroke: schools.black.text, width: 2.2, dash: "3 5" };
  }
};

interface PathHighlightProps {
  edges: readonly EdgePair[];
  byId: ReadonlyMap<NodeId, MapNode>;
  geo: MapGeometry;
  selected: NodeId | null;
  hidden: boolean;
}

export const PathHighlight = ({
  edges,
  byId,
  geo,
  selected,
  hidden,
}: PathHighlightProps) =>
  edges.map(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (na === undefined || nb === undefined) return null;
    const from = nodePoint(geo, na);
    const to = nodePoint(geo, nb);
    return (
      <line
        key={`${selected ?? ""}:${edgeKey(a, b)}`}
        className={styles.pathHighlight}
        data-path-highlight={edgeKey(a, b)}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={tokens.amber}
        strokeWidth={PATH_HIGHLIGHT_WIDTH}
        strokeOpacity={PATH_HIGHLIGHT_OPACITY}
        strokeLinecap="round"
        visibility={hidden ? "hidden" : undefined}
        style={pathStyle(from, to)}
      />
    );
  });

interface BaseEdgesProps {
  map: MapGraph;
  byId: ReadonlyMap<NodeId, MapNode>;
  geo: MapGeometry;
  visibleIds: ReadonlySet<NodeId>;
}

export const BaseEdges = ({ map, byId, geo, visibleIds }: BaseEdgesProps) =>
  map.edges.map(([a, b]) => {
    const na = byId.get(a);
    const nb = byId.get(b);
    if (na === undefined || nb === undefined) return null;
    if (!isDrawableEdge(na, nb, visibleIds)) return null;
    const mark = edgeMarkFor(map, a, b);
    const look = edgeLook(mark);
    const from = nodePoint(geo, na);
    const to = nodePoint(geo, nb);
    return (
      <line
        key={`${a}-${b}`}
        data-edge={edgeKey(a, b)}
        data-edge-mark={mark}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={look.stroke}
        strokeWidth={look.width}
        strokeDasharray={look.dash}
      />
    );
  });
