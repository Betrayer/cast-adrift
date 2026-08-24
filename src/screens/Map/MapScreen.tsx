import { Button, Text } from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/app/backGuard";
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
import {
  bypassHole,
  enterNode,
  jumpTo,
  openWormhole,
  resumeUnenteredNode,
  rideWormhole,
} from "@/game/run/flow";
import { holeTollFor } from "@/game/run/motifs";
import { isGentleRide } from "@/game/map/wormhole";
import { computeRunMods } from "@/game/run/runMods";
import {
  areConnected,
  edgeMarkFor,
  NODE_GLYPH,
  nodeById,
  wormholeFor,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { nodeRisk, type RiskBand } from "@/game/map/risk";
import { haptic } from "@/services/tma";
import {
  clearVignette,
  flashVignette,
  syncHullRim,
} from "@/services/vignette";
import { tierForNode } from "@/game/puzzles/selection";
import { TierBadge } from "@/components/TierBadge";
import { AbandonConfirm } from "@/components/AbandonConfirm";
import { AxisMeter } from "@/components/AxisMeter";
import { WarpStreaks } from "@/components/WarpStreaks";
import { WormholeChoice } from "./WormholeChoice";
import { TapPopover } from "@/components/TapPopover";
import { TIDE_HP_PCT } from "@/game/run/encounter";
import { chainMarkedNodes } from "@/game/narrative/chainMarkers";
import { mapGeometry, ROW_GAP } from "./mapGeometry";
import {
  MAP_JUMP_MS,
  MARKER_TRAVEL_MS,
  markerStyle,
  trailStyle,
  WARP_BURST_MS,
  WARP_FLASH_MS,
  WARP_LAND_MS,
  WARP_SUCK_MS,
  type Point,
} from "./travel";
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

const RISK_RATE: Record<RiskBand, number> = {
  low: 1.14,
  raised: 0.96,
  high: 0.78,
};

const MOTIF_BADGE = {
  pocket: "✦",
  cache: "◈",
  unstable: "⚡",
  blessed: "○",
  cursed: "●",
  inversion: "⇅",
  storm: "≋",
  blackHoles: "◉",
  wormhole: "◌",
} as const;

const motifBadge = (node: MapNode): string | null => {
  if (node.hole === true) return null;
  if (node.pocket === true) return MOTIF_BADGE.pocket;
  if (node.cache === true) return MOTIF_BADGE.cache;
  if (node.unstable === true) return MOTIF_BADGE.unstable;
  if (node.inverted === true) return MOTIF_BADGE.inversion;
  if (node.storm === true) return MOTIF_BADGE.storm;
  if (node.blessing !== undefined) return MOTIF_BADGE[node.blessing];
  return null;
};

const motifColor = (node: MapNode): string => {
  if (node.pocket === true) return tokens.amber;
  if (node.cache === true) return schools.yellow.text;
  if (node.unstable === true) return schools.red.text;
  if (node.inverted === true) return schools.prismatic.text;
  if (node.storm === true) return schools.blue.text;
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
    key: "inversion",
    badge: MOTIF_BADGE.inversion,
    color: schools.prismatic.text,
    present: (map) => map.nodes.some((n) => n.inverted === true),
  },
  {
    key: "storm",
    badge: MOTIF_BADGE.storm,
    color: schools.blue.text,
    present: (map) => map.nodes.some((n) => n.storm === true),
  },
  {
    key: "mine",
    badge: "─",
    color: schools.red.text,
    present: (map) =>
      Object.values(map.edgeMarks).some((mark) => mark === "mine"),
  },
  {
    key: "blackHoles",
    badge: MOTIF_BADGE.blackHoles,
    color: schools.black.text,
    present: (map) => map.nodes.some((n) => n.hole === true),
  },
  {
    key: "wormhole",
    badge: MOTIF_BADGE.wormhole,
    color: schools.black.text,
    present: (map) =>
      Object.values(map.edgeMarks).some((mark) => mark === "wormhole"),
  },
];


interface WarpBeat {
  phase: "suck" | "burst" | "land";
  x: number;
  y: number;
  rows: number;
  direction: "forward" | "backward";
}

interface MapViewProps {
  map: MapGraph;
  position: NodeId;
}

const MapView = ({ map, position }: MapViewProps) => {
  const { t } = useTranslation(["run", "common", "battle", "content"]);
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
  const hullMax = useRunStore((s) => s.hullMax);
  const scrap = useRunStore((s) => s.scrap);
  const axis = useRunStore((s) => s.axis);
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

  const flags = useRunStore((s) => s.flags);
  const seenEvents = useRunStore((s) => s.seenEvents);
  const chainNodes = useMemo(
    () =>
      chainMarkedNodes(map, { sector, axis, flags, seenEvents }, seed),
    [map, sector, axis, flags, seenEvents, seed],
  );

  const geo = useMemo(() => mapGeometry(map.shape), [map.shape]);
  const byId = useMemo(() => nodeById(map), [map]);
  const posNode = byId.get(position);
  const positionRow = posNode?.row ?? 0;

  const pendingWormhole = useRunStore((s) => s.pendingWormhole);
  const hull = useRunStore((s) => s.hull);
  const rides = useRunStore((s) => s.stats.wormholeRides);

  const [selected, setSelected] = useState<NodeId | null>(null);
  const [abandoning, setAbandoning] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [warp, setWarp] = useState<WarpBeat | null>(null);
  const timers = useRef<number[]>([]);
  const [marker, setMarker] = useState<Point>(() => ({
    x: posNode ? geo.nodeX(posNode) : geo.centerX,
    y: geo.rowY(positionRow),
  }));
  const [trail, setTrail] = useState<{ from: Point; to: Point } | null>(null);
  const [arrival, setArrival] = useState<Point | null>(null);
  const travelFrames = useRef<number[]>([]);
  const knownChains = useRef(new Set<NodeId>());
  const seatedChains = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<SVGSVGElement | null>(null);
  const prevTide = useRef(tide);
  const prevTideCue = useRef(tide);
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

  const arrivalFraming = useRef({ positionRow, reduced, geo });

  useEffect(() => {
    const el = scrollRef.current;
    const stage = stageRef.current;
    if (el === null || stage === null) return;
    const framing = arrivalFraming.current;
    const scale = stage.getBoundingClientRect().width / framing.geo.viewW;
    const targetY = framing.geo.rowY(framing.positionRow) * scale;
    el.scrollTo({
      top: Math.max(0, targetY - el.clientHeight * 0.55),
      behavior: framing.reduced ? "auto" : "smooth",
    });
  }, []);

  useEffect(() => {
    if (visibleLimit > prevLimit.current) playSfx("fogReveal");
    prevLimit.current = visibleLimit;
  }, [visibleLimit]);

  useEffect(() => {
    syncHullRim(hull, hullMax);
  }, [hull, hullMax]);

  useEffect(
    () => () => {
      clearVignette();
    },
    [],
  );

  useEffect(() => {
    const known = knownChains.current;
    const fresh = [...chainNodes].filter((id) => !known.has(id));
    for (const id of chainNodes) known.add(id);
    if (fresh.length === 0 || !seatedChains.current) {
      seatedChains.current = true;
      return;
    }
    playSfx("chainStep", { rate: 1 + Math.min(3, fresh.length) * 0.05 });
  }, [chainNodes]);

  useEffect(() => {
    if (warp?.phase !== "land") return;
    const el = scrollRef.current;
    const stage = stageRef.current;
    if (el === null || stage === null) return;
    const scale = stage.getBoundingClientRect().width / geo.viewW;
    el.scrollTo({
      top: Math.max(0, warp.y * scale - el.clientHeight * 0.55),
      behavior: reduced ? "auto" : "smooth",
    });
  }, [warp, geo, reduced]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      for (const id of travelFrames.current) window.cancelAnimationFrame(id);
      travelFrames.current = [];
    },
    [],
  );

  useEffect(() => {
    if (tide > prevTideCue.current) {
      playSfx("tideUp", { rate: 1 - Math.min(4, tide) * 0.03 });
    }
    prevTideCue.current = tide;
  }, [tide]);

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

  const selectNode = (id: NodeId): void => {
    if (id !== selected) {
      const node = byId.get(id);
      playSfx("navTick", {
        rate: node === undefined ? 1 : RISK_RATE[nodeRisk(node)] ?? 1,
        gain: 2.2,
      });
    }
    setSelected(id);
  };

  const after = (ms: number, run: () => void): void => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const here = (): Point => ({
    x: posNode ? geo.nodeX(posNode) : geo.centerX,
    y: geo.rowY(positionRow),
  });

  const land = (arrive: () => void): void => {
    setJumping(false);
    setTrail(null);
    setArrival(null);
    arrive();
  };

  const travelTo = (to: Point, arrive: () => void): void => {
    const from = here();
    setJumping(true);
    setArrival(null);
    setMarker(from);
    if (reduced) {
      setTrail(null);
      setMarker(to);
      land(arrive);
      return;
    }
    setTrail({ from, to });
    travelFrames.current.push(
      window.requestAnimationFrame(() => {
        travelFrames.current.push(
          window.requestAnimationFrame(() => {
            setMarker(to);
          }),
        );
      }),
    );
    after(MARKER_TRAVEL_MS, () => {
      playSfx("navTick", { gain: 1.6 });
      setArrival(to);
    });
    after(MAP_JUMP_MS, () => {
      land(arrive);
    });
  };

  const onRide = (holeId: NodeId): void => {
    if (jumping) return;
    const hole = byId.get(holeId);
    setJumping(true);
    setSelected(null);
    haptic("bossIntro");
    playSfx("foldBeat", { gain: 0.9 });
    if (reduced) {
      const roll = rideWormhole(holeId, false);
      const landed = roll?.landing == null ? undefined : byId.get(roll.landing);
      playSfx("inversionCue");
      setWarp({
        phase: "land",
        x: landed === undefined ? geo.centerX : geo.nodeX(landed),
        y: geo.rowY(landed?.row ?? positionRow),
        rows: Math.abs(roll?.rows ?? 0),
        direction: roll?.direction ?? "forward",
      });
      after(WARP_FLASH_MS, () => {
        setWarp(null);
        if (roll?.landing != null) enterNode(roll.landing);
      });
      return;
    }
    setWarp({
      phase: "suck",
      x: hole === undefined ? geo.centerX : geo.nodeX(hole),
      y: geo.rowY(hole?.row ?? positionRow),
      rows: 0,
      direction: "forward",
    });
    after(WARP_SUCK_MS, () => {
      const roll = rideWormhole(holeId, false);
      const landing = roll?.landing == null ? undefined : byId.get(roll.landing);
      playSfx("inversionCue");
      setWarp({
        phase: "burst",
        x: landing === undefined ? geo.centerX : geo.nodeX(landing),
        y: geo.rowY(landing?.row ?? positionRow),
        rows: Math.abs(roll?.rows ?? 0),
        direction: roll?.direction ?? "forward",
      });
      after(WARP_BURST_MS, () => {
        setWarp((beat) => (beat === null ? null : { ...beat, phase: "land" }));
        playSfx("navTick", { gain: 1.6 });
        setArrival({
          x: landing === undefined ? geo.centerX : geo.nodeX(landing),
          y: geo.rowY(landing?.row ?? positionRow),
        });
        after(WARP_LAND_MS, () => {
          setWarp(null);
          setArrival(null);
          if (roll?.landing != null) enterNode(roll.landing);
        });
      });
    });
  };

  const onBypass = (holeId: NodeId): void => {
    if (jumping) return;
    const record = wormholeFor(map, position, holeId);
    const target = record === undefined ? undefined : byId.get(record.bypass);
    playSfx("jump");
    haptic("mapJump");
    setSelected(null);
    if (holeTollFor(sector, hull) > 0) {
      playSfx("hullHit", { gain: 0.5 });
      flashVignette("toll");
    }
    if (target === undefined) {
      bypassHole(holeId);
      return;
    }
    travelTo({ x: geo.nodeX(target), y: geo.rowY(target.row) }, () => {
      bypassHole(holeId);
    });
  };

  const onJump = (): void => {
    if (selected === null || jumping) return;
    const target = byId.get(selected);
    if (target === undefined || !isLegal(target)) return;
    if (target.hole === true) {
      playSfx("eventOpen");
      openWormhole(target.id);
      return;
    }
    playSfx("jump");
    haptic("mapJump");
    if (target.pocket === true) playSfx("detourEntry");
    if (target.cache === true) playSfx("cacheClaim");
    if (target.blessing !== undefined) {
      playSfx("laneMotif", { rate: target.blessing === "cursed" ? 0.72 : 1.18 });
    }
    if (target.storm === true) playSfx("stormBeat", { gain: 0.6 });
    if (target.unstable === true) {
      playSfx("stormBeat", { gain: 0.45, rate: 0.78 });
      flashVignette("surge", { strength: 0.6 });
    }
    if (target.inverted === true) playSfx("inversionCue", { gain: 0.6 });
    if (edgeMarkFor(map, position, target.id) === "mine") {
      playSfx("hullHit", { gain: 0.5 });
      playSfx("gateBreak", { gain: 0.45 });
      flashVignette("toll");
    }
    travelTo({ x: geo.nodeX(target), y: geo.rowY(target.row) }, () => {
      jumpTo(selected);
    });
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
          selectedNode.hole === true
            ? t("run:map.node.hole")
            : t("run:map.previewNode", {
                type: t(`run:map.node.${selectedNode.type}`),
                risk: t(`run:map.risk.${nodeRisk(selectedNode)}`),
              }),
          ...(selectedNode.hole === true
            ? [
                t("run:map.previewHole"),
                holeTollFor(sector, hull) > 0
                  ? t("run:hole.bypassCost", { n: holeTollFor(sector, hull) })
                  : t("run:hole.bypassFree"),
              ]
            : []),
          ...(previewName === null ? [] : [previewName]),
          ...(selectedNode.pocket === true ? [t("run:map.previewPocket")] : []),
          ...(selectedNode.cache === true ? [t("run:motif.cache")] : []),
          ...(selectedNode.unstable === true ? [t("run:motif.unstable")] : []),
          ...(selectedNode.inverted === true ? [t("run:motif.inversion")] : []),
          ...(selectedNode.storm === true ? [t("run:motif.storm")] : []),
          ...(selectedNode.blessing === undefined
            ? []
            : [t(`run:motif.${selectedNode.blessing}`)]),
          ...(edgeMarkFor(map, position, selectedNode.id) === "mine"
            ? [t("run:motif.mine")]
            : []),
          ...(edgeMarkFor(map, position, selectedNode.id) === "wormhole"
            ? [t("run:motif.wormhole")]
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
        <AxisMeter axis={axis} compact withLabel={false} explain />
        <Button
          size="compact-xs"
          variant="default"
          data-open-journal
          onClick={() => {
            useAppStore.getState().go("journal");
          }}
        >
          {t("run:journal.open")}
        </Button>
        <Button
          size="compact-xs"
          variant="default"
          data-open-build
          onClick={() => {
            useAppStore.getState().setBuildSheet(true);
          }}
        >
          {t("run:build.open")}
        </Button>
        <Button
          size="compact-xs"
          variant="default"
          data-testid="map-system-menu"
          onClick={() => {
            useAppStore.getState().setSystemMenu(true);
          }}
        >
          {t("run:system.open")}
        </Button>
        <span className={styles.tideChip ?? ""} data-map-hull>
          {t("run:map.hull", { cur: hull, max: hullMax })}
        </span>
        <span className={styles.tideChip ?? ""} data-map-scrap>
          {t("run:map.scrap", { n: scrap })}
        </span>
        <TapPopover
          label={t("battle:tideTitle")}
          testId="map-tide"
          align="end"
          content={
            <>
              <b>{t("battle:tideTitle")}</b>
              <br />
              {t("battle:tideWhy", { n: tide, pct: tide * TIDE_HP_PCT })}
            </>
          }
        >
          <span
            className={`${styles.tideChip ?? ""} ${tidePulse ? styles.tidePulse ?? "" : ""}`}
          >
            {t("run:map.tide", { n: tide })}
          </span>
        </TapPopover>
        {interference > 0 ? (
          <TapPopover
            label={t("battle:interferenceTitle")}
            testId="map-interference"
            align="end"
            content={
              <>
                <b>{t("battle:interferenceTitle")}</b>
                <br />
                {t("battle:interferenceWhy")}
              </>
            }
          >
            <span className={styles.tideChip ?? ""}>
              {t("run:map.interference", { n: interference })}
            </span>
          </TapPopover>
        ) : null}
        {runModules.length > 0 ? (
          <TapPopover
            label={t("run:map.modules", {
              used: runModules.length,
              max: moduleCap,
            })}
            testId="map-modules"
            align="end"
            content={moduleNames}
          >
            <span className={styles.tideChip ?? ""}>
              {t("run:map.modules", {
                used: runModules.length,
                max: moduleCap,
              })}
            </span>
          </TapPopover>
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
        data-testid="map-jump"
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
        data-testid="map-abandon"
        onClick={() => {
          setAbandoning(true);
        }}
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
        <>
          <AbandonConfirm
            opened={abandoning}
            prefix="map"
            onCancel={() => {
              setAbandoning(false);
            }}
          />
          {pendingWormhole === null ? null : (
            <WormholeChoice
              toll={holeTollFor(sector, hull)}
              gentle={isGentleRide(rides)}
              busy={jumping}
              onBypass={() => {
                onBypass(pendingWormhole);
              }}
              onRide={() => {
                onRide(pendingWormhole);
              }}
            />
          )}
          {warp?.phase === "burst" ? (
            <WarpStreaks color={schools.black.text} durationMs={WARP_BURST_MS} />
          ) : null}
        </>
      }

    >
      <div>
        <svg
          ref={stageRef}
          className={styles.stage}
          viewBox={`0 0 ${String(geo.viewW)} ${String(geo.viewH)}`}
          role="img"
        >
          <defs>
            <radialGradient id="caHoleWash">
              <stop offset="0%" stopColor={schools.black.stroke} stopOpacity={0.42} />
              <stop offset="70%" stopColor={schools.black.fill} stopOpacity={0.22} />
              <stop offset="100%" stopColor={schools.black.fill} stopOpacity={0} />
            </radialGradient>
          </defs>

          {map.edges.map(([a, b]) => {
            if (!visibleIds.has(a) || !visibleIds.has(b)) return null;
            const na = byId.get(a);
            const nb = byId.get(b);
            if (na === undefined || nb === undefined) return null;
            const mark = edgeMarkFor(map, a, b);
            return (
              <line
                key={`${a}-${b}`}
                data-edge-mark={mark}
                x1={geo.nodeX(na)}
                y1={geo.rowY(na.row)}
                x2={geo.nodeX(nb)}
                y2={geo.rowY(nb.row)}
                stroke={
                  mark === undefined
                    ? mixHex(tokens.line, tokens.faint, 0.35)
                    : mark === "mine"
                      ? schools.red.text
                      : mark === "wormhole"
                        ? schools.black.text
                        : tokens.amber
                }
                strokeWidth={
                  mark === undefined ? 1.2 : mark === "wormhole" ? 2.2 : 1.8
                }
                strokeDasharray={
                  mark === undefined
                    ? undefined
                    : mark === "wormhole"
                      ? "3 5"
                      : "5 4"
                }
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
            if (node.hole === true) {
              return (
                <g
                  key={node.id}
                  data-node={node.id}
                  data-testid={`map-node-${node.id}`}
                  data-node-type="hole"
                  data-node-hole="1"
                  data-node-legal={legal ? '1' : '0'}
                  className={legal ? styles.nodeSelectable ?? "" : styles.node ?? ""}
                  onClick={legal ? () => { selectNode(node.id); } : undefined}
                >
                  <circle
                    cx={geo.nodeX(node)}
                    cy={geo.rowY(node.row)}
                    r={geo.radius(node) + 14}
                    fill="url(#caHoleWash)"
                  />
                  <circle
                    cx={geo.nodeX(node)}
                    cy={geo.rowY(node.row)}
                    r={geo.radius(node)}
                    fill={tokens.bg}
                    stroke={chosen ? tokens.amber : schools.black.stroke}
                    strokeWidth={chosen ? 2.6 : 1.4}
                  />
                  <circle
                    className={reduced ? undefined : styles.vortex}
                    cx={geo.nodeX(node)}
                    cy={geo.rowY(node.row)}
                    r={geo.radius(node) - 4}
                    fill="none"
                    stroke={schools.black.text}
                    strokeWidth={2}
                    strokeDasharray="3 5"
                  />
                  <circle
                    cx={geo.nodeX(node)}
                    cy={geo.rowY(node.row)}
                    r={geo.radius(node) * 0.3}
                    fill={tokens.bg}
                    stroke={schools.black.stroke}
                    strokeWidth={0.8}
                  />
                  <text
                    x={geo.nodeX(node) + geo.radius(node) - 1}
                    y={geo.rowY(node.row) - geo.radius(node) + 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill={schools.black.text}
                  >
                    {MOTIF_BADGE.blackHoles}
                  </text>
                </g>
              );
            }
            return (
              <g
                key={node.id}
                data-node={node.id}
                data-testid={`map-node-${node.id}`}
                data-node-type={node.type}
                data-node-legal={legal ? '1' : '0'}
                data-causality={
                  node.inverted === true
                    ? "inverted"
                    : node.storm === true
                      ? "storm"
                      : undefined
                }
                className={`${legal ? styles.nodeSelectable ?? "" : styles.node ?? ""} ${
                  reduced ? "" : styles.nodeStagger ?? ""
                }`}
                style={reduced ? undefined : { animationDelay: `${String(Math.min(index, 24) * 45)}ms` }}
                opacity={done ? 0.5 : 1}
                onClick={legal ? () => { selectNode(node.id); } : undefined}
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
                {chainNodes.has(node.id) ? (
                  <text
                    data-chain-marker={node.id}
                    className={reduced ? undefined : styles.chainMark}
                    x={geo.nodeX(node) - geo.radius(node) + 1}
                    y={geo.rowY(node.row) - geo.radius(node) + 6}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={tokens.amber}
                  >
                    !
                  </text>
                ) : null}
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

          {warp === null && jumping && trail !== null && !reduced ? (
            <line
              className={styles.trail}
              data-map-trail
              x1={trail.from.x}
              y1={trail.from.y}
              x2={trail.to.x}
              y2={trail.to.y}
              stroke={tokens.accent}
              strokeWidth={2}
              strokeLinecap="round"
              style={trailStyle(trail.from, trail.to)}
            />
          ) : null}

          {arrival === null ? null : (
            <circle
              className={styles.arrival}
              data-map-arrival
              cx={arrival.x}
              cy={arrival.y}
              r={10}
              fill="none"
              stroke={tokens.accent}
              strokeWidth={2}
            />
          )}

          {warp === null && jumping ? (
            <g
              className={`${styles.marker ?? ""} ${
                reduced ? styles.markerInstant ?? "" : ""
              }`}
              data-map-marker
              style={markerStyle(marker)}
            >
              <circle r={6} fill={tokens.accent} />
            </g>
          ) : null}

          {warp === null ? null : (
            <g
              data-warp-phase={warp.phase}
              className={
                warp.phase === "suck"
                  ? styles.warpSuck ?? ""
                  : warp.phase === "land"
                    ? styles.warpLand ?? ""
                    : styles.warpHidden ?? ""
              }
              style={{ transform: `translate(${String(warp.x)}px, ${String(warp.y)}px)` }}
            >
              <circle r={9} fill={schools.black.text} />
            </g>
          )}

          {warp?.phase === "land" ? (
            <text
              data-warp-label
              x={warp.x}
              y={warp.y - 26}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill={schools.black.text}
            >
              {t("run:hole.landed", {
                rows: warp.rows,
                way: t(`run:journal.wormholeWay.${warp.direction}`),
              })}
            </text>
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
        <AxisMeter axis={axis} />
        <Button
          size="compact-xs"
          variant="default"
          onClick={() => {
            useAppStore.getState().go("journal");
          }}
        >
          {t("run:journal.open")}
        </Button>
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
  const setSystemMenu = useAppStore((s) => s.setSystemMenu);

  useBackGuard("map", () => {
    setSystemMenu(true);
  });

  useEffect(() => {
    if (map === null || position === null) go("menu");
  }, [map, position, go]);

  useEffect(() => {
    resumeUnenteredNode();
  }, []);

  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window) ?? window.setTimeout;
    idle(() => {
      prefetchBattle();
    });
  }, []);

  if (map === null || position === null) return <Screen />;
  return <MapView map={map} position={position} />;
};
