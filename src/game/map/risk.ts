import type { MapNode } from "@/game/map/types";

export type RiskBand = "low" | "raised" | "high";

const FIGHT_TYPES: readonly MapNode["type"][] = [
  "battle",
  "elite",
  "miniboss",
  "boss",
];

export const isFightNode = (node: MapNode): boolean =>
  FIGHT_TYPES.includes(node.type);

export const nodeRisk = (node: MapNode): RiskBand => {
  if (node.type === "boss" || node.type === "miniboss" || node.type === "elite") {
    return "high";
  }
  if (node.pocket === true) return isFightNode(node) ? "high" : "raised";
  if (node.unstable === true || node.blessing === "cursed") return "raised";
  return "low";
};
