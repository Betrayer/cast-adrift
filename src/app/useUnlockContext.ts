import { useMemo } from "react";
import type { UnlockContext } from "@/data/unlocks";
import { unlockContextOf } from "@/game/meta/unlockState";
import { useMetaStore } from "@/stores/metaStore";

export const useUnlockContext = (): UnlockContext => {
  const level = useMetaStore((s) => s.level);
  const achievements = useMetaStore((s) => s.achievements);
  const ascension = useMetaStore((s) => s.ascension);
  const unlocksGranted = useMetaStore((s) => s.unlocksGranted);
  const clears = useMetaStore((s) => s.stats.campaignClears);
  return useMemo(
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
};
