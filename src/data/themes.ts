import type { School } from "@/types/content";

export type ThemeId = "deepSpace" | "terminal" | "blueprint" | "aurora";

export interface ThemeTokens {
  bg: string;
  surface1: string;
  surface2: string;
  line: string;
  text: string;
  dim: string;
  faint: string;
  accent: string;
  danger: string;
  amber: string;
}

export interface SchoolTint {
  hue: number;
  hueMix: number;
  satScale: number;
  // Additive lightness deltas normally; with `monochrome` set they are read as
  // absolute lightness targets, which is what makes a single-hue theme keep
  // seven separable school steps.
  lightShift: Partial<Record<School, number>>;
  monochrome?: boolean;
}

export interface DieStyle {
  radius: number;
  strokeW: number;
  glyphFont: string;
  noise: number;
  gradient: number;
}

export interface SlotStyle {
  dashed: boolean;
  innerShadow: number;
  etching: boolean;
}

export interface BgStyle {
  starDensity: number;
  hue: number;
  scanlines?: boolean;
  grid?: boolean;
}

export interface ThemeDef {
  id: ThemeId;
  name: string;
  palette: ThemeTokens;
  schoolTint?: SchoolTint;
  dieStyle: DieStyle;
  slotStyle: SlotStyle;
  bgStyle: BgStyle;
  price: number;
}

const SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export const THEME_PRICE = 600;

const deepSpace: ThemeDef = {
  id: "deepSpace",
  name: "settings:theme.deepSpace",
  palette: {
    bg: "#0B0F1A",
    surface1: "#10182A",
    surface2: "#182238",
    line: "#2A3853",
    text: "#E8EDF7",
    dim: "#9AA8C0",
    faint: "#6C7C99",
    accent: "#7C5CFF",
    danger: "#E4574E",
    amber: "#E8B23A",
  },
  dieStyle: {
    radius: 0.23,
    strokeW: 1.5,
    glyphFont: SANS,
    noise: 0.04,
    gradient: 0.16,
  },
  slotStyle: { dashed: true, innerShadow: 0.22, etching: true },
  bgStyle: { starDensity: 1, hue: 220 },
  price: 0,
};

const terminal: ThemeDef = {
  id: "terminal",
  name: "settings:theme.terminal",
  palette: {
    bg: "#0A0F0A",
    surface1: "#0E1810",
    surface2: "#132217",
    line: "#245231",
    text: "#B8F5C0",
    dim: "#7FCB8D",
    faint: "#5E9E6B",
    accent: "#4BE07A",
    danger: "#E8705F",
    amber: "#D7E04A",
  },
  schoolTint: {
    hue: 128,
    hueMix: 1,
    satScale: 0.55,
    monochrome: true,
    lightShift: {
      black: 0.34,
      grey: 0.43,
      green: 0.52,
      blue: 0.61,
      yellow: 0.7,
      red: 0.79,
      prismatic: 0.88,
    },
  },
  dieStyle: {
    radius: 0.08,
    strokeW: 1.25,
    glyphFont: MONO,
    noise: 0.08,
    gradient: 0.1,
  },
  slotStyle: { dashed: false, innerShadow: 0.3, etching: false },
  bgStyle: { starDensity: 0.45, hue: 128, scanlines: true },
  price: THEME_PRICE,
};

const blueprint: ThemeDef = {
  id: "blueprint",
  name: "settings:theme.blueprint",
  palette: {
    bg: "#0A1630",
    surface1: "#0E1E42",
    surface2: "#142A55",
    line: "#2F6C9E",
    text: "#FFFFFF",
    dim: "#B6D4EE",
    faint: "#7FA6CC",
    accent: "#5CD7EA",
    danger: "#FF8A7C",
    amber: "#FFD46B",
  },
  schoolTint: {
    hue: 196,
    hueMix: 0.5,
    satScale: 0.8,
    lightShift: {
      red: 0.06,
      yellow: 0.04,
      prismatic: 0.02,
      blue: 0,
      green: 0.02,
      grey: -0.02,
      black: -0.04,
    },
  },
  dieStyle: {
    radius: 0.05,
    strokeW: 1,
    glyphFont: MONO,
    noise: 0.02,
    gradient: 0.06,
  },
  slotStyle: { dashed: true, innerShadow: 0.12, etching: true },
  bgStyle: { starDensity: 0.7, hue: 200, grid: true },
  price: THEME_PRICE,
};

const aurora: ThemeDef = {
  id: "aurora",
  name: "settings:theme.aurora",
  palette: {
    bg: "#080B18",
    surface1: "#111A2E",
    surface2: "#1A2742",
    line: "#31456B",
    text: "#EDF4FF",
    dim: "#A4B8D6",
    faint: "#7186A8",
    accent: "#4FE0BE",
    danger: "#FF7183",
    amber: "#FFC94A",
  },
  schoolTint: {
    hue: 168,
    hueMix: 0.16,
    satScale: 1.12,
    lightShift: {
      red: 0.05,
      yellow: 0.05,
      prismatic: 0.06,
      blue: 0.05,
      green: 0.05,
      grey: 0.04,
      black: 0.05,
    },
  },
  dieStyle: {
    radius: 0.3,
    strokeW: 2,
    glyphFont: SANS,
    noise: 0.03,
    gradient: 0.26,
  },
  slotStyle: { dashed: false, innerShadow: 0.2, etching: true },
  bgStyle: { starDensity: 1.25, hue: 190 },
  price: THEME_PRICE,
};

export const THEMES: readonly ThemeDef[] = [
  deepSpace,
  terminal,
  blueprint,
  aurora,
];

export const THEME_BY_ID: Record<ThemeId, ThemeDef> = {
  deepSpace,
  terminal,
  blueprint,
  aurora,
};

export const DEFAULT_THEME_ID: ThemeId = "deepSpace";

export const isThemeId = (value: unknown): value is ThemeId =>
  typeof value === "string" && value in THEME_BY_ID;

export const themeDef = (id: ThemeId): ThemeDef => THEME_BY_ID[id];
