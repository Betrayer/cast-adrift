import { useState } from "react";
import { HAND_CAP, SHOP_REROLL_COST } from "@/game/economy/prices";
import {
  generateShopModules,
  generateShopStock,
} from "@/game/economy/shop";
import { autosaveRun, completeNode } from "@/game/run/flow";
import { shopPricePct } from "@/game/run/shopPrice";
import { computeRunMods } from "@/game/run/runMods";
import { replaceDie, replaceModule, sellDie } from "@/game/run/inventory";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  runModuleSlots,
  useRunStore,
  type PendingSwap,
} from "@/stores/runStore";

export type ShopCardKind = "die" | "module";

export interface ShopPending {
  swap: Extract<PendingSwap, { kind: "die" | "module" }>;
  index: number;
  price: number;
}

export interface ShopTrade {
  pending: ShopPending | null;
  clearPending: () => void;
  buy: (index: number) => void;
  buyModule: (index: number) => void;
  confirmReplace: (key: string) => void;
  reroll: () => void;
  sell: (uid: string) => void;
  leave: () => void;
  rerollCost: (rerolls: number) => number;
}

const soldAt = <T extends { sold: boolean }>(
  list: readonly T[],
  index: number,
): T[] => list.map((it, i) => (i === index ? { ...it, sold: true } : it));

export const useShopTrade = ({
  pulseScrap,
  flyToAnchor,
}: {
  pulseScrap: () => void;
  flyToAnchor: (kind: ShopCardKind, index: number) => void;
}): ShopTrade => {
  const seed = useRunStore((s) => s.seed);
  const perks = useRunStore((s) => s.perks);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const runModules = useRunStore((s) => s.modules);
  const setShop = useRunStore((s) => s.setShop);

  const mods = computeRunMods(perks, chartPicks, runModules);
  const [pending, setPending] = useState<ShopPending | null>(null);

  const markSold = (kind: ShopCardKind, index: number): void => {
    const current = useRunStore.getState().shop;
    if (current === null) return;
    setShop(
      kind === "die"
        ? { ...current, items: soldAt(current.items, index) }
        : { ...current, modules: soldAt(current.modules, index) },
    );
  };

  const landPurchase = (kind: ShopCardKind, index: number): void => {
    playSfx("buy");
    haptic("purchase");
    pulseScrap();
    flyToAnchor(kind, index);
    markSold(kind, index);
  };

  const buy = (index: number): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const item = current.items[index];
    if (item === undefined || item.sold) return;
    if (state.scrap < item.price) return;
    if (state.deck.length >= HAND_CAP) {
      setPending({
        swap: { kind: "die", defId: item.defId },
        index,
        price: item.price,
      });
      return;
    }
    if (!state.spendScrap(item.price)) return;
    state.addDie(item.defId);
    landPurchase("die", index);
    autosaveRun();
  };

  const buyModule = (index: number): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const item = current.modules[index];
    if (item === undefined || item.sold) return;
    if (state.scrap < item.price) return;
    if (state.modules.includes(item.moduleId)) return;
    if (state.modules.length >= runModuleSlots(state)) {
      setPending({
        swap: { kind: "module", moduleId: item.moduleId },
        index,
        price: item.price,
      });
      return;
    }
    if (!state.spendScrap(item.price)) return;
    if (!state.addModule(item.moduleId)) {
      state.addScrap(item.price);
      return;
    }
    landPurchase("module", index);
    autosaveRun();
  };

  const confirmReplace = (key: string): void => {
    if (pending === null) return;
    const state = useRunStore.getState();
    if (state.scrap < pending.price) return;
    if (!state.spendScrap(pending.price)) return;
    const done =
      pending.swap.kind === "die"
        ? replaceDie(key, pending.swap.defId)
        : replaceModule(key, pending.swap.moduleId);
    if (!done) {
      useRunStore.getState().addScrap(pending.price);
      return;
    }
    landPurchase(pending.swap.kind, pending.index);
    setPending(null);
    autosaveRun();
  };

  const rerollCost = (rerolls: number): number =>
    rerolls < mods.freeShopRerolls ? 0 : SHOP_REROLL_COST;

  const reroll = (): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const cost = rerollCost(current.rerolls);
    if (state.scrap < cost) return;
    if (cost > 0 && !state.spendScrap(cost)) return;
    const rerolls = current.rerolls + 1;
    const pct = shopPricePct(state);
    setShop({
      nodeId: current.nodeId,
      rerolls,
      items: generateShopStock(seed, current.nodeId, rerolls, pct),
      modules: generateShopModules(seed, current.nodeId, rerolls, pct),
    });
    autosaveRun();
  };

  const sell = (uid: string): void => {
    if (!sellDie(uid)) return;
    pulseScrap();
    autosaveRun();
  };

  const leave = (): void => {
    const state = useRunStore.getState();
    const courier = state.flags.courierDiscount;
    if (typeof courier === "number") {
      if (courier - 1 <= 0) state.clearFlag("courierDiscount");
      else state.setFlag("courierDiscount", courier - 1);
    }
    setShop(null);
    completeNode({ outcome: "cleared" });
  };

  return {
    pending,
    clearPending: () => {
      setPending(null);
    },
    buy,
    buyModule,
    confirmReplace,
    reroll,
    sell,
    leave,
    rerollCost,
  };
};
