import { ascensionMods } from "@/data/ascension";
import {
  flagShopConsequence,
  flagShopDiscount,
  generateShopModules,
  generateShopStock,
} from "@/game/economy/shop";
import { computeRunMods } from "@/game/run/runMods";
import { emitRunHook } from "@/game/run/runEffects";
import { logConsequence } from "@/game/run/journal";
import { useRunStore, type RunValues } from "@/stores/runStore";
import type { NodeId } from "@/game/map/types";

export const shopPricePct = (state: RunValues): number =>
  computeRunMods(state.perks, state.chartPicks, state.modules)
    .shopDiscountPct +
  flagShopDiscount(state.flags) -
  ascensionMods(state.ascension).shopPricePct;

export const enterShop = (nodeId: NodeId): boolean => {
  if (nodeId === "") return false;
  const state = useRunStore.getState();
  if (state.shop !== null && state.shop.nodeId === nodeId) return false;
  const pct = shopPricePct(state);
  state.setShop({
    nodeId,
    rerolls: 0,
    items: generateShopStock(state.seed, nodeId, 0, pct),
    modules: generateShopModules(state.seed, nodeId, 0, pct),
  });
  const consequence = flagShopConsequence(state.flags);
  if (consequence !== null) logConsequence(consequence);
  emitRunHook("shopEnter", { shop: { nodeId, sector: state.sector } });
  return true;
};
