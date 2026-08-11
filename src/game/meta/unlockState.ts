import { DIE_BY_ID } from "@/data/dice";
import { ENCOUNTER_DISCOUNT_PCT, META_DIE_PRICE } from "@/data/metaShop";
import {
  dieGrantId,
  hasFeature,
  resolveUnlocks,
  unlockedContracts,
  unlockedCosmetics,
  unlockedDice,
  UNLOCK_BY_ID,
  type FeatureId,
  type UnlockContext,
  type UnlockDef,
} from "@/data/unlocks";
import { useMetaStore } from "@/stores/metaStore";
import type { MetaValues } from "@/stores/metaStore";

export type UnlockSourceValues = Pick<
  MetaValues,
  "level" | "achievements" | "ascension" | "unlocksGranted"
> & { stats: Pick<MetaValues["stats"], "campaignClears"> };

export const unlockContextOf = (meta: UnlockSourceValues): UnlockContext => ({
  level: meta.level,
  achievements: meta.achievements,
  ascension: meta.ascension.campaign,
  clears: meta.stats.campaignClears,
  granted: meta.unlocksGranted,
});

export const metaUnlockContext = (): UnlockContext =>
  unlockContextOf(useMetaStore.getState());

export const metaHasFeature = (feature: FeatureId): boolean =>
  hasFeature(metaUnlockContext(), feature);

export const metaUnlockedDice = (): Set<string> =>
  unlockedDice(metaUnlockContext());

export const metaUnlockedContracts = (): Set<string> =>
  unlockedContracts(metaUnlockContext());

export const metaUnlockedCosmetics = (): Set<string> =>
  unlockedCosmetics(metaUnlockContext());

export const metaResolvedUnlocks = (): Set<string> =>
  resolveUnlocks(metaUnlockContext());

export const dieShopPrice = (
  defId: string,
  encountered: Readonly<Record<string, unknown>>,
): number => {
  const rarity = DIE_BY_ID.get(defId)?.rarity ?? "common";
  const base = META_DIE_PRICE[rarity];
  if (encountered[defId] === undefined) return base;
  return Math.round((base * (100 - ENCOUNTER_DISCOUNT_PCT)) / 100);
};

export const grantDieUnlock = (defId: string): boolean =>
  useMetaStore.getState().grantUnlock(dieGrantId(defId));

export interface FreshUnlocks {
  ids: string[];
  defs: UnlockDef[];
}

export const freshUnlocks = (
  ctx: UnlockContext,
  seen: readonly string[],
): FreshUnlocks => {
  const seenSet = new Set(seen);
  const ids = [...resolveUnlocks(ctx)].filter((id) => !seenSet.has(id));
  const defs = ids
    .map((id) => UNLOCK_BY_ID.get(id))
    .filter((def): def is UnlockDef => def !== undefined);
  return { ids, defs };
};

export const freshUnlockIdsOfKind = (
  ctx: UnlockContext,
  seen: readonly string[],
  kind: UnlockDef["kind"],
): string[] =>
  freshUnlocks(ctx, seen)
    .defs.filter((def) => def.kind === kind)
    .map((def) => def.id);

export const freshDiceIds = (
  ctx: UnlockContext,
  seen: readonly string[],
): Set<string> => {
  const out = new Set<string>();
  for (const def of freshUnlocks(ctx, seen).defs) {
    for (const id of def.dice ?? []) out.add(id);
  }
  return out;
};

export const freshContractIds = (
  ctx: UnlockContext,
  seen: readonly string[],
): Set<string> => {
  const out = new Set<string>();
  for (const def of freshUnlocks(ctx, seen).defs) {
    for (const id of def.contracts ?? []) out.add(id);
  }
  return out;
};
