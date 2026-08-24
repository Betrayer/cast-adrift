import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ascensionMods } from "@/data/ascension";
import { useBackGuard } from "@/app/backGuard";
import { POP_MS, riseStyle, useMotionFlag } from "@/app/motion";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { DieCard } from "@/components/DieCard";
import { DieCardTrigger } from "@/components/DieCardModal";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID, moduleSlots } from "@/data/modules";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  DECK_CAP,
  ptsForDie,
  sellValue,
  SHOP_REROLL_COST,
} from "@/game/economy/prices";
import {
  flagShopDiscount,
  generateShopModules,
  generateShopStock,
} from "@/game/economy/shop";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import { autosaveRun, completeNode } from "@/game/run/flow";
import { enterShop } from "@/game/run/shopEntry";
import { computeRunMods } from "@/game/run/runMods";
import { createStream, deriveSeed } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

export const ShopScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const { attach: scrapRef, fire: pulseScrap } = useMotionFlag<HTMLDivElement>(
    "data-pop",
    POP_MS,
  );
  const scrap = useRunStore((s) => s.scrap);
  const deck = useRunStore((s) => s.deck);
  const seed = useRunStore((s) => s.seed);
  const perks = useRunStore((s) => s.perks);
  const chartPicks = useRunStore((s) => s.chartPicks);
  const runModules = useRunStore((s) => s.modules);
  const flags = useRunStore((s) => s.flags);
  const position = useRunStore((s) => s.position);
  const shop = useRunStore((s) => s.shop);
  const engravings = useMetaStore((s) => s.engravings);
  const setShop = useRunStore((s) => s.setShop);

  const ascension = useRunStore((s) => s.ascension);
  const mods = computeRunMods(perks, chartPicks, runModules);
  const discount =
    mods.shopDiscountPct +
    flagShopDiscount(flags) -
    ascensionMods(ascension).shopPricePct;
  const nodeId = position ?? "";
  const slots = moduleSlots(computeRunMods(perks, chartPicks).moduleSlotDelta);

  useEffect(() => {
    if (enterShop(nodeId)) autosaveRun();
  }, [nodeId, seed]);

  const buy = (index: number): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const item = current.items[index];
    if (item === undefined || item.sold) return;
    if (state.deck.length >= DECK_CAP || state.scrap < item.price) return;
    if (!state.spendScrap(item.price)) return;
    playSfx("buy");
    haptic("purchase");
    pulseScrap();
    state.addDie(item.defId);
    setShop({
      ...current,
      items: current.items.map((it, i) =>
        i === index ? { ...it, sold: true } : it,
      ),
    });
    autosaveRun();
  };

  const buyModule = (index: number): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const item = current.modules[index];
    if (item === undefined || item.sold) return;
    if (state.scrap < item.price) return;
    if (!state.spendScrap(item.price)) return;
    if (!state.addModule(item.moduleId)) {
      state.addScrap(item.price);
      return;
    }
    playSfx("buy");
    haptic("purchase");
    pulseScrap();
    setShop({
      ...current,
      modules: current.modules.map((it, i) =>
        i === index ? { ...it, sold: true } : it,
      ),
    });
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
    setShop({
      nodeId: current.nodeId,
      rerolls,
      items: generateShopStock(seed, current.nodeId, rerolls, discount),
      modules: generateShopModules(seed, current.nodeId, rerolls, discount),
    });
    autosaveRun();
  };

  const sellDie = (uid: string): void => {
    const state = useRunStore.getState();
    if (state.deck.length <= 1) return;
    const die = state.deck.find((d) => d.uid === uid);
    if (die === undefined) return;
    state.removeDie(uid);
    state.addScrap(sellValue(ptsForDie(die.defId)));
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

  useBackGuard("shop", leave);

  const greeting = createStream(deriveSeed(seed, `keeper:${nodeId}`)).pick(
    keeperLinesFor("shop", flags),
  );
  const items = shop?.items ?? [];
  const moduleItems = shop?.modules ?? [];
  const nextRerollCost = rerollCost(shop?.rerolls ?? 0);

  return (
    <Screen
      width="wide"
      header={
        <AppHeader
          actions={
            <>
              <Text
                ref={scrapRef}
                size="sm"
                c={tokens.amber}
                data-shop-scrap
              >
                {t("run:shop.scrap", { n: scrap })}
              </Text>
              <Text size="sm" c={tokens.dim}>
                {t("run:shop.deck", { n: deck.length })}
              </Text>
            </>
          }
        />
      }
      footer={
        <Button size="md" fullWidth data-testid="shop-leave" onClick={leave}>
          {t("run:shop.leave")}
        </Button>
      }
    >
      <Stack gap="sm">
      <Text size="xs" c={tokens.dim} fs="italic">
        {t(greeting.text)}
      </Text>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" maw={720}>
        {items.map((item, index) => {
          const def = DIE_BY_ID.get(item.defId);
          if (def === undefined) return null;
          const affordable =
            !item.sold && scrap >= item.price && deck.length < DECK_CAP;
          return (
            <div
              key={index}
              data-testid={`shop-item-${String(index)}`}
              data-sold={item.sold ? '1' : '0'}
              data-rise
              data-press
              style={{ opacity: item.sold ? 0.4 : 1, ...riseStyle(index) }}
            >
              <DieCard
                defId={item.defId}
                engravings={engravings}
                footer={
                  <Button
                    size="compact-sm"
                    fullWidth
                    disabled={!affordable}
                    data-testid={`shop-buy-${String(index)}`}
                    onClick={() => {
                      buy(index);
                    }}
                  >
                    {item.sold
                      ? t("run:shop.empty")
                      : t("run:shop.buy", { n: item.price })}
                  </Button>
                }
              />
            </div>
          );
        })}
      </SimpleGrid>

      <Divider
        color={tokens.line}
        label={t("run:shop.modulesTitle", {
          used: runModules.length,
          max: slots,
        })}
      />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" maw={720}>
        {moduleItems.map((item, index) => {
          const def = MODULE_BY_ID.get(item.moduleId);
          if (def === undefined) return null;
          const owned = runModules.includes(item.moduleId);
          const full = runModules.length >= slots;
          const affordable = !item.sold && !owned && !full && scrap >= item.price;
          return (
            <Paper
              key={item.moduleId}
              bg={tokens.surface1}
              p="sm"
              radius="md"
              withBorder
              data-rise
              data-press
              style={{ opacity: item.sold ? 0.4 : 1, ...riseStyle(index) }}
            >
              <Stack gap={4}>
                <Group gap={6} justify="space-between">
                  <Text fw={600} c={tokens.text}>
                    {t(def.name)}
                  </Text>
                  <Badge size="xs" variant="light">
                    {def.rarity}
                  </Badge>
                </Group>
                <Text size="xs" c={tokens.dim}>
                  {t(def.desc)}
                </Text>
                <Button
                  size="compact-sm"
                  mt={4}
                  fullWidth
                  disabled={!affordable}
                  onClick={() => {
                    buyModule(index);
                  }}
                >
                  {item.sold
                    ? t("run:shop.empty")
                    : full
                      ? t("run:shop.modulesFull")
                      : t("run:shop.buy", { n: item.price })}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>

      <Button
        variant="default"
        disabled={scrap < nextRerollCost}
        data-testid="shop-reroll"
        onClick={reroll}
      >
        {nextRerollCost === 0
          ? t("run:shop.rerollFree")
          : t("run:shop.reroll", { n: nextRerollCost })}
      </Button>

      <Divider color={tokens.line} label={t("run:shop.sellTitle")} />
        <Group gap="xs" wrap="wrap">
          {deck.map((die) => {
            const def = DIE_BY_ID.get(die.defId);
            if (def === undefined) return null;
            return (
              <Group key={die.uid} gap={4} wrap="nowrap">
                <DieCardTrigger
                  defId={die.defId}
                  engravings={engravings}
                  growthBonus={die.growthBonus ?? 0}
                  testId={`shop-sell-card-${die.uid}`}
                >
                  <Text size="xs" c={tokens.dim}>
                    {t(def.name)}
                  </Text>
                </DieCardTrigger>
                <Button
                  size="compact-xs"
                  variant="light"
                  color="gray"
                  disabled={deck.length <= 1}
                  data-testid={`shop-sell-${die.uid}`}
                  onClick={() => {
                    sellDie(die.uid);
                  }}
                >
                  {`+${String(sellValue(ptsForDie(die.defId)))}`}
                </Button>
              </Group>
            );
          })}
        </Group>
      </Stack>
    </Screen>
  );
};
