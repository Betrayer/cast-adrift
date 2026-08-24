import { settleLifetimeAchievements } from "@/game/meta/achievements";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";

const bump = (delta: Partial<MetaStats>): void => {
  useMetaStore.getState().bumpLifetime(delta);
  settleLifetimeAchievements();
};

export const noteCheckWon = (): void => {
  bump({ checksWon: 1 });
};

export const noteEventResolved = (): void => {
  bump({ eventsResolved: 1 });
};

export const noteFusion = (): void => {
  bump({ fusions: 1 });
};

export const noteMkTop = (): void => {
  bump({ mk3Built: 1 });
};
