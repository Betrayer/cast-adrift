import { ascensionMods } from "@/data/ascension";
import { flagShopDiscount } from "@/game/economy/shop";
import { setupForRun } from "@/game/run/modes";
import { computeRunMods } from "@/game/run/runMods";
import type { RunValues } from "@/stores/runStore";

export type ShopPriceInput = Pick<
  RunValues,
  "perks" | "chartPicks" | "modules" | "flags" | "ascension" | "contractId"
>;

export const shopPricePct = (state: ShopPriceInput): number =>
  computeRunMods(state.perks, state.chartPicks, state.modules).shopDiscountPct +
  flagShopDiscount(state.flags) -
  ascensionMods(state.ascension).shopPricePct -
  (setupForRun(state).shopPricePct ?? 0);
