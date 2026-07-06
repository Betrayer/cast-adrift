import { Button, Paper, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { completeNode } from "@/game/run/flow";

export const EventStub = () => {
  const { t } = useTranslation(["run"]);
  return (
    <Stack align="center" justify="center" mih="100dvh" p="md" bg={tokens.bg}>
      <Paper bg={tokens.surface1} p="xl" radius="md" withBorder maw={420}>
        <Stack align="center" gap="md">
          <Title order={3} c={tokens.text}>
            {t("run:event.title")}
          </Title>
          <Text c={tokens.dim} ta="center">
            {t("run:event.phase6")}
          </Text>
          <Button
            size="md"
            onClick={() => {
              completeNode({ outcome: "cleared" });
            }}
          >
            {t("run:event.continue")}
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
};
