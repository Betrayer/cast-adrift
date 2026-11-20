import { DIE_BY_ID } from "@/data/dice";
import type { DieTier } from "@/types/content";

export const TIER_LADDER: readonly DieTier[] = [4, 6, 8, 10, 12, 20, 100];

export const FORGE_TIER_CEILING: DieTier = 20;

export type ForgeLevel = 1 | 2;

export const FORGE_MAX_LEVEL: ForgeLevel = 2;

export interface DieFusion {
  level: ForgeLevel;
  consumed: readonly string[];
}

export interface HandDie {
  defId: string;
  fusion?: DieFusion;
  growthBonus?: number;
}

export type DeckEntry = string | HandDie;

export const handDie = (entry: DeckEntry): HandDie =>
  typeof entry === "string" ? { defId: entry } : entry;

export const forgeLevel = (die: HandDie): number => die.fusion?.level ?? 0;

export const stepTier = (tier: DieTier, steps: number): DieTier => {
  const index = TIER_LADDER.indexOf(tier);
  const ceiling = TIER_LADDER.indexOf(FORGE_TIER_CEILING);
  if (index < 0 || index > ceiling) return tier;
  return TIER_LADDER[Math.min(ceiling, index + Math.max(0, steps))] ?? tier;
};

const baseTier = (defId: string): DieTier => {
  const def = DIE_BY_ID.get(defId);
  if (def === undefined) throw new Error(`baseTier: unknown die def "${defId}"`);
  return def.tier;
};

export const dieTier = (die: HandDie): DieTier =>
  stepTier(baseTier(die.defId), forgeLevel(die));

const extendFaces = (
  faces: readonly number[],
  levels: number,
): number[] => {
  const out = [...faces];
  for (let level = 0; level < levels; level += 1) {
    const top = Math.max(...out) + 1;
    out.push(top, top);
  }
  return out;
};

export const forgedFaces = (
  faces: readonly number[] | undefined,
  level: number,
): readonly number[] | undefined => {
  if (faces === undefined || faces.length === 0) return undefined;
  return level === 0 ? faces : extendFaces(faces, level);
};

export const dieFaces = (die: HandDie): readonly number[] | undefined =>
  forgedFaces(DIE_BY_ID.get(die.defId)?.faces, forgeLevel(die));

export const facesIfForged = (die: HandDie): readonly number[] | undefined =>
  forgeLevel(die) > 0 ? dieFaces(die) : undefined;

export const resolveFaces = (defId: string, tier: DieTier): number[] => {
  const faces = DIE_BY_ID.get(defId)?.faces;
  if (faces !== undefined && faces.length > 0) return [...faces];
  return Array.from({ length: tier }, (_, i) => i + 1);
};
