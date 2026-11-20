import { Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { CONTRACT_STAR_MAX } from "@/data/contracts";
import { contractStarTotal } from "@/game/run/goals";
import { useMetaStore } from "@/stores/metaStore";

export const BestsCard = () => {
  const { t } = useTranslation(["meta"]);
  const best = useMetaStore((s) => s.best);
  const contracts = useMetaStore((s) => s.contracts);
  const starTotal = contractStarTotal(contracts);

  return (
    <Paper
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-rise
      data-profile-section="bests"
      style={riseStyle(3)}
    >
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
              max: CONTRACT_STAR_MAX,
            })}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
};
