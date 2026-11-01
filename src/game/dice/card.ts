import { DIE_BY_ID } from "@/data/dice";
import {
  ENGRAVING_BY_ID,
  engravingsForDie,
  type EngravingDef,
  type EngravingMap,
} from "@/data/engravings";
import { FATE_DIE_ID } from "@/data/fate";
import { DIE_PTS } from "@/data/tiers";
import {
  forgedFaces,
  forgeLevel,
  stepTier,
  type HandDie,
} from "@/game/dice/tier";
import type { DieGrowth, DieItemDef, DieTier, School } from "@/types/content";

export type DieBadgeKind =
  | "fate"
  | "forged"
  | "active"
  | "engraved"
  | "faces"
  | "growth";

export type DieFeature = DieBadgeKind | "prismatic";

export const DIE_BADGE_GLYPH: Record<DieBadgeKind, string> = {
  fate: "★",
  forged: "⚒",
  active: "◆",
  engraved: "⟡",
  faces: "▦",
  growth: "+",
};

export const DIE_BADGE_ORDER: readonly DieBadgeKind[] = [
  "fate",
  "forged",
  "active",
  "engraved",
  "faces",
  "growth",
];

export interface DieFaceModel {
  custom: boolean;
  faces: readonly number[];
  min: number;
  max: number;
  ev: number;
}

export const dieFaceModel = (def: DieItemDef, level = 0): DieFaceModel => {
  const tier = stepTier(def.tier, level);
  const faces = forgedFaces(def.faces, level) ?? [];
  if (faces.length === 0) {
    return {
      custom: false,
      faces: [],
      min: 1,
      max: tier,
      ev: (1 + tier) / 2,
    };
  }
  const sum = faces.reduce((total, face) => total + face, 0);
  return {
    custom: true,
    faces,
    min: Math.min(...faces),
    max: Math.max(...faces),
    ev: sum / faces.length,
  };
};

export const evLabel = (ev: number): string =>
  (Math.round(ev * 10) / 10).toFixed(1);

export interface DieCardInput {
  defId: string;
  engravings?: EngravingMap;
  engravingIds?: readonly string[];
  growthBonus?: number;
  fusion?: number;
}

export const handDieCardProps = (
  die: HandDie,
): Required<Pick<DieCardInput, "defId" | "fusion" | "growthBonus">> => ({
  defId: die.defId,
  fusion: forgeLevel(die),
  growthBonus: die.growthBonus ?? 0,
});

export interface DieCardModel {
  def: DieItemDef;
  tier: DieTier;
  pts: number;
  fusion: number;
  faces: DieFaceModel;
  badges: readonly DieBadgeKind[];
  features: readonly DieFeature[];
  engravings: readonly EngravingDef[];
  growth: DieGrowth | undefined;
  growthBonus: number;
}

const engravingDefsFor = (input: DieCardInput): readonly EngravingDef[] => {
  const ids =
    input.engravingIds ?? engravingsForDie(input.engravings, input.defId);
  return ids
    .map((id) => ENGRAVING_BY_ID.get(id))
    .filter((def): def is EngravingDef => def !== undefined);
};

export const dieCardModel = (input: DieCardInput): DieCardModel | null => {
  const def = DIE_BY_ID.get(input.defId);
  if (def === undefined) return null;
  const engravings = engravingDefsFor(input);
  const growthBonus = input.growthBonus ?? 0;
  const fusion = Math.max(0, input.fusion ?? 0);
  const tier = stepTier(def.tier, fusion);
  const faces = dieFaceModel(def, fusion);
  const badges = DIE_BADGE_ORDER.filter((badge) => {
    if (badge === "fate") return def.id === FATE_DIE_ID;
    if (badge === "forged") return fusion > 0;
    if (badge === "active") return def.active !== undefined;
    if (badge === "engraved") return engravings.length > 0;
    if (badge === "faces") return faces.custom;
    return def.growth !== undefined || growthBonus > 0;
  });
  const features: DieFeature[] =
    def.school === "prismatic" ? [...badges, "prismatic"] : [...badges];
  return {
    def,
    tier,
    pts: fusion === 0 ? def.pts : DIE_PTS[tier],
    fusion,
    faces,
    badges,
    features,
    engravings,
    growth: def.growth,
    growthBonus,
  };
};

export const DIE_FILTERS: readonly DieFeature[] = [
  "active",
  "engraved",
  "growth",
  "faces",
  "prismatic",
  "fate",
];

export const SCHOOL_FILTERS: readonly (School | "all")[] = [
  "all",
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

export const dieHasFeature = (
  defId: string,
  feature: DieFeature,
  engravings?: EngravingMap,
): boolean => {
  const model = dieCardModel({ defId, engravings });
  return model !== null && model.features.includes(feature);
};
