import { Divider, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { MEDALLION_COLUMNS } from "@/app/grids";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import { ENDINGS, STANDARD_ENDINGS } from "@/data/narrative/endings";
import { useMetaStore } from "@/stores/metaStore";

const endingSlots = (earned: readonly string[]): typeof ENDINGS =>
  earned.includes("answer") ? ENDINGS : STANDARD_ENDINGS;

export const EndingsCard = () => {
  const { t } = useTranslation(["meta", "content"]);
  const endings = useMetaStore((s) => s.endings);

  return (
    <Paper
      bg={tokens.surface1}
      p="md"
      radius="md"
      withBorder
      data-rise
      data-profile-section="endings"
      style={riseStyle(3)}
    >
      <Stack gap="xs">
        <Text fw={600} c={tokens.text}>
          {t("meta:profile.endings")}
        </Text>
        <Divider color={tokens.line} />
        <SimpleGrid cols={MEDALLION_COLUMNS} spacing="xs">
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
  );
};
