import { BASIC_DICE } from "@/data/dice/basic";
import { FUSED_DICE } from "@/data/dice/fusion";
import { DIE_ITEMS } from "@/data/dice/items";
import { PHASE10_DICE } from "@/data/dice/phase10";
import type { RngStream } from "@/services/rng";
import type { DieItemDef } from "@/types/content";

export const ALL_DICE: readonly DieItemDef[] = [
  ...BASIC_DICE,
  ...DIE_ITEMS,
  ...PHASE10_DICE,
  ...FUSED_DICE,
];

export const DIE_BY_ID: ReadonlyMap<string, DieItemDef> = new Map(
  ALL_DICE.map((def) => [def.id, def]),
);

// The Fate die is a deck-building choice, never a drop: it is capped at one per
// deck and the run has no way to enforce that on loot.
export const LOOT_DICE: readonly DieItemDef[] = [
  ...DIE_ITEMS,
  ...PHASE10_DICE,
].filter((d) => d.tier !== 100);

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
export { PHASE10_DICE } from "@/data/dice/phase10";
export { FUSED_DICE, FUSION_MAP, fusionTarget } from "@/data/dice/fusion";
