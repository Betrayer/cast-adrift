import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import {
  CODEX_GROUP_ORDER,
  codexByGroup,
  type CodexEntry,
  type CodexGroup,
} from "@/data/codex";
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
        <Text size="sm" c={tokens.dim} mt="xs">
          {t(entry.body)}
        </Text>
      ) : null}
    </Paper>
  );
};

export const CodexScreen = () => {
  const { t } = useTranslation(["run", "content"]);
  const go = useAppStore((s) => s.go);

  return (
    <Stack mih="100dvh" p="md" gap="sm" bg={tokens.bg}>
      <Group justify="space-between">
        <Title order={3} c={tokens.text}>
          {t("run:codex.title")}
        </Title>
        <Button size="compact-sm" variant="default" onClick={() => { go("menu"); }}>
          {t("run:codex.back")}
        </Button>
      </Group>
      <ScrollArea.Autosize mah="82dvh">
        <Stack gap="md">
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
      </ScrollArea.Autosize>
    </Stack>
  );
};
