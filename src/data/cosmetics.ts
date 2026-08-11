import type { DieStyle } from "@/data/themes";
import type { LocKey } from "@/types/content";

export interface DieSkinDef {
  id: string;
  name: LocKey;
  desc: LocKey;
  style: Partial<DieStyle>;
  edge?: string;
  cosmetic?: string;
}

export const DEFAULT_DIE_SKIN = "default";

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

export const DIE_SKINS: readonly DieSkinDef[] = [
  {
    id: DEFAULT_DIE_SKIN,
    name: "meta:skin.default.name",
    desc: "meta:skin.default.desc",
    style: {},
  },
  {
    id: "ashen",
    name: "meta:skin.ashen.name",
    desc: "meta:skin.ashen.desc",
    style: { radius: 0.08, strokeW: 2.5, noise: 0.12, gradient: 0.05 },
    edge: "#3A3F49",
    cosmetic: "ashenSkin",
  },
  {
    id: "voidglass",
    name: "meta:skin.voidglass.name",
    desc: "meta:skin.voidglass.desc",
    style: { radius: 0.42, strokeW: 1, noise: 0, gradient: 0.42 },
    edge: "#0B0F1A",
    cosmetic: "voidglassSkin",
  },
  {
    id: "emberglass",
    name: "meta:skin.emberglass.name",
    desc: "meta:skin.emberglass.desc",
    style: { radius: 0.3, strokeW: 3, noise: 0.02, gradient: 0.34 },
    edge: "#E8B23A",
    cosmetic: "emberglassSkin",
  },
  {
    id: "prestige50",
    name: "meta:skin.prestige50.name",
    desc: "meta:skin.prestige50.desc",
    style: { radius: 0.16, strokeW: 2, glyphFont: SERIF, gradient: 0.28 },
    edge: "#E8EDF7",
    cosmetic: "prestige50Skin",
  },
  {
    id: "chartwright",
    name: "meta:skin.chartwright.name",
    desc: "meta:skin.chartwright.desc",
    style: { radius: 0.05, strokeW: 1, glyphFont: MONO, noise: 0.08 },
    edge: "#7C5CFF",
    cosmetic: "chartwrightSkin",
  },
];

export const DIE_SKIN_BY_ID: ReadonlyMap<string, DieSkinDef> = new Map(
  DIE_SKINS.map((def) => [def.id, def]),
);

export const isDieSkinId = (value: unknown): value is string =>
  typeof value === "string" && DIE_SKIN_BY_ID.has(value);

export const dieSkinStyle = (base: DieStyle, skinId: string): DieStyle => {
  const skin = DIE_SKIN_BY_ID.get(skinId);
  if (skin === undefined) return base;
  return { ...base, ...skin.style };
};

export type BadgeKind = "static" | "animated";

export interface BadgeDef {
  id: string;
  name: LocKey;
  glyph: string;
  kind: BadgeKind;
}

export const BADGES: readonly BadgeDef[] = [
  {
    id: "keeper",
    name: "meta:badge.keeper",
    glyph: "◈",
    kind: "static",
  },
  {
    id: "ascendant",
    name: "meta:badge.ascendant",
    glyph: "✶",
    kind: "animated",
  },
  {
    id: "chartwright",
    name: "meta:badge.chartwright",
    glyph: "✦",
    kind: "static",
  },
  {
    id: "archivist",
    name: "meta:badge.archivist",
    glyph: "❖",
    kind: "static",
  },
];

export const BADGE_BY_ID: ReadonlyMap<string, BadgeDef> = new Map(
  BADGES.map((def) => [def.id, def]),
);
