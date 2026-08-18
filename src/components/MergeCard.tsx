import { Badge, Button, Group, Modal, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { tokens } from "@/app/theme";
import { relativeWhen } from "@/game/run/resume";
import { resolveMergeChoice } from "@/services/account";
import type { ProfileSummary } from "@/services/metaDoc";
import { useAppStore } from "@/stores/appStore";

const whenLabel = (t: TFunction, updatedAt: number): string => {
  if (updatedAt <= 0) return t("settings:account.merge.never");
  const when = relativeWhen(updatedAt);
  return when.unit === "now"
    ? t("menu:resumeWhen.now")
    : t(`menu:resumeWhen.${when.unit}`, { n: when.n });
};

interface SideProps {
  label: string;
  summary: ProfileSummary;
  recommended: boolean;
  testId: string;
  busy: boolean;
  onKeep: () => void;
}

const Side = ({
  label,
  summary,
  recommended,
  testId,
  busy,
  onKeep,
}: SideProps) => {
  const { t } = useTranslation(["settings", "menu"]);
  return (
    <Paper
      p="sm"
      radius="md"
      withBorder
      bg={tokens.surface1}
      data-testid={testId}
      style={{ borderColor: recommended ? tokens.accent : tokens.line }}
    >
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" fw={600} c={tokens.text}>
            {label}
          </Text>
          {recommended ? (
            <Badge size="xs" variant="light" color="accent">
              {t("settings:account.merge.recommended")}
            </Badge>
          ) : null}
        </Group>
        <Text size="xs" c={tokens.dim}>
          {t("settings:account.merge.stats", {
            level: summary.level,
            shards: summary.shards,
            runs: summary.runs,
          })}
        </Text>
        <Text size="10px" c={tokens.faint}>
          {whenLabel(t, summary.updatedAt)}
        </Text>
        <Button
          size="compact-sm"
          variant={recommended ? "filled" : "default"}
          loading={busy}
          data-testid={`${testId}-keep`}
          onClick={onKeep}
        >
          {t("settings:account.merge.keep")}
        </Button>
      </Stack>
    </Paper>
  );
};

export const MergeCard = () => {
  const { t } = useTranslation(["settings", "menu"]);
  const merge = useAppStore((s) => s.merge);
  const busy = useAppStore((s) => s.authBusy);

  if (merge === null) return null;

  return (
    <Modal
      opened
      centered
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      title={t("settings:account.merge.title")}
      onClose={() => undefined}
    >
      <Stack gap="sm" data-testid="merge-card">
        <Text size="sm" c={tokens.dim}>
          {t("settings:account.merge.body")}
        </Text>
        <Side
          label={t("settings:account.merge.thisDevice")}
          summary={merge.source}
          recommended={merge.recommended === "source"}
          testId="merge-source"
          busy={busy}
          onKeep={() => {
            void resolveMergeChoice("source");
          }}
        />
        <Side
          label={t("settings:account.merge.thisAccount")}
          summary={merge.target}
          recommended={merge.recommended === "target"}
          testId="merge-target"
          busy={busy}
          onKeep={() => {
            void resolveMergeChoice("target");
          }}
        />
      </Stack>
    </Modal>
  );
};
