import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { AppHeader } from "@/components/AppHeader";
import { tokens } from "@/app/theme";
import { CONTRACTS, CONTRACT_STAR_COUNT } from "@/data/contracts";
import { MUTATOR_BY_ID } from "@/data/mutators";
import { unlockedContracts } from "@/data/unlocks";
import { contractRoutes, unlockHintsLine } from "@/game/meta/describeUnlock";
import {
  freshContractIds,
  freshUnlockIdsOfKind,
  unlockContextOf,
} from "@/game/meta/unlockState";
import { hasActiveRun, startContractRun } from "@/game/run/flow";
import { goalAmount, goalSecondary, type GoalSpec } from "@/game/run/goals";
import { useMetaStore } from "@/stores/metaStore";
import { ActiveRunGuard } from "@/screens/Modes/ActiveRunGuard";

const STAR_FILLED = "★";
const STAR_EMPTY = "☆";

export const ContractsScreen = () => {
  const { t } = useTranslation(["meta", "common", "content"]);
  const contracts = useMetaStore((s) => s.contracts);
  const level = useMetaStore((s) => s.level);
  const achievements = useMetaStore((s) => s.achievements);
  const ascension = useMetaStore((s) => s.ascension);
  const unlocksGranted = useMetaStore((s) => s.unlocksGranted);
  const unlocksSeen = useMetaStore((s) => s.unlocksSeen);
  const clears = useMetaStore((s) => s.stats.campaignClears);
  const [pending, setPending] = useState<string | null>(null);

  const unlockCtx = useMemo(
    () =>
      unlockContextOf({
        level,
        achievements,
        ascension,
        unlocksGranted,
        stats: { campaignClears: clears },
      }),
    [level, achievements, ascension, unlocksGranted, clears],
  );
  const open = useMemo(() => unlockedContracts(unlockCtx), [unlockCtx]);

  const [freshAtMount] = useState(() => ({
    contracts: freshContractIds(unlockCtx, unlocksSeen),
    ids: freshUnlockIdsOfKind(unlockCtx, unlocksSeen, "contractWave"),
  }));
  const fresh = freshAtMount.contracts;
  useEffect(() => {
    useMetaStore.getState().markUnlocksSeen(freshAtMount.ids);
  }, [freshAtMount]);

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
    <Screen
      header={<AppHeader />}
    >
      <Stack gap="sm">
          {CONTRACTS.map((def) => {
            const mask = contracts[def.id] ?? 0;
            const isOpen = open.has(def.id);
            return (
              <Paper
                key={def.id}
                bg={tokens.surface1}
                p="md"
                radius="md"
                withBorder
                data-contract={def.id}
                data-contract-locked={isOpen ? undefined : "1"}
                style={isOpen ? undefined : { opacity: 0.6 }}
              >
                <Stack gap={6}>
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap={4} wrap="nowrap">
                      <Text fw={600} c={tokens.text}>
                        {t(def.name)}
                      </Text>
                      {fresh.has(def.id) ? (
                        <Badge size="xs" color="accent" data-unlock-new>
                          {t("meta:unlock.new")}
                        </Badge>
                      ) : null}
                    </Group>
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
                  {isOpen ? (
                    <Button
                      size="sm"
                      color="accent"
                      onClick={() => {
                        launch(def.id);
                      }}
                    >
                      {t("meta:contracts.launch")}
                    </Button>
                  ) : (
                    <Text size="xs" c={tokens.amber} data-unlock-hint>
                      {unlockHintsLine(contractRoutes(def.id), t)}
                    </Text>
                  )}
                </Stack>
              </Paper>
            );
          })}
      </Stack>

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
    </Screen>
  );
};
