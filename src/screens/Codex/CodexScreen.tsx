import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import {
  CODEX_GROUP_ORDER,
  codexByGroup,
  type CodexEntry,
  type CodexGroup,
} from "@/data/codex";
import { schoolGlyphPath } from "@/data/glyphs";
import { SCHOOL_IDS, schools } from "@/data/schools";
import {
  MECHANIC_TAGS,
  SCHOOL_TAGS,
  SYSTEM_TAGS,
  type ContentTag,
} from "@/data/tags";
import { STATUS_KEYS } from "@/game/battle/statuses";
import { DIE_BADGE_GLYPH, DIE_BADGE_ORDER } from "@/game/dice/card";
import { memoryUnlockHint } from "@/game/narrative/memoryArc";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";

const groupLabel: Record<CodexGroup, string> = {
  world: "run:codex.world",
  dossier: "run:codex.dossiers",
  memory: "run:codex.memory",
};

const EntryRow = ({ entry, index }: { entry: CodexEntry; index: number }) => {
  const { t } = useTranslation(["run", "content"]);
  const unlocked = useMetaStore((s) => s.codex.includes(entry.id));
  const read = useMetaStore((s) => s.codexRead.includes(entry.id));
  const markRead = useMetaStore((s) => s.markCodexRead);
  const [open, setOpen] = useState(false);

  if (!unlocked) {
    const hint = entry.group === "memory" ? memoryUnlockHint(entry.id) : null;
    return (
      <Paper
        bg={tokens.surface1}
        p="sm"
        radius="sm"
        withBorder
        opacity={0.55}
        data-rise
        style={riseStyle(index)}
      >
        <Text size="sm" c={tokens.faint}>
          {t("run:codex.locked")}
        </Text>
        {hint === null ? null : (
          <Text size="xs" c={tokens.faint} data-memory-hint={entry.id}>
            {t(hint.key, hint.values)}
          </Text>
        )}
      </Paper>
    );
  }

  const toggle = (): void => {
    setOpen((v) => !v);
    if (!read) markRead(entry.id);
  };

  return (
    <Paper
      bg={tokens.surface1}
      p="sm"
      radius="sm"
      withBorder
      data-rise
      data-press
      style={riseStyle(index)}
    >
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

      <Divider my="xs" color={tokens.line} />
      <Text size="sm" fw={600} c={tokens.text}>
        {t("run:codex.badgeLegend")}
      </Text>
      <Stack gap={2} mt={4} data-badge-legend>
        {DIE_BADGE_ORDER.map((badge) => (
          <Group key={badge} gap={6} wrap="nowrap" data-legend-badge={badge}>
            <Text size="sm" fw={700} c={tokens.text} w={18} ta="center">
              {DIE_BADGE_GLYPH[badge]}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t(`battle:badge.${badge}`)}
            </Text>
          </Group>
        ))}
        <Group gap={6} wrap="nowrap" data-legend-badge="prismatic">
          <Text size="sm" fw={700} c={schools.prismatic.text} w={18} ta="center">
            ◈
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t("battle:die.feature.prismatic")}
          </Text>
        </Group>
      </Stack>

      <Divider my="xs" color={tokens.line} />
      <Text size="sm" fw={600} c={tokens.text}>
        {t("battle:statusLegend")}
      </Text>
      <Stack gap={2} mt={4} data-status-legend>
        {STATUS_KEYS.map((key) => (
          <Group key={key} gap={6} wrap="nowrap" data-legend-status={key}>
            <Text size="sm" fw={700} c={tokens.text} w={18} ta="center">
              {t(`battle:status.${key}`)}
            </Text>
            <Stack gap={0}>
              <Text size="xs" c={tokens.dim}>
                {t(`battle:statusName.${key}`)}
              </Text>
              <Text size="xs" c={tokens.faint}>
                {t(`battle:statusDesc.${key}`)}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
};

const TAG_GROUPS: readonly (readonly [string, readonly ContentTag[]])[] = [
  ["run:tag.glossarySchools", SCHOOL_TAGS],
  ["run:tag.glossarySystems", SYSTEM_TAGS],
  ["run:tag.glossaryMechanics", MECHANIC_TAGS],
];

const TagGlossary = () => {
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

export const CodexScreen = () => {
  const { t } = useTranslation(["run", "content"]);
  const go = useAppStore((s) => s.go);

  return (
    <Screen
      width="wide"
      header={<AppHeader />}
    >
      <Stack gap="md">
          <div data-rise style={riseStyle(0)}>
            <GlyphLegend />
          </div>
          <div data-rise style={riseStyle(1)}>
            <TagGlossary />
          </div>
          <Paper
            bg={tokens.surface1}
            p="sm"
            radius="sm"
            withBorder
            data-rise
            data-press
            style={riseStyle(2)}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={2}>
                <Text size="sm" fw={600} c={tokens.text}>
                  {t("run:codex.prologueTitle")}
                </Text>
                <Text size="xs" c={tokens.faint}>
                  {t("run:codex.prologueBody")}
                </Text>
              </Stack>
              <Button
                size="compact-sm"
                variant="default"
                data-replay-prologue
                onClick={() => {
                  go("prologue", { replay: "1" });
                }}
              >
                {t("run:codex.prologueReplay")}
              </Button>
            </Group>
          </Paper>
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
                    entries.map((entry, index) => (
                      <EntryRow key={entry.id} entry={entry} index={index} />
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
