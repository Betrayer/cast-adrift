import {
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { SHOP_MODULE_COLUMNS } from "@/app/grids";
import { tokens } from "@/app/theme";
import { MODULE_BY_ID } from "@/data/modules";
import type { ShopModuleItem } from "@/game/economy/shop";

export const ShopModuleGrid = ({
  items,
  installed,
  scrap,
  cardRef,
  onBuy,
}: {
  items: readonly ShopModuleItem[];
  installed: readonly string[];
  scrap: number;
  cardRef: (index: number) => (node: HTMLElement | null) => void;
  onBuy: (index: number) => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  return (
    <SimpleGrid cols={SHOP_MODULE_COLUMNS} spacing="sm" maw={720}>
      {items.map((item, index) => {
        const def = MODULE_BY_ID.get(item.moduleId);
        if (def === undefined) return null;
        const owned = installed.includes(item.moduleId);
        const affordable = !item.sold && !owned && scrap >= item.price;
        return (
          <Paper
            key={item.moduleId}
            ref={cardRef(index)}
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
                data-shop-module-buy={item.moduleId}
                data-testid={`shop-module-buy-${String(index)}`}
                onClick={() => {
                  onBuy(index);
                }}
              >
                {item.sold
                  ? t("run:shop.empty")
                  : owned
                    ? t("run:shop.owned")
                    : t("run:shop.buy", { n: item.price })}
              </Button>
            </Stack>
          </Paper>
        );
      })}
    </SimpleGrid>
  );
};
