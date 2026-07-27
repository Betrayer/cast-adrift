import {
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { abandonRun } from "@/game/run/flow";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";
import { useSummaryStore } from "@/stores/summaryStore";

const SUBMIT_KEY = {
  idle: "meta:drift.submitIdle",
  pending: "meta:drift.submitPending",
  sent: "meta:drift.submitSent",
  failed: "meta:drift.submitFailed",
  offline: "meta:drift.submitOffline",
} as const;

export const DriftSummaryScreen = () => {
  const { t } = useTranslation(["meta", "run", "content"]);
  const go = useAppStore((s) => s.go);
  const result = useSummaryStore((s) => s.result);
  const personalBest = useSummaryStore((s) => s.personalBest);
  const beatPersonalBest = useSummaryStore((s) => s.beatPersonalBest);
  const submit = useSummaryStore((s) => s.submit);
  const mutators = useRunStore((s) => s.mutators);
  const score = result?.score ?? null;
  const daily = result?.mode === "daily";

  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder maw={420} w="100%">
        <Stack gap="sm">
          <Title order={2} c={tokens.text} ta="center">
            {t(daily ? "meta:drift.dailyTitle" : "meta:drift.title")}
          </Title>
          {mutators.length > 0 ? (
            <Group gap="xs" justify="center">
              {mutators.map((id) => (
                <Badge key={id} size="sm" color="amber" variant="light">
                  {t(MUTATOR_BY_ID.get(id)?.name ?? id)}
                </Badge>
              ))}
            </Group>
          ) : null}
          <Divider color={tokens.line} />
          <Group justify="space-between">
            <Text c={tokens.dim}>
              {t("meta:drift.depth", { n: score?.depth ?? 0 })}
            </Text>
            <Text c={tokens.text}>{score?.depthPoints ?? 0}</Text>
          </Group>
          <Group justify="space-between">
            <Text c={tokens.dim}>
              {t("meta:drift.kills", { n: score?.kills ?? 0 })}
            </Text>
            <Text c={tokens.text}>{score?.killPoints ?? 0}</Text>
          </Group>
          <Group justify="space-between">
            <Text c={tokens.dim}>{t("meta:drift.scrap")}</Text>
            <Text c={tokens.text}>{score?.scrap ?? 0}</Text>
          </Group>
          <Divider color={tokens.line} />
          <Group justify="space-between">
            <Text c={tokens.amber} fw={700}>
              {t("meta:drift.total")}
            </Text>
            <Text c={tokens.amber} fw={700}>
              {score?.total ?? 0}
            </Text>
          </Group>
          {daily ? null : (
            <Text size="xs" c={beatPersonalBest ? tokens.accent : tokens.faint}>
              {beatPersonalBest
                ? t("meta:drift.newBest", { n: personalBest })
                : t("meta:drift.best", {
                    n: personalBest,
                    diff: Math.max(0, personalBest - (score?.total ?? 0)),
                  })}
            </Text>
          )}
          <Text size="xs" c={tokens.faint}>
            {t(SUBMIT_KEY[submit])}
          </Text>
          <Group justify="space-between">
            <Text size="xs" c={tokens.dim}>
              {t("meta:summary.xp")}
            </Text>
            <Text size="xs" c={tokens.accent}>
              +{result?.xpGain ?? 0}
            </Text>
          </Group>
          <Button
            mt="sm"
            fullWidth
            variant="default"
            onClick={() => {
              useSummaryStore.getState().clear();
              abandonRun();
              go("leaderboard", { tab: daily ? "daily" : "drift" });
            }}
          >
            {t("meta:drift.toBoard")}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              useSummaryStore.getState().clear();
              abandonRun();
            }}
          >
            {t("run:summary.toMenu")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
