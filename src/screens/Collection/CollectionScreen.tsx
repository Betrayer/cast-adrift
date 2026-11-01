import {
  Badge,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { CARD_COLUMNS } from "@/app/grids";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { useScreenParam } from "@/app/useScreenParam";
import { useUnlockContext } from "@/app/useUnlockContext";
import { tokens } from "@/app/theme";
import { DieCardTrigger } from "@/components/DieCardModal";
import { auraHostClass, LegendaryAura } from "@/components/LegendaryAura";
import { DieFilterChips } from "@/components/DieFilterChips";
import { DieSchoolSelect } from "@/components/DieSchoolSelect";
import { ALL_DICE } from "@/data/dice";
import {
  DIE_FILTERS,
  dieHasFeature,
  SCHOOL_FILTERS,
  type DieFeature,
} from "@/game/dice/card";
import { TIER_LADDER } from "@/game/dice/tier";
import { schools } from "@/data/schools";
import { diePoints, ENCOUNTER_DISCOUNT_PCT } from "@/data/metaShop";
import { unlockedDice } from "@/data/unlocks";
import { dieRoutes, unlockHintsLine } from "@/game/meta/describeUnlock";
import { useMetaStore } from "@/stores/metaStore";
import type { DieTier, School } from "@/types/content";

const TIERS: readonly (DieTier | 0)[] = [0, ...TIER_LADDER];

const TIER_PARAMS: readonly string[] = TIERS.map((tier) => String(tier));

type StateFilter = "all" | "owned" | "found" | "unknown";

const STATES: readonly StateFilter[] = ["all", "owned", "found", "unknown"];

const FEATURES: readonly (DieFeature | "all")[] = ["all", ...DIE_FILTERS];

export const CollectionScreen = () => {
  const { t } = useTranslation(["meta", "common", "content", "battle"]);
  const collection = useMetaStore((s) => s.collection);
  const engravings = useMetaStore((s) => s.engravings);
  const encountered = useMetaStore((s) => s.encountered);
  const unlockCtx = useUnlockContext();
  const [schoolFilter, setSchoolFilter] = useScreenParam<School | "all">(
    "school",
    SCHOOL_FILTERS,
    "all",
  );
  const [tierParam, setTierParam] = useScreenParam("tier", TIER_PARAMS, "0");
  const [stateFilter, setStateFilter] = useScreenParam<StateFilter>(
    "state",
    STATES,
    "all",
  );
  const [featureFilter, setFeatureFilter] = useScreenParam<DieFeature | "all">(
    "feature",
    FEATURES,
    "all",
  );
  const tierFilter = Number(tierParam);

  const ownedCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of collection) {
      if (entry.count > 0) map.set(entry.defId, entry.count);
    }
    return map;
  }, [collection]);

  const openDice = useMemo(() => unlockedDice(unlockCtx), [unlockCtx]);

  const rows = useMemo(
    () =>
      ALL_DICE.map((def) => {
        const owned = ownedCounts.get(def.id) ?? 0;
        const met = encountered[def.id];
        const state: StateFilter =
          owned > 0 ? "owned" : met !== undefined ? "found" : "unknown";
        return { def, owned, met, state };
      }),
    [ownedCounts, encountered],
  );

  const filtered = rows.filter((row) => {
    if (schoolFilter !== "all" && row.def.school !== schoolFilter) return false;
    if (tierFilter !== 0 && row.def.tier !== tierFilter) return false;
    if (stateFilter !== "all" && row.state !== stateFilter) return false;
    if (
      featureFilter !== "all" &&
      !dieHasFeature(row.def.id, featureFilter, engravings)
    )
      return false;
    return true;
  });

  const ownedTotal = rows.filter((row) => row.owned > 0).length;
  const foundTotal = Object.keys(encountered).length;

  return (
    <Screen
      width="grid"
      header={
        <>
        <AppHeader />
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder mt="xs">
        <Text size="xs" c={tokens.faint} mb="xs" data-collection-totals>
          {t("meta:collection.totals", {
            owned: ownedTotal,
            found: foundTotal,
            total: ALL_DICE.length,
          })}
        </Text>
        <Group gap="xs" grow wrap="wrap">
          <DieSchoolSelect
            value={schoolFilter}
            onChange={setSchoolFilter}
            testId="collection-school"
          />
          <Select
            size="xs"
            miw={120}
            value={String(tierFilter)}
            data-testid="collection-tier"
            onChange={(v) => { setTierParam(v ?? "0"); }}
            data={TIERS.map((tier) => ({
              value: String(tier),
              label: tier === 0 ? t("meta:hangar.filterAll") : `d${String(tier)}`,
            }))}
          />
          <Select
            size="xs"
            miw={120}
            value={stateFilter}
            data-collection-state
            onChange={(v) => { setStateFilter((v as StateFilter) ?? "all"); }}
            data={STATES.map((state) => ({
              value: state,
              label: t(
                state === "all"
                  ? "meta:collection.stateAll"
                  : state === "owned"
                    ? "meta:collection.stateOwned"
                    : state === "found"
                      ? "meta:collection.stateFound"
                      : "meta:collection.stateUnknown",
              ),
            }))}
          />
        </Group>
        <DieFilterChips
          value={featureFilter}
          onChange={setFeatureFilter}
          testId="collection-feature-filter"
        />
        </Paper>
        </>
      }
    >
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <SimpleGrid cols={CARD_COLUMNS} spacing="xs">
            {filtered.map((row, index) => {
              const def = row.def;
              const unknown = row.state === "unknown";
              return (
                <Paper
                  key={def.id}
                  p="xs"
                  radius="md"
                  withBorder
                  data-collection-entry={def.id}
                  data-collection-state={row.state}
                  data-rarity={def.rarity}
                  data-school={def.school}
                  className={!unknown && def.rarity === "legendary" ? auraHostClass : undefined}
                  data-rise
                  bg={unknown ? tokens.bg : schools[def.school].fill}
                  style={
                    unknown
                      ? { opacity: 0.65, ...riseStyle(index) }
                      : riseStyle(index)
                  }
                >
                  {!unknown && def.rarity === "legendary" ? (
                    <LegendaryAura defId={def.id} school={def.school} />
                  ) : null}
                  <Group justify="space-between">
                    {unknown ? (
                      <Text size="sm" style={{ color: tokens.faint }}>
                        {t(def.name)}
                      </Text>
                    ) : (
                      <DieCardTrigger
                        defId={def.id}
                        engravings={engravings}
                        testId={`collection-card-${def.id}`}
                      >
                        <Text
                          size="sm"
                          style={{ color: schools[def.school].text }}
                        >
                          {t(def.name)}
                        </Text>
                      </DieCardTrigger>
                    )}
                    {row.owned > 0 ? (
                      <Badge size="sm" variant="light" color="gray">
                        {t("meta:collection.owned", { n: row.owned })}
                      </Badge>
                    ) : row.state === "found" ? (
                      <Badge size="sm" variant="light" color="teal">
                        {t("meta:collection.found")}
                      </Badge>
                    ) : (
                      <Badge size="sm" variant="outline" color="gray">
                        {t("meta:collection.undiscovered")}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c={tokens.faint}>
                    d{def.tier} · {t(`battle:die.rarity.${def.rarity}`)} ·{" "}
                    {diePoints(def.id)} pts
                  </Text>
                  {row.met === undefined ? null : (
                    <Text size="xs" c={tokens.dim} data-collection-provenance>
                      {t("meta:collection.provenance", {
                        sector: row.met.sector,
                        node: t(`meta:collection.node.${row.met.node}`),
                      })}
                    </Text>
                  )}
                  {row.met !== undefined && row.owned === 0 ? (
                    <Text size="xs" c="teal">
                      {t("meta:collection.discount", {
                        n: ENCOUNTER_DISCOUNT_PCT,
                      })}
                    </Text>
                  ) : null}
                  {unknown && !openDice.has(def.id) ? (
                    <Text size="xs" c={tokens.amber} data-collection-hint>
                      {unlockHintsLine(dieRoutes(def.id), t)}
                    </Text>
                  ) : null}
                </Paper>
              );
            })}
          </SimpleGrid>
      </Paper>
    </Screen>
  );
};
