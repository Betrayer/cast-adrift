import { Button, Divider, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useBackBlock, useBackGuard } from "@/app/backGuard";
import { MOTION_MS, POP_MS, useMotionFlag } from "@/app/motion";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { useCountedText } from "@/components/CountNumber";
import { tokens } from "@/app/theme";
import { useFlyToAnchor } from "@/components/FlyToAnchor";
import { HAND_CAP } from "@/game/economy/prices";
import { keeperLinesFor } from "@/data/narrative/keeperLines";
import { autosaveRun } from "@/game/run/flow";
import { enterShop } from "@/game/run/shopEntry";
import { ReplaceCard } from "@/components/ReplaceCard";
import { createStream, deriveSeed } from "@/services/rng";
import { useMetaStore } from "@/stores/metaStore";
import { runModuleSlots, useRunStore } from "@/stores/runStore";
import { ShopDieGrid } from "./ShopDieGrid";
import { ShopModuleGrid } from "./ShopModuleGrid";
import { ShopSellList } from "./ShopSellList";
import { useShopTrade, type ShopCardKind } from "./useShopTrade";

const SCRAP_COUNT_MS = MOTION_MS.l;

const cardKey = (kind: ShopCardKind, index: number): string =>
  `${kind}:${String(index)}`;

export const ShopScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const { attach: scrapRef, fire: pulseScrap } = useMotionFlag<HTMLElement>(
    "data-pop",
    POP_MS,
  );
  const { fly, layer: flyLayer } = useFlyToAnchor();
  const scrapNode = useRef<HTMLElement | null>(null);
  const handAnchor = useRef<HTMLParagraphElement | null>(null);
  const bayAnchor = useRef<HTMLSpanElement | null>(null);
  const cards = useRef<Map<string, HTMLElement>>(new Map());
  const scrap = useRunStore((s) => s.scrap);
  const deck = useRunStore((s) => s.deck);
  const seed = useRunStore((s) => s.seed);
  const runModules = useRunStore((s) => s.modules);
  const flags = useRunStore((s) => s.flags);
  const position = useRunStore((s) => s.position);
  const shop = useRunStore((s) => s.shop);
  const engravings = useMetaStore((s) => s.engravings);

  const attachScrap = useCallback(
    (node: HTMLElement | null) => {
      scrapRef(node);
      scrapNode.current = node;
    },
    [scrapRef],
  );
  const formatScrap = useCallback(
    (n: number) => t("run:shop.scrap", { n }),
    [t],
  );
  useCountedText(scrapNode, scrap, {
    ms: SCRAP_COUNT_MS,
    format: formatScrap,
  });

  const trackCard =
    (key: string) =>
    (node: HTMLElement | null): void => {
      if (node === null) cards.current.delete(key);
      else cards.current.set(key, node);
    };

  const flyToAnchor = (kind: ShopCardKind, index: number): void => {
    fly({
      source: cards.current.get(cardKey(kind, index)),
      target: kind === "die" ? handAnchor.current : bayAnchor.current,
      kind,
    });
  };

  const trade = useShopTrade({ pulseScrap, flyToAnchor });
  const nodeId = position ?? "";
  const slots = useRunStore(runModuleSlots);

  useEffect(() => {
    if (enterShop(nodeId)) autosaveRun();
  }, [nodeId, seed]);

  useBackGuard("shop", trade.leave);
  useBackBlock(trade.pending !== null);

  const greeting = createStream(deriveSeed(seed, `keeper:${nodeId}`)).pick(
    keeperLinesFor("shop", flags),
  );
  const items = shop?.items ?? [];
  const moduleItems = shop?.modules ?? [];
  const nextRerollCost = trade.rerollCost(shop?.rerolls ?? 0);

  const header = (
    <AppHeader
      actions={
        <>
          <Text
            ref={attachScrap}
            size="sm"
            c={tokens.amber}
            data-shop-scrap
          >
            {t("run:shop.scrap", { n: scrap })}
          </Text>
          <Text ref={handAnchor} size="sm" c={tokens.dim} data-shop-hand>
            {t("run:shop.deck", { n: deck.length, max: HAND_CAP })}
          </Text>
        </>
      }
    />
  );

  const footer = (
    <Button size="md" fullWidth data-testid="shop-leave" onClick={trade.leave}>
      {t("run:shop.leave")}
    </Button>
  );

  const overlay = (
    <>
      {flyLayer}
      {trade.pending === null ? null : (
        <ReplaceCard
          swap={trade.pending.swap}
          used={
            trade.pending.swap.kind === "die" ? deck.length : runModules.length
          }
          cap={trade.pending.swap.kind === "die" ? HAND_CAP : slots}
          footerLabel={t("run:replace.cancel")}
          onPick={trade.confirmReplace}
          onFooter={() => {
            trade.clearPending();
          }}
          onClose={() => {
            trade.clearPending();
          }}
        />
      )}
    </>
  );

  return (
    <Screen width="wide" header={header} footer={footer} overlay={overlay}>
      <Stack gap="sm">
        <Text size="xs" c={tokens.dim} fs="italic">
          {t(greeting.text)}
        </Text>

        <ShopDieGrid
          items={items}
          scrap={scrap}
          engravings={engravings}
          cardRef={(index) => trackCard(cardKey("die", index))}
          onBuy={trade.buy}
        />

        <Divider
          color={tokens.line}
          label={
            <span
              ref={bayAnchor}
              data-shop-bay
              style={{ display: "inline-block" }}
            >
              {t("run:shop.modulesTitle", {
                used: runModules.length,
                max: slots,
              })}
            </span>
          }
        />
        <ShopModuleGrid
          items={moduleItems}
          installed={runModules}
          scrap={scrap}
          cardRef={(index) => trackCard(cardKey("module", index))}
          onBuy={trade.buyModule}
        />

        <Button
          variant="default"
          disabled={scrap < nextRerollCost}
          data-testid="shop-reroll"
          onClick={trade.reroll}
        >
          {nextRerollCost === 0
            ? t("run:shop.rerollFree")
            : t("run:shop.reroll", { n: nextRerollCost })}
        </Button>

        <ShopSellList
          deck={deck}
          engravings={engravings}
          onSell={trade.sell}
        />
      </Stack>
    </Screen>
  );
};
