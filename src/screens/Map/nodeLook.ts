import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { MapGraph, MapNode } from "@/game/map/types";
import type { RiskBand } from "@/game/map/risk";

export const ringFor = (
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

export const glyphColorFor = (type: MapNode["type"]): string => {
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

export const LEGEND_TYPES: readonly MapNode["type"][] = [
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

export const nodeStamp = (
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

export const RISK_RATE: Record<RiskBand, number> = {
  low: 1.14,
  raised: 0.96,
  high: 0.78,
};

export const MOTIF_BADGE = {
  pocket: "✦",
  cache: "◈",
  unstable: "⚡",
  blessed: "○",
  cursed: "●",
  inversion: "⇅",
  storm: "≋",
  blackHoles: "◉",
  wormhole: "◌",
  mine: "─",
} as const;

export type MotifKey = keyof typeof MOTIF_BADGE;

export const motifColor = (key: MotifKey): string => {
  switch (key) {
    case "pocket":
      return tokens.amber;
    case "cache":
      return schools.yellow.text;
    case "unstable":
    case "cursed":
    case "mine":
      return schools.red.text;
    case "inversion":
      return schools.prismatic.text;
    case "storm":
    case "blessed":
      return schools.blue.text;
    case "blackHoles":
    case "wormhole":
      return schools.black.text;
  }
};

export const nodeMotif = (node: MapNode): MotifKey | null => {
  if (node.hole === true) return null;
  if (node.pocket === true) return "pocket";
  if (node.cache === true) return "cache";
  if (node.unstable === true) return "unstable";
  if (node.inverted === true) return "inversion";
  if (node.storm === true) return "storm";
  return node.blessing ?? null;
};

export interface MotifLegendEntry {
  key: MotifKey;
  present: (map: MapGraph) => boolean;
}

export const MOTIF_LEGEND: readonly MotifLegendEntry[] = [
  {
    key: "pocket",
    present: (map) => map.nodes.some((n) => n.pocket === true),
  },
  {
    key: "cache",
    present: (map) => map.nodes.some((n) => n.cache === true),
  },
  {
    key: "unstable",
    present: (map) => map.nodes.some((n) => n.unstable === true),
  },
  {
    key: "blessed",
    present: (map) => map.nodes.some((n) => n.blessing === "blessed"),
  },
  {
    key: "cursed",
    present: (map) => map.nodes.some((n) => n.blessing === "cursed"),
  },
  {
    key: "inversion",
    present: (map) => map.nodes.some((n) => n.inverted === true),
  },
  {
    key: "storm",
    present: (map) => map.nodes.some((n) => n.storm === true),
  },
  {
    key: "mine",
    present: (map) =>
      Object.values(map.edgeMarks).some((mark) => mark === "mine"),
  },
  {
    key: "blackHoles",
    present: (map) => map.nodes.some((n) => n.hole === true),
  },
  {
    key: "wormhole",
    present: (map) =>
      Object.values(map.edgeMarks).some((mark) => mark === "wormhole"),
  },
];
