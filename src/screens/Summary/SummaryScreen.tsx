import {
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { ACHIEVEMENT_BY_ID } from "@/data/achievements";
import { ShipCard } from "@/components/ShipCard";
import { BattleTallyPanel } from "@/screens/Rewards/BattleTallyPanel";
import { DIE_BY_ID } from "@/data/dice";
import { PERK_BY_ID } from "@/data/perks";
import { progressWithinLevel, ZERO_SHARD_BREAKDOWN } from "@/game/xp";
import { abandonRun } from "@/game/run/flow";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore, type RunStats } from "@/stores/runStore";
import {
  resolveReducedMotion,
  useSettingsStore,
} from "@/stores/settingsStore";
import { useSummaryStore } from "@/stores/summaryStore";
import { LevelUpCeremony } from "./LevelUpCeremony";

const DETAIL_ROWS: readonly {
  id: string;
  label: string;
  read: (stats: RunStats) => number;
}[] = [
  { id: "elites", label: "run:summary.elites", read: (s) => s.elites },
  {
    id: "minibosses",
    label: "run:summary.minibosses",
    read: (s) => s.minibosses,
  },
  { id: "bosses", label: "run:summary.bosses", read: (s) => s.bosses },
  {
    id: "scrapSpent",
    label: "run:summary.scrapSpent",
    read: (s) => s.scrapSpent,
  },
  {
    id: "hullPctMin",
    label: "run:summary.hullPctMin",
    read: (s) => s.hullPctMin,
  },
  {
    id: "dicePlaced",
    label: "run:summary.dicePlaced",
    read: (s) => s.dicePlaced,
  },
];

const useCountUp = (target: number, reduced: boolean): number => {
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let start = 0;
    const duration = 650;
    const tick = (ts: number): void => {
      if (start === 0) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      setValue(Math.round(target * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, reduced]);
  return value;
};

export const SummaryScreen = () => {
  const { t } = useTranslation(["run", "meta"]);
  const stats = useRunStore((s) => s.stats);
  const shipId = useRunStore((s) => s.shipId);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const tally = useRunStore((s) => s.lastTally);
  const perks = useRunStore((s) => s.perks);
  const result = useSummaryStore((s) => s.result);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );

  const win = result?.win ?? false;
  const xpShown = useCountUp(result?.xpGain ?? 0, reduced);
  const shardsShown = useCountUp(result?.shardGain ?? 0, reduced);
  const leveled =
    result !== null && result.toLevel > result.fromLevel;
  const [ceremonyDone, setCeremonyDone] = useState(!leveled);
  const [barsDone, setBarsDone] = useState(reduced);
  const [detailed, setDetailed] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => {
      setBarsDone(true);
    }, 750);
    return () => {
      clearTimeout(id);
    };
  }, [reduced]);

  const progress = progressWithinLevel(xp);
  const perkNames = perks
    .map((id) => PERK_BY_ID.get(id)?.name)
    .filter((name): name is string => name !== undefined);


  const ceremony =
    leveled && barsDone && !ceremonyDone && result !== null ? (
      <LevelUpCeremony
        fromLevel={result.fromLevel}
        toLevel={result.toLevel}
        milestones={result.milestones}
        unlocks={result.unlocks}
        reduced={reduced}
        onContinue={() => {
          setCeremonyDone(true);
        }}
      />
    ) : null;

  const shards = result?.shards ?? ZERO_SHARD_BREAKDOWN;
  const breakdown: readonly [string, number][] = [
    ["meta:summary.fromSectors", shards.sectors],
    ["meta:summary.fromBeacons", shards.beacons],
    ["meta:summary.fromEnding", shards.firstEnding],
    ["meta:summary.fromHull", shards.hullClear],
    ["meta:summary.fromStreak", shards.streak],
    ["meta:summary.fromDeep", shards.deepClear],
    ["meta:summary.fromAscension", shards.ascension],
    ["meta:summary.fromFinds", result?.findShards ?? 0],
    ["meta:summary.fromAchievements", result?.achievementShards ?? 0],
  ];
  const earned = breakdown.filter(([, value]) => value !== 0);

  return (
    <Screen
      centered
      overlay={ceremony}
    >
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="sm">
          <Title order={2} c={win ? tokens.text : tokens.danger} ta="center">
            {t(win ? "run:summary.victory" : "run:summary.defeat")}
          </Title>
          <ShipCard shipId={shipId} size="compact" mkLevels={mkLevels} />
          <Divider color={tokens.line} />
          <Text c={tokens.dim}>
            {t("run:summary.nodes", { n: stats.nodesCleared })}
          </Text>
          <Text c={tokens.dim}>{t("run:summary.kills", { n: stats.kills })}</Text>
          <Text c={tokens.dim}>
            {t("run:summary.earned", { n: stats.scrapEarned })}
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            data-testid="summary-more"
            onClick={() => {
              setDetailed((value) => !value);
            }}
          >
            {t(detailed ? "run:summary.less" : "run:summary.more")}
          </Button>
          {detailed ? (
            <SimpleGrid cols={2} spacing={4} data-summary-detail>
              {DETAIL_ROWS.map((row) => (
                <Group key={row.id} justify="space-between" data-summary-row={row.id}>
                  <Text size="xs" c={tokens.faint}>
                    {t(row.label)}
                  </Text>
                  <Text size="xs" c={tokens.dim} data-summary-value={row.id}>
                    {row.id === "hullPctMin"
                      ? t("run:summary.pct", { n: Math.round(row.read(stats)) })
                      : row.read(stats)}
                  </Text>
                </Group>
              ))}
            </SimpleGrid>
          ) : null}
          {detailed && tally !== null ? (
            <BattleTallyPanel tally={tally} />
          ) : null}
          {(result?.rotation ?? []).length === 0 ? null : (
            <Text c={tokens.dim}>
              {t("run:summary.faced", {
                names: (result?.rotation ?? []).map((n) => t(n)).join(" · "),
              })}
            </Text>
          )}
          <Divider color={tokens.line} />
          <Group justify="space-between">
            <Text c={tokens.amber} fw={600}>
              {t("meta:summary.shards")}
            </Text>
            <Text c={tokens.amber} fw={700}>
              +{shardsShown} ◈
            </Text>
          </Group>
          {earned.length === 0 ? null : (
            <Stack gap={2} data-shard-breakdown>
              {earned.map(([label, value]) => (
                <Group key={label} justify="space-between">
                  <Text size="xs" c={tokens.faint}>
                    {t(label)}
                  </Text>
                  <Text size="xs" c={tokens.dim}>
                    +{value}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
          {(result?.firstFinds ?? []).length === 0 ? null : (
            <Text size="xs" c={tokens.dim} data-first-finds>
              {t("meta:summary.firstFinds", {
                names: (result?.firstFinds ?? [])
                  .map((id) => t(DIE_BY_ID.get(id)?.name ?? id))
                  .join(" · "),
              })}
            </Text>
          )}
          {(result?.achievements ?? []).length === 0 ? null : (
            <Stack gap={2} data-achievement-lines>
              {(result?.achievements ?? []).map((id) => (
                <Text key={id} size="xs" c={tokens.accent}>
                  ✦ {t(ACHIEVEMENT_BY_ID.get(id)?.name ?? id)}
                </Text>
              ))}
            </Stack>
          )}
          <Group justify="space-between">
            <Text c={tokens.accent} fw={600}>
              {t("meta:summary.xp")}
            </Text>
            <Text c={tokens.accent} fw={700}>
              +{xpShown}
            </Text>
          </Group>
          <Text size="xs" c={tokens.faint}>
            {t("meta:summary.level", { level })}
          </Text>
          <Progress
            value={progress.pct * 100}
            color="accent"
            aria-label="xp"
          />
          <Divider color={tokens.line} />
          <Text c={tokens.faint} size="sm">
            {t("run:summary.perks")}{" "}
            {perkNames.length === 0
              ? t("run:summary.perksNone")
              : perkNames.map((name) => t(name)).join(" · ")}
          </Text>
          <Button
            size="compact-sm"
            variant="default"
            data-open-build
            onClick={() => {
              useAppStore.getState().setBuildSheet(true);
            }}
          >
            {t("run:build.open")}
          </Button>
          <Button
            size="md"
            fullWidth
            mt="sm"
            onClick={() => {
              useSummaryStore.getState().clear();
              abandonRun();
            }}
          >
            {t("run:summary.toMenu")}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
