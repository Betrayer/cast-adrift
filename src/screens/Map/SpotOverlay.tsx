import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { HoleSpot } from "@/game/map/types";
import { SPOT_UNIT, type SpotEllipse } from "./spot";
import styles from "./SpotOverlay.module.css";

export const SPOT_WASH_ID = "caSpotWash";

interface RingSpec {
  band: "outer" | "mid" | "inner";
  radius: number;
  width: number;
  dash: string;
  opacity: number;
}

const RINGS: readonly RingSpec[] = [
  { band: "outer", radius: 1, width: 2.2, dash: "11 17", opacity: 0.5 },
  { band: "mid", radius: 0.72, width: 1.8, dash: "7 12", opacity: 0.68 },
  { band: "inner", radius: 0.46, width: 2.4, dash: "4 7", opacity: 0.86 },
];

interface DragSpec {
  lane: "far" | "near";
  radius: number;
  width: number;
  dash: string;
  opacity: number;
}

const DRAG: readonly DragSpec[] = [
  { lane: "far", radius: 0.87, width: 3.2, dash: "0.5 23", opacity: 0.62 },
  { lane: "near", radius: 0.59, width: 2.6, dash: "0.5 15", opacity: 0.52 },
];

interface MoteSpec {
  x: number;
  y: number;
  r: number;
  step: number;
}

const MOTES: readonly MoteSpec[] = [
  { x: 0.62, y: -0.48, r: 2.6, step: 0 },
  { x: -0.74, y: -0.21, r: 2, step: 1 },
  { x: -0.33, y: 0.66, r: 3, step: 2 },
  { x: 0.79, y: 0.34, r: 2.2, step: 3 },
  { x: 0.08, y: -0.83, r: 1.8, step: 4 },
];

export const SpotDefs = () => (
  <radialGradient id={SPOT_WASH_ID}>
    <stop offset="0%" stopColor={tokens.bg} stopOpacity={0.94} />
    <stop offset="44%" stopColor={schools.black.fill} stopOpacity={0.78} />
    <stop offset="76%" stopColor={schools.black.stroke} stopOpacity={0.24} />
    <stop offset="100%" stopColor={schools.black.fill} stopOpacity={0} />
  </radialGradient>
);

interface Props {
  spot: HoleSpot;
  ellipse: SpotEllipse;
  reduced: boolean;
  label: string;
  onOpen: (() => void) | null;
}

export const SpotOverlay = ({ spot, ellipse, reduced, label, onOpen }: Props) => {
  const disc = `translate(${String(ellipse.cx)} ${String(ellipse.cy)}) scale(${String(
    ellipse.rx / SPOT_UNIT,
  )} ${String(ellipse.ry / SPOT_UNIT)})`;
  return (
    <g
      data-testid="map-spot"
      data-spot-id={spot.id}
      data-spot-motion={reduced ? "static" : "live"}
      data-spot-open={onOpen === null ? "0" : "1"}
      className={
        onOpen === null ? styles.spot ?? "" : styles.spotOpen ?? ""
      }
      onClick={onOpen ?? undefined}
    >
      <title>{label}</title>
      <ellipse
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx}
        ry={ellipse.ry}
        fill={`url(#${SPOT_WASH_ID})`}
      />
      <g transform={disc}>
        {RINGS.map((ring) => (
          <circle
            key={ring.band}
            data-spot-ring={ring.band}
            className={styles[ring.band] ?? ""}
            r={SPOT_UNIT * ring.radius}
            fill="none"
            stroke={ring.band === "outer" ? schools.black.stroke : schools.black.text}
            strokeWidth={ring.width}
            strokeDasharray={ring.dash}
            opacity={ring.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {DRAG.map((lane) => (
          <circle
            key={lane.lane}
            data-spot-drag={lane.lane}
            className={styles[lane.lane] ?? ""}
            r={SPOT_UNIT * lane.radius}
            fill="none"
            stroke={schools.black.text}
            strokeWidth={lane.width}
            strokeDasharray={lane.dash}
            strokeLinecap="round"
            opacity={lane.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {MOTES.map((mote) => (
          <circle
            key={`${String(mote.x)}:${String(mote.y)}`}
            data-spot-mote={mote.step}
            className={styles.mote ?? ""}
            cx={SPOT_UNIT * mote.x}
            cy={SPOT_UNIT * mote.y}
            r={mote.r}
            fill={schools.black.text}
            opacity={0.72}
            style={{ animationDelay: `${String(mote.step * 430)}ms` }}
          />
        ))}
        <circle
          data-spot-core
          className={styles.core ?? ""}
          r={SPOT_UNIT * 0.22}
          fill={tokens.bg}
          stroke={schools.black.stroke}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <ellipse
        data-spot-hit
        cx={ellipse.cx}
        cy={ellipse.cy}
        rx={ellipse.rx}
        ry={ellipse.ry}
        fill="none"
        pointerEvents={onOpen === null ? "none" : "all"}
      />
    </g>
  );
};
