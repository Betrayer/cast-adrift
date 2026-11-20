import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { claimProfile, type PendingClaim } from "@/services/account-link";
import { META_DOC_V, type MetaDoc, type MetaDocPort } from "@/services/metaDoc";
import {
  battleLayoutId,
  chartLayoutId,
  chooseBattleLayout,
  chooseChartLayout,
  chooseRollStyle,
  chooseTheme,
  resolveBattleLayout,
  resolveChartLayout,
  resolveRollStyle,
  rollStyleId,
  useBattleLayoutId,
  useChartLayoutId,
  useRollStyle,
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
  useSettingsStore.setState({
    battleLayout: "console",
    chartLayout: "spiral",
    rollStyle: "flip",
    theme: "deepSpace",
  });
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

describe("chart layout preference", () => {
  beforeEach(resetStores);

  it("prefers the account value, then the device value, then the spiral", () => {
    expect(resolveChartLayout("rings", "nebulae")).toBe("rings");
    expect(resolveChartLayout(undefined, "nebulae")).toBe("nebulae");
    expect(resolveChartLayout(undefined, undefined)).toBe("spiral");
  });

  it("ignores a value the build no longer knows at either level", () => {
    expect(
      resolveChartLayout(
        "radial" as unknown as "rings",
        "constellations",
      ),
    ).toBe("constellations");
    expect(
      resolveChartLayout(undefined, "holo" as unknown as "rings"),
    ).toBe("spiral");
  });

  it("writes both stores, and the account wins over the device", () => {
    chooseChartLayout("constellations");
    expect(useMetaStore.getState().prefs.chartLayout).toBe("constellations");
    expect(useSettingsStore.getState().chartLayout).toBe("constellations");
    expect(chartLayoutId()).toBe("constellations");

    useSettingsStore.setState({ chartLayout: "rings" });
    expect(chartLayoutId()).toBe("constellations");

    useMetaStore.setState({ prefs: {} });
    expect(chartLayoutId()).toBe("rings");
  });

  it("leaves the battle layout alone", () => {
    chooseBattleLayout("orbit");
    chooseChartLayout("nebulae");
    expect(battleLayoutId()).toBe("orbit");
    expect(useMetaStore.getState().prefs).toEqual({
      battleLayout: "orbit",
      chartLayout: "nebulae",
    });
  });
});

describe("roll style preference", () => {
  beforeEach(resetStores);

  it("prefers the account value, then the device value, then the flip", () => {
    expect(resolveRollStyle("blur", "reel")).toBe("blur");
    expect(resolveRollStyle(undefined, "reel")).toBe("reel");
    expect(resolveRollStyle(undefined, undefined)).toBe("flip");
  });

  it("writes both stores, and the account wins over the device", () => {
    chooseRollStyle("reel");
    expect(useMetaStore.getState().prefs.rollStyle).toBe("reel");
    expect(useSettingsStore.getState().rollStyle).toBe("reel");
    useSettingsStore.setState({ rollStyle: "blur" });
    expect(rollStyleId()).toBe("reel");
    useMetaStore.setState({ prefs: {} });
    expect(rollStyleId()).toBe("blur");
  });
});

const BattleLayoutProbe = (): string => useBattleLayoutId();
const ChartLayoutProbe = (): string => useChartLayoutId();
const RollStyleProbe = (): string => useRollStyle();

const renderPrefs = (): string[] =>
  [BattleLayoutProbe, ChartLayoutProbe, RollStyleProbe].map((probe) =>
    renderToString(createElement(probe)),
  );

describe("pref hooks on first render", () => {
  beforeEach(resetStores);

  it("read an account pull that landed while nothing was mounted", () => {
    expect(renderPrefs()).toEqual(["console", "spiral", "flip"]);
    useMetaStore.setState({
      prefs: { battleLayout: "orbit", chartLayout: "rings", rollStyle: "blur" },
    });
    expect(renderPrefs()).toEqual(["orbit", "rings", "blur"]);
  });

  it("read a device change that landed while nothing was mounted", () => {
    useSettingsStore.setState({
      battleLayout: "tablet",
      chartLayout: "nebulae",
      rollStyle: "reel",
    });
    expect(renderPrefs()).toEqual(["tablet", "nebulae", "reel"]);
  });
});

describe("prefs migration", () => {
  it("starts empty and survives a round trip", () => {
    expect(createInitialMetaValues().prefs).toEqual({});
    const migrated = migrateMeta(
      {
        prefs: { battleLayout: "orbit", chartLayout: "rings", rollStyle: "blur", theme: "terminal" },
      },
      META_VERSION - 1,
    );
    expect(migrated.prefs).toEqual({
      battleLayout: "orbit",
      chartLayout: "rings",
      rollStyle: "blur",
      theme: "terminal",
    });
  });

  it("drops preference values the build no longer knows", () => {
    const migrated = migrateMeta(
      {
        prefs: { battleLayout: "holodeck", chartLayout: "radial", theme: "chartreuse" },
      },
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
