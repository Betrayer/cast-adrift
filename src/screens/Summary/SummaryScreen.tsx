import {
  Button,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Screen } from "@/app/Screen";
import { riseStyle } from "@/app/motion";
import { rafTweens, UI_GROUP } from "@/pixi/tween";
import { playSfx } from "@/services/audio";
import { tokens } from "@/app/theme";
import { achievementTitleById } from "@/game/meta/achievements";
import { ShipCard } from "@/components/ShipCard";
import { ShipSilhouette } from "@/components/ShipSilhouette";
import { SHIP_RANK_MAX, shipRankOf } from "@/data/shipRanks";
import { BattleTallyPanel } from "@/screens/Rewards/BattleTallyPanel";
import { DIE_BY_ID } from "@/data/dice";
import { PERK_BY_ID } from "@/data/perks";
import { draftedPerks } from "@/data/perks/ship";
import { progressWithinLevel } from "@/game/xp";
import { abandonRun } from "@/game/run/flow";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { useReducedMotion } from "@/stores/settingsStore";
import { useSummaryStore } from "@/stores/summaryStore";
import { CountLine, CountSlot } from "./CountLine";
import { COUNT_MARK } from "./countSequence";
import { LevelUpCeremony } from "./LevelUpCeremony";
import { RecapShareButton } from "./RecapShareButton";
import { SectorLadder, summaryRoute } from "./SectorLadder";
import { ShardBreakdownList } from "./ShardBreakdownList";
import { SummaryDetail } from "./SummaryDetail";
import { useSummaryCounts } from "./useSummaryCounts";

const FIND_STAGGER_MS = 180;

export const SummaryScreen = () => {
  const { t } = useTranslation(["run", "meta"]);
  const stats = useRunStore((s) => s.stats);
  const shipId = useRunStore((s) => s.shipId);
  const mkLevels = useRunStore((s) => s.mkLevels);
  const tally = useRunStore((s) => s.lastTally);
  const perks = useRunStore((s) => s.perks);
  const masteryRank = useRunStore((s) => s.masteryRank);
  const shipRankXp = useRunStore((s) => s.shipRankXp);
  const sectorIndex = useRunStore((s) => s.sectorIndex);
  const crossedThreshold = useRunStore((s) => s.crossedThreshold);
  const mode = useRunStore((s) => s.mode);
  const contractId = useRunStore((s) => s.contractId);
  const result = useSummaryStore((s) => s.result);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const reduced = useReducedMotion();
  const modelRef = useRef<HTMLDivElement | null>(null);

  const win = result?.win ?? false;
  const route = summaryRoute(
    { sectorIndex, crossedThreshold, mode, contractId },
    win,
  );
  const leveled =
    result !== null && result.toLevel > result.fromLevel;
  const [ceremonyDone, setCeremonyDone] = useState(!leveled);
  const [detailed, setDetailed] = useState(false);

  const xpTarget = result?.xpGain ?? 0;
  const shardsTarget = result?.shardGain ?? 0;
  const nodesTarget = stats.nodesCleared;
  const killsTarget = stats.kills;
  const scrapTarget = stats.scrapEarned;

  const { slots, countsDone } = useSummaryCounts(
    {
      xp: xpTarget,
      shards: shardsTarget,
      nodes: nodesTarget,
      kills: killsTarget,
      scrap: scrapTarget,
    },
    reduced,
  );

  const firstFinds = useMemo(() => result?.firstFinds ?? [], [result]);
  const findShards = result?.findShards ?? 0;

  useEffect(() => {
    if (firstFinds.length === 0) return;
    const { tweens, destroy } = rafTweens();
    tweens.channel(UI_GROUP).sequence(
      firstFinds.map((_, index) => ({
        ms: FIND_STAGGER_MS,
        run: () => {
          playSfx("cacheClaim", { rate: 1 + index * 0.07 });
        },
      })),
      );
    return () => {
      destroy();
    };
  }, [firstFinds]);

  const progress = progressWithinLevel(xp);
  const perkNames = draftedPerks(perks)
    .map((id) => PERK_BY_ID.get(id)?.name)
    .filter((name): name is string => name !== undefined);


  const ceremony =
    leveled && countsDone && !ceremonyDone && result !== null ? (
      <LevelUpCeremony
        fromLevel={result.fromLevel}
        toLevel={result.toLevel}
        milestones={result.milestones}
        unlocks={result.unlocks}
        reduced={reduced}
        onContinue={() => {
          setCeremonyDone(true);
        }}
      />
    ) : null;

  return (
    <Screen
      centered
      overlay={ceremony}
    >
      <Paper
        bg={tokens.surface1}
        p="xl"
        radius="md"
        withBorder
        w="100%"
        data-summary-sequence={countsDone ? "done" : "running"}
      >
        <Stack gap="sm">
          <Title order={2} c={win ? tokens.text : tokens.danger} ta="center">
            {t(win ? "run:summary.victory" : "run:summary.defeat")}
          </Title>
          <div ref={modelRef}>
            <ShipSilhouette
              shipId={shipId}
              masteryRank={masteryRank}
              perks={perks}
              size="summary"
            />
          </div>
          <Text size="sm" c={tokens.dim} ta="center" data-testid="summary-ship-rank">
            {t("run:summary.shipRank", {
              rank: shipRankOf(shipRankXp),
              max: SHIP_RANK_MAX,
            })}
          </Text>
          <ShipCard shipId={shipId} size="compact" mkLevels={mkLevels} masteryRank={masteryRank} />
          <SectorLadder
            route={route}
            label={t("run:summary.route", { n: route.to, max: route.total })}
          />
          <Divider color={tokens.line} />
          <Text c={tokens.dim}>
            <CountLine
              text={t("run:summary.nodes", { n: COUNT_MARK })}
              id="nodes"
              target={nodesTarget}
              slot={slots.nodes}
            />
          </Text>
          <Text c={tokens.dim}>
            <CountLine
              text={t("run:summary.kills", { n: COUNT_MARK })}
              id="kills"
              target={killsTarget}
              slot={slots.kills}
            />
          </Text>
          <Text c={tokens.dim}>
            <CountLine
              text={t("run:summary.earned", { n: COUNT_MARK })}
              id="scrap"
              target={scrapTarget}
              slot={slots.scrap}
            />
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            data-testid="summary-more"
            onClick={() => {
              setDetailed((value) => !value);
            }}
          >
            {t(detailed ? "run:summary.less" : "run:summary.more")}
          </Button>
          {detailed ? (
            <SummaryDetail stats={stats} cause={result?.cause ?? null} />
          ) : null}
          {detailed && tally !== null ? (
            <BattleTallyPanel tally={tally} />
          ) : null}
          {(result?.rotation ?? []).length === 0 ? null : (
            <Text c={tokens.dim}>
              {t("run:summary.faced", {
                names: (result?.rotation ?? []).map((n) => t(n)).join(" · "),
              })}
            </Text>
          )}
          <Divider color={tokens.line} />
          <Group justify="space-between">
            <Text c={tokens.amber} fw={600}>
              {t("meta:summary.shards")}
            </Text>
            <Text c={tokens.amber} fw={700}>
              +
              <CountSlot id="shards" target={shardsTarget} slot={slots.shards} />
              {" ◈"}
            </Text>
          </Group>
          <ShardBreakdownList result={result} />
          {firstFinds.length === 0 ? null : (
            <Text
              size="xs"
              c={tokens.amber}
              data-first-finds
              data-find-shards={findShards}
              data-rise
              style={riseStyle(0)}
            >
              {t("meta:summary.firstFinds", {
                names: firstFinds
                  .map((id) => t(DIE_BY_ID.get(id)?.name ?? id))
                  .join(" · "),
              })}
            </Text>
          )}
          {(result?.achievements ?? []).length === 0 ? null : (
            <Stack gap={2} data-achievement-lines>
              {(result?.achievements ?? []).map((id) => (
                <Text key={id} size="xs" c={tokens.accent}>
                  ✦ {achievementTitleById(id, t)}
                </Text>
              ))}
            </Stack>
          )}
          <Group justify="space-between">
            <Text c={tokens.accent} fw={600}>
              {t("meta:summary.xp")}
            </Text>
            <Text c={tokens.accent} fw={700}>
              +
              <CountSlot id="xp" target={xpTarget} slot={slots.xp} />
            </Text>
          </Group>
          <Text size="xs" c={tokens.faint}>
            {t("meta:summary.level", { level })}
          </Text>
          <Progress
            value={progress.pct * 100}
            color="accent"
            aria-label="xp"
          />
          <Divider color={tokens.line} />
          <Text c={tokens.faint} size="sm">
            {t("run:summary.perks")}{" "}
            {perkNames.length === 0
              ? t("run:summary.perksNone")
              : perkNames.map((name) => t(name)).join(" · ")}
          </Text>
          <Group grow gap="xs" align="flex-start" wrap="nowrap">
          <Button
            size="compact-sm"
            variant="default"
            data-open-build
            onClick={() => {
              useAppStore.getState().setBuildSheet(true);
            }}
          >
            {t("run:build.open")}
          </Button>
          <RecapShareButton modelRef={modelRef} win={win} sector={route.to} sectorMax={route.total} />
          </Group>
          <Button
            size="md"
            fullWidth
            mt="sm"
            data-testid="summary-menu"
            onClick={() => {
              useSummaryStore.getState().clear();
              abandonRun();
            }}
          >
            {t("run:summary.toMenu")}
          </Button>
        </Stack>
      </Paper>
    </Screen>
  );
};
