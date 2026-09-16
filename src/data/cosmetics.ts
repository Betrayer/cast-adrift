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

const skinDef = (
  id: string,
  body: Omit<DieSkinDef, "id" | "name" | "desc">,
): DieSkinDef => ({
  id,
  name: `meta:skin.${id}.name`,
  desc: `meta:skin.${id}.desc`,
  ...body,
});

export const DIE_SKINS: readonly DieSkinDef[] = [
  skinDef(DEFAULT_DIE_SKIN, { style: {} }),
  skinDef("ashen", {
    style: { radius: 0.08, strokeW: 2.5, noise: 0.12, gradient: 0.05 },
    edge: "#3A3F49",
    cosmetic: "ashenSkin",
  }),
  skinDef("voidglass", {
    style: { radius: 0.42, strokeW: 1, noise: 0, gradient: 0.42 },
    edge: "#0B0F1A",
    cosmetic: "voidglassSkin",
  }),
  skinDef("emberglass", {
    style: { radius: 0.3, strokeW: 3, noise: 0.02, gradient: 0.34 },
    edge: "#E8B23A",
    cosmetic: "emberglassSkin",
  }),
  skinDef("prestige50", {
    style: { radius: 0.16, strokeW: 2, glyphFont: SERIF, gradient: 0.28 },
    edge: "#E8EDF7",
    cosmetic: "prestige50Skin",
  }),
  skinDef("chartwright", {
    style: { radius: 0.05, strokeW: 1, glyphFont: MONO, noise: 0.08 },
    edge: "#7C5CFF",
    cosmetic: "chartwrightSkin",
  }),
  skinDef("threshold", {
    style: { radius: 0.5, strokeW: 2, noise: 0, gradient: 0.5, glyphFont: SERIF },
    edge: "#B9C6D6",
    cosmetic: "thresholdSkin",
  }),
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

const badge = (
  id: string,
  body: Omit<BadgeDef, "id" | "name">,
): BadgeDef => ({
  id,
  name: `meta:badge.${id}`,
  ...body,
});

export const BADGES: readonly BadgeDef[] = [
  badge("keeper", { glyph: "◈", kind: "static" }),
  badge("ascendant", { glyph: "✶", kind: "animated" }),
  badge("chartwright", { glyph: "✦", kind: "static" }),
  badge("archivist", { glyph: "❖", kind: "static" }),
  badge("answer", { glyph: "◉", kind: "animated" }),
];

export const BADGE_BY_ID: ReadonlyMap<string, BadgeDef> = new Map(
  BADGES.map((def) => [def.id, def]),
);
