import { useEffect, useState } from "react";
import { isShipPerk } from "@/data/perks/ship";
import { MASTERY_MAX_RANK } from "@/data/shipMastery";
import type { ShipId } from "@/data/ships";
import type { SlotId } from "@/types/battle";

const MODEL_LOADERS = import.meta.glob<string>("../art/ships/*.svg", {
  query: "?raw",
  import: "default",
});

export interface ModelView {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const PINNED_VIEW: ModelView = { left: -30, top: -66, width: 330, height: 302 };

export const BARE_VIEW: ModelView = { left: -30, top: 2, width: 330, height: 166 };

export const modelAspect = (view: ModelView): string =>
  `${String(view.width)} / ${String(view.height)}`;

const viewBoxOf = (view: ModelView): string =>
  [view.left, view.top, view.width, view.height].map(String).join(" ");

export const MASTERY_NUMERALS = ["I", "II", "III", "IV", "V"] as const;

export const masteryNumeral = (rank: number): string =>
  MASTERY_NUMERALS[rank - 1] ?? "0";

const artFor = (shipId: ShipId): string =>
  shipId === "ram-proto" ? "ram" : shipId;

const modelPath = (art: string): string => `../art/ships/${art}.svg`;

const cache = new Map<string, string>();

const peekShipModel = (shipId: ShipId): string | null =>
  cache.get(artFor(shipId)) ?? null;

export const loadShipModel = async (shipId: ShipId): Promise<string | null> => {
  const art = artFor(shipId);
  const known = cache.get(art);
  if (known !== undefined) return known;
  const load = MODEL_LOADERS[modelPath(art)];
  if (load === undefined) return null;
  const svg = await load();
  cache.set(art, svg);
  return svg;
};

export const useShipModel = (shipId: ShipId): string | null => {
  const [loaded, setLoaded] = useState<{ shipId: ShipId; svg: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadShipModel(shipId).then((svg) => {
      if (alive && svg !== null) setLoaded({ shipId, svg });
    });
    return () => {
      alive = false;
    };
  }, [shipId]);
  return loaded?.shipId === shipId ? loaded.svg : peekShipModel(shipId);
};

export const modelPartNames = (
  masteryRank: number,
  perks: readonly string[],
): string[] => [
  "hull",
  ...MASTERY_NUMERALS.slice(
    0,
    Math.max(0, Math.min(masteryRank, MASTERY_MAX_RANK)),
  ).map((numeral) => `mastery-${numeral}`),
  ...perks.filter(isShipPerk).map((id) => `perk-${id}`),
];

export const litShipModel = (
  svg: string,
  on: ReadonlySet<string>,
  fresh: ReadonlySet<string>,
  view: ModelView = PINNED_VIEW,
): string =>
  svg
    .replace(/viewBox="[^"]*"/, `viewBox="${viewBoxOf(view)}"`)
    .replace(/data-part="([^"]+)"/g, (match, name: string) => {
      if (!on.has(name)) return match;
      return fresh.has(name) ? `${match} data-on="1" data-fresh="1"` : `${match} data-on="1"`;
    });

export interface ModelPin {
  left: string;
  top: string;
}

export const shipModelPins = (
  svg: string,
): Partial<Record<SlotId, ModelPin>> => {
  const pins: Partial<Record<SlotId, ModelPin>> = {};
  for (const found of svg.matchAll(
    /data-pin="([^"]+)" cx="(-?[\d.]+)" cy="(-?[\d.]+)"/g,
  )) {
    const [, slot, x, y] = found;
    if (slot === undefined || x === undefined || y === undefined) continue;
    pins[slot as SlotId] = {
      left: `${String(((Number(x) - PINNED_VIEW.left) / PINNED_VIEW.width) * 100)}%`,
      top: `${String(((Number(y) - PINNED_VIEW.top) / PINNED_VIEW.height) * 100)}%`,
    };
  }
  return pins;
};
