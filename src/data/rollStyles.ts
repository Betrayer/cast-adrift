import type { RollStyle } from "@/types";
import type { LocKey } from "@/types/content";

export interface RollStyleDef {
  id: RollStyle;
  name: LocKey;
  desc: LocKey;
  sfxRate: number;
}

export const DEFAULT_ROLL_STYLE: RollStyle = "flip";

export const ROLL_STYLE_DEFS: readonly RollStyleDef[] = [
  { id: "flip", name: "settings:rollStyle.flip.name", desc: "settings:rollStyle.flip.desc", sfxRate: 1 },
  { id: "reel", name: "settings:rollStyle.reel.name", desc: "settings:rollStyle.reel.desc", sfxRate: 1.18 },
  { id: "blur", name: "settings:rollStyle.blur.name", desc: "settings:rollStyle.blur.desc", sfxRate: 0.86 },
];

export const rollSfxRate = (style: RollStyle): number =>
  ROLL_STYLE_DEFS.find((def) => def.id === style)?.sfxRate ?? 1;

export const ROLL_STYLE_IDS: readonly RollStyle[] = ROLL_STYLE_DEFS.map((def) => def.id);

export const isRollStyle = (value: unknown): value is RollStyle =>
  typeof value === "string" && ROLL_STYLE_IDS.includes(value as RollStyle);