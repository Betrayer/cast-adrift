import { useState, type ReactNode } from "react";
import { schools } from "@/data/schools";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { useBridgeFrame } from "@/services/prefs";
import {
  BARE_VIEW,
  litShipModel,
  modelAspect,
  modelPartNames,
  PINNED_VIEW,
  useShipModel,
} from "./shipModel";
import styles from "./ShipSilhouette.module.css";

export type ShipSilhouetteSize = "hero" | "summary" | "card";

const NO_PERKS: readonly string[] = [];

interface ShipSilhouetteProps {
  shipId: ShipId;
  masteryRank?: number;
  perks?: readonly string[];
  size?: ShipSilhouetteSize;
  pinned?: boolean;
  children?: ReactNode;
}

interface SeenParts {
  key: string;
  shipId: ShipId;
  names: readonly string[];
  fresh: readonly string[];
}

export const ShipSilhouette = ({
  shipId,
  masteryRank = 0,
  perks = NO_PERKS,
  size = "hero",
  pinned = false,
  children,
}: ShipSilhouetteProps) => {
  const def = SHIP_BY_ID.get(shipId);
  const frame = useBridgeFrame();
  const svg = useShipModel(shipId);
  const names = modelPartNames(masteryRank, perks);
  const key = `${shipId}|${names.join(",")}`;
  const [seen, setSeen] = useState<SeenParts>({ key, shipId, names, fresh: [] });
  if (seen.key !== key) {
    setSeen({
      key,
      shipId,
      names,
      fresh:
        seen.shipId === shipId
          ? names.filter((name) => !seen.names.includes(name))
          : [],
    });
  }
  if (def === undefined) return null;
  const colors = schools[def.bridgeTheme.tint];
  const fresh = seen.key === key ? seen.fresh : [];
  const view = pinned ? PINNED_VIEW : BARE_VIEW;
  return (
    <div
      className={styles.stage}
      data-ship-silhouette={shipId}
      data-ship-silhouette-size={size}
      data-model-view={pinned ? "pinned" : "bare"}
      data-model-ready={svg === null ? undefined : "1"}
      data-bridge-frame={frame === "hull" ? def.bridgeTheme.frame : frame}
      style={{
        ["--bridge-accent" as string]: colors.stroke,
        ["--bridge-wash" as string]: colors.fill,
        ["--bridge-text" as string]: colors.text,
        aspectRatio: modelAspect(view),
      }}
    >
      {svg === null ? null : (
        <div
          className={styles.model}
          onAnimationEnd={() => {
            if (fresh.length > 0) setSeen((prev) => ({ ...prev, fresh: [] }));
          }}
          dangerouslySetInnerHTML={{
            __html: litShipModel(svg, new Set(names), new Set(fresh), view),
          }}
        />
      )}
      {children}
    </div>
  );
};
