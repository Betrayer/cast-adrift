import {
  drawSalvageOffer,
  SALVAGE_BY_ID,
  SALVAGE_OFFER_SIZE,
  type SalvageFaceId,
} from "@/data/salvage";
import type { NodeId, NodeType } from "@/game/map/types";
import type { LocKey } from "@/types/content";
import { applyEventEffects } from "@/game/events/apply";
import { logConsequence } from "@/game/run/journal";
import { createStream, deriveSeed, type RngStream } from "@/services/rng";

export const SALVAGE_DECLINED: LocKey = "run:salvage.declined";

const SALVAGE_NODE_TYPES: ReadonlySet<NodeType> = new Set<NodeType>([
  "elite",
  "miniboss",
]);

export const isSalvageNode = (type: NodeType): boolean =>
  SALVAGE_NODE_TYPES.has(type);

export const salvageStreamFor = (seed: number, nodeId: NodeId): RngStream =>
  createStream(deriveSeed(seed, `salvage:${nodeId}`));

export const ACT_SCOPED_FACES: readonly SalvageFaceId[] = ["recon"];

export const rollSalvageOffer = (
  seed: number,
  nodeId: NodeId,
  exclude: readonly SalvageFaceId[] = [],
): SalvageFaceId[] =>
  drawSalvageOffer(
    salvageStreamFor(seed, nodeId),
    SALVAGE_OFFER_SIZE,
    exclude,
  );

export const applySalvageFace = (id: string, stream: RngStream): boolean => {
  const face = SALVAGE_BY_ID.get(id);
  if (face === undefined) return false;
  applyEventEffects(face.effects, stream);
  logConsequence(face.line);
  return true;
};
