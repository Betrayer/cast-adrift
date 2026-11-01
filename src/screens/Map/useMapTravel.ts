import { useEffect, useRef, useState, type RefObject } from "react";
import type { WormholeThrow } from "@/game/map/wormhole";
import type { MapNode, NodeId } from "@/game/map/types";
import { enterNode, rideWormhole } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { nodePoint, type MapGeometry, type Point } from "./mapGeometry";
import {
  MAP_JUMP_MS,
  MARKER_TRAVEL_MS,
  WARP_BURST_MS,
  WARP_FLASH_MS,
  WARP_LAND_MS,
  WARP_SUCK_MS,
  type WarpBeat,
} from "./travel";

interface MapTravelInput {
  geo: MapGeometry;
  byId: ReadonlyMap<NodeId, MapNode>;
  posNode: MapNode | undefined;
  positionRow: number;
  reduced: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<SVGSVGElement | null>;
}

export interface MapTravel {
  jumping: boolean;
  warp: WarpBeat | null;
  marker: Point;
  trail: { from: Point; to: Point } | null;
  arrival: Point | null;
  travelTo: (to: Point, arrive: () => void) => void;
  ride: (holeId: NodeId, softLand: boolean, aim: Point | null) => void;
}

export const useMapTravel = ({
  geo,
  byId,
  posNode,
  positionRow,
  reduced,
  scrollRef,
  stageRef,
}: MapTravelInput): MapTravel => {
  const pointAt = (node: MapNode | undefined): Point =>
    node === undefined
      ? { x: geo.centerX, y: geo.rowY(positionRow) }
      : nodePoint(geo, node);

  const [jumping, setJumping] = useState(false);
  const [warp, setWarp] = useState<WarpBeat | null>(null);
  const timers = useRef<number[]>([]);
  const [marker, setMarker] = useState<Point>(() => pointAt(posNode));
  const [trail, setTrail] = useState<{ from: Point; to: Point } | null>(null);
  const [arrival, setArrival] = useState<Point | null>(null);
  const travelFrames = useRef<number[]>([]);

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
  }, [warp, geo, reduced, scrollRef, stageRef]);

  useEffect(
    () => () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      for (const id of travelFrames.current) window.cancelAnimationFrame(id);
      travelFrames.current = [];
    },
    [],
  );

  const after = (ms: number, run: () => void): void => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const landingBeat = (
    thrown: WormholeThrow | null,
    phase: WarpBeat["phase"],
  ): WarpBeat => {
    const at = pointAt(
      thrown?.landing == null ? undefined : byId.get(thrown.landing),
    );
    return {
      phase,
      x: at.x,
      y: at.y,
      rows: Math.abs(thrown?.rows ?? 0),
      direction: thrown?.direction ?? "forward",
      aim: null,
    };
  };

  const land = (arrive: () => void): void => {
    setJumping(false);
    setTrail(null);
    setArrival(null);
    arrive();
  };

  const travelTo = (to: Point, arrive: () => void): void => {
    const from = pointAt(posNode);
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

  const ride = (holeId: NodeId, softLand: boolean, aim: Point | null): void => {
    setJumping(true);
    if (reduced) {
      const result = rideWormhole(holeId, false, softLand);
      if (result?.kind === "fatal") return;
      const thrown = result === null ? null : result.throw;
      playSfx("inversionCue");
      setWarp(landingBeat(thrown, "land"));
      after(WARP_FLASH_MS, () => {
        setWarp(null);
        setJumping(false);
        if (thrown?.landing != null) enterNode(thrown.landing);
      });
      return;
    }
    const ship = pointAt(posNode);
    setWarp({
      phase: "suck",
      x: ship.x,
      y: ship.y,
      rows: 0,
      direction: "forward",
      aim,
    });
    after(WARP_SUCK_MS, () => {
      const result = rideWormhole(holeId, false, softLand);
      if (result?.kind === "fatal") return;
      const thrown = result === null ? null : result.throw;
      const burst = landingBeat(thrown, "burst");
      playSfx("inversionCue");
      setWarp(burst);
      after(WARP_BURST_MS, () => {
        setWarp((beat) => (beat === null ? null : { ...beat, phase: "land" }));
        playSfx("navTick", { gain: 1.6 });
        setArrival({ x: burst.x, y: burst.y });
        after(WARP_LAND_MS, () => {
          setWarp(null);
          setArrival(null);
          setJumping(false);
          if (thrown?.landing != null) enterNode(thrown.landing);
        });
      });
    });
  };

  return { jumping, warp, marker, trail, arrival, travelTo, ride };
};
