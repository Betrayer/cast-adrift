import { useTranslation } from "react-i18next";
import { cx } from "@/app/cx";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import { NODE_GLYPH, type MapNode, type NodeId } from "@/game/map/types";
import { NODE_HIT_RADIUS, nodePoint, type MapGeometry } from "./mapGeometry";
import {
  glyphColorFor,
  MOTIF_BADGE,
  motifColor,
  nodeMotif,
  nodeStamp,
  ringFor,
} from "./nodeLook";
import { nodeRevealStyle } from "./travel";
import styles from "./MapScreen.module.css";

interface NodeMarkProps {
  node: MapNode;
  geo: MapGeometry;
  current: boolean;
  chosen: boolean;
  legal: boolean;
  previewable: boolean;
  done: boolean;
  stagger: boolean;
  rowsAway: number;
  reduced: boolean;
  chained: boolean;
  delivery: boolean;
  interference: number;
  onSelect: (id: NodeId) => void;
}

type HoleNodeMarkProps = Pick<
  NodeMarkProps,
  | "node"
  | "geo"
  | "chosen"
  | "legal"
  | "previewable"
  | "stagger"
  | "rowsAway"
  | "onSelect"
>;

export const HoleNodeMark = ({
  node,
  geo,
  chosen,
  legal,
  previewable,
  stagger,
  rowsAway,
  onSelect,
}: HoleNodeMarkProps) => {
  const { x, y } = nodePoint(geo, node);
  const r = geo.radius(node);
  return (
    <g
      data-node={node.id}
      data-testid={`map-node-${node.id}`}
      data-node-type="hole"
      data-node-hole="1"
      data-node-ghost="1"
      data-spot-id={node.spot}
      data-node-legal={legal ? '1' : '0'}
      data-node-preview={previewable && !legal ? '1' : undefined}
      className={cx(
        legal ? styles.nodeSelectable : styles.node,
        stagger && styles.nodeStagger,
      )}
      style={stagger ? nodeRevealStyle(rowsAway) : undefined}
      onClick={previewable ? () => { onSelect(node.id); } : undefined}
    >
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={tokens.bg}
        fillOpacity={chosen ? 0.85 : 0.62}
        stroke={chosen ? tokens.amber : schools.black.text}
        strokeWidth={chosen ? 2.6 : 1.4}
        strokeDasharray={chosen ? undefined : "3 4"}
        opacity={chosen ? 1 : 0.9}
      />
      <circle
        cx={x}
        cy={y}
        r={r * 0.3}
        fill={schools.black.text}
        opacity={0.7}
      />
    </g>
  );
};

export const NodeMark = ({
  node,
  geo,
  current,
  chosen,
  legal,
  previewable,
  done,
  stagger,
  rowsAway,
  reduced,
  chained,
  delivery,
  interference,
  onSelect,
}: NodeMarkProps) => {
  const { t } = useTranslation(["run"]);
  const { x, y } = nodePoint(geo, node);
  const r = geo.radius(node);
  const ring = ringFor(node, current, chosen);
  const stamp = nodeStamp(node, x, y, r);
  const motif = nodeMotif(node);
  return (
    <g
      data-node={node.id}
      data-testid={`map-node-${node.id}`}
      data-node-type={node.type}
      data-node-legal={legal ? '1' : '0'}
      data-node-preview={previewable && !legal ? '1' : undefined}
      data-causality={
        node.inverted === true
          ? "inverted"
          : node.storm === true
            ? "storm"
            : undefined
      }
      className={cx(
        legal ? styles.nodeSelectable : styles.node,
        stagger && styles.nodeStagger,
      )}
      style={stagger ? nodeRevealStyle(rowsAway) : undefined}
      opacity={done ? 0.5 : 1}
      onClick={previewable ? () => { onSelect(node.id); } : undefined}
    >
      {legal && !chosen && !reduced ? (
        <circle
          className={styles.pulse}
          cx={x}
          cy={y}
          r={r + 4}
          fill="none"
          stroke={tokens.accent}
          strokeWidth={1}
        />
      ) : null}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={
          node.type === "boss"
            ? schools.red.fill
            : current
              ? schools.black.fill
              : tokens.surface2
        }
        stroke={ring.stroke}
        strokeWidth={ring.width}
      />
      {stamp === null ? null : (
        <path d={stamp} fill={glyphColorFor(node.type)} opacity={0.16} />
      )}
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill={current ? schools.black.text : glyphColorFor(node.type)}
      >
        {t(NODE_GLYPH[node.type])}
      </text>
      {chained ? (
        <text
          data-chain-marker={node.id}
          x={x - r + 1}
          y={y - r + 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill={tokens.amber}
        >
          !
        </text>
      ) : null}
      {motif === null ? null : (
        <text
          x={x + r - 1}
          y={y - r + 6}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={motifColor(motif)}
        >
          {MOTIF_BADGE[motif]}
        </text>
      )}
      {delivery ? (
        <text
          className={styles.cargoMark}
          data-cargo-marker={node.id}
          x={x + r - 1}
          y={y + r + 7}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={tokens.amber}
        >
          ▣
        </text>
      ) : null}
      {current ? (
        <text
          x={x}
          y={y + r + 15}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={schools.black.text}
        >
          {t("run:map.you")}
        </text>
      ) : null}
      {current && interference > 0 ? (
        <text
          x={x}
          y={y - r - 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill={schools.red.text}
        >
          {`≈${String(interference)}`}
        </text>
      ) : null}
      {previewable ? (
        <circle
          className={styles.nodeHit}
          cx={x}
          cy={y}
          r={NODE_HIT_RADIUS}
        />
      ) : null}
    </g>
  );
};
