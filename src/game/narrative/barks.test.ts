import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emitBark, resetBarkMemory } from "@/game/narrative/barks";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useSettingsStore } from "@/stores/settingsStore";

const START = 1_000_000;

const currentBark = (): string | null =>
  useNarrativeStore.getState().bark?.line ?? null;

describe("bark engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    resetBarkMemory();
    useNarrativeStore.getState().reset();
    useSettingsStore.setState({ echoVerbosity: "normal" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays silent when verbosity is off", () => {
    useSettingsStore.setState({ echoVerbosity: "off" });
    emitBark("resume");
    expect(currentBark()).toBe(null);
  });

  it("emits a line for a known trigger", () => {
    emitBark("resume");
    expect(currentBark()).not.toBe(null);
  });

  it("does not repeat a line before the pool is exhausted", () => {
    emitBark("resume");
    const first = currentBark();
    useNarrativeStore.getState().dismissBark();
    vi.setSystemTime(START + 130_000);
    emitBark("resume");
    const second = currentBark();
    expect(second).not.toBe(null);
    expect(second).not.toBe(first);
  });

  it("respects the global frequency budget", () => {
    emitBark("resume");
    expect(currentBark()).not.toBe(null);
    useNarrativeStore.getState().dismissBark();
    vi.setSystemTime(START + 5_000);
    emitBark("battleWin");
    expect(currentBark()).toBe(null);
  });

  it("doubles cooldown under reduced verbosity", () => {
    emitBark("resume");
    useNarrativeStore.getState().dismissBark();
    useSettingsStore.setState({ echoVerbosity: "less" });
    vi.setSystemTime(START + 130_000);
    emitBark("resume");
    expect(currentBark()).toBe(null);
  });

  it("ignores unknown triggers", () => {
    emitBark("nope:nothing");
    expect(currentBark()).toBe(null);
  });
});
