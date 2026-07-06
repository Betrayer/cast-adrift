import { Button, Divider, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { PERK_BY_ID } from "@/data/perks";
import { abandonRun } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";

export const SummaryScreen = () => {
  const { t } = useTranslation(["run"]);
  const stats = useRunStore((s) => s.stats);
  const perks = useRunStore((s) => s.perks);
  const position = useRunStore((s) => s.position);
  const map = useRunStore((s) => s.map);
  const node = map?.nodes.find((n) => n.id === position);
  const victory = node?.type === "boss";

  const perkNames = perks
    .map((id) => PERK_BY_ID.get(id)?.name)
    .filter((name): name is string => name !== undefined);

  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder maw={420} w="100%">
        <Stack gap="sm">
          <Title order={2} c={victory ? tokens.text : tokens.danger} ta="center">
            {t(victory ? "run:summary.victory" : "run:summary.defeat")}
          </Title>
          <Divider color={tokens.line} />
          <Text c={tokens.dim}>
            {t("run:summary.nodes", { n: stats.nodesCleared })}
          </Text>
          <Text c={tokens.dim}>{t("run:summary.kills", { n: stats.kills })}</Text>
          <Text c={tokens.dim}>
            {t("run:summary.earned", { n: stats.scrapEarned })}
          </Text>
          <Text c={tokens.dim}>
            {t("run:summary.spent", { n: stats.scrapSpent })}
          </Text>
          <Divider color={tokens.line} />
          <Text c={tokens.faint} size="sm">
            {t("run:summary.perks")}{" "}
            {perkNames.length === 0
              ? t("run:summary.perksNone")
              : perkNames.map((name) => t(name)).join(" · ")}
          </Text>
          <Group
            justify="space-between"
            px="sm"
            py="xs"
            style={{
              border: `1px dashed ${tokens.line}`,
              borderRadius: 8,
            }}
          >
            <Text c={tokens.faint} size="sm">
              {t("run:summary.meta")}
            </Text>
          </Group>
          <Button size="md" fullWidth mt="sm" onClick={abandonRun}>
            {t("run:summary.toMenu")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
