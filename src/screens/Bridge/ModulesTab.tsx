import { Button, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { cx } from "@/app/cx";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { TagChips } from "@/components/TagChips";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { bayPrice, moduleSellValue } from "@/game/economy/prices";
import { autosaveRun } from "@/game/run/flow";
import { sellModule } from "@/game/run/inventory";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import {
  runBayPurchasable,
  runModuleSlots,
  useRunStore,
} from "@/stores/runStore";
import { useFocusScroll, type BridgePanelProps } from "./bridgeFocus";
import styles from "./BridgeScreen.module.css";

export const ModulesTab = ({ focus }: BridgePanelProps) => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const modules = useRunStore((s) => s.modules);
  const focusId = focus?.kind === "module" ? focus.id : null;
  const focusRef = useFocusScroll<HTMLDivElement>(focusId);
  const sector = useRunStore((s) => s.sector);
  const bays = useRunStore(runModuleSlots);
  const canBuyBay = useRunStore(runBayPurchasable);
  const empty = Math.max(0, bays - modules.length);

  const sell = (moduleId: string): void => {
    if (!sellModule(moduleId)) return;
    playSfx("buy");
    haptic("purchase");
    autosaveRun();
  };

  return (
    <Stack gap="sm">
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.bays", { used: modules.length, max: bays })}
      </Text>
      {modules.map((moduleId) => {
        const def = MODULE_BY_ID.get(moduleId);
        if (def === undefined) return null;
        const focused = moduleId === focusId;
        return (
          <Paper
            key={moduleId}
            ref={focused ? focusRef : undefined}
            bg={tokens.surface1}
            p="sm"
            radius="md"
            withBorder
            className={cx(focused && styles.focused)}
            data-bridge-module={moduleId}
            data-bridge-focus={focused ? "1" : undefined}
            tabIndex={focused ? -1 : undefined}
            style={{ borderLeftColor: rarityColor(def.rarity) }}
          >
            <Stack gap={6}>
              <Text size="sm" fw={600} c={tokens.text}>
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
                data-testid={`bridge-sell-${moduleId}`}
                onClick={() => {
                  sell(moduleId);
                }}
              >
                {t("run:bridge.sellModule", { n: moduleSellValue(def.price) })}
              </Button>
            </Stack>
          </Paper>
        );
      })}
      {Array.from({ length: empty }, (_, index) => (
        <Paper
          key={`empty-${String(index)}`}
          bg={tokens.surface1}
          p="sm"
          radius="md"
          withBorder
          className={styles.emptyBay}
          data-bridge-bay-empty
        >
          <Text size="xs" c={tokens.faint}>
            {t("run:bridge.bayEmpty")}
          </Text>
        </Paper>
      ))}
      {canBuyBay ? (
        <Text size="xs" c={tokens.faint} data-bridge-bay-offer>
          {t("run:bridge.bayOffer", { n: bayPrice(sector) })}
        </Text>
      ) : null}
    </Stack>
  );
};
