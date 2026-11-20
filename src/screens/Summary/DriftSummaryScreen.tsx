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
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { abandonRun } from "@/game/run/flow";
import { ascensionScoreMult } from "@/game/run/modes";
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

const DriftRow = ({
  id,
  index,
  label,
  value,
}: {
  id: string;
  index: number;
  label: string;
  value: number;
}) => (
  <Group
    justify="space-between"
    data-drift-row={id}
    data-rise
    style={riseStyle(index)}
  >
    <Text c={tokens.dim}>{label}</Text>
    <Text c={tokens.text}>{value}</Text>
  </Group>
);

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
    <Screen centered>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder w="100%">
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
          <DriftRow
            id="depth"
            index={0}
            label={t("meta:drift.depth", { n: score?.depth ?? 0 })}
            value={score?.depthPoints ?? 0}
          />
          <DriftRow
            id="kills"
            index={1}
            label={t("meta:drift.kills", { n: score?.kills ?? 0 })}
            value={score?.killPoints ?? 0}
          />
          <DriftRow
            id="scrap"
            index={2}
            label={t("meta:drift.scrap")}
            value={score?.scrap ?? 0}
          />
          {score !== null && score.ascension > 0 ? (
            <DriftRow
              id="ascension"
              index={3}
              label={t("meta:drift.ascension", {
                n: score.ascension,
                mult: ascensionScoreMult(score.ascension).toFixed(2),
              })}
              value={score.ascensionPoints}
            />
          ) : null}
          <Divider color={tokens.line} />
          <Group
            justify="space-between"
            data-drift-row="total"
            data-rise
            style={riseStyle(3)}
          >
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
          <Group
            justify="space-between"
            data-drift-row="xp"
            data-rise
            style={riseStyle(3)}
          >
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
    </Screen>
  );
};
