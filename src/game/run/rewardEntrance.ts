import { createStream, deriveSeed } from "@/services/rng";

export const REWARD_ENTRANCES = ["fan", "flip", "slide", "spin", "pop"] as const;

export type RewardEntrance = (typeof REWARD_ENTRANCES)[number];

export const LEGACY_ENTRANCE: RewardEntrance = "slide";

export const entranceKey = (sectorIndex: number, nodeId: string): string =>
  `vfx:reward:${String(sectorIndex)}:${nodeId}`;

export const pickEntrance = (
  seed: number,
  key: string,
  previous: RewardEntrance | null,
): RewardEntrance => {
  const pool = REWARD_ENTRANCES.filter((entrance) => entrance !== previous);
  return createStream(deriveSeed(seed, key)).pick(pool);
};
