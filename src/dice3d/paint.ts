import { mixHex } from "@/app/color";
import { clamp01 } from "@/app/math";
import type { DieShape } from "./polyhedra";
import type { ProjectedFace } from "./projection";

export interface DiePalette {
  fill: string;
  stroke: string;
  text: string;
}

export const LABEL_MIN_FACING = 0.35;

export const LABEL_FULL_FACING = 0.75;

export const faceColour = (palette: DiePalette, shade: number): string =>
  mixHex(palette.fill, palette.stroke, 0.18 + 0.62 * shade);

export const labelAlphaFor = (facing: number): number =>
  clamp01((facing - LABEL_MIN_FACING) / (LABEL_FULL_FACING - LABEL_MIN_FACING));

export interface LabelPlacement {
  face: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  front: boolean;
}

export const LABEL_SLOTS = 3;

export const SIDE_LABEL_SCALE = 0.36;

export const frontLabelScale = (shape: DieShape): number =>
  shape === 6 ? 0.6 : shape === 4 ? 0.44 : 0.5;

export const labelPlacements = (
  faces: readonly ProjectedFace[],
  labels: readonly string[],
  front: string | null,
  alpha: number,
): LabelPlacement[] => {
  const visible = [...faces]
    .filter((face) => face.facing > LABEL_MIN_FACING)
    .sort((a, b) => b.facing - a.facing)
    .slice(0, LABEL_SLOTS);
  return visible.map((face, rank) => ({
    face: face.index,
    text: rank === 0 && front !== null ? front : (labels[face.index] ?? ""),
    x: face.centre.x,
    y: face.centre.y,
    alpha: alpha * labelAlphaFor(face.facing),
    front: rank === 0,
  }));
};
