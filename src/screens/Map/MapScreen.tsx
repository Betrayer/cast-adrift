import { Box, Button, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { mixHex } from "@/app/color";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import { ENEMY_BY_ID } from "@/data/enemies";
import { MODULE_BY_ID, moduleSlots } from "@/data/modules";
import { computeMutatorMods } from "@/data/mutators";
import { sectorDef } from "@/data/sectors";
import { pickMiniboss } from "@/game/run/encounter";
import { playSfx } from "@/services/audio";
import { createStream, deriveSeed } from "@/services/rng";
import { abandonRun, jumpTo } from "@/game/run/flow";
import { computeRunMods } from "@/game/run/runMods";
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
      return schools.red.text;
    case "beacon":
      return schools.black.text;
    case "shipyard":
    case "shop":
      return schools.yellow.text;
    default:
      return tokens.dim;
  }
};

// Each node type carries a stamp behind its glyph: a procedural silhouette
// that reads at a glance and survives a monochrome theme.
const nodeStamp = (node: MapNode, cx: number, cy: number): string | null => {
  const r = nodeRadius(node) * 0.72;
  switch (node.type) {
    case "battle":
    case "elite":
      return `M ${String(cx - r)} ${String(cy + r)} L ${String(cx)} ${String(cy - r)} L ${String(cx + r)} ${String(cy + r)} Z`;
    case "miniboss":
    case "boss":
      return `M ${String(cx)} ${String(cy - r)} L ${String(cx + r)} ${String(cy)} L ${String(cx)} ${String(cy + r)} L ${String(cx - r)} ${String(cy)} Z`;
    case "shop":
    case "shipyard":
      return `M ${String(cx - r)} ${String(cy - r * 0.6)} H ${String(cx + r)} V ${String(cy + r * 0.8)} H ${String(cx - r)} Z`;
    case "beacon":
      return `M ${String(cx)} ${String(cy - r)} L ${String(cx + r * 0.4)} ${String(cy)} L ${String(cx)} ${String(cy + r)} L ${String(cx - r * 0.4)} ${String(cy)} Z`;
    default:
      return null;
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
  const runModules = useRunStore((s) => s.modules);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const perks = useRunStore((s) => s.perks);
  const moduleCap = moduleSlots(
    computeRunMods(perks, chartPicks).moduleSlotDelta,
  );
  const moduleNames = runModules
    .map((id) => {
      const def = MODULE_BY_ID.get(id);
      return def === undefined ? id : t(def.name);
    })
    .join(" · ");
  const interference = useRunStore((s) => s.interferenceStacks);
  const sector = useRunStore((s) => s.sector);
  const seed = useRunStore((s) => s.seed);
  const usedMinibosses = useRunStore((s) => s.usedMinibosses);
  const pendingDeepScan = useRunStore((s) => s.pendingDeepScan);
  const bonusReveal = useRunStore((s) => s.bonusReveal);
  const mutators = useRunStore((s) => s.mutators);
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
  const prevLimit = useRef(0);
  const [tidePulse, setTidePulse] = useState(false);

  const visibleRows = Math.max(
    1,
    2 +
      (sensorsMk - 1) +
      (pendingDeepScan ? 1 : 0) +
      bonusReveal +
      computeMutatorMods(mutators).fogRowDelta,
  );
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
    if (visibleLimit > prevLimit.current) playSfx("fogReveal");
    prevLimit.current = visibleLimit;
  }, [visibleLimit]);

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
    playSfx("jump");
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

  // Intent preview: the gate row announces which of the six mini-bosses waits.
  const previewLabel = ((): string | null => {
    if (selectedNode === undefined || selectedNode === null) return null;
    if (selectedNode.type === "boss") {
      const boss = ENEMY_BY_ID.get(sectorDef(sector).bossId);
      return boss === undefined
        ? null
        : t("run:map.previewBoss", { name: t(boss.name) });
    }
    if (selectedNode.type !== "miniboss") return null;
    const stream = createStream(deriveSeed(seed, `enc:${selectedNode.id}`));
    const id = pickMiniboss(sector, stream, usedMinibosses);
    const def = ENEMY_BY_ID.get(id);
    return def === undefined
      ? null
      : t("run:map.previewMiniboss", { name: t(def.name) });
  })();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.headTitle}>
          <Text fw={600} c={sectorDef(sector).accent}>
            {t("run:map.title", {
              n: sector,
              name: t(sectorDef(sector).name),
            })}
          </Text>
          <Text size="xs" c={tokens.faint}>
            {t("run:map.depth", { cur: positionRow, max: ROW_COUNT })}
          </Text>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <span
            className={`${styles.tideChip ?? ""} ${tidePulse ? styles.tidePulse ?? "" : ""}`}
          >
            {t("run:map.tide", { n: tide })}
          </span>
          {interference > 0 ? (
            <span className={styles.tideChip ?? ""}>
              {t("run:map.interference", { n: interference })}
            </span>
          ) : null}
          {runModules.length > 0 ? (
            <span className={styles.tideChip ?? ""} title={moduleNames}>
              {t("run:map.modules", {
                used: runModules.length,
                max: moduleCap,
              })}
            </span>
          ) : null}
        </div>
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
                stroke={mixHex(tokens.line, tokens.faint, 0.35)}
                strokeWidth={1.2}
              />
            );
          })}

          {visibleNodes.map((node, index) => {
            const current = node.id === position;
            const chosen = node.id === selected;
            const legal = isLegal(node);
            const ring = ringFor(node, current, chosen);
            const done = visited.includes(node.id) && !current;
            const stamp = nodeStamp(node, nodeX(node), rowY(node.row));
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
                  <path d={stamp} fill={glyphColor(node)} opacity={0.16} />
                )}
                <text
                  x={nodeX(node)}
                  y={rowY(node.row) + 4}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill={current ? schools.black.text : glyphColor(node)}
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
                    fill={schools.black.text}
                  >
                    {t("run:map.you")}
                  </text>
                ) : null}
                {current && interference > 0 ? (
                  <text
                    x={nodeX(node)}
                    y={rowY(node.row) - nodeRadius(node) - 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={schools.red.text}
                  >
                    {`≈${String(interference)}`}
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
                fill={tokens.bg}
                opacity={0.72}
              />
              <rect
                x={8}
                y={0}
                width={VIEW_W - 16}
                height={fogBottom}
                rx={8}
                fill="none"
                stroke={mixHex(tokens.line, tokens.faint, 0.35)}
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
        {previewLabel === null ? null : (
          <Text size="xs" c={schools.red.text} ta="center" fw={600}>
            {previewLabel}
          </Text>
        )}
        <Button
          size="md"
          fullWidth
          disabled={!canJump}
          onClick={onJump}
          data-coach="jump"
        >
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
