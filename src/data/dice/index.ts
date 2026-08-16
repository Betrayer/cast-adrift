import { BASIC_DICE } from "@/data/dice/basic";
import { BLACK_DICE } from "@/data/dice/black";
import { BLUE_DICE } from "@/data/dice/blue";
import { FUSED_DICE } from "@/data/dice/fusion";
import { GREEN_DICE } from "@/data/dice/green";
import { GREY_DICE } from "@/data/dice/grey";
import { PRISMATIC_DICE } from "@/data/dice/prismatic";
import { RED_DICE } from "@/data/dice/red";
import { YELLOW_DICE } from "@/data/dice/yellow";
import type { RngStream } from "@/services/rng";
import type { DieItemDef } from "@/types/content";

export const POOL_DICE: readonly DieItemDef[] = [
  ...RED_DICE,
  ...BLUE_DICE,
  ...GREEN_DICE,
  ...YELLOW_DICE,
  ...BLACK_DICE,
  ...GREY_DICE,
  ...PRISMATIC_DICE,
];

export const ALL_DICE: readonly DieItemDef[] = [
  ...BASIC_DICE,
  ...POOL_DICE,
  ...FUSED_DICE,
];

export const DIE_BY_ID: ReadonlyMap<string, DieItemDef> = new Map(
  ALL_DICE.map((def) => [def.id, def]),
);

export const LOOT_DICE: readonly DieItemDef[] = POOL_DICE.filter(
  (d) => d.tier !== 100,
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
export { RED_DICE } from "@/data/dice/red";
export { BLUE_DICE } from "@/data/dice/blue";
export { GREEN_DICE } from "@/data/dice/green";
export { YELLOW_DICE } from "@/data/dice/yellow";
export { BLACK_DICE } from "@/data/dice/black";
export { GREY_DICE } from "@/data/dice/grey";
export { PRISMATIC_DICE } from "@/data/dice/prismatic";
export { FUSED_DICE, FUSION_MAP, fusionTarget } from "@/data/dice/fusion";
