import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { tokens } from "@/app/theme";
import {
  CODEX_GROUP_ORDER,
  codexByGroup,
  type CodexEntry,
  type CodexGroup,
} from "@/data/codex";
import { schoolGlyphPath } from "@/data/glyphs";
import { SCHOOL_IDS, schools } from "@/data/schools";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";

const groupLabel: Record<CodexGroup, string> = {
  world: "run:codex.world",
  dossier: "run:codex.dossiers",
  memory: "run:codex.memory",
};

const EntryRow = ({ entry }: { entry: CodexEntry }) => {
  const { t } = useTranslation(["run", "content"]);
  const unlocked = useMetaStore((s) => s.codex.includes(entry.id));
  const read = useMetaStore((s) => s.codexRead.includes(entry.id));
  const markRead = useMetaStore((s) => s.markCodexRead);
  const [open, setOpen] = useState(false);

  if (!unlocked) {
    return (
      <Paper bg={tokens.surface1} p="sm" radius="sm" withBorder opacity={0.55}>
        <Text size="sm" c={tokens.faint}>
          {t("run:codex.locked")}
        </Text>
      </Paper>
    );
  }

  const toggle = (): void => {
    setOpen((v) => !v);
    if (!read) markRead(entry.id);
  };

  return (
    <Paper bg={tokens.surface1} p="sm" radius="sm" withBorder>
      <Group
        justify="space-between"
        wrap="nowrap"
        style={{ cursor: "pointer" }}
        data-codex-entry={entry.id}
        onClick={toggle}
      >
        <Text size="sm" fw={600} c={tokens.text}>
          {t(entry.title)}
        </Text>
        {!read ? (
          <Badge size="xs" color="accent" variant="filled">
            {t("run:codex.unread")}
          </Badge>
        ) : null}
      </Group>
      {open ? (
        <Stack gap={4} mt="xs">
          {entry.signature === undefined ? null : (
            <Text size="sm" c={tokens.accent} data-codex-signature={entry.id}>
              {t(entry.signature)}
            </Text>
          )}
          <Text size="sm" c={tokens.dim}>
            {t(entry.body)}
          </Text>
        </Stack>
      ) : null}
    </Paper>
  );
};

const GlyphLegend = () => {
  const { t } = useTranslation(["run", "battle"]);
  return (
    <Paper bg={tokens.surface1} p="sm" radius="sm" withBorder>
      <Text size="sm" fw={600} c={tokens.text}>
        {t("run:codex.glyphLegend.title")}
      </Text>
      <Group gap="sm" mt="xs" wrap="wrap">
        {SCHOOL_IDS.map((school) => {
          const glyph = schoolGlyphPath(school, 11, 11, 8);
          return (
            <Group key={school} gap={6} wrap="nowrap">
              <svg width={22} height={22} role="presentation">
                <path
                  d={glyph.d}
                  fill={glyph.mode === "fill" ? schools[school].stroke : "none"}
                  stroke={
                    glyph.mode === "stroke" ? schools[school].stroke : "none"
                  }
                  strokeWidth={glyph.width}
                />
              </svg>
              <Text size="xs" c={tokens.dim}>
                {t(`battle:school.${school}`)}
              </Text>
            </Group>
          );
        })}
      </Group>
      <Text size="xs" c={tokens.faint} mt="xs">
        {t("run:codex.glyphLegend.body")}
      </Text>
    </Paper>
  );
};

export const CodexScreen = () => {
  const { t } = useTranslation(["run", "content"]);
  const go = useAppStore((s) => s.go);

  return (
    <Screen
      width="wide"
      header={
        <Group justify="space-between">
          <Title order={3} c={tokens.text}>
            {t("run:codex.title")}
          </Title>
          <Button size="compact-sm" variant="default" onClick={() => { go("menu"); }}>
            {t("run:codex.back")}
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
          <GlyphLegend />
          {CODEX_GROUP_ORDER.map((group) => {
            const entries = codexByGroup(group);
            return (
              <Box key={group}>
                <Divider color={tokens.line} label={t(groupLabel[group])} />
                <Stack gap={6} mt="xs">
                  {entries.length === 0 ? (
                    <Text size="sm" c={tokens.faint}>
                      {t("run:codex.empty")}
                    </Text>
                  ) : (
                    entries.map((entry) => (
                      <EntryRow key={entry.id} entry={entry} />
                    ))
                  )}
                </Stack>
              </Box>
            );
          })}
      </Stack>
    </Screen>
  );
};
