import { Box, Button, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { abandonRun, jumpTo } from "@/game/run/flow";
import {
  areConnected,
  BOSS_ROW,
  NODE_GLYPH,
  ROW_COUNT,
  nodeById,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./MapScreen.module.css";

const LANE_X = [64, 144, 224, 304] as const;
const CENTER_X = 184;
const VIEW_W = 368;
const ROW_GAP = 62;
const TOP_PAD = 42;
const BOT_PAD = 42;
const MAP_H = TOP_PAD + BOSS_ROW * ROW_GAP + BOT_PAD;
const MAX_STAGE_W = 440;

const rowY = (row: number): number => TOP_PAD + (BOSS_ROW - row) * ROW_GAP;
const nodeX = (node: MapNode): number =>
  node.type === "start" || node.type === "boss"
    ? CENTER_X
    : (LANE_X[node.lane] ?? CENTER_X);
const nodeRadius = (node: MapNode): number => (node.type === "boss" ? 22 : 16);

const ringFor = (
  node: MapNode,
  isCurrent: boolean,
  isSelected: boolean,
): { stroke: string; width: number } => {
  if (isSelected) return { stroke: tokens.amber, width: 2.6 };
  if (isCurrent) return { stroke: tokens.accent, width: 2.6 };
  switch (node.type) {
    case "elite":
    case "miniboss":
    case "boss":
      return { stroke: tokens.danger, width: 1.8 };
    case "beacon":
      return { stroke: tokens.accent, width: 1.8 };
    case "shipyard":
    case "shop":
      return { stroke: tokens.amber, width: 1.4 };
    default:
      return { stroke: tokens.line, width: 1.2 };
  }
};

const glyphColor = (node: MapNode): string => {
  switch (node.type) {
    case "elite":
    case "miniboss":
      return "#F0A09A";
    case "beacon":
      return "#CDBAFF";
    case "shipyard":
    case "shop":
      return "#F0CE7E";
    default:
      return tokens.dim;
  }
};

interface MapViewProps {
  map: MapGraph;
  position: NodeId;
}

const MapView = ({ map, position }: MapViewProps) => {
  const { t } = useTranslation(["run", "common"]);
  const visited = useRunStore((s) => s.visited);
  const tide = useRunStore((s) => s.tide);
  const sector = useRunStore((s) => s.sector);
  const pendingDeepScan = useRunStore((s) => s.pendingDeepScan);
  const bonusReveal = useRunStore((s) => s.bonusReveal);
  const sensorsMk = useRunStore((s) => s.mkLevels.sensors ?? 1);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );

  const byId = useMemo(() => nodeById(map), [map]);
  const posNode = byId.get(position);
  const positionRow = posNode?.row ?? 0;

  const [selected, setSelected] = useState<NodeId | null>(null);
  const [jumping, setJumping] = useState(false);
  const [marker, setMarker] = useState(() => ({
    x: posNode ? nodeX(posNode) : CENTER_X,
    y: rowY(positionRow),
  }));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevTide = useRef(tide);
  const [tidePulse, setTidePulse] = useState(false);

  const visibleRows =
    2 + (sensorsMk - 1) + (pendingDeepScan ? 1 : 0) + bonusReveal;
  const visibleLimit = positionRow + visibleRows;

  const isVisible = (node: MapNode): boolean =>
    node.type === "boss" ||
    visited.includes(node.id) ||
    node.row <= visibleLimit;
  const isLegal = (node: MapNode): boolean =>
    !visited.includes(node.id) &&
    node.row > positionRow &&
    isVisible(node) &&
    areConnected(map, position, node.id);

  useEffect(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const scale = Math.min(el.clientWidth, MAX_STAGE_W) / VIEW_W;
    const targetY = rowY(positionRow) * scale;
    el.scrollTo({
      top: Math.max(0, targetY - el.clientHeight * 0.55),
      behavior: reduced ? "auto" : "smooth",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tide > prevTide.current && !reduced) {
      setTidePulse(true);
      const id = window.setTimeout(() => {
        setTidePulse(false);
      }, 720);
      prevTide.current = tide;
      return () => {
        window.clearTimeout(id);
      };
    }
    prevTide.current = tide;
  }, [tide, reduced]);

  const onJump = (): void => {
    if (selected === null || jumping) return;
    const target = byId.get(selected);
    if (target === undefined || !isLegal(target)) return;
    if (reduced) {
      jumpTo(selected);
      return;
    }
    setJumping(true);
    setMarker({ x: nodeX(target), y: rowY(target.row) });
    window.setTimeout(() => {
      jumpTo(selected);
    }, 430);
  };

  const visibleNodes = map.nodes.filter(isVisible);
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const fogBottom =
    visibleLimit >= BOSS_ROW ? 0 : rowY(visibleLimit) - ROW_GAP / 2;

  const selectedNode = selected === null ? null : byId.get(selected);
  const canJump =
    !jumping && selectedNode !== undefined && selectedNode !== null && isLegal(selectedNode);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headTitle}>
          <Text fw={600} c={tokens.text}>
            {t("run:map.title", {
              n: sector,
              name: t("run:map.sector1"),
            })}
          </Text>
          <Text size="xs" c={tokens.faint}>
            {t("run:map.depth", { cur: positionRow, max: ROW_COUNT })}
          </Text>
        </div>
        <span
          className={`${styles.tideChip ?? ""} ${tidePulse ? styles.tidePulse ?? "" : ""}`}
        >
          {t("run:map.tide", { n: tide })}
        </span>
      </div>

      <div className={styles.scroll} ref={scrollRef}>
        <svg
          className={styles.stage}
          viewBox={`0 0 ${String(VIEW_W)} ${String(MAP_H)}`}
          role="img"
        >
          {map.edges.map(([a, b]) => {
            if (!visibleIds.has(a) || !visibleIds.has(b)) return null;
            const na = byId.get(a);
            const nb = byId.get(b);
            if (na === undefined || nb === undefined) return null;
            return (
              <line
                key={`${a}-${b}`}
                x1={nodeX(na)}
                y1={rowY(na.row)}
                x2={nodeX(nb)}
                y2={rowY(nb.row)}
                stroke="#33405C"
                strokeWidth={1.2}
              />
            );
          })}

          {visibleNodes.map((node, index) => {
            if (node.type === "boss") return null;
            const current = node.id === position;
            const chosen = node.id === selected;
            const legal = isLegal(node);
            const ring = ringFor(node, current, chosen);
            const done = visited.includes(node.id) && !current;
            return (
              <g
                key={node.id}
                className={`${legal ? styles.nodeSelectable ?? "" : styles.node ?? ""} ${
                  reduced ? "" : styles.nodeStagger ?? ""
                }`}
                style={reduced ? undefined : { animationDelay: `${String(Math.min(index, 24) * 45)}ms` }}
                opacity={done ? 0.5 : 1}
                onClick={legal ? () => { setSelected(node.id); } : undefined}
              >
                {legal && !chosen && !reduced ? (
                  <circle
                    className={styles.pulse}
                    cx={nodeX(node)}
                    cy={rowY(node.row)}
                    r={nodeRadius(node) + 4}
                    fill="none"
                    stroke={tokens.accent}
                    strokeWidth={1}
                  />
                ) : null}
                <circle
                  cx={nodeX(node)}
                  cy={rowY(node.row)}
                  r={nodeRadius(node)}
                  fill={current ? "#221A38" : "#182238"}
                  stroke={ring.stroke}
                  strokeWidth={ring.width}
                />
                <text
                  x={nodeX(node)}
                  y={rowY(node.row) + 4}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill={current ? "#CDBAFF" : glyphColor(node)}
                >
                  {t(NODE_GLYPH[node.type])}
                </text>
                {current ? (
                  <text
                    x={nodeX(node)}
                    y={rowY(node.row) + nodeRadius(node) + 15}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="#CDBAFF"
                  >
                    {t("run:map.you")}
                  </text>
                ) : null}
              </g>
            );
          })}

          {fogBottom > 0 ? (
            <g className={styles.fog}>
              <rect
                x={8}
                y={0}
                width={VIEW_W - 16}
                height={fogBottom}
                rx={8}
                fill="#0B0F1A"
                opacity={0.72}
              />
              <rect
                x={8}
                y={0}
                width={VIEW_W - 16}
                height={fogBottom}
                rx={8}
                fill="none"
                stroke="#33405C"
                strokeDasharray="6 5"
              />
              <text
                x={VIEW_W / 2}
                y={Math.min(fogBottom - 26, 54)}
                textAnchor="middle"
                fontSize={13}
                fill={tokens.dim}
              >
                {t("run:map.fog")}
              </text>
              <text
                x={VIEW_W / 2}
                y={Math.min(fogBottom - 10, 72)}
                textAnchor="middle"
                fontSize={11}
                fill={tokens.faint}
              >
                {t("run:map.fogSub")}
              </text>
            </g>
          ) : null}

          <g>
            <circle
              cx={CENTER_X}
              cy={rowY(BOSS_ROW)}
              r={22}
              fill="#2E1517"
              stroke={tokens.danger}
              strokeWidth={2}
            />
            <text
              x={CENTER_X}
              y={rowY(BOSS_ROW) + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="#F0A09A"
            >
              {t("run:map.boss")}
            </text>
          </g>

          {jumping ? (
            <g
              className={styles.marker}
              style={{ transform: `translate(${String(marker.x)}px, ${String(marker.y)}px)` }}
            >
              <circle r={6} fill={tokens.accent} />
            </g>
          ) : null}
        </svg>
      </div>

      <div className={styles.footer}>
        <Button size="md" fullWidth disabled={!canJump} onClick={onJump}>
          {t("run:map.jump")}
        </Button>
        {selected === null ? (
          <Text size="xs" c={tokens.faint} ta="center">
            {t("run:map.jumpHint")}
          </Text>
        ) : null}
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          onClick={abandonRun}
        >
          {t("run:map.abandon")}
        </Button>
      </div>
    </div>
  );
};

export const MapScreen = () => {
  const map = useRunStore((s) => s.map);
  const position = useRunStore((s) => s.position);
  const go = useAppStore((s) => s.go);

  useEffect(() => {
    if (map === null || position === null) go("menu");
  }, [map, position, go]);

  if (map === null || position === null) return <Box bg={tokens.bg} mih="100dvh" />;
  return <MapView map={map} position={position} />;
};
