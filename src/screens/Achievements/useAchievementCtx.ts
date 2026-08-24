import { useMemo } from "react";
import type { AchievementCtx } from "@/game/meta/achievements";
import { useMetaStore } from "@/stores/metaStore";

export const useAchievementCtx = (): AchievementCtx => {
  const stats = useMetaStore((s) => s.stats);
  const endings = useMetaStore((s) => s.endings);
  const bossFirstKills = useMetaStore((s) => s.bossFirstKills);
  const collection = useMetaStore((s) => s.collection);
  const encountered = useMetaStore((s) => s.encountered);
  const contracts = useMetaStore((s) => s.contracts);
  const chartPicks = useMetaStore((s) => s.chartPicks);
  const codex = useMetaStore((s) => s.codex);
  const seenPuzzles = useMetaStore((s) => s.seenPuzzles);
  const flagsArchive = useMetaStore((s) => s.flagsArchive);

  return useMemo(
    () => ({
      stats,
      endings,
      bossFirstKills,
      collection,
      encountered,
      contracts,
      chartPicks,
      codex,
      seenPuzzles,
      flagsArchive,
      run: null,
    }),
    [
      stats,
      endings,
      bossFirstKills,
      collection,
      encountered,
      contracts,
      chartPicks,
      codex,
      seenPuzzles,
      flagsArchive,
    ],
  );
};
