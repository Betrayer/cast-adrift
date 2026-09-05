import type { ReactNode } from "react";
import { schools } from "@/data/schools";
import { shipGlyphFor, type GlyphPoint } from "@/data/shipGlyphs";
import { SHIP_BY_ID, type BridgePin, type ShipId } from "@/data/ships";
import styles from "./ShipSilhouette.module.css";

const VIEW = 1.6;

const SVG_INSET_PCT = 8;

const SVG_SPAN_PCT = 100 - SVG_INSET_PCT * 2;

const points = (poly: readonly GlyphPoint[]): string =>
  poly.map(([x, y]) => `${String(x)},${String(y)}`).join(" ");

export const pinStyle = (point: BridgePin): Record<string, string> => ({
  left: `${String(50 + (point[0] / VIEW) * SVG_SPAN_PCT)}%`,
  top: `${String(50 + (point[1] / VIEW) * SVG_SPAN_PCT)}%`,
});

interface ShipSilhouetteProps {
  shipId: ShipId;
  children?: ReactNode;
}

export const ShipSilhouette = ({ shipId, children }: ShipSilhouetteProps) => {
  const def = SHIP_BY_ID.get(shipId);
  if (def === undefined) return null;
  const glyph = shipGlyphFor(shipId);
  const colors = schools[def.bridgeTheme.tint];
  return (
    <div
      className={styles.stage}
      data-ship-silhouette={shipId}
      data-bridge-frame={def.bridgeTheme.frame}
      style={{
        ["--bridge-accent" as string]: colors.stroke,
        ["--bridge-wash" as string]: colors.fill,
        ["--bridge-text" as string]: colors.text,
      }}
    >
      <svg
        className={styles.svg}
        viewBox={`${String(-VIEW / 2)} ${String(-VIEW / 2)} ${String(VIEW)} ${String(VIEW)}`}
        role="presentation"
      >
        <polygon
          className={styles.hull}
          points={points(glyph.hull)}
          vectorEffect="non-scaling-stroke"
        />
        {glyph.fins.map((fin, index) => (
          <polygon
            key={index}
            className={styles.fin}
            points={points(fin)}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <circle
          className={styles.cockpit}
          cx={glyph.cockpit.x}
          cy={glyph.cockpit.y}
          r={glyph.cockpit.r}
        />
      </svg>
      {children}
    </div>
  );
};
