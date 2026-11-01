import { Button, Divider, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { rarityColor } from "@/app/rarity";
import { TagChips } from "@/components/TagChips";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { bayPrice, moduleSellValue } from "@/game/economy/prices";
import { sellModule } from "@/game/run/inventory";
import { autosaveRun } from "@/game/run/flow";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  runBayPurchasable,
  runModuleSlots,
  useRunStore,
} from "@/stores/runStore";

export const BaysSection = () => {
  const { t } = useTranslation(["run", "content"]);
  const scrap = useRunStore((s) => s.scrap);
  const modules = useRunStore((s) => s.modules);
  const sector = useRunStore((s) => s.sector);
  const bays = useRunStore(runModuleSlots);
  const canBuyBay = useRunStore(runBayPurchasable);

  const bayCost = bayPrice(sector);

  const buyBay = (): void => {
    const state = useRunStore.getState();
    if (!state.spendScrap(bayCost)) return;
    state.purchaseBay();
    playSfx("buy");
    playSfx("mkSweep");
    haptic("purchase");
    autosaveRun();
  };

  const demount = (moduleId: string): void => {
    if (!sellModule(moduleId)) return;
    playSfx("buy");
    haptic("purchase");
    autosaveRun();
  };

  return (
    <>
      <Divider
        color={tokens.line}
        label={t("run:shipyard.baysTitle", { used: modules.length, max: bays })}
      />
      <Stack gap={6}>
        {modules.map((moduleId) => {
          const def = MODULE_BY_ID.get(moduleId);
          if (def === undefined) return null;
          return (
            <Paper
              key={moduleId}
              bg={tokens.surface1}
              p="xs"
              radius="md"
              withBorder
              data-yard-module={moduleId}
              style={{ borderLeftColor: rarityColor(def.rarity) }}
            >
              <Stack gap={6}>
                <Text size="sm" c={tokens.text}>
                  {t(def.name)}
                </Text>
                <Text size="xs" c={tokens.dim}>
                  {t(def.desc)}
                </Text>
                <TagChips tags={moduleTags(def)} />
                <Button
                  size="compact-sm"
                  variant="light"
                  color="gray"
                  data-testid={`yard-demount-${moduleId}`}
                  onClick={() => {
                    demount(moduleId);
                  }}
                >
                  {t("run:shipyard.demount", {
                    n: moduleSellValue(def.price),
                  })}
                </Button>
              </Stack>
            </Paper>
          );
        })}
        {modules.length === 0 ? (
          <Text size="xs" c={tokens.faint}>
            {t("run:shipyard.baysEmpty")}
          </Text>
        ) : null}
        {canBuyBay ? (
          <Button
            variant="default"
            disabled={scrap < bayCost}
            data-testid="yard-buy-bay"
            onClick={buyBay}
          >
            {t("run:shipyard.buyBay", { n: bayCost })}
          </Button>
        ) : (
          <Text size="xs" c={tokens.faint} data-yard-bay-locked>
            {t("run:shipyard.bayDone")}
          </Text>
        )}
      </Stack>
    </>
  );
};
