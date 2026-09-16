import { beforeEach, describe, expect, it } from "vitest";
import { unlockedCosmetics } from "@/data/unlocks";
import { unlockContextOf } from "@/game/meta/unlockState";
import { createInitialMetaStats, useMetaStore } from "@/stores/metaStore";

const resetMeta = (): void => {
  useMetaStore.setState({
    level: 1,
    achievements: [],
    unlocksGranted: [],
    unlocksSeen: [],
    ascension: { campaign: 0 },
    stats: createInitialMetaStats(),
  });
};

const cosmeticsNow = (): Set<string> =>
  unlockedCosmetics(unlockContextOf(useMetaStore.getState()));

describe("ascension-gated unlocks track the cleared level", () => {
  beforeEach(resetMeta);

  it("withholds the A3 skin until the campaign is cleared at A3", () => {
    useMetaStore.getState().recordCampaignClear(2);
    expect(useMetaStore.getState().ascension.campaign).toBe(3);
    expect(cosmeticsNow().has("ashenSkin")).toBe(false);

    useMetaStore.getState().recordCampaignClear(3);
    expect(cosmeticsNow().has("ashenSkin")).toBe(true);
  });

  it("reports no cleared ascension on a fresh profile", () => {
    expect(unlockContextOf(useMetaStore.getState()).ascension).toBe(0);
    useMetaStore.getState().recordCampaignClear(0);
    expect(unlockContextOf(useMetaStore.getState()).ascension).toBe(0);
  });
});
