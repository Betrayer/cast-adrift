import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "@/data/contracts";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { hasActiveRun, startContractRun } from "@/game/run/flow";
import { goalAmount, goalSecondary, type GoalSpec } from "@/game/run/goals";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { ActiveRunGuard } from "@/screens/Modes/ActiveRunGuard";

const STAR_FILLED = "★";
const STAR_EMPTY = "☆";

export const ContractsScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const go = useAppStore((s) => s.go);
  const contracts = useMetaStore((s) => s.contracts);
  const [pending, setPending] = useState<string | null>(null);

  const goalLabel = useCallback(
    (spec: GoalSpec): string =>
      t(`meta:goal.${spec.g}`, {
        n: goalAmount(spec) ?? 0,
        deck: goalSecondary(spec) ?? 0,
      }),
    [t],
  );

  const launch = useCallback((id: string) => {
    if (hasActiveRun()) {
      setPending(id);
      return;
    }
    startContractRun(id);
  }, []);

  return (
    <Stack align="center" mih="var(--ca-vh)" p="md" bg={tokens.bg} gap="sm">
      <Paper bg={tokens.surface1} p="md" radius="md" withBorder maw={460} w="100%">
        <Group justify="space-between">
          <Text fw={700} c={tokens.text}>
            {t("meta:contracts.title")}
          </Text>
          <Button
            size="xs"
            variant="default"
            onClick={() => {
              go("modes");
            }}
          >
            {t("common:back")}
          </Button>
        </Group>
      </Paper>

      <ScrollArea h="calc(var(--ca-vh) - 120px)" w="100%" maw={460}>
        <Stack gap="sm" pb="md">
          {CONTRACTS.map((def) => {
            const mask = contracts[def.id] ?? 0;
            return (
              <Paper
                key={def.id}
                bg={tokens.surface1}
                p="md"
                radius="md"
                withBorder
              >
                <Stack gap={6}>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600} c={tokens.text}>
                      {t(def.name)}
                    </Text>
                    <Group gap={2} wrap="nowrap">
                      {Array.from({ length: CONTRACT_STAR_COUNT }, (_, i) => {
                        const earned = (mask & (1 << i)) !== 0;
                        return (
                          <Text
                            key={`${def.id}-star-${String(i)}`}
                            fw={700}
                            c={earned ? tokens.amber : tokens.faint}
                          >
                            {earned ? STAR_FILLED : STAR_EMPTY}
                          </Text>
                        );
                      })}
                    </Group>
                  </Group>
                  <Text size="xs" c={tokens.dim}>
                    {t(def.desc)}
                  </Text>
                  <Group gap={4}>
                    {(def.setup.mutators ?? []).map((id) => (
                      <Badge key={id} size="sm" color="amber" variant="light">
                        {t(MUTATOR_BY_ID.get(id)?.name ?? id)}
                      </Badge>
                    ))}
                  </Group>
                  <Stack gap={2}>
                    {def.goals.map((spec, index) => (
                      <Text
                        key={`${def.id}-${spec.g}`}
                        size="xs"
                        c={
                          (mask & (1 << index)) !== 0
                            ? tokens.amber
                            : tokens.faint
                        }
                      >
                        {`${(mask & (1 << index)) !== 0 ? STAR_FILLED : STAR_EMPTY} ${goalLabel(spec)}`}
                      </Text>
                    ))}
                  </Stack>
                  <Button
                    size="sm"
                    color="accent"
                    onClick={() => {
                      launch(def.id);
                    }}
                  >
                    {t("meta:contracts.launch")}
                  </Button>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </ScrollArea>

      <ActiveRunGuard
        opened={pending !== null}
        onCancel={() => {
          setPending(null);
        }}
        onConfirm={() => {
          const id = pending;
          setPending(null);
          if (id !== null) startContractRun(id);
        }}
      />
    </Stack>
  );
};
