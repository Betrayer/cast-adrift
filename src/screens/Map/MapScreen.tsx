import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/app/backGuard";
import { useAtLeast } from "@/app/breakpoints";
import { Screen } from "@/app/Screen";
import { prefetchBattle } from "@/app/prefetch";
import { schools } from "@/data/schools";
import { ENEMY_BY_ID } from "@/data/enemies";
import { MODULE_BY_ID } from "@/data/modules";
import { echoPreviewRows, echoSoftLands } from "@/data/echo";
import { fogRowsFor } from "@/game/map/fog";
import { cargoDef, cargoPayout } from "@/data/cargo";
import { runModifiers } from "@/game/run/weather";
import { sectorDef } from "@/data/sectors";
import { emitBark } from "@/game/narrative/barks";
import {
  officerBarkWaitMs,
  spendOfficerBark,
} from "@/game/narrative/officerBark";
import { pickBoss, pickMiniboss } from "@/game/run/encounter";
import { playSfx } from "@/services/audio";
import { createStream, deriveSeed } from "@/services/rng";
import {
  bypassHole,
  jumpTo,
  openWormhole,
  resumeUnenteredNode,
} from "@/game/run/flow";
import { bypassTargetFor } from "@/game/map/wormhole";
import {
  edgeMarkFor,
  nodeById,
  spotOf,
  type HoleSpot,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { nodeRisk } from "@/game/map/risk";
import { haptic } from "@/services/tma";
import { flashVignette } from "@/services/vignette";
import { tierForNode } from "@/game/puzzles/selection";
import { AbandonConfirm } from "@/components/AbandonConfirm";
import { WarpStreaks } from "@/components/WarpStreaks";
import { ridesStayGentle } from "@/game/run/motifs";
import { WormholeChoice } from "./WormholeChoice";
import { SpotDefs, SpotOverlay } from "./SpotOverlay";
import { chainMarkedNodes } from "@/game/narrative/chainMarkers";
import { mapGeometry, nodePoint, ROW_GAP, type Point } from "./mapGeometry";
import {
  adjacentBypassOffer,
  bandHorizons,
  bypassCopyKey,
  bypassCopyVars,
  bypassOfferFor,
  bypassState,
  spotEllipse,
  spotEntryFor,
  spotMembers,
  type BypassOffer,
  type SpotEllipse,
} from "./spot";
import { WARP_BURST_MS } from "./travel";
import {
  isLegalNode,
  isPreviewableNode,
  isVisibleNode,
  pathEdgesTo,
  type EdgePair,
  type MapVantage,
} from "./vantage";
import { useReducedMotion } from "@/stores/settingsStore";
import { useAppStore } from "@/stores/appStore";
import { runModuleSlots, useRunStore } from "@/stores/runStore";
import { BaseEdges, PathHighlight } from "./MapEdges";
import { MapFog } from "./MapFog";
import { MapFooter } from "./MapFooter";
import { MapHeader } from "./MapHeader";
import { HoleNodeMark, NodeMark } from "./MapNodeMark";
import { MapSidePanel } from "./MapSidePanel";
import { MOTIF_LEGEND, RISK_RATE } from "./nodeLook";
import { TravelLayer } from "./TravelLayer";
import { useChainMarkPop } from "./useChainMarkPop";
import { useMapTravel } from "./useMapTravel";
import { useTidePulse } from "./useTidePulse";
import styles from "./MapScreen.module.css";

interface MapViewProps {
  map: MapGraph;
  position: NodeId;
}

const revealMemory: { map: MapGraph | null } = { map: null };

const IDLE_BARK_MS = 25000;

const IDLE_BARK_WAKE: readonly string[] = ["pointerdown", "keydown", "wheel"];

const MapView = ({ map, position }: MapViewProps) => {
  const wide = useAtLeast("lg");
  const { t } = useTranslation(["run", "common", "battle", "content"]);
  const visited = useRunStore((s) => s.visited);
  const tide = useRunStore((s) => s.tide);
  const runModules = useRunStore((s) => s.modules);
  const moduleCap = useRunStore(runModuleSlots);
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
  const ascension = useRunStore((s) => s.ascension);
  const seed = useRunStore((s) => s.seed);
  const usedMinibosses = useRunStore((s) => s.usedMinibosses);
  const pendingDeepScan = useRunStore((s) => s.pendingDeepScan);
  const bonusReveal = useRunStore((s) => s.bonusReveal);
  const sectorReveal = useRunStore((s) => s.sectorReveal);
  const mutators = useRunStore((s) => s.mutators);
  const heldCargo = useRunStore((s) => s.cargo);
  const sectorIndex = useRunStore((s) => s.sectorIndex);
  const sensorsMk = useRunStore((s) => s.mkLevels.sensors ?? 1);
  const echo = useRunStore((s) => s.echo);
  const echoUsed = useRunStore((s) => s.echoUsed);
  const reduced = useReducedMotion();
  const [stagger] = useState(() => !reduced && revealMemory.map !== map);

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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<SVGSVGElement | null>(null);
  const prevLimit = useRef(0);

  const visibleRows = fogRowsFor({
    sensorsMk,
    deepScan: pendingDeepScan,
    bonusReveal,
    sectorReveal,
    echo,
    mutators,
  });
  const visibleLimit = positionRow + visibleRows;
  const ghostRows = echoPreviewRows(echo);

  const deliveries = heldCargo.filter(
    (held) => held.sectorIndex === sectorIndex,
  );
  const deliveryIds = new Set(deliveries.map((held) => held.nodeId));
  const vantage: MapVantage = {
    map,
    position,
    positionRow,
    visited,
    visibleLimit,
    deliveryIds,
    ghostRows,
  };
  const scrapMult = sectorDef(sector).scrapMult;
  const deliveryPayout = (nodeId: NodeId): number =>
    deliveries
      .filter((held) => held.nodeId === nodeId)
      .reduce((sum, held) => {
        const def = cargoDef(held.defId);
        return def === undefined ? sum : sum + cargoPayout(def, scrapMult);
      }, 0);

  const isLegal = (node: MapNode): boolean => isLegalNode(vantage, node);
  const isPreviewable = (node: MapNode): boolean =>
    isPreviewableNode(vantage, node);

  const visibleNodes = map.nodes.filter((node) => isVisibleNode(vantage, node));
  const visibleIds = new Set(visibleNodes.map((n) => n.id));

  const drawnSpot = (spot: HoleSpot): SpotEllipse | null =>
    spotEllipse(geo, spotMembers(spot, byId, visibleIds));

  const bandCentre = (holeId: NodeId): Point | null => {
    const spot = spotOf(map, holeId);
    const ellipse = spot === undefined ? null : drawnSpot(spot);
    return ellipse === null ? null : { x: ellipse.cx, y: ellipse.cy };
  };

  const bypassOffer = (holeId: NodeId): BypassOffer =>
    bypassOfferFor(map, position, holeId, visited, sector, hull, hullMax, ascension);

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
    revealMemory.map = map;
  }, [map]);

  useEffect(() => {
    if (visibleLimit > prevLimit.current) playSfx("fogReveal");
    prevLimit.current = visibleLimit;
  }, [visibleLimit]);

  useChainMarkPop(chainNodes, seed, sector);

  const { jumping, warp, marker, trail, arrival, travelTo, ride } =
    useMapTravel({
      geo,
      byId,
      posNode,
      positionRow,
      reduced,
      scrollRef,
      stageRef,
    });

  const tidePulse = useTidePulse(tide, reduced);

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

  const onRide = (holeId: NodeId, softLand = false): void => {
    if (jumping) return;
    const hole = byId.get(holeId);
    setSelected(null);
    haptic("bossIntro");
    playSfx("foldBeat", { gain: 0.9 });
    ride(
      holeId,
      softLand,
      bandCentre(holeId) ?? (hole === undefined ? null : nodePoint(geo, hole)),
    );
  };

  const onBypass = (holeId: NodeId): void => {
    const offer = bypassOffer(holeId);
    if (jumping || bypassState(offer) !== "cost") return;
    const landing = bypassTargetFor(map, position, holeId, visited);
    const target = landing === null ? undefined : byId.get(landing);
    playSfx("jump");
    haptic("mapJump");
    setSelected(null);
    if (offer.toll > 0) {
      playSfx("hullHit", { gain: 0.5 });
      flashVignette("toll");
    }
    if (target === undefined) {
      bypassHole(holeId);
      return;
    }
    travelTo(nodePoint(geo, target), () => {
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
    travelTo(nodePoint(geo, target), () => {
      jumpTo(selected);
    });
  };

  const onSpot = (entry: NodeId): void => {
    if (jumping) return;
    playSfx("eventOpen");
    setSelected(entry);
    openWormhole(entry);
  };

  const fogBottom =
    visibleLimit >= map.shape.bossRow
      ? 0
      : geo.rowY(visibleLimit) - ROW_GAP / 2;

  const motifLegend = MOTIF_LEGEND.filter((entry) =>
    entry.present(map),
  );

  const modifiers = runModifiers(mutators);

  const selectedNode = selected === null ? null : byId.get(selected);
  const canJump =
    !jumping && selectedNode !== undefined && selectedNode !== null && isLegal(selectedNode);

  const pathEdges: readonly EdgePair[] =
    selectedNode === undefined || selectedNode === null
      ? []
      : pathEdgesTo(vantage, byId, selectedNode, visibleIds);

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
    selectedNode === undefined ||
    selectedNode === null ||
    selectedNode.hole === true
      ? null
      : tierForNode(seed, selectedNode);

  const selectedOffer =
    selectedNode === undefined || selectedNode === null
      ? null
      : adjacentBypassOffer(
          map,
          position,
          selectedNode,
          visited,
          sector,
          hull,
          hullMax,
          ascension,
        );

  const bypassPreview =
    selectedOffer === null
      ? null
      : t(bypassCopyKey(selectedOffer), bypassCopyVars(selectedOffer));

  const selectedMark =
    selectedNode === undefined || selectedNode === null
      ? undefined
      : edgeMarkFor(map, position, selectedNode.id);

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
          ...(bypassPreview === null
            ? []
            : [t("run:map.previewHole"), bypassPreview]),
          ...(previewName === null ? [] : [previewName]),
          ...(selectedNode.pocket === true ? [t("run:map.previewPocket")] : []),
          ...(selectedNode.cache === true ? [t("run:motif.cache")] : []),
          ...(selectedNode.unstable === true ? [t("run:motif.unstable")] : []),
          ...(selectedNode.inverted === true ? [t("run:motif.inversion")] : []),
          ...(selectedNode.storm === true ? [t("run:motif.storm")] : []),
          ...(selectedNode.blessing === undefined
            ? []
            : [t(`run:motif.${selectedNode.blessing}`)]),
          ...(selectedMark === "mine" ? [t("run:motif.mine")] : []),
          ...(selectedMark === "wormhole" ? [t("run:motif.wormhole")] : []),
          ...(deliveryIds.has(selectedNode.id)
            ? [
                t("run:map.previewDelivery", {
                  n: deliveryPayout(selectedNode.id),
                }),
              ]
            : []),
        ];

  return (
    <Screen
      width="full"
      pad={false}
      header={
        <MapHeader
          map={map}
          sector={sector}
          positionRow={positionRow}
          axis={axis}
          wide={wide}
          hull={hull}
          hullMax={hullMax}
          scrap={scrap}
          tide={tide}
          tidePulse={tidePulse}
          interference={interference}
          modifiers={modifiers}
          deliveries={deliveries}
          moduleCount={runModules.length}
          moduleCap={moduleCap}
          moduleNames={moduleNames}
        />
      }
      footer={
        <MapFooter
          anomalyTier={anomalyTier}
          lines={previewLines}
          bypassLine={bypassPreview}
          bypassOffer={selectedOffer}
          canJump={canJump}
          hasSelection={selected !== null}
          onJump={onJump}
          onAbandon={() => {
            setAbandoning(true);
          }}
        />
      }
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
          {pendingWormhole === null || jumping ? null : (
            <WormholeChoice
              offer={bypassOffer(pendingWormhole)}
              rides={rides}
              unstable={!ridesStayGentle(ascension)}
              softLand={echoSoftLands(echo)}
              softLandSpent={echoUsed}
              onBypass={() => {
                onBypass(pendingWormhole);
              }}
              onRide={() => {
                onRide(pendingWormhole);
              }}
              onSoftLand={() => {
                onRide(pendingWormhole, true);
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
          data-map-reveal={stagger ? "stagger" : "static"}
        >
          <defs>
            <SpotDefs />
          </defs>

          <PathHighlight
            edges={pathEdges}
            byId={byId}
            geo={geo}
            selected={selected}
            hidden={pendingWormhole !== null}
          />

          <BaseEdges map={map} byId={byId} geo={geo} visibleIds={visibleIds} />

          {map.spots.map((spot) => {
            const ellipse = drawnSpot(spot);
            if (ellipse === null) return null;
            const entry = spotEntryFor(map, position, spot, visited);
            return (
              <SpotOverlay
                key={spot.id}
                spot={spot}
                ellipse={ellipse}
                reduced={reduced}
                label={t("run:map.spotLabel")}
                horizons={bandHorizons(geo, spot, map.shape.lanes, visibleLimit)}
                onOpen={
                  entry === null || jumping
                    ? null
                    : () => {
                        onSpot(entry);
                      }
                }
              />
            );
          })}

          {visibleNodes.map((node) =>
            node.hole === true ? (
              <HoleNodeMark
                key={node.id}
                node={node}
                geo={geo}
                chosen={node.id === selected}
                legal={isLegal(node)}
                previewable={isPreviewable(node)}
                stagger={stagger}
                rowsAway={node.row - positionRow}
                onSelect={selectNode}
              />
            ) : (
              <NodeMark
                key={node.id}
                node={node}
                geo={geo}
                current={node.id === position}
                chosen={node.id === selected}
                legal={isLegal(node)}
                previewable={isPreviewable(node)}
                done={visited.includes(node.id) && node.id !== position}
                stagger={stagger}
                rowsAway={node.row - positionRow}
                reduced={reduced}
                chained={chainNodes.has(node.id)}
                delivery={deliveryIds.has(node.id)}
                interference={interference}
                onSelect={selectNode}
              />
            ),
          )}

          <MapFog geo={geo} fogBottom={fogBottom} />

          <TravelLayer
            warp={warp}
            jumping={jumping}
            trail={trail}
            arrival={arrival}
            marker={marker}
            reduced={reduced}
          />
        </svg>
      </div>

      <MapSidePanel
        sector={sector}
        positionRow={positionRow}
        bossRow={map.shape.bossRow}
        tide={tide}
        axis={axis}
        wide={wide}
        moduleCount={runModules.length}
        moduleNames={moduleNames}
        modifiers={modifiers}
        motifLegend={motifLegend}
        stagger={stagger}
      />
    </Screen>
  );
};

export const MapScreen = () => {
  const map = useRunStore((s) => s.map);
  const position = useRunStore((s) => s.position);
  const rescued = useRunStore((s) => s.pendingOfficerBark);
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
    if (!rescued) return;
    const wait = officerBarkWaitMs();
    if (wait === 0) {
      spendOfficerBark();
      return;
    }
    const timer = window.setTimeout(() => {
      spendOfficerBark();
    }, wait);
    return () => {
      window.clearTimeout(timer);
    };
  }, [rescued]);

  useEffect(() => {
    if (map === null || position === null) return;
    let timer = 0;
    const arm = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        emitBark("idleMap");
        arm();
      }, IDLE_BARK_MS);
    };
    for (const name of IDLE_BARK_WAKE) {
      window.addEventListener(name, arm, { passive: true });
    }
    arm();
    return () => {
      window.clearTimeout(timer);
      for (const name of IDLE_BARK_WAKE) window.removeEventListener(name, arm);
    };
  }, [map, position]);

  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window) ?? window.setTimeout;
    idle(() => {
      prefetchBattle();
    });
  }, []);

  if (map === null || position === null) return <Screen />;
  return <MapView map={map} position={position} />;
};
