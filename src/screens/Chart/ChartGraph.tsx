import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { CHART_EDGES, CHART_NODES } from "@/data/chart";
import type { ChartNodeDef } from "@/data/chart";
import { isAllocatable } from "@/game/chart/engine";
import { chartNodeTitle } from "@/game/chart/describe";
import { NODE_RADIUS, type Point } from "@/game/chart/layouts";
import {
  chainPoints,
  constellationColor,
  labelBelow,
  LABEL_MIN_CSS,
  nodeStrokeWidth,
} from "./chartPresentation";
import { hitRadiusFor, type Box } from "./chartView";
import styles from "./ChartScreen.module.css";

export interface ChartPulse {
  key: number;
  node: string;
  chain: readonly string[];
}

const LABEL_PX = 12;

export const ChartLinks = ({
  pickSet,
  previewSet,
  posOf,
}: {
  pickSet: ReadonlySet<string>;
  previewSet: ReadonlySet<string>;
  posOf: (id: string) => Point;
}) => (
  <>
    {CHART_EDGES.map(([a, b]) => {
      const lit = pickSet.has(a.id) && pickSet.has(b.id);
      const onPath =
        (previewSet.has(a.id) || pickSet.has(a.id)) &&
        (previewSet.has(b.id) || pickSet.has(b.id)) &&
        (previewSet.has(a.id) || previewSet.has(b.id));
      const from = posOf(a.id);
      const to = posOf(b.id);
      return (
        <line
          key={`${a.id}|${b.id}`}
          className={styles.link}
          data-chart-link={`${a.id}|${b.id}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={
            lit
              ? tokens.accent
              : onPath
                ? tokens.amber
                : tokens.line
          }
          strokeWidth={lit || onPath ? 2 : 1}
          opacity={lit ? 0.9 : onPath ? 0.85 : 0.35}
        />
      );
    })}
  </>
);

export const ChartNodes = ({
  picks,
  pickSet,
  previewSet,
  matchesFilter,
  posOf,
  selected,
  hovered,
  pulse,
  reduced,
  bounds,
  viewport,
  viewScale,
  unitsPerPx,
  labelSize,
  wide,
  onHover,
  onHold,
  onTap,
}: {
  picks: readonly string[];
  pickSet: ReadonlySet<string>;
  previewSet: ReadonlySet<string>;
  matchesFilter: (node: ChartNodeDef) => boolean;
  posOf: (id: string) => Point;
  selected: string | null;
  hovered: string | null;
  pulse: ChartPulse | null;
  reduced: boolean;
  bounds: Box;
  viewport: Box;
  viewScale: number;
  unitsPerPx: number;
  labelSize: number;
  wide: boolean;
  onHover: (id: string | null) => void;
  onHold: (id: string) => void;
  onTap: (id: string) => void;
}) => {
  const { t } = useTranslation(["meta", "common", "battle"]);
  const labelVisibleFor = (node: ChartNodeDef): boolean =>
    selected === node.id ||
    hovered === node.id ||
    labelSize >= LABEL_MIN_CSS[node.kind];
  return (
    <>
      {CHART_NODES.map((node) => {
        const color = constellationColor(node.constellation);
        const allocated = pickSet.has(node.id);
        const canGet = !allocated && isAllocatable(node.id, picks);
        const onPath = previewSet.has(node.id);
        const dimmed = !matchesFilter(node) && !allocated;
        const r = NODE_RADIUS[node.kind];
        const at = posOf(node.id);
        const flashing =
          reduced && pulse !== null && pulse.node === node.id;
        const fill = allocated ? color.stroke : color.fill;
        const stroke = allocated || canGet ? color.stroke : tokens.faint;
        const opacity = dimmed
          ? 0.12
          : allocated
            ? 1
            : canGet || onPath
              ? 1
              : 0.4;
        const highlight = selected === node.id;
        const hitR = hitRadiusFor(
          r,
          bounds,
          viewport,
          viewScale,
        );
        const outline = highlight
          ? tokens.text
          : onPath
            ? tokens.amber
            : stroke;
        return (
          <g
            key={flashing ? `${node.id}:${String(pulse.key)}` : node.id}
            className={flashing ? styles.flash : undefined}
            data-chart-flash={flashing ? "1" : undefined}
          >
            {node.kind === "keystone" ? (
              <rect
                className={`${styles.node ?? ""} ${canGet ? styles.pulse ?? "" : ""}`}
                x={at.x - r}
                y={at.y - r}
                width={r * 2}
                height={r * 2}
                transform={`rotate(45 ${String(at.x)} ${String(at.y)})`}
                fill={fill}
                stroke={outline}
                strokeWidth={nodeStrokeWidth(node.kind, highlight)}
                opacity={opacity}
              />
            ) : (
              <circle
                className={`${styles.node ?? ""} ${canGet ? styles.pulse ?? "" : ""}`}
                cx={at.x}
                cy={at.y}
                r={r}
                fill={fill}
                stroke={outline}
                strokeWidth={nodeStrokeWidth(node.kind, highlight)}
                opacity={opacity}
              />
            )}
            {labelVisibleFor(node) ? (
              <text
                className={styles.label}
                x={at.x}
                y={
                  labelBelow(node)
                    ? at.y + r + LABEL_PX * unitsPerPx
                    : at.y - r - 6 * unitsPerPx
                }
                textAnchor="middle"
                fontSize={LABEL_PX * unitsPerPx}
                fill={
                  highlight
                    ? tokens.text
                    : allocated
                      ? tokens.text
                      : tokens.dim
                }
                opacity={opacity}
              >
                {chartNodeTitle(node, t)}
              </text>
            ) : null}
            <circle
              className={styles.hit}
              cx={at.x}
              cy={at.y}
              r={hitR}
              data-chart-node={node.id}
              onPointerEnter={() => {
                if (wide) onHover(node.id);
              }}
              onPointerLeave={() => {
                onHover(null);
              }}
              onPointerDown={() => {
                onHold(node.id);
              }}
              onPointerUp={() => {
                onTap(node.id);
              }}
            />
          </g>
        );
      })}
    </>
  );
};

export const ChartPulseTrail = ({
  pulse,
  pos,
  onDone,
}: {
  pulse: ChartPulse;
  pos: ReadonlyMap<string, Point>;
  onDone: () => void;
}) => (
  <polyline
    className={styles.travel}
    points={chainPoints(pulse.chain, pos)}
    pathLength={1000}
    fill="none"
    data-chart-pulse={pulse.node}
    onAnimationEnd={() => {
      onDone();
    }}
  />
);
