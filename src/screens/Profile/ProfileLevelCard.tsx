import { Group, Paper, Progress, RingProgress, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { progressWithinLevel } from "@/game/xp";
import { useMetaStore } from "@/stores/metaStore";

export const ProfileLevelCard = () => {
  const { t } = useTranslation(["meta"]);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const shards = useMetaStore((s) => s.shards);
  const progress = progressWithinLevel(xp);

  return (
    <Paper
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-rise
      data-profile-section="level"
      style={riseStyle(1)}
    >
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
  );
};
