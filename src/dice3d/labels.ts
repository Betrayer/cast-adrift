import { POLYHEDRA, type DieShape } from "./polyhedra";

export const faceCount = (shape: DieShape): number => POLYHEDRA[shape].faces.length;

export const faceLabels = (
  shape: DieShape,
  faces?: readonly number[],
): string[] =>
  Array.from({ length: faceCount(shape) }, (_, index) =>
    faces !== undefined && faces.length > 0
      ? String(faces[index % faces.length])
      : String(index + 1),
  );

export const TENS_LABELS: readonly string[] = Array.from({ length: 10 }, (_, i) =>
  i === 0 ? "00" : String(i * 10),
);

export const UNITS_LABELS: readonly string[] = Array.from({ length: 10 }, (_, i) =>
  String(i),
);

export interface PercentileSplit {
  tens: string;
  units: string;
}

export const splitPercentile = (value: number): PercentileSplit => {
  const clamped = Math.max(1, Math.min(100, Math.round(value)));
  const tens = clamped === 100 ? 0 : Math.floor(clamped / 10);
  return {
    tens: TENS_LABELS[tens] ?? "00",
    units: UNITS_LABELS[clamped % 10] ?? "0",
  };
};

export const readPercentile = (tens: string, units: string): number => {
  const total = Number(tens) + Number(units);
  return total === 0 ? 100 : total;
};
