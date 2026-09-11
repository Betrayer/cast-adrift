import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BARKS } from "@/data/barks";
import {
  emitBark,
  isMajorBarkTrigger,
  resetBarkMemory,
} from "@/game/narrative/barks";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";

const START = 1_000_000;

const echoRows = (): string[] =>
  useNarrativeStore
    .getState()
    .feed.filter((message) => message.source === "bark")
    .map((message) => message.key);

const currentBark = (): string | null => echoRows()[0] ?? null;

const barkEntries = (): string[] =>
  useNarrativeStore
    .getState()
    .journal.filter((entry) => entry.k === "bark")
    .map((entry) => (entry.k === "bark" ? entry.line : ""));

describe("bark engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    resetBarkMemory();
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
    useSettingsStore.setState({ echoVerbosity: "normal" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits a line for a known trigger", () => {
    emitBark("resume");
    expect(currentBark()).not.toBe(null);
  });

  it("ignores unknown triggers", () => {
    emitBark("nope:nothing");
    expect(currentBark()).toBe(null);
  });

  it("does not repeat a line before the pool is exhausted", () => {
    emitBark("resume");
    const first = currentBark();
    useNarrativeStore.getState().clearFeed();
    vi.setSystemTime(START + 130_000);
    emitBark("resume");
    const second = currentBark();
    expect(second).not.toBe(null);
    expect(second).not.toBe(first);
  });

  it("respects the global frequency budget", () => {
    emitBark("resume");
    expect(currentBark()).not.toBe(null);
    useNarrativeStore.getState().clearFeed();
    vi.setSystemTime(START + 5_000);
    emitBark("battleWin");
    expect(currentBark()).toBe(null);
  });
});

describe("echo verbosity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    resetBarkMemory();
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
    useSettingsStore.setState({ echoVerbosity: "normal" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("names the landmark triggers as major and the chatter as minor", () => {
    for (const trigger of [
      "resume",
      "bossPhase",
      "lowHull",
      "sectorEnter:3",
      "wormholeRide",
      "holeBypass",
    ]) {
      expect(isMajorBarkTrigger(trigger)).toBe(true);
    }
    for (const trigger of [
      "battleWin",
      "rareLoot",
      "idleMap",
      "eventOutcome:positive",
      "firstKill:raider",
    ]) {
      expect(isMajorBarkTrigger(trigger)).toBe(false);
    }
  });

  it("off keeps every echo row out of the feed", () => {
    useSettingsStore.setState({ echoVerbosity: "off" });
    emitBark("resume");
    emitBark("bossPhase");
    expect(echoRows()).toHaveLength(0);
  });

  it("off leaves the other sources untouched", () => {
    useSettingsStore.setState({ echoVerbosity: "off" });
    useNarrativeStore
      .getState()
      .pushFeed({ source: "consequence", key: "run:motif.cache" });
    expect(useNarrativeStore.getState().feed).toHaveLength(1);
    expect(echoRows()).toHaveLength(0);
  });

  it("keeps the two black-hole branches on their own pools", () => {
    const ride = BARKS.find((b) => b.trigger === "wormholeRide")?.lines ?? [];
    const bypass = BARKS.find((b) => b.trigger === "holeBypass")?.lines ?? [];
    expect(ride).toHaveLength(5);
    expect(bypass).toHaveLength(5);
    expect(ride.filter((line) => bypass.includes(line))).toEqual([]);
  });

  it("less speaks on a major trigger and stays quiet on chatter", () => {
    useSettingsStore.setState({ echoVerbosity: "less" });
    emitBark("rareLoot");
    expect(currentBark()).toBe(null);
    emitBark("bossPhase");
    expect(currentBark()).not.toBe(null);
  });

  it("less still doubles the per-trigger cooldown", () => {
    emitBark("resume");
    useNarrativeStore.getState().clearFeed();
    useSettingsStore.setState({ echoVerbosity: "less" });
    vi.setSystemTime(START + 130_000);
    emitBark("resume");
    expect(currentBark()).toBe(null);
  });
});

describe("echo in the record", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    resetBarkMemory();
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
    useSettingsStore.setState({ echoVerbosity: "normal" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the line to the journal at emit time so an expired row is recoverable", () => {
    useRunStore.setState({ active: true, sector: 2 });
    emitBark("resume");
    const line = currentBark();
    expect(line).not.toBe(null);
    useNarrativeStore.getState().clearFeed();
    expect(barkEntries()).toEqual([line]);
  });

  it("links the feed row to the journal entry it wrote", () => {
    useRunStore.setState({ active: true, sector: 1 });
    emitBark("resume");
    const row = useNarrativeStore.getState().feed[0];
    const entry = useNarrativeStore.getState().journal[0];
    expect(row?.journalId).toBe(entry?.id);
  });

  it("writes nothing to the journal outside a run", () => {
    emitBark("resume");
    expect(currentBark()).not.toBe(null);
    expect(barkEntries()).toHaveLength(0);
    expect(useNarrativeStore.getState().feed[0]?.journalId).toBe(null);
  });
});
