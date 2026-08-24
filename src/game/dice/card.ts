import { DIE_BY_ID } from "@/data/dice";
import {
  ENGRAVING_BY_ID,
  engravingsForDie,
  type EngravingDef,
  type EngravingMap,
} from "@/data/engravings";
import { FATE_DIE_ID } from "@/data/fate";
import type { DieGrowth, DieItemDef } from "@/types/content";

export type DieBadgeKind = "fate" | "active" | "engraved" | "faces" | "growth";

export type DieFeature = DieBadgeKind | "prismatic";

export const DIE_BADGE_GLYPH: Record<DieBadgeKind, string> = {
  fate: "★",
  active: "◆",
  engraved: "⟡",
  faces: "▦",
  growth: "+",
};

export const DIE_BADGE_ORDER: readonly DieBadgeKind[] = [
  "fate",
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

export const dieFaceModel = (def: DieItemDef): DieFaceModel => {
  const faces = def.faces ?? [];
  if (faces.length === 0) {
    return {
      custom: false,
      faces: [],
      min: 1,
      max: def.tier,
      ev: (1 + def.tier) / 2,
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
}

export interface DieCardModel {
  def: DieItemDef;
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
  const faces = dieFaceModel(def);
  const badges = DIE_BADGE_ORDER.filter((badge) => {
    if (badge === "fate") return def.id === FATE_DIE_ID;
    if (badge === "active") return def.active !== undefined;
    if (badge === "engraved") return engravings.length > 0;
    if (badge === "faces") return faces.custom;
    return def.growth !== undefined || growthBonus > 0;
  });
  const features: DieFeature[] =
    def.school === "prismatic" ? [...badges, "prismatic"] : [...badges];
  return {
    def,
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

export const dieHasFeature = (
  defId: string,
  feature: DieFeature,
  engravings?: EngravingMap,
): boolean => {
  const model = dieCardModel({ defId, engravings });
  return model !== null && model.features.includes(feature);
};
