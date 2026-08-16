import { createTheme, type MantineColorsTuple } from '@mantine/core';
import { BREAKPOINTS, BREAKPOINT_ORDER } from '@/app/breakpoints';
import { mixHex, rgba } from '@/app/color';
import {
  applySchoolPalette,
  SCHOOL_IDS,
  tintedSchools,
} from '@/data/schools';
import {
  DEFAULT_THEME_ID,
  THEME_BY_ID,
  type ThemeDef,
  type ThemeId,
  type ThemeTokens,
} from '@/data/themes';
import type { FontScale } from '@/types';

export type { ThemeTokens } from '@/data/themes';

export const tokens: ThemeTokens = { ...THEME_BY_ID[DEFAULT_THEME_ID].palette };

const TOKEN_KEYS = Object.keys(tokens) as (keyof ThemeTokens)[];

const ramp = (base: string): MantineColorsTuple => {
  const shades: string[] = [];
  for (let i = 0; i < 5; i += 1) {
    shades.push(mixHex(base, '#FFFFFF', ((5 - i) / 5) * 0.88));
  }
  shades.push(base);
  for (let i = 6; i < 10; i += 1) {
    shades.push(mixHex(base, '#000000', ((i - 5) / 4) * 0.5));
  }
  return shades as unknown as MantineColorsTuple;
};

const darkRamp = (palette: ThemeTokens): MantineColorsTuple =>
  [
    palette.text,
    palette.dim,
    palette.faint,
    mixHex(palette.faint, palette.line, 0.5),
    palette.line,
    palette.surface2,
    palette.surface1,
    palette.bg,
    mixHex(palette.bg, '#000000', 0.35),
    mixHex(palette.bg, '#000000', 0.6),
  ] as unknown as MantineColorsTuple;

const mantineBreakpoints = Object.fromEntries(
  BREAKPOINT_ORDER.map((name) => [name, `${String(BREAKPOINTS[name])}px`]),
) as Record<(typeof BREAKPOINT_ORDER)[number], string>;

export const mantineThemeFor = (def: ThemeDef) =>
  createTheme({
    fontFamily: def.dieStyle.glyphFont,
    primaryColor: 'accent',
    primaryShade: 5,
    defaultRadius: 'md',
    breakpoints: mantineBreakpoints,
    colors: {
      accent: ramp(def.palette.accent),
      danger: ramp(def.palette.danger),
      amber: ramp(def.palette.amber),
      dark: darkRamp(def.palette),
    },
    other: { tokens: def.palette, themeId: def.id },
  });

type ThemeListener = (def: ThemeDef) => void;

const listeners = new Set<ThemeListener>();

export const onThemeChange = (listener: ThemeListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let active: ThemeDef = THEME_BY_ID[DEFAULT_THEME_ID];

export const currentTheme = (): ThemeDef => active;

const writeCssVariables = (def: ThemeDef): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  for (const key of TOKEN_KEYS) root.setProperty(`--ca-${key}`, tokens[key]);
  root.setProperty('--ca-shadow', rgba(mixHex(def.palette.bg, '#000000', 0.6), 0.72));
  root.setProperty('--ca-veil', mixHex(def.palette.bg, '#000000', 0.35));
  root.setProperty('--ca-hull-track', mixHex(def.palette.bg, '#000000', 0.3));
  root.setProperty('--ca-surface1-a92', rgba(def.palette.surface1, 0.92));
  root.setProperty('--ca-surface2-a92', rgba(def.palette.surface2, 0.92));
  root.setProperty('--ca-bg-a86', rgba(mixHex(def.palette.bg, '#000000', 0.4), 0.86));
  root.setProperty('--ca-danger-a12', rgba(def.palette.danger, 0.12));
  root.setProperty('--ca-danger-a55', rgba(def.palette.danger, 0.55));
  root.setProperty('--ca-danger-a0', rgba(def.palette.danger, 0));
  const palette = tintedSchools(def.schoolTint);
  for (const id of SCHOOL_IDS) {
    const colors = palette[id];
    root.setProperty(`--ca-school-${id}-fill`, colors.fill);
    root.setProperty(`--ca-school-${id}-stroke`, colors.stroke);
    root.setProperty(`--ca-school-${id}-text`, colors.text);
  }
  document.body.style.background = def.palette.bg;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta !== null) meta.setAttribute('content', def.palette.bg);
  document.documentElement.dataset.caTheme = def.id;
};

export const applyTheme = (id: ThemeId): ThemeDef => {
  const def = THEME_BY_ID[id] ?? THEME_BY_ID[DEFAULT_THEME_ID];
  if (active.id === def.id && tokens.bg === def.palette.bg) {
    writeCssVariables(def);
    return def;
  }
  active = def;
  for (const key of TOKEN_KEYS) tokens[key] = def.palette[key];
  applySchoolPalette(tintedSchools(def.schoolTint));
  writeCssVariables(def);
  for (const listener of [...listeners]) listener(def);
  return def;
};

export const applyMotion = (reduced: boolean): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.caMotion = reduced ? 'reduced' : 'full';
};

export const FONT_SCALE_VALUE: Record<FontScale, number> = {
  s: 0.875,
  m: 1,
  l: 1.125,
};

export const applyFontScale = (scale: FontScale): void => {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(
    '--mantine-scale',
    String(FONT_SCALE_VALUE[scale]),
  );
};
