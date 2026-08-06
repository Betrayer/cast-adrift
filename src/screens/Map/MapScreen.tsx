import { Button, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { mixHex } from "@/app/color";
import { prefetchBattle } from "@/app/prefetch";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import { ENEMY_BY_ID } from "@/data/enemies";
import { MODULE_BY_ID, moduleSlots } from "@/data/modules";
import { computeMutatorMods } from "@/data/mutators";
import { sectorDef } from "@/data/sectors";
import { pickBoss, pickMiniboss } from "@/game/run/encounter";
import { playSfx } from "@/services/audio";
import { createStream, deriveSeed } from "@/services/rng";
import { abandonRun, jumpTo } from "@/game/run/flow";
import { computeRunMods } from "@/game/run/runMods";
import {
  areConnected,
  edgeMarkFor,
  NODE_GLYPH,
  nodeById,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { nodeRisk } from "@/game/map/risk";
import { tierForNode } from "@/game/puzzles/selection";
import { TierBadge } from "@/components/TierBadge";
import { BuildSheet } from "@/screens/Build/BuildSheet";
import { mapGeometry, ROW_GAP } from "./mapGeometry";
import { resolveReducedMotion, useSettingsStore } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";
import styles from "./MapScreen.module.css";

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

const glyphColorFor = (type: MapNode["type"]): string => {
  switch (type) {
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

const glyphColor = (node: MapNode): string => glyphColorFor(node.type);

const LEGEND_TYPES: readonly MapNode["type"][] = [
  "battle",
  "elite",
  "miniboss",
  "event",
  "anomaly",
  "shop",
  "shipyard",
  "beacon",
  "boss",
];

// Each node type carries a stamp behind its glyph: a procedural silhouette
// that reads at a glance and survives a monochrome theme.
const nodeStamp = (
  node: MapNode,
  cx: number,
  cy: number,
  radius: number,
): string | null => {
  const r = radius * 0.72;
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

const MOTIF_BADGE = {
  pocket: "✦",
  cache: "◈",
  unstable: "⚡",
  blessed: "○",
  cursed: "●",
} as const;

const motifBadge = (node: MapNode): string | null => {
  if (node.pocket === true) return MOTIF_BADGE.pocket;
  if (node.cache === true) return MOTIF_BADGE.cache;
  if (node.unstable === true) return MOTIF_BADGE.unstable;
  if (node.blessing !== undefined) return MOTIF_BADGE[node.blessing];
  return null;
};

const motifColor = (node: MapNode): string => {
  if (node.pocket === true) return tokens.amber;
  if (node.cache === true) return schools.yellow.text;
  if (node.unstable === true) return schools.red.text;
  return node.blessing === "cursed" ? schools.red.text : schools.blue.text;
};

interface MotifLegendEntry {
  key: string;
  badge: string;
  color: string;
  present: (map: MapGraph) => boolean;
}

const MOTIF_LEGEND: readonly MotifLegendEntry[] = [
  {
    key: "pocket",
    badge: MOTIF_BADGE.pocket,
    color: tokens.amber,
    present: (map) => map.nodes.some((n) => n.pocket === true),
  },
  {
    key: "cache",
    badge: MOTIF_BADGE.cache,
    color: schools.yellow.text,
    present: (map) => map.nodes.some((n) => n.cache === true),
  },
  {
    key: "unstable",
    badge: MOTIF_BADGE.unstable,
    color: schools.red.text,
    present: (map) => map.nodes.some((n) => n.unstable === true),
  },
  {
    key: "blessed",
    badge: MOTIF_BADGE.blessed,
    color: schools.blue.text,
    present: (map) => map.nodes.some((n) => n.blessing === "blessed"),
  },
  {
    key: "cursed",
    badge: MOTIF_BADGE.cursed,
    color: schools.red.text,
    present: (map) => map.nodes.some((n) => n.blessing === "cursed"),
  },
  {
    key: "mine",
    badge: "─",
    color: schools.red.text,
    present: (map) => Object.keys(map.edgeMarks).length > 0,
  },
];

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

  const geo = useMemo(() => mapGeometry(map.shape), [map.shape]);
  const byId = useMemo(() => nodeById(map), [map]);
  const posNode = byId.get(position);
  const positionRow = posNode?.row ?? 0;

  const [selected, setSelected] = useState<NodeId | null>(null);
  const [buildOpen, setBuildOpen] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [marker, setMarker] = useState(() => ({
    x: posNode ? geo.nodeX(posNode) : geo.centerX,
    y: geo.rowY(positionRow),
  }));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<SVGSVGElement | null>(null);
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
    const stage = stageRef.current;
    if (el === null || stage === null) return;
    const scale = stage.getBoundingClientRect().width / geo.viewW;
    const targetY = geo.rowY(positionRow) * scale;
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
    setMarker({ x: geo.nodeX(target), y: geo.rowY(target.row) });
    window.setTimeout(() => {
      jumpTo(selected);
    }, 430);
  };

  const visibleNodes = map.nodes.filter(isVisible);
  const visibleIds = new Set(visibleNodes.map((n) => n.id));
  const fogBottom =
    visibleLimit >= map.shape.bossRow
      ? 0
      : geo.rowY(visibleLimit) - ROW_GAP / 2;

  const motifLegend = MOTIF_LEGEND.filter((entry) =>
    entry.present(map),
  );

  const selectedNode = selected === null ? null : byId.get(selected);
  const canJump =
    !jumping && selectedNode !== undefined && selectedNode !== null && isLegal(selectedNode);

  // Intent preview: what waits, how dangerous it is, and what a detour pays.
  const previewName = ((): string | null => {
    if (selectedNode === undefined || selectedNode === null) return null;
    if (selectedNode.type === "boss") {
      const boss = ENEMY_BY_ID.get(pickBoss(sector, seed));
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

  const anomalyTier =
    selectedNode === undefined || selectedNode === null
      ? null
      : tierForNode(seed, selectedNode);

  const previewLines =
    selectedNode === undefined || selectedNode === null
      ? []
      : [
          t("run:map.previewNode", {
            type: t(`run:map.node.${selectedNode.type}`),
            risk: t(`run:map.risk.${nodeRisk(selectedNode)}`),
          }),
          ...(previewName === null ? [] : [previewName]),
          ...(selectedNode.pocket === true ? [t("run:map.previewPocket")] : []),
          ...(selectedNode.cache === true ? [t("run:motif.cache")] : []),
          ...(selectedNode.unstable === true ? [t("run:motif.unstable")] : []),
          ...(selectedNode.blessing === undefined
            ? []
            : [t(`run:motif.${selectedNode.blessing}`)]),
          ...(edgeMarkFor(map, position, selectedNode.id) === "mine"
            ? [t("run:motif.mine")]
            : []),
        ];

  const header = (
    <div className={styles.header}>
      <div className={styles.headTitle}>
        <Text fw={600} c={sectorDef(sector).accent}>
          {t("run:map.title", {
            n: sector,
            name: t(sectorDef(sector).name),
          })}
        </Text>
        <Text size="xs" c={tokens.faint}>
          {t("run:map.depth", { cur: positionRow, max: map.shape.bossRow })}
        </Text>
      </div>
      <div className={styles.headChips}>
        <Button
          size="compact-xs"
          variant="default"
          data-open-build
          onClick={() => {
            setBuildOpen(true);
          }}
        >
          {t("run:build.open")}
        </Button>
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
  );

  const footer = (
    <div className={styles.footer}>
      {anomalyTier === null ? null : (
        <div className={styles.previewBadge}>
          <TierBadge
            tier={anomalyTier}
            label={t(`run:anomaly.tierName.${String(anomalyTier)}`)}
          />
        </div>
      )}
      {previewLines.map((line, index) => (
        <Text
          key={line}
          size="xs"
          c={index === 0 ? tokens.dim : schools.red.text}
          ta="center"
          fw={index === 0 ? 400 : 600}
        >
          {line}
        </Text>
      ))}
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
  );

  return (
    <Screen
      width="full"
      pad={false}
      header={header}
      footer={footer}
      bodyRef={scrollRef}
      innerClassName={styles.body}
      overlay={
        buildOpen ? (
          <BuildSheet
            onClose={() => {
              setBuildOpen(false);
            }}
          />
        ) : null
      }
    >
      <div>
        <svg
          ref={stageRef}
          className={styles.stage}
          viewBox={`0 0 ${String(geo.viewW)} ${String(geo.viewH)}`}
          role="img"
        >
          {map.edges.map(([a, b]) => {
            if (!visibleIds.has(a) || !visibleIds.has(b)) return null;
            const na = byId.get(a);
            const nb = byId.get(b);
            if (na === undefined || nb === undefined) return null;
            const mark = edgeMarkFor(map, a, b);
            return (
              <line
                key={`${a}-${b}`}
                x1={geo.nodeX(na)}
                y1={geo.rowY(na.row)}
                x2={geo.nodeX(nb)}
                y2={geo.rowY(nb.row)}
                stroke={
                  mark === undefined
                    ? mixHex(tokens.line, tokens.faint, 0.35)
                    : mark === "mine"
                      ? schools.red.text
                      : tokens.amber
                }
                strokeWidth={mark === undefined ? 1.2 : 1.8}
                strokeDasharray={mark === undefined ? undefined : "5 4"}
              />
            );
          })}

          {visibleNodes.map((node, index) => {
            const current = node.id === position;
            const chosen = node.id === selected;
            const legal = isLegal(node);
            const ring = ringFor(node, current, chosen);
            const done = visited.includes(node.id) && !current;
            const stamp = nodeStamp(
              node,
              geo.nodeX(node),
              geo.rowY(node.row),
              geo.radius(node),
            );
            return (
              <g
                key={node.id}
                data-node={node.id}
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
                    cx={geo.nodeX(node)}
                    cy={geo.rowY(node.row)}
                    r={geo.radius(node) + 4}
                    fill="none"
                    stroke={tokens.accent}
                    strokeWidth={1}
                  />
                ) : null}
                <circle
                  cx={geo.nodeX(node)}
                  cy={geo.rowY(node.row)}
                  r={geo.radius(node)}
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
                  x={geo.nodeX(node)}
                  y={geo.rowY(node.row) + 4}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={600}
                  fill={current ? schools.black.text : glyphColor(node)}
                >
                  {t(NODE_GLYPH[node.type])}
                </text>
                {motifBadge(node) === null ? null : (
                  <text
                    x={geo.nodeX(node) + geo.radius(node) - 1}
                    y={geo.rowY(node.row) - geo.radius(node) + 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={motifColor(node)}
                  >
                    {motifBadge(node)}
                  </text>
                )}
                {current ? (
                  <text
                    x={geo.nodeX(node)}
                    y={geo.rowY(node.row) + geo.radius(node) + 15}
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
                    x={geo.nodeX(node)}
                    y={geo.rowY(node.row) - geo.radius(node) - 6}
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
                width={geo.viewW - 16}
                height={fogBottom}
                rx={8}
                fill={tokens.bg}
                opacity={0.72}
              />
              <rect
                x={8}
                y={0}
                width={geo.viewW - 16}
                height={fogBottom}
                rx={8}
                fill="none"
                stroke={mixHex(tokens.line, tokens.faint, 0.35)}
                strokeDasharray="6 5"
              />
              <text
                x={geo.viewW / 2}
                y={Math.min(fogBottom - 26, 54)}
                textAnchor="middle"
                fontSize={13}
                fill={tokens.dim}
              >
                {t("run:map.fog")}
              </text>
              <text
                x={geo.viewW / 2}
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

      <aside className={styles.sidePanel}>
        <Text fw={600} c={tokens.text}>
          {t("run:map.title", { n: sector, name: t(sectorDef(sector).name) })}
        </Text>
        <Text size="xs" c={tokens.dim}>
          {t("run:map.depth", { cur: positionRow, max: map.shape.bossRow })}
        </Text>
        <Text size="xs" c={tokens.dim}>
          {t("run:map.tide", { n: tide })}
        </Text>
        {runModules.length > 0 ? (
          <Text size="xs" c={tokens.dim}>
            {moduleNames}
          </Text>
        ) : null}
        <Text size="xs" c={tokens.faint}>
          {t("run:map.legend")}
        </Text>
        {LEGEND_TYPES.map((type) => (
          <div key={type} className={styles.legendRow}>
            <span
              className={styles.legendGlyph}
              style={{ color: glyphColorFor(type) }}
            >
              {t(NODE_GLYPH[type])}
            </span>
            <Text size="xs" c={tokens.dim}>
              {t(`run:map.node.${type}`)}
            </Text>
          </div>
        ))}
        {motifLegend.length === 0 ? null : (
          <>
            <Text size="xs" c={tokens.faint}>
              {t("run:motif.title")}
            </Text>
            {motifLegend.map((entry) => (
              <div key={entry.key} className={styles.legendRow}>
                <span
                  className={styles.legendGlyph}
                  style={{ color: entry.color }}
                >
                  {entry.badge}
                </span>
                <Text size="xs" c={tokens.dim}>
                  {t(`run:motif.${entry.key}`)}
                </Text>
              </div>
            ))}
          </>
        )}
      </aside>
    </Screen>
  );
};

export const MapScreen = () => {
  const map = useRunStore((s) => s.map);
  const position = useRunStore((s) => s.position);
  const go = useAppStore((s) => s.go);

  useEffect(() => {
    if (map === null || position === null) go("menu");
  }, [map, position, go]);

  // Reading the map is the one unhurried moment in a run, so the battle chunk
  // (Pixi + Matter) downloads here instead of at the node the player picks.
  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window) ?? window.setTimeout;
    idle(() => {
      prefetchBattle();
    });
  }, []);

  if (map === null || position === null) return <Screen />;
  return <MapView map={map} position={position} />;
};
