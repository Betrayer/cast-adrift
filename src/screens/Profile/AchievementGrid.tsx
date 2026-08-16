import {
  Badge,
  Divider,
  Group,
  Paper,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_GROUPS,
  type AchievementDef,
} from "@/data/achievements";
import { UNLOCK_BY_ID } from "@/data/unlocks";
import {
  achievementProgress,
  metaAchievementCtx,
  type AchievementCtx,
} from "@/game/meta/achievements";
import { useMetaStore } from "@/stores/metaStore";

const Row = ({
  def,
  ctx,
  unlocked,
}: {
  def: AchievementDef;
  ctx: AchievementCtx;
  unlocked: boolean;
}) => {
  const { t } = useTranslation(["meta"]);
  const progress = achievementProgress(def, ctx);
  const reward = def.reward;
  const rewardUnlock =
    reward?.unlockId === undefined
      ? undefined
      : UNLOCK_BY_ID.get(reward.unlockId);
  const showBar = !unlocked && progress.need > 1;
  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      bg={unlocked ? tokens.surface2 : tokens.bg}
      data-achievement={def.id}
      data-achievement-state={unlocked ? "unlocked" : "locked"}
      style={{ borderColor: unlocked ? tokens.amber : tokens.line }}
    >
      <Stack gap={2}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" fw={600} c={unlocked ? tokens.amber : tokens.dim}>
            {t(def.name)}
          </Text>
          {unlocked ? (
            <Text size="sm" c={tokens.amber}>
              ✦
            </Text>
          ) : (
            <Text size="xs" c={tokens.faint}>
              {t("meta:profile.achProgress", {
                have: progress.have,
                need: progress.need,
              })}
            </Text>
          )}
        </Group>
        <Text size="xs" c={tokens.faint}>
          {t(def.desc)}
        </Text>
        {showBar ? (
          <Progress
            value={(progress.have / progress.need) * 100}
            color="accent"
            size="xs"
            aria-label={t(def.name)}
          />
        ) : null}
        {reward === undefined ? null : (
          <Group gap={4}>
            {reward.shards === undefined ? null : (
              <Badge size="xs" variant="light" color="yellow">
                +{reward.shards} ◈
              </Badge>
            )}
            {rewardUnlock === undefined ? null : (
              <Badge size="xs" variant="light" color="accent">
                {t(rewardUnlock.label)}
              </Badge>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  );
};

export const AchievementGrid = () => {
  const { t } = useTranslation(["meta"]);
  const unlocked = useMetaStore((s) => s.achievements);
  const ctx = useMemo(() => metaAchievementCtx(null), []);
  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked]);

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600} c={tokens.text}>
            {t("meta:profile.achievements")}
          </Text>
          <Text size="xs" c={tokens.amber} data-achievement-count>
            {t("meta:profile.achCount", {
              n: unlockedSet.size,
              total: ACHIEVEMENTS.length,
            })}
          </Text>
        </Group>
        <Divider color={tokens.line} />
        {ACHIEVEMENT_GROUPS.map((group) => {
          const rows = ACHIEVEMENTS.filter((def) => def.group === group);
          if (rows.length === 0) return null;
          return (
            <Stack key={group} gap={4}>
              <Text size="xs" c={tokens.faint}>
                {t(`meta:profile.group.${group}`)}
              </Text>
              {rows.map((def) => (
                <Row
                  key={def.id}
                  def={def}
                  ctx={ctx}
                  unlocked={unlockedSet.has(def.id)}
                />
              ))}
            </Stack>
          );
        })}
      </Stack>
    </Paper>
  );
};
