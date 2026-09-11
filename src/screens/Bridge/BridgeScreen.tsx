import { Badge, Button, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { rarityColor } from "@/app/rarity";
import { tokens } from "@/app/theme";
import { DieCard } from "@/components/DieCard";
import { DieCardTrigger } from "@/components/DieCardModal";
import { pinStyle, ShipSilhouette } from "@/components/ShipSilhouette";
import { TagChips } from "@/components/TagChips";
import { DIE_BY_ID } from "@/data/dice";
import { MODULE_BY_ID } from "@/data/modules";
import { moduleTags } from "@/data/modules/types";
import { PERK_BY_ID } from "@/data/perks";
import { schools } from "@/data/schools";
import { SHIP_BY_ID } from "@/data/ships";
import { slotCapForMk } from "@/data/slots";
import { MECHANIC_TAGS, SYSTEM_TAGS, type ContentTag } from "@/data/tags";
import { computeCensus } from "@/game/battle/resonance";
import { loadoutCensus } from "@/game/effects/census";
import { bayPrice, DECK_CAP, moduleSellValue } from "@/game/economy/prices";
import { autosaveRun } from "@/game/run/flow";
import { sellModule } from "@/game/run/inventory";
import { playSfx } from "@/services/audio";
import { haptic } from "@/services/tma";
import { useMetaStore } from "@/stores/metaStore";
import {
  runBayPurchasable,
  runModuleSlots,
  useRunStore,
} from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";
import { CabinsSection } from "./CabinsSection";
import { CargoSection } from "./CargoSection";
import styles from "./BridgeScreen.module.css";

const TABS = ["overview", "dice", "modules", "perks"] as const;

type BridgeTab = (typeof TABS)[number];

const Overview = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const shipId = useRunStore((s) => s.shipId);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const hull = useRunStore((s) => s.hull);
  const hullMax = useRunStore((s) => s.hullMax);
  const scrap = useRunStore((s) => s.scrap);
  const modules = useRunStore((s) => s.modules);
  const bays = useRunStore(runModuleSlots);
  const def = SHIP_BY_ID.get(shipId);
  if (def === undefined) return null;
  const pins = (Object.keys(def.slots) as SlotId[]).flatMap((slotId) => {
    const point = def.bridgeTheme.pins[slotId];
    return point === undefined ? [] : [{ slotId, point }];
  });
  return (
    <Stack gap="sm">
      <ShipSilhouette shipId={shipId}>
        {pins.map(({ slotId, point }) => {
          const mk = mkLevels[slotId] ?? def.slots[slotId]?.mk ?? 1;
          return (
            <span
              key={slotId}
              className={styles.pin}
              data-bridge-pin={slotId}
              style={pinStyle(point)}
            >
              <span className={styles.pinName}>
                {t(`battle:slot.${slotId}`)}
              </span>
              <span className={styles.pinCap}>
                {t("battle:slot.pin", { cap: slotCapForMk(slotId, mk), mk })}
              </span>
            </span>
          );
        })}
      </ShipSilhouette>

      <Group gap="xs" justify="center" data-bridge-stats>
        <Badge variant="light" color="gray" data-bridge-stat="hull">
          {t("run:bridge.hull", { cur: hull, max: hullMax })}
        </Badge>
        <Badge variant="light" color="yellow" data-bridge-stat="scrap">
          {t("run:bridge.scrap", { n: scrap })}
        </Badge>
        <Badge variant="light" color="accent" data-bridge-stat="bays">
          {t("run:bridge.bays", { used: modules.length, max: bays })}
        </Badge>
      </Group>

      <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
        <Text size="sm" fw={600} c={tokens.text}>
          {def.passiveName === undefined
            ? t("battle:ship.passiveNone")
            : t(def.passiveName)}
        </Text>
        {def.passiveDesc === undefined ? null : (
          <Text size="xs" c={tokens.dim}>
            {t(def.passiveDesc)}
          </Text>
        )}
      </Paper>

      <CabinsSection />

      <CargoSection />
    </Stack>
  );
};

const DiceTab = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deck = useRunStore((s) => s.deck);
  const engravings = useMetaStore((s) => s.engravings);
  const resonance = computeCensus(
    deck
      .map((die) => DIE_BY_ID.get(die.defId))
      .filter((def) => def !== undefined)
      .map((def) => ({ school: def.school })),
  );
  return (
    <Stack gap="sm">
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.deckCount", { n: deck.length, max: DECK_CAP })}
      </Text>
      <Group gap={6} wrap="wrap" data-bridge-resonance>
        {(Object.keys(schools) as School[]).map((school) => {
          const count = resonance.counts[school];
          if (count === 0) return null;
          return (
            <Badge
              key={school}
              variant="light"
              color="gray"
              styles={{ label: { color: schools[school].text } }}
            >
              {`${t(`run:tag.${school}`)} ${String(count)}`}
            </Badge>
          );
        })}
      </Group>
      <div className={styles.deck}>
        {deck.map((die) => (
          <DieCardTrigger
            key={die.uid}
            defId={die.defId}
            engravings={engravings}
            growthBonus={die.growthBonus ?? 0}
            testId={`bridge-die-${die.uid}`}
          >
            <DieCard
              defId={die.defId}
              engravings={engravings}
              growthBonus={die.growthBonus ?? 0}
            />
          </DieCardTrigger>
        ))}
      </div>
      <Text size="xs" c={tokens.faint}>
        {t("run:bridge.sellDiceHint")}
      </Text>
    </Stack>
  );
};

const ModulesTab = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const modules = useRunStore((s) => s.modules);
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
        return (
          <Paper
            key={moduleId}
            bg={tokens.surface1}
            p="sm"
            radius="md"
            withBorder
            data-bridge-module={moduleId}
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

const PerksTab = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const deck = useRunStore((s) => s.deck);
  const perks = useRunStore((s) => s.perks);
  const modules = useRunStore((s) => s.modules);
  const banished = useRunStore((s) => s.banishedPerks);
  const engravings = useMetaStore((s) => s.engravings);
  const census = loadoutCensus({
    deckDefIds: deck.map((d) => d.defId),
    perks,
    modules,
    engravings,
  });
  const activeTags: ContentTag[] = [...SYSTEM_TAGS, ...MECHANIC_TAGS].filter(
    (tag) => (census[tag] ?? 0) > 0,
  );
  return (
    <Stack gap="sm">
      <Text size="xs" c={tokens.faint}>
        {t("run:build.tags")}
      </Text>
      {activeTags.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t("run:build.empty")}
        </Text>
      ) : (
        <TagChips tags={activeTags} counts={census} size="sm" />
      )}
      <Divider color={tokens.line} label={t("run:build.perks", { n: perks.length })} />
      {perks.length === 0 ? (
        <Text size="xs" c={tokens.faint}>
          {t("run:build.empty")}
        </Text>
      ) : (
        perks.map((id) => {
          const def = PERK_BY_ID.get(id);
          if (def === undefined) return null;
          return (
            <Paper
              key={id}
              bg={tokens.surface1}
              p="sm"
              radius="md"
              withBorder
              data-bridge-perk={id}
              style={{ borderLeftColor: rarityColor(def.rarity) }}
            >
              <Text size="sm" fw={600} c={tokens.text}>
                {t(def.name)}
              </Text>
              <Text size="xs" c={tokens.dim}>
                {t(def.desc)}
              </Text>
              <TagChips
                tags={[...new Set([...(def.synergy ?? []), ...(def.tags ?? [])])]}
              />
            </Paper>
          );
        })
      )}
      {banished.length === 0 ? null : (
        <>
          <Divider color={tokens.line} label={t("run:build.banished")} />
          {banished.map((id) => (
            <Text key={id} size="xs" c={tokens.faint}>
              {t(PERK_BY_ID.get(id)?.name ?? id)}
            </Text>
          ))}
        </>
      )}
    </Stack>
  );
};

const PANELS: Record<BridgeTab, () => React.ReactElement | null> = {
  overview: Overview,
  dice: DiceTab,
  modules: ModulesTab,
  perks: PerksTab,
};

export const BridgeScreen = () => {
  const { t } = useTranslation(["run", "battle", "content"]);
  const shipId = useRunStore((s) => s.shipId);
  const [tab, setTab] = useState<BridgeTab>("overview");
  const def = SHIP_BY_ID.get(shipId);
  const Panel = PANELS[tab];

  return (
    <Screen
      width="wide"
      header={
        <AppHeader
          actions={
            def === undefined ? null : (
              <Text size="sm" c={tokens.dim}>
                {t(def.name)}
              </Text>
            )
          }
        />
      }
    >
      <Stack gap="sm">
        <Group gap={6} wrap="wrap" data-bridge-tabs>
          {TABS.map((id) => (
            <Button
              key={id}
              size="compact-sm"
              variant={id === tab ? "filled" : "default"}
              data-testid={`bridge-tab-${id}`}
              data-active={id === tab ? "1" : "0"}
              onClick={() => {
                setTab(id);
              }}
            >
              {t(`run:bridge.tab.${id}`)}
            </Button>
          ))}
        </Group>
        <Panel />
      </Stack>
    </Screen>
  );
};
