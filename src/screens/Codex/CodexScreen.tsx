import {
  Box,
  Button,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import {
  CODEX_GROUP_ORDER,
  codexByGroup,
  type CodexGroup,
} from "@/data/codex";
import { useAppStore } from "@/stores/appStore";
import { CodexEntryRow } from "./CodexEntryRow";
import { GlyphLegend } from "./GlyphLegend";
import { TagGlossary } from "./TagGlossary";

const groupLabel: Record<CodexGroup, string> = {
  world: "run:codex.world",
  dossier: "run:codex.dossiers",
  forge: "run:codex.forge",
  memory: "run:codex.memory",
};

const CodexActionCard = ({
  title,
  body,
  action,
  onAction,
  testId,
  actionTestId,
  replayPrologue,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  testId?: string;
  actionTestId?: string;
  replayPrologue?: true;
}) => (
  <Paper
    bg={tokens.surface1}
    p="sm"
    radius="sm"
    withBorder
    data-rise
    data-press
    data-testid={testId}
    style={riseStyle(2)}
  >
    <Group justify="space-between" wrap="nowrap">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text size="sm" fw={600} c={tokens.text}>
          {title}
        </Text>
        <Text size="xs" c={tokens.faint}>
          {body}
        </Text>
      </Stack>
      <Button
        size="compact-sm"
        variant="default"
        style={{ flex: "0 0 auto" }}
        data-testid={actionTestId}
        data-replay-prologue={replayPrologue}
        onClick={onAction}
      >
        {action}
      </Button>
    </Group>
  </Paper>
);

export const CodexScreen = () => {
  const { t } = useTranslation(["run", "content"]);
  const go = useAppStore((s) => s.go);
  const setEchoCore = useAppStore((s) => s.setEchoCore);

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
          <CodexActionCard
            title={t("run:codex.prologueTitle")}
            body={t("run:codex.prologueBody")}
            action={t("run:codex.prologueReplay")}
            replayPrologue
            onAction={() => {
              go("prologue", { replay: "1" });
            }}
          />
          <CodexActionCard
            title={t("run:echo.codexTitle")}
            body={t("run:echo.codexBody")}
            action={t("run:echo.open")}
            testId="codex-echo"
            actionTestId="codex-echo-open"
            onAction={() => {
              setEchoCore(true);
            }}
          />
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
                      <CodexEntryRow key={entry.id} entry={entry} riseIndex={index} />
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
