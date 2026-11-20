import { Button, Divider, Paper, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tokens } from "@/app/theme";
import { ACHIEVEMENTS } from "@/data/achievements";
import {
  achievementProgress,
  achievementTitle,
} from "@/game/meta/achievements";
import {
  AchievementTallyBar,
  AchievementTallyHead,
} from "@/screens/Achievements/AchievementTally";
import { useAchievementCtx } from "@/screens/Achievements/useAchievementCtx";
import { useAppStore } from "@/stores/appStore";
import { useMetaStore } from "@/stores/metaStore";

export const AchievementSummary = () => {
  const { t } = useTranslation(["meta"]);
  const go = useAppStore((s) => s.go);
  const ctx = useAchievementCtx();
  const unlocked = useMetaStore((s) => s.achievements);
  const earned = useMemo(() => new Set(unlocked), [unlocked]);

  const closest = useMemo(() => {
    let best: { title: string; have: number; need: number } | null = null;
    for (const def of ACHIEVEMENTS) {
      if (earned.has(def.id)) continue;
      const progress = achievementProgress(def, ctx);
      if (progress.done || progress.need <= 0 || progress.have <= 0) continue;
      const ratio = progress.have / progress.need;
      if (best !== null && ratio <= best.have / best.need) continue;
      best = {
        title: achievementTitle(def, t),
        have: progress.have,
        need: progress.need,
      };
    }
    return best;
  }, [ctx, earned, t]);

  return (
    <Paper bg={tokens.surface1} p="md" radius="md" withBorder>
      <Stack gap="xs">
        <AchievementTallyHead earned={earned.size} />
        <Divider color={tokens.line} />
        <AchievementTallyBar earned={earned.size} />
        <Text size="xs" c={tokens.faint} data-achievement-closest>
          {closest === null
            ? t("meta:profile.achNoneClose")
            : t("meta:profile.achClosest", {
                name: closest.title,
                have: closest.have,
                need: closest.need,
              })}
        </Text>
        <Button
          size="compact-xs"
          variant="default"
          data-testid="profile-achievements"
          onClick={() => {
            go("achievements");
          }}
        >
          {t("meta:profile.achOpen")}
        </Button>
      </Stack>
    </Paper>
  );
};
