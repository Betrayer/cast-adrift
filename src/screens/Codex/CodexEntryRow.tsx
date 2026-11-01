import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { riseStyle } from "@/app/motion";
import { tokens } from "@/app/theme";
import type { CodexEntry } from "@/data/codex";
import { memoryUnlockHint } from "@/game/narrative/memoryArc";
import { useMetaStore } from "@/stores/metaStore";

export const CodexEntryRow = ({
  entry,
  riseIndex,
}: {
  entry: CodexEntry;
  riseIndex: number;
}) => {
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
        style={riseStyle(riseIndex)}
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
      style={riseStyle(riseIndex)}
    >
      <Group
        justify="space-between"
        wrap="nowrap"
        style={{ cursor: "pointer" }}
        data-codex-entry={entry.id}
        data-press
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
