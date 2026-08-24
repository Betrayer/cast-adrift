import { beforeEach, describe, expect, it } from "vitest";
import { claimProfile, type PendingClaim } from "@/services/account-link";
import { META_DOC_V, type MetaDoc, type MetaDocPort } from "@/services/metaDoc";
import {
  battleLayoutId,
  chooseBattleLayout,
  chooseTheme,
  resolveBattleLayout,
} from "@/services/prefs";
import {
  createInitialMetaValues,
  migrateMeta,
  META_VERSION,
  useMetaStore,
} from "@/stores/metaStore";
import { useSettingsStore } from "@/stores/settingsStore";

const resetStores = (): void => {
  useMetaStore.setState({ prefs: {} });
  useSettingsStore.setState({ battleLayout: "console", theme: "deepSpace" });
};

describe("battle layout preference", () => {
  beforeEach(resetStores);

  it("prefers the account value, then the device value, then the default", () => {
    expect(resolveBattleLayout("orbit", "tablet")).toBe("orbit");
    expect(resolveBattleLayout(undefined, "tablet")).toBe("tablet");
    expect(resolveBattleLayout(undefined, undefined)).toBe("console");
  });

  it("writes both stores so a cold boot before meta hydration still lands right", () => {
    chooseBattleLayout("tablet");
    expect(useMetaStore.getState().prefs.battleLayout).toBe("tablet");
    expect(useSettingsStore.getState().battleLayout).toBe("tablet");
    expect(battleLayoutId()).toBe("tablet");

    useMetaStore.setState({ prefs: {} });
    expect(battleLayoutId()).toBe("tablet");
  });

  it("mirrors the theme into the account prefs", () => {
    chooseTheme("terminal");
    expect(useMetaStore.getState().prefs.theme).toBe("terminal");
    expect(useSettingsStore.getState().theme).toBe("terminal");
  });
});

describe("prefs migration", () => {
  it("starts empty and survives a round trip", () => {
    expect(createInitialMetaValues().prefs).toEqual({});
    const migrated = migrateMeta(
      { prefs: { battleLayout: "orbit", theme: "terminal" } },
      META_VERSION - 1,
    );
    expect(migrated.prefs).toEqual({
      battleLayout: "orbit",
      theme: "terminal",
    });
  });

  it("drops preference values the build no longer knows", () => {
    const migrated = migrateMeta(
      { prefs: { battleLayout: "holodeck", theme: "chartreuse" } },
      META_VERSION - 1,
    );
    expect(migrated.prefs).toEqual({});
  });

  it("treats a missing prefs object as no opinion", () => {
    expect(migrateMeta({ shards: 4 }, 11).prefs).toEqual({});
  });
});

describe("prefs across the identity claim", () => {
  it("rides the P2 claim because the claim copies the whole payload", async () => {
    const values = {
      ...createInitialMetaValues(),
      shards: 120,
      prefs: { battleLayout: "tablet" as const },
    };
    const source: MetaDoc = {
      v: META_DOC_V,
      updatedAt: 1000,
      data: JSON.stringify(values),
    };
    const written: MetaDoc[] = [];
    const port: MetaDocPort = {
      read: async () => null,
      write: async (_uid, doc) => {
        written.push(doc);
      },
      archive: async () => undefined,
    };
    const claim: PendingClaim = {
      sourceUid: "guest-1",
      meta: source,
      boards: [],
    };
    const result = await claimProfile(claim, "account-1", port);
    expect(result.outcome).toBe("copied");
    const landed = JSON.parse(written[0]?.data ?? "{}") as {
      prefs?: { battleLayout?: string };
    };
    expect(landed.prefs?.battleLayout).toBe("tablet");
  });
});
