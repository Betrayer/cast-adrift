import type { DieItemDef } from "@/types/content";

export const dieLabel = (def: DieItemDef, t: (k: string) => string): string =>
  `${t(def.name)} · d${String(def.tier)}`;
