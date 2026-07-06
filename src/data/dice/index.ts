import { BASIC_DICE } from "@/data/dice/basic";
import { FUSED_DICE } from "@/data/dice/fusion";
import { DIE_ITEMS } from "@/data/dice/items";
import type { RngStream } from "@/services/rng";
import type { DieItemDef } from "@/types/content";

export const ALL_DICE: readonly DieItemDef[] = [
  ...BASIC_DICE,
  ...DIE_ITEMS,
  ...FUSED_DICE,
];

export const DIE_BY_ID: ReadonlyMap<string, DieItemDef> = new Map(
  ALL_DICE.map((def) => [def.id, def]),
);

export const rollBaseValue = (
  defId: string,
  tier: number,
  stream: RngStream,
): number => {
  const faces = DIE_BY_ID.get(defId)?.faces;
  if (faces !== undefined && faces.length > 0) return stream.pick(faces);
  return stream.int(1, tier);
};

export { BASIC_DICE } from "@/data/dice/basic";
export { DIE_ITEMS } from "@/data/dice/items";
export { FUSED_DICE, FUSION_MAP, fusionTarget } from "@/data/dice/fusion";
