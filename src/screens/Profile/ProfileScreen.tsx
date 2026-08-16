import {
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "@/data/contracts";
import { ENDINGS, STANDARD_ENDINGS } from "@/data/narrative/endings";

import { countStars } from "@/game/run/goals";
import { progressWithinLevel } from "@/game/xp";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { AchievementGrid } from "./AchievementGrid";
import { BadgeRow } from "./BadgeRow";

const endingSlots = (earned: readonly string[]): typeof ENDINGS =>
  earned.includes("answer") ? ENDINGS : STANDARD_ENDINGS;

const StatCell = ({ label, value }: { label: string; value: string }) => (
  <Stack gap={0}>
    <Text size="xs" c={tokens.faint}>
      {label}
    </Text>
    <Text fw={700} c={tokens.text}>
      {value}
    </Text>
  </Stack>
);

export const ProfileScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const go = useAppStore((s) => s.go);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const shards = useMetaStore((s) => s.shards);
  const stats = useMetaStore((s) => s.stats);
  const best = useMetaStore((s) => s.best);
  const endings = useMetaStore((s) => s.endings);
  const contracts = useMetaStore((s) => s.contracts);
  const progress = progressWithinLevel(xp);
  const starTotal = CONTRACTS.reduce(
    (sum, def) => sum + countStars(contracts[def.id] ?? 0),
    0,
  );

  return (
    <Screen
      header={
        <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
          <Group justify="space-between">
            <Text fw={700} c={tokens.text}>
              {t("meta:profile.title")}
            </Text>
            <Button
              size="xs"
              variant="default"
              onClick={() => {
                go("modes");
              }}
            >
              {t("common:back")}
            </Button>
          </Group>
        </Paper>
      }
    >
      <Stack gap="sm">
          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Group>
              <RingProgress
                size={92}
                thickness={7}
                roundCaps
                sections={[{ value: progress.pct * 100, color: "accent" }]}
                label={
                  <Text ta="center" c={tokens.text} fw={700}>
                    {level}
                  </Text>
                }
              />
              <Stack gap={4} style={{ flex: 1 }}>
                <Text c={tokens.text} fw={600}>
                  {t("meta:summary.level", { level })}
                </Text>
                <Progress
                  value={progress.pct * 100}
                  color="accent"
                  aria-label="xp"
                />
                <Text size="xs" c={tokens.faint}>
                  {t("meta:summary.toNext", {
                    into: progress.into,
                    need: progress.need,
                  })}
                </Text>
                <Text size="xs" c={tokens.amber}>
                  {t("meta:profile.shards", { n: shards })}
                </Text>
              </Stack>
            </Group>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.lifetime")}
              </Text>
              <Divider color={tokens.line} />
              <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                <StatCell
                  label={t("meta:profile.runs")}
                  value={String(stats.runs)}
                />
                <StatCell
                  label={t("meta:profile.wins")}
                  value={String(stats.wins)}
                />
                <StatCell
                  label={t("meta:profile.kills")}
                  value={String(stats.kills)}
                />
                <StatCell
                  label={t("meta:profile.scrap")}
                  value={String(stats.scrapEarned)}
                />
                <StatCell
                  label={t("meta:profile.deepestDrift")}
                  value={String(stats.deepestDrift)}
                />
                <StatCell
                  label={t("meta:profile.clears")}
                  value={String(stats.campaignClears)}
                />
              </SimpleGrid>
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.bests")}
              </Text>
              <Divider color={tokens.line} />
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestDrift")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.drift}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestWeekly")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.driftWeekly}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.bestDaily")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {best.dailyRank === null
                    ? t("meta:profile.none")
                    : t("meta:profile.place", { rank: best.dailyRank })}
                </Text>
              </Group>
              <Group justify="space-between">
                <Text size="sm" c={tokens.dim}>
                  {t("meta:profile.stars")}
                </Text>
                <Text size="sm" c={tokens.amber} fw={700}>
                  {t("meta:modes.contractStars", {
                    n: starTotal,
                    max: CONTRACTS.length * CONTRACT_STAR_COUNT,
                  })}
                </Text>
              </Group>
            </Stack>
          </Paper>

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.badges")}
              </Text>
              <Divider color={tokens.line} />
              <BadgeRow />
            </Stack>
          </Paper>

          <AchievementGrid />

          <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text fw={600} c={tokens.text}>
                {t("meta:profile.endings")}
              </Text>
              <Divider color={tokens.line} />
              <SimpleGrid cols={{ base: 2, xs: 5 }} spacing="xs">
                {endingSlots(endings).map((def) => {
                  const earned = endings.includes(def.id);
                  return (
                    <Stack key={def.id} align="center" gap={2}>
                      <Paper
                        bg={earned ? tokens.surface2 : tokens.bg}
                        withBorder
                        radius="xl"
                        w={46}
                        h={46}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderColor: earned ? tokens.amber : tokens.line,
                        }}
                      >
                        <Text
                          fw={700}
                          c={earned ? tokens.amber : tokens.faint}
                          size="lg"
                        >
                          {earned ? t(def.label).slice(0, 1) : "?"}
                        </Text>
                      </Paper>
                      <Text size="10px" c={earned ? tokens.dim : tokens.faint} ta="center">
                        {earned ? t(def.label) : t("meta:profile.locked")}
                      </Text>
                    </Stack>
                  );
                })}
              </SimpleGrid>
            </Stack>
          </Paper>
      </Stack>
    </Screen>
  );
};
