import { Box, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import {
  MECHANIC_TAGS,
  SCHOOL_TAGS,
  SYSTEM_TAGS,
  type ContentTag,
} from "@/data/tags";

const TAG_GROUPS: readonly (readonly [string, readonly ContentTag[]])[] = [
  ["run:tag.glossarySchools", SCHOOL_TAGS],
  ["run:tag.glossarySystems", SYSTEM_TAGS],
  ["run:tag.glossaryMechanics", MECHANIC_TAGS],
];

export const TagGlossary = () => {
  const { t } = useTranslation(["run"]);
  return (
    <Paper bg={tokens.surface1} p="sm" radius="sm" withBorder data-tag-glossary>
      <Text size="sm" fw={600} c={tokens.text}>
        {t("run:tag.glossaryTitle")}
      </Text>
      <Text size="xs" c={tokens.faint} mt={2}>
        {t("run:tag.glossaryBody")}
      </Text>
      {TAG_GROUPS.map(([label, tags]) => (
        <Box key={label} mt="xs">
          <Divider color={tokens.line} label={t(label)} />
          <Stack gap={2} mt={4}>
            {tags.map((tag) => (
              <Group key={tag} gap={6} wrap="nowrap" data-glossary-tag={tag}>
                <Text size="xs" fw={700} c={tokens.dim} miw={82}>
                  {t(`run:tag.${tag}`)}
                </Text>
                <Text size="xs" c={tokens.faint}>
                  {t(`run:tagDesc.${tag}`)}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>
      ))}
    </Paper>
  );
};
