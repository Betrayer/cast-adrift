import { DIE_BY_ID } from "@/data/dice";
import { ENGRAVING_BY_ID, type EngravingMap } from "@/data/engravings";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { PERK_BY_ID } from "@/data/perks";
import type { ContentTag } from "@/data/tags";

export type TagCensus = Partial<Record<ContentTag, number>>;

export interface LoadoutRef {
  deckDefIds: readonly string[];
  perks: readonly string[];
  modules: readonly string[];
  engravings?: EngravingMap;
}

const add = (census: TagCensus, tags: readonly ContentTag[]): void => {
  for (const tag of tags) census[tag] = (census[tag] ?? 0) + 1;
};

export const loadoutCensus = (loadout: LoadoutRef): TagCensus => {
  const census: TagCensus = {};
  for (const defId of loadout.deckDefIds) {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined) continue;
    add(census, [def.school, ...(def.tags ?? [])]);
    for (const engravingId of loadout.engravings?.[defId] ?? []) {
      add(census, ENGRAVING_BY_ID.get(engravingId)?.tags ?? []);
    }
  }
  for (const id of loadout.perks) {
    add(census, PERK_BY_ID.get(id)?.tags ?? []);
  }
  for (const id of loadout.modules) {
    const def = MODULE_BY_ID.get(id);
    if (def !== undefined) add(census, moduleTags(def));
  }
  return census;
};
