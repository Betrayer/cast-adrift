import { Badge, Button, Group, Text } from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/app/backGuard";
import { riseStyle } from "@/app/motion";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { TabPanel } from "@/components/TabPanel";
import { masteryNumeral } from "@/components/shipModel";
import { SHIP_RANK_MAX, shipRankOf } from "@/data/shipRanks";
import { SHIP_BY_ID } from "@/data/ships";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { BridgeFocus, BridgePanelProps } from "./bridgeFocus";
import { DiceTab } from "./DiceTab";
import { ModulesTab } from "./ModulesTab";
import { OverviewTab } from "./OverviewTab";
import { PerksTab } from "./PerksTab";
import { SlotInfoSheet } from "./SlotInfoSheet";
import styles from "./BridgeScreen.module.css";

const TABS = ["overview", "dice", "modules", "perks"] as const;

type BridgeTab = (typeof TABS)[number];

const FOCUS_TAB: Record<BridgeFocus["kind"], BridgeTab> = {
  module: "modules",
  perk: "perks",
};

const PANELS: Record<BridgeTab, (props: BridgePanelProps) => React.ReactElement | null> = {
  overview: OverviewTab,
  dice: DiceTab,
  modules: ModulesTab,
  perks: PerksTab,
};

export const BridgeScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const shipId = useRunStore((s) => s.shipId);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const shipRankXp = useRunStore((s) => s.shipRankXp);
  const pendingRankUps = useRunStore((s) => s.pendingRankUps);
  const [tab, setTab] = useState<BridgeTab>("overview");
  const [sheetSlot, setSheetSlot] = useState<SlotId | null>(null);
  const [focus, setFocus] = useState<BridgeFocus | null>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const def = SHIP_BY_ID.get(shipId);
  const Panel = PANELS[tab];

  useEffect(() => {
    if (focus === null) return;
    if (document.activeElement === null || document.activeElement === document.body) {
      activeTabRef.current?.focus({ preventScroll: true });
    }
  }, [tab, focus]);

  const closeSheet = (): void => {
    setSheetSlot(null);
  };

  useBackGuard("bridge", sheetSlot === null ? null : closeSheet);

  const openSource = (next: BridgeFocus): void => {
    setSheetSlot(null);
    setFocus(next);
    setTab(FOCUS_TAB[next.kind]);
  };

  const header = (
    <div className={styles.head}>
      <AppHeader
        actions={
          def === undefined ? null : (
            <Text size="sm" c={tokens.dim}>
              {t(def.name)}
            </Text>
          )
        }
      />
      <Group gap={6} wrap="wrap" data-bridge-tabs>
        {TABS.map((id, index) => (
          <Button
            key={id}
            ref={id === tab ? activeTabRef : undefined}
            size="compact-sm"
            variant={id === tab ? "filled" : "default"}
            data-testid={`bridge-tab-${id}`}
            data-active={id === tab ? "1" : "0"}
            data-rise
            style={riseStyle(index)}
            onClick={() => {
              setFocus(null);
              setTab(id);
            }}
          >
            {t(`run:bridge.tab.${id}`)}
          </Button>
        ))}
        <Badge variant="light" color="yellow" data-testid="bridge-mastery">
          {t("run:bridge.mastery", { rank: masteryNumeral(masteryRank) })}
        </Badge>
        <Badge variant="light" color="accent" data-testid="bridge-ship-rank">
          {t("run:bridge.shipRank", {
            rank: shipRankOf(shipRankXp) - pendingRankUps,
            max: SHIP_RANK_MAX,
          })}
        </Badge>
      </Group>
    </div>
  );

  return (
    <Screen width="wide" header={header}>
      <TabPanel id={tab}>
        <Panel focus={focus} onOpenSlot={setSheetSlot} />
      </TabPanel>
      {sheetSlot === null ? null : (
        <SlotInfoSheet
          slotId={sheetSlot}
          onClose={closeSheet}
          onSource={openSource}
        />
      )}
    </Screen>
  );
};
