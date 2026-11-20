import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { DIE_LIST_COLUMNS } from "@/app/grids";
import { tokens } from "@/app/theme";
import { DieCardTrigger } from "@/components/DieCardModal";
import { DieFilterChips } from "@/components/DieFilterChips";
import { DieSchoolSelect } from "@/components/DieSchoolSelect";
import { TabPanel } from "@/components/TabPanel";
import { riseStyle } from "@/app/motion";
import { ALL_DICE, DIE_BY_ID } from "@/data/dice";
import { dieHasFeature, type DieFeature } from "@/game/dice/card";
import { schools } from "@/data/schools";
import {
  diePoints,
  ENCOUNTER_DISCOUNT_PCT,
  HANGAR_DECK_CAP,
} from "@/data/metaShop";
import { hasFeature, unlockedDice, type UnlockContext } from "@/data/unlocks";
import { dieRoutes, unlockHintsLine } from "@/game/meta/describeUnlock";
import { dieShopPrice } from "@/game/meta/unlockState";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import type { Rarity, School } from "@/types/content";
import { dieLabel } from "./dieLabel";

const RARITIES: readonly (Rarity | "all")[] = [
  "all",
  "common",
  "uncommon",
  "rare",
  "legendary",
];

interface HangarDiceListProps {
  tab: string;
  owned: ReadonlyMap<string, number>;
  inDeck: ReadonlyMap<string, number>;
  draftLength: number;
  fresh: ReadonlySet<string>;
  unlockCtx: UnlockContext;
  onAdd: (id: string) => void;
}

export const HangarDiceList = ({
  tab,
  owned,
  inDeck,
  draftLength,
  fresh,
  unlockCtx,
  onAdd,
}: HangarDiceListProps) => {
  const { t } = useTranslation(["meta", "common", "content", "battle"]);
  const go = useAppStore((s) => s.go);
  const collection = useMetaStore((s) => s.collection);
  const shards = useMetaStore((s) => s.shards);
  const encountered = useMetaStore((s) => s.encountered);
  const engravings = useMetaStore((s) => s.engravings);
  const buyDie = useMetaStore((s) => s.buyDie);

  const openDice = useMemo(() => unlockedDice(unlockCtx), [unlockCtx]);

  const [schoolFilter, setSchoolFilter] = useState<School | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [featureFilter, setFeatureFilter] = useState<DieFeature | "all">("all");

  const filtered = (list: readonly string[]): string[] =>
    list.filter((id) => {
      const def = DIE_BY_ID.get(id);
      if (def === undefined) return false;
      if (schoolFilter !== "all" && def.school !== schoolFilter) return false;
      if (rarityFilter !== "all" && def.rarity !== rarityFilter) return false;
      if (
        featureFilter !== "all" &&
        !dieHasFeature(def.id, featureFilter, engravings)
      )
        return false;
      return true;
    });

  const collectionIds = filtered(collection.map((e) => e.defId));
  const shopIds = filtered(ALL_DICE.map((d) => d.id));

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <Group gap="xs" mb="xs" grow wrap="wrap">
        <DieSchoolSelect value={schoolFilter} onChange={setSchoolFilter} />
        <Select
          size="xs"
          miw={120}
          value={rarityFilter}
          onChange={(v) => { setRarityFilter((v as Rarity | "all") ?? "all"); }}
          data={RARITIES.map((r) => ({
            value: r,
            label:
              r === "all"
                ? t("meta:hangar.filterAll")
                : t(`battle:die.rarity.${r}`),
          }))}
        />
      </Group>
      <DieFilterChips
        value={featureFilter}
        onChange={setFeatureFilter}
        testId="hangar-feature-filter"
      />
      <TabPanel id={tab}>
        <SimpleGrid cols={DIE_LIST_COLUMNS} spacing={6} data-hangar-dice>
          {(tab === "build" ? collectionIds : shopIds).map((id, index) => {
            const def = DIE_BY_ID.get(id);
            if (def === undefined) return null;
            const ownedCount = owned.get(id) ?? 0;
            const usedCount = inDeck.get(id) ?? 0;
            const isOpen = openDice.has(id);
            const price = dieShopPrice(id, encountered);
            const discounted = encountered[id] !== undefined;
            const hints = dieRoutes(id);
            return (
              <Group
                key={id}
                justify="space-between"
                px="xs"
                py={4}
                data-die-row={id}
                data-die-locked={!isOpen && tab === "shop" ? "1" : undefined}
                data-rise
                style={{
                  border: `1px solid ${tokens.line}`,
                  borderRadius: 8,
                  opacity: !isOpen && tab === "shop" ? 0.55 : 1,
                  ...riseStyle(index),
                }}
              >
                <Stack gap={0}>
                  <Group gap={4} wrap="nowrap">
                    <DieCardTrigger
                      defId={id}
                      engravings={engravings}
                      testId={`hangar-card-${id}`}
                    >
                      <Text size="sm" style={{ color: schools[def.school].text }}>
                        {dieLabel(def, t)}
                      </Text>
                    </DieCardTrigger>
                    {fresh.has(id) ? (
                      <Badge size="xs" color="accent" data-unlock-new>
                        {t("meta:unlock.new")}
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" c={tokens.faint}>
                    {t(`battle:die.rarity.${def.rarity}`)} · {diePoints(id)} pts ·{" "}
                    {t("meta:collection.owned", { n: ownedCount })}
                  </Text>
                  {tab === "shop" && !isOpen ? (
                    <Text size="xs" c={tokens.amber} data-unlock-hint>
                      {unlockHintsLine(hints, t)}
                    </Text>
                  ) : null}
                  {tab === "shop" && isOpen && discounted ? (
                    <Text size="xs" c="teal" data-die-discount>
                      {t("meta:collection.discount", {
                        n: ENCOUNTER_DISCOUNT_PCT,
                      })}
                    </Text>
                  ) : null}
                </Stack>
                {tab === "build" ? (
                  <Button
                    size="compact-xs"
                    variant="default"
                    data-testid={`hangar-add-${id}`}
                    disabled={usedCount >= ownedCount || draftLength >= HANGAR_DECK_CAP}
                    onClick={() => { onAdd(id); }}
                  >
                    {t("meta:hangar.add")}
                  </Button>
                ) : isOpen ? (
                  <Button
                    size="compact-xs"
                    disabled={shards < price}
                    onClick={() => { buyDie(id, price); }}
                  >
                    {t("meta:hangar.buy", { price })}
                  </Button>
                ) : (
                  <Badge size="sm" variant="light" color="gray">
                    {t("meta:unlock.locked")}
                  </Badge>
                )}
              </Group>
            );
          })}
        </SimpleGrid>
      </TabPanel>
      <Divider my="xs" color={tokens.line} />
      <Group gap="xs" justify="center">
        <Button
          size="xs"
          variant="subtle"
          data-testid="hangar-collection"
          onClick={() => { go("collection"); }}
        >
          {t("meta:collection.title")}
        </Button>
        <Button
          size="xs"
          variant="subtle"
          disabled={!hasFeature(unlockCtx, "engravingStation")}
          data-testid="hangar-engraving"
          onClick={() => { go("engraving"); }}
        >
          {t("meta:engraving.title")}
        </Button>
      </Group>
    </Paper>
  );
};
