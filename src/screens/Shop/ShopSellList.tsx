import { Button, Divider, Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { DieCardTrigger } from "@/components/DieCardModal";
import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import { handDieCardProps } from "@/game/dice/card";
import { instanceSellValue } from "@/game/economy/prices";
import type { DieInstance } from "@/stores/runStore";

export const ShopSellList = ({
  deck,
  engravings,
  onSell,
}: {
  deck: readonly DieInstance[];
  engravings: EngravingMap;
  onSell: (uid: string) => void;
}) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  return (
    <>
      <Divider color={tokens.line} label={t("run:shop.sellTitle")} />
      <Group gap="xs" wrap="wrap">
        {deck.map((die) => {
          const def = DIE_BY_ID.get(die.defId);
          if (def === undefined) return null;
          return (
            <Group key={die.uid} gap={4} wrap="nowrap">
              <DieCardTrigger
                {...handDieCardProps(die)}
                engravings={engravings}
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
                  onSell(die.uid);
                }}
              >
                {`+${String(instanceSellValue(die))}`}
              </Button>
            </Group>
          );
        })}
      </Group>
    </>
  );
};
