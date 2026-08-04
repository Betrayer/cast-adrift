import {
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { PERK_BY_ID } from "@/data/perks";
import { progressWithinLevel } from "@/game/xp";
import { abandonRun } from "@/game/run/flow";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import {
  resolveReducedMotion,
  useSettingsStore,
} from "@/stores/settingsStore";
import { useSummaryStore } from "@/stores/summaryStore";
import { LevelUpCeremony } from "./LevelUpCeremony";

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
        reduced={reduced}
        onContinue={() => {
          setCeremonyDone(true);
        }}
      />
    ) : null;

  return (
    <Screen centered overlay={ceremony}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
        <Stack gap="sm">
          <Title order={2} c={win ? tokens.text : tokens.danger} ta="center">
            {t(win ? "run:summary.victory" : "run:summary.defeat")}
          </Title>
          <Divider color={tokens.line} />
          <Text c={tokens.dim}>
            {t("run:summary.nodes", { n: stats.nodesCleared })}
          </Text>
          <Text c={tokens.dim}>{t("run:summary.kills", { n: stats.kills })}</Text>
          <Text c={tokens.dim}>
            {t("run:summary.earned", { n: stats.scrapEarned })}
          </Text>
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
