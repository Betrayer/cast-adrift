import { hslToHex, tintHex } from "@/app/color";
import type { SchoolTint } from "@/data/themes";
import type { School } from "@/types/content";

export interface SchoolColors {
  fill: string;
  stroke: string;
  text: string;
}

export const BASE_SCHOOLS: Record<School, SchoolColors> = {
  red: { fill: "#2B1214", stroke: "#E4574E", text: "#F0A09A" },
  blue: { fill: "#10233A", stroke: "#4A90E2", text: "#9CC4F2" },
  green: { fill: "#14260F", stroke: "#6FBF4B", text: "#A8DF8E" },
  grey: { fill: "#1C2230", stroke: "#8A93A6", text: "#C3CBDA" },
  yellow: { fill: "#2E2412", stroke: "#E8B23A", text: "#F0CE7E" },
  black: { fill: "#171126", stroke: "#B08CFF", text: "#D9CBFF" },
  prismatic: { fill: "#1E2340", stroke: "#8FD0FF", text: "#CFEBFF" },
};

export const SCHOOL_IDS = Object.keys(BASE_SCHOOLS) as School[];

export const schools: Record<School, SchoolColors> = {
  red: { ...BASE_SCHOOLS.red },
  blue: { ...BASE_SCHOOLS.blue },
  green: { ...BASE_SCHOOLS.green },
  grey: { ...BASE_SCHOOLS.grey },
  yellow: { ...BASE_SCHOOLS.yellow },
  black: { ...BASE_SCHOOLS.black },
  prismatic: { ...BASE_SCHOOLS.prismatic },
};

export const tintedSchools = (
  tint: SchoolTint | undefined,
): Record<School, SchoolColors> => {
  const out = {} as Record<School, SchoolColors>;
  for (const id of SCHOOL_IDS) {
    const base = BASE_SCHOOLS[id];
    if (tint === undefined) {
      out[id] = { ...base };
      continue;
    }
    const lightShift = tint.lightShift[id] ?? 0;
    if (tint.monochrome === true) {
      out[id] = {
        fill: hslToHex({ h: tint.hue, s: tint.satScale * 0.5, l: 0.05 + lightShift * 0.1 }),
        stroke: hslToHex({ h: tint.hue, s: tint.satScale, l: lightShift }),
        text: hslToHex({
          h: tint.hue,
          s: tint.satScale * 0.8,
          l: Math.min(0.93, lightShift + 0.2),
        }),
      };
      continue;
    }
    const apply = (hex: string, extra: number): string =>
      tintHex(hex, {
        hue: tint.hue,
        hueMix: tint.hueMix,
        satScale: tint.satScale,
        lightShift: lightShift * extra,
      });
    out[id] = {
      fill: apply(base.fill, 0.35),
      stroke: apply(base.stroke, 1),
      text: apply(base.text, 0.7),
    };
  }
  return out;
};

export const applySchoolPalette = (
  next: Record<School, SchoolColors>,
): void => {
  for (const id of SCHOOL_IDS) {
    const target = schools[id];
    const source = next[id];
    target.fill = source.fill;
    target.stroke = source.stroke;
    target.text = source.text;
  }
};
