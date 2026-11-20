import { useTranslation } from "react-i18next";
import { cx } from "@/app/cx";
import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { Point } from "./mapGeometry";
import {
  arrivalStyle,
  markerStyle,
  trailStyle,
  warpAimMark,
  warpAimStyle,
  warpStretchStyle,
  type WarpBeat,
} from "./travel";
import styles from "./MapScreen.module.css";

interface TravelLayerProps {
  warp: WarpBeat | null;
  jumping: boolean;
  trail: { from: Point; to: Point } | null;
  arrival: Point | null;
  marker: Point;
  reduced: boolean;
}

export const TravelLayer = ({
  warp,
  jumping,
  trail,
  arrival,
  marker,
  reduced,
}: TravelLayerProps) => {
  const { t } = useTranslation(["run"]);
  const suckAim = warp?.phase === "suck" ? warp.aim : null;
  return (
    <>
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
          style={arrivalStyle()}
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
          className={cx(styles.marker, reduced && styles.markerInstant)}
          data-map-marker
          style={markerStyle(marker)}
        >
          <circle r={6} fill={tokens.accent} />
        </g>
      ) : null}

      {warp === null ? null : (
        <g
          data-warp-phase={warp.phase}
          data-warp-stretch={suckAim === null ? undefined : "1"}
          data-warp-aim={suckAim === null ? undefined : warpAimMark(suckAim)}
          className={
            warp.phase === "suck"
              ? suckAim === null
                ? styles.warpSuck ?? ""
                : undefined
              : warp.phase === "land"
                ? styles.warpLand ?? ""
                : styles.warpHidden ?? ""
          }
          style={{ transform: `translate(${String(warp.x)}px, ${String(warp.y)}px)` }}
        >
          {suckAim !== null ? (
            <g style={warpAimStyle(warp, suckAim)}>
              <g
                className={styles.warpStretch}
                style={warpStretchStyle(warp, suckAim)}
              >
                <circle
                  className={styles.warpSuck}
                  r={6}
                  fill={tokens.accent}
                />
              </g>
            </g>
          ) : (
            <circle r={9} fill={schools.black.text} />
          )}
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
    </>
  );
};
