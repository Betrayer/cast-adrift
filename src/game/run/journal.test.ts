import { beforeEach, describe, expect, it } from "vitest";
import { applyOutcome } from "@/game/events/apply";
import { abandonRun, endRun, startRun } from "@/game/run/flow";
import {
  applyAxisDelta,
  journalAxisHistory,
  journalBySector,
  logJournal,
  settleSectorDrift,
} from "@/game/run/journal";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createStream } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";

const journal = () => useNarrativeStore.getState().journal;

describe("run journal", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu", params: undefined });
  });

  it("starts empty and records the choice an outcome came from", () => {
    startRun(42);
    expect(journal()).toHaveLength(0);
    applyOutcome(
      {
        text: "content:events.probe.out.take",
        effects: [{ k: "scrap", n: 5 }],
      },
      createStream(1),
      { eventId: "probe", optionId: "take", optionIndex: 0 },
    );
    const entries = journal();
    expect(entries).toHaveLength(1);
    const first = entries[0];
    expect(first?.k).toBe("choice");
    if (first?.k === "choice") {
      expect(first.event).toBe("probe");
      expect(first.option).toBe("take");
    }
    expect(first?.sector).toBe(1);
  });

  it("logs a consequence line beside the choice, so a missed toast is recoverable", () => {
    startRun(42);
    applyOutcome(
      {
        text: "content:events.probe.out.take",
        effects: [{ k: "flag", key: "maraFriend" }],
        consequence: "content:consequence.maraFriend",
      },
      createStream(1),
      { eventId: "probe", optionId: "take", optionIndex: 0 },
    );
    const kinds = journal().map((e) => e.k);
    // The flag also closes Mara's first chain step, so the thread logs itself
    // between the choice and its consequence.
    expect(kinds).toEqual(["choice", "chain", "consequence"]);
    expect(useNarrativeStore.getState().consequence?.origin).toBe(
      "content:consequence.maraFriend",
    );
  });

  it("records an axis shift with its source and builds a history", () => {
    startRun(42);
    applyAxisDelta(-2, "choice");
    applyAxisDelta(3, "beacon");
    const shifts = journal().filter((e) => e.k === "axis");
    expect(shifts).toHaveLength(2);
    expect(journalAxisHistory(journal())).toEqual([0, -2, 1]);
  });

  it("does not log an axis entry when the value cannot move", () => {
    startRun(42);
    useRunStore.setState({ axis: 10 });
    applyAxisDelta(2, "choice");
    expect(journal().filter((e) => e.k === "axis")).toHaveLength(0);
  });

  it("settles deck drift once per sector and logs it as drift", () => {
    startRun(42);
    useRunStore.setState({
      deck: Array.from({ length: 4 }, (_, i) => ({
        uid: `d${String(i)}`,
        defId: "black-d6",
      })),
    });
    useRunStore.getState().noteDriftUsage(6, 0);
    settleSectorDrift();
    expect(useRunStore.getState().axis).toBe(-1);
    expect(useRunStore.getState().driftBlack).toBe(0);
    const drift = journal().filter((e) => e.k === "axis");
    expect(drift).toHaveLength(1);
    // A second settle with no usage in between is a no-op, so the sector
    // boundary can be crossed twice without paying twice.
    settleSectorDrift();
    expect(useRunStore.getState().axis).toBe(-1);
  });

  it("groups entries by the sector they happened in", () => {
    startRun(42);
    logJournal({ k: "memory", order: 1 });
    useRunStore.setState({ sector: 3 });
    logJournal({ k: "memory", order: 2 });
    const bySector = journalBySector(journal());
    expect(bySector.get(1)).toHaveLength(1);
    expect(bySector.get(3)).toHaveLength(1);
  });

  it("survives a save/restore round trip", () => {
    startRun(42);
    logJournal({ k: "beacon", event: "beaconKeeperIntro", resolved: 1 });
    applyAxisDelta(-1, "choice");
    const snapshot = captureRunSnapshot();
    abandonRun();
    expect(journal()).toHaveLength(0);
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(journal().map((e) => e.k)).toEqual(["beacon", "axis"]);
  });

  it("a new run does not inherit the previous run's journal", () => {
    startRun(42);
    logJournal({ k: "memory", order: 1 });
    startRun(43);
    expect(journal()).toHaveLength(0);
  });
});

describe("death closure", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu", params: undefined });
  });

  it("routes defeat through the epilogue rather than straight to the summary", () => {
    startRun(42);
    endRun(false);
    expect(useAppStore.getState().screen).toBe("ending");
    expect(useAppStore.getState().params?.death).toBe("1");
  });

  it("still sends a clear to the summary", () => {
    startRun(42);
    endRun(true);
    expect(useAppStore.getState().screen).toBe("summary");
  });
});
