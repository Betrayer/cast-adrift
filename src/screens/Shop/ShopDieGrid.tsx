import { OwnedLine } from '@/components/OwnedLine';
import { Button, SimpleGrid } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { SHOP_CARD_COLUMNS } from "@/app/grids";
import { DieCard } from "@/components/DieCard";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import type { ShopItem } from "@/game/economy/shop";

export const ShopDieGrid = ({
  items,
  scrap,
  engravings,
  cardRef,
  onBuy,
}: {
  items: readonly ShopItem[];
  scrap: number;
  engravings: EngravingMap;
  cardRef: (index: number) => (node: HTMLElement | null) => void;
  onBuy: (index: number) => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  return (
    <SimpleGrid cols={SHOP_CARD_COLUMNS} spacing="sm" maw={720}>
      {items.map((item, index) => {
        const def = DIE_BY_ID.get(item.defId);
        if (def === undefined) return null;
        const affordable = !item.sold && scrap >= item.price;
        const cardFooter = (
          <>
            <OwnedLine defId={item.defId} />
            <Button
              size="compact-sm"
              fullWidth
              disabled={!affordable}
              data-testid={`shop-buy-${String(index)}`}
              onClick={() => {
                onBuy(index);
              }}
            >
              {item.sold
                ? t("run:shop.empty")
                : t("run:shop.buy", { n: item.price })}
            </Button>
          </>
        );
        return (
          <div
            key={index}
            ref={cardRef(index)}
            data-testid={`shop-item-${String(index)}`}
            data-sold={item.sold ? '1' : '0'}
            data-rise
            data-press
            style={{ opacity: item.sold ? 0.4 : 1, ...riseStyle(index) }}
          >
            <DieCard
              defId={item.defId}
              engravings={engravings}
              footer={cardFooter}
            />
          </div>
        );
      })}
    </SimpleGrid>
  );
};
