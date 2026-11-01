import { DIE_BY_ID } from "@/data/dice";
import type { DieTier } from "@/types/content";
import {
  faceLabels,
  readPercentile,
  splitPercentile,
  TENS_LABELS,
  UNITS_LABELS,
} from "./labels";
import { isPercentile, POLYHEDRA, shapeFor } from "./polyhedra";
import { topFace } from "./projection";
import { planRoll, type RollStyle } from "./spin";
import type { PolyPart } from "./paintPixi";

export interface RollableDie {
  defId: string;
  tier: DieTier;
  value: number | null;
  faces?: readonly number[];
}

export const UNROLLED_LABEL = "?";

export interface RollOptions {
  style: RollStyle;
  durationMs: number;
  seed: number;
  reduced: boolean;
  radius: number;
}

const PAIR_OFFSET = 0.52;
const PAIR_RADIUS = 0.6;

export const rollParts = (die: RollableDie, options: RollOptions): PolyPart[] => {
  const base = {
    style: options.style,
    durationMs: options.durationMs,
    reduced: options.reduced,
  };
  if (isPercentile(die.tier)) {
    const split =
      die.value === null
        ? { tens: UNROLLED_LABEL, units: UNROLLED_LABEL }
        : splitPercentile(die.value);
    return [
      {
        shape: 10,
        offsetX: -options.radius * PAIR_OFFSET,
        radius: options.radius * PAIR_RADIUS,
        plan: planRoll({ ...base, shape: 10, labels: TENS_LABELS, value: split.tens, seed: options.seed }),
      },
      {
        shape: 10,
        offsetX: options.radius * PAIR_OFFSET,
        radius: options.radius * PAIR_RADIUS,
        plan: planRoll({
          ...base,
          shape: 10,
          labels: UNITS_LABELS,
          value: split.units,
          seed: (options.seed ^ 0x9e3779b9) >>> 0,
        }),
      },
    ];
  }
  const shape = shapeFor(die.tier);
  const faces = die.faces ?? DIE_BY_ID.get(die.defId)?.faces;
  return [
    {
      shape,
      offsetX: 0,
      radius: options.radius,
      plan: planRoll({
        ...base,
        shape,
        labels: faceLabels(shape, faces),
        value: die.value === null ? UNROLLED_LABEL : String(die.value),
        seed: options.seed,
      }),
    },
  ];
};

export const partsEndMs = (parts: readonly PolyPart[]): number =>
  Math.max(0, ...parts.map((part) => part.plan.endMs));

const partFace = (part: PolyPart, ms: number): string => {
  const frame = part.plan.at(ms);
  if (frame.front !== null) return frame.front;
  return frame.labels[topFace(POLYHEDRA[part.shape], frame.q)] ?? "";
};

export const visibleFace = (parts: readonly PolyPart[], ms: number): string => {
  const read = parts.map((part) => partFace(part, ms));
  if (parts.length === 2) return String(readPercentile(read[0] ?? "00", read[1] ?? "0"));
  return read[0] ?? "";
};
