import { beforeEach, describe, expect, it } from "vitest";
import { bridgeFrameId } from "@/services/prefs";
import { applySettings } from "@/services/testApiPatches";
import { useMetaStore } from "@/stores/metaStore";
import { useSettingsStore } from "@/stores/settingsStore";

describe("caTest.settings", () => {
  beforeEach(() => {
    useSettingsStore.setState(useSettingsStore.getInitialState());
    useMetaStore.setState(useMetaStore.getInitialState());
  });

  it("sets the bridge frame through the account preference, the way the Settings picker does", () => {
    applySettings({ bridgeFrame: "obsidian" });
    expect(bridgeFrameId()).toBe("obsidian");
    expect(useMetaStore.getState().prefs.bridgeFrame).toBe("obsidian");
  });
});
