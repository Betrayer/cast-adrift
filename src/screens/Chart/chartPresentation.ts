import type { PointerEvent as ReactPointerEvent } from "react";
import { tokens } from "@/app/theme";
import type { ChartNodeDef, ChartNodeKind, Constellation } from "@/data/chart";
import { schools, tintedSchools } from "@/data/schools";
import { THEME_BY_ID, type ThemeId } from "@/data/themes";
import { fmtPoint, type Point } from "@/game/chart/layouts";
import type { BackdropPalette } from "./backdropPainters";

const HUB_FILL = "#1E2340";
const NEXUS_FILL = "#2A2413";

export const constellationColor = (
  con: Constellation,
): { stroke: string; fill: string } =>
  con === "hub"
    ? { stroke: tokens.accent, fill: HUB_FILL }
    : con === "nexus"
      ? { stroke: tokens.amber, fill: NEXUS_FILL }
      : { stroke: schools[con].stroke, fill: schools[con].fill };

export const LABEL_MIN_CSS: Readonly<Record<ChartNodeKind, number>> = {
  keystone: 6,
  nexus: 6,
  gate: 6,
  notable: 20,
  confluence: 24,
  small: Infinity,
};

export const labelBelow = (node: ChartNodeDef): boolean => {
  if (node.kind === "keystone") return node.id.endsWith("-key2");
  let h = 0;
  for (let i = 0; i < node.id.length; i += 1) {
    h = (h * 31 + node.id.charCodeAt(i)) | 0;
  }
  return (h & 1) === 1;
};

const NODE_STROKE: Readonly<Record<ChartNodeKind, number>> = {
  keystone: 2,
  nexus: 3,
  notable: 3,
  confluence: 2.5,
  gate: 1.5,
  small: 1.5,
};

export const nodeStrokeWidth = (
  kind: ChartNodeKind,
  highlight: boolean,
): number => (highlight ? 3 : NODE_STROKE[kind]);

const STAR_COLOR = "#DFE6F5";

export const backdropPalette = (themeId: ThemeId): BackdropPalette => {
  const theme = THEME_BY_ID[themeId];
  const tinted = tintedSchools(theme.schoolTint);
  return {
    schools: {
      red: tinted.red.stroke,
      blue: tinted.blue.stroke,
      green: tinted.green.stroke,
      yellow: tinted.yellow.stroke,
      black: tinted.black.stroke,
      grey: tinted.grey.stroke,
      prismatic: tinted.prismatic.stroke,
    },
    core: theme.palette.accent,
    star: STAR_COLOR,
  };
};

export const chainPoints = (
  chain: readonly string[],
  pos: ReadonlyMap<string, Point>,
): string =>
  chain
    .map((id) => pos.get(id))
    .filter((point): point is Point => point !== undefined)
    .map((point) => fmtPoint(point))
    .join(" ");

export const stopStagePointer = (e: ReactPointerEvent): void => {
  e.stopPropagation();
};
