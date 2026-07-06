import {
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DIE_BY_ID } from "@/data/dice";
import { schools } from "@/data/schools";
import {
  DECK_CAP,
  ptsForDie,
  sellValue,
  SHOP_REROLL_COST,
} from "@/game/economy/prices";
import { generateShopStock } from "@/game/economy/shop";
import { autosaveRun, completeNode } from "@/game/run/flow";
import { computePerkMods } from "@/game/run/perkMods";
import { useRunStore } from "@/stores/runStore";

export const ShopScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const deck = useRunStore((s) => s.deck);
  const seed = useRunStore((s) => s.seed);
  const perks = useRunStore((s) => s.perks);
  const position = useRunStore((s) => s.position);
  const shop = useRunStore((s) => s.shop);
  const setShop = useRunStore((s) => s.setShop);

  const discount = computePerkMods(perks).shopDiscountPct;
  const nodeId = position ?? "";

  useEffect(() => {
    if (nodeId === "") return;
    const current = useRunStore.getState().shop;
    if (current === null || current.nodeId !== nodeId) {
      useRunStore.getState().setShop({
        nodeId,
        rerolls: 0,
        items: generateShopStock(seed, nodeId, 0, discount),
      });
      autosaveRun();
    }
  }, [nodeId, seed, discount]);

  const buy = (index: number): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null) return;
    const item = current.items[index];
    if (item === undefined || item.sold) return;
    if (state.deck.length >= DECK_CAP || state.scrap < item.price) return;
    if (!state.spendScrap(item.price)) return;
    state.addDie(item.defId);
    setShop({
      ...current,
      items: current.items.map((it, i) =>
        i === index ? { ...it, sold: true } : it,
      ),
    });
    autosaveRun();
  };

  const reroll = (): void => {
    const state = useRunStore.getState();
    const current = state.shop;
    if (current === null || state.scrap < SHOP_REROLL_COST) return;
    if (!state.spendScrap(SHOP_REROLL_COST)) return;
    const rerolls = current.rerolls + 1;
    setShop({
      nodeId: current.nodeId,
      rerolls,
      items: generateShopStock(seed, current.nodeId, rerolls, discount),
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
    autosaveRun();
  };

  const leave = (): void => {
    setShop(null);
    completeNode({ outcome: "cleared" });
  };

  const items = shop?.items ?? [];

  return (
    <Stack mih="100dvh" p="md" gap="sm" bg={tokens.bg}>
      <Group justify="space-between">
        <Text fw={600} c={tokens.text}>
          {t("run:shop.title")}
        </Text>
        <Group gap="xs">
          <Text size="sm" c={tokens.amber}>
            {t("run:shop.scrap", { n: scrap })}
          </Text>
          <Text size="sm" c={tokens.dim}>
            {t("run:shop.deck", { n: deck.length })}
          </Text>
        </Group>
      </Group>

      <Group gap="sm" grow>
        {items.map((item, index) => {
          const def = DIE_BY_ID.get(item.defId);
          if (def === undefined) return null;
          const colors = schools[def.school];
          const affordable =
            !item.sold && scrap >= item.price && deck.length < DECK_CAP;
          return (
            <Paper
              key={index}
              bg={tokens.surface1}
              p="sm"
              radius="md"
              withBorder
              style={{ opacity: item.sold ? 0.4 : 1 }}
            >
              <Stack gap={4} align="center">
                <Text fw={600} c={tokens.text} ta="center">
                  {t(def.name)}
                </Text>
                <Text size="xs" c={tokens.dim}>
                  {`d${String(def.tier)}`}
                </Text>
                <span
                  style={{
                    border: `1px solid ${colors.stroke}`,
                    color: colors.text,
                    borderRadius: 10,
                    padding: "2px 8px",
                    fontSize: 11,
                  }}
                >
                  {t(`battle:school.${def.school}`)}
                </span>
                <Button
                  size="compact-sm"
                  mt={4}
                  fullWidth
                  disabled={!affordable}
                  onClick={() => {
                    buy(index);
                  }}
                >
                  {item.sold
                    ? t("run:shop.empty")
                    : t("run:shop.buy", { n: item.price })}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Group>

      <Button
        variant="default"
        disabled={scrap < SHOP_REROLL_COST}
        onClick={reroll}
      >
        {t("run:shop.reroll", { n: SHOP_REROLL_COST })}
      </Button>

      <Divider color={tokens.line} label={t("run:shop.sellTitle")} />
      <ScrollArea.Autosize mah={200}>
        <Group gap="xs">
          {deck.map((die) => {
            const def = DIE_BY_ID.get(die.defId);
            if (def === undefined) return null;
            return (
              <Button
                key={die.uid}
                size="compact-xs"
                variant="light"
                color="gray"
                disabled={deck.length <= 1}
                onClick={() => {
                  sellDie(die.uid);
                }}
              >
                {`${t(def.name)} · +${String(sellValue(ptsForDie(die.defId)))}`}
              </Button>
            );
          })}
        </Group>
      </ScrollArea.Autosize>

      <Button size="md" mt="auto" onClick={leave}>
        {t("run:shop.leave")}
      </Button>
    </Stack>
  );
};
