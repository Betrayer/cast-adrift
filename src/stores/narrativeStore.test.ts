import { beforeEach, describe, expect, it } from "vitest";
import {
  logAuthError,
  logBark,
  logConsequence,
  logJournal,
} from "@/game/run/journal";
import {
  FEED_CAP,
  FEED_CONSEQUENCE_MS,
  FEED_MS,
  JOURNAL_CAP,
  JOURNAL_CHATTER_CAP,
  feedTtl,
  useNarrativeStore,
} from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";

const feed = () => useNarrativeStore.getState().feed;

const journal = () => useNarrativeStore.getState().journal;

describe("the comms feed", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
  });

  it("gives a consequence longer on screen than every other source", () => {
    expect(feedTtl("consequence")).toBe(FEED_CONSEQUENCE_MS);
    expect(feedTtl("bark")).toBe(FEED_MS);
    expect(feedTtl("achievement")).toBe(FEED_MS);
    expect(feedTtl("system")).toBe(FEED_MS);
    expect(FEED_CONSEQUENCE_MS).toBeGreaterThan(FEED_MS);
  });

  it("stacks newest first and drops the oldest past the cap", () => {
    const store = useNarrativeStore.getState();
    store.pushFeed({ source: "bark", key: "a" });
    store.pushFeed({ source: "consequence", key: "b" });
    store.pushFeed({ source: "achievement", key: "c" });
    store.pushFeed({ source: "system", key: "d" });
    expect(feed()).toHaveLength(FEED_CAP);
    expect(feed().map((m) => m.key)).toEqual(["d", "c", "b"]);
  });

  it("dismisses one row without disturbing the rest", () => {
    const store = useNarrativeStore.getState();
    const first = store.pushFeed({ source: "bark", key: "a" });
    store.pushFeed({ source: "bark", key: "b" });
    store.dismissFeed(first);
    expect(feed().map((m) => m.key)).toEqual(["b"]);
  });

  it("never reissues a row id, so a survivor can never look newer than one already seen", () => {
    const store = useNarrativeStore.getState();
    const seen: number[] = [];
    const note = (id: number): void => {
      expect(id).toBeGreaterThan(Math.max(0, ...seen));
      seen.push(id);
    };

    note(store.pushFeed({ source: "bark", key: "a" }));
    const second = store.pushFeed({ source: "bark", key: "b" });
    note(second);
    store.dismissFeed(second);
    expect(feed().map((m) => m.key)).toEqual(["a"]);
    expect(feed()[0]?.id).toBeLessThan(second);

    note(store.pushFeed({ source: "consequence", key: "c" }));
    store.clearFeed();
    note(store.pushFeed({ source: "achievement", key: "d" }));

    useNarrativeStore.getState().reset();
    note(useNarrativeStore.getState().pushFeed({ source: "system", key: "e" }));

    useNarrativeStore.getState().setJournal([
      { id: 4, k: "bark", sector: 1, line: "x" },
    ]);
    note(useNarrativeStore.getState().pushFeed({ source: "bark", key: "f" }));
  });
  it("carries the journal id of the entry a consequence wrote, not the row's own id", () => {
    useRunStore.setState({ active: true, sector: 2 });
    logConsequence("run:motif.cache");
    const row = feed()[0];
    const entry = journal()[0];
    expect(entry?.k).toBe("consequence");
    expect(row?.journalId).toBe(entry?.id);
    expect(row?.journalId).not.toBe(row?.id);
  });

  it("drops the run's rows when the run context ends and keeps the app's own", () => {
    useRunStore.setState({ active: true, sector: 2 });
    logBark("content:bark.resume.a");
    logConsequence("run:motif.cache");
    logAuthError("network");
    expect(feed()).toHaveLength(3);

    useNarrativeStore.getState().dropRunFeed();
    expect(feed().map((m) => m.source)).toEqual(["system"]);
    expect(feed()[0]?.scope).toBe("app");
    expect(feed()[0]?.tone).toBe("alert");
  });

  it("keeps the auth row out of reach of a tap", () => {
    useNarrativeStore.getState().pushFeed({
      source: "system",
      key: "settings:account.error.network",
      tone: "alert",
      interactive: false,
    });
    expect(feed()[0]?.interactive).toBe(false);
    expect(feed()[0]?.tone).toBe("alert");
  });
});

describe("the journal ring", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    useRunStore.getState().reset();
    useRunStore.setState({ active: true, sector: 1 });
  });

  it("keeps every choice through two hundred barks", () => {
    for (let i = 0; i < 12; i += 1) {
      logJournal({
        k: "choice",
        event: `event${String(i)}`,
        option: "take",
        text: "content:events.probe.out.take",
      });
    }
    for (let i = 0; i < 200; i += 1) {
      logBark(`content:bark.resume.${String((i % 10) + 1)}`);
    }
    const choices = journal().filter((entry) => entry.k === "choice");
    const barks = journal().filter((entry) => entry.k === "bark");
    expect(choices).toHaveLength(12);
    expect(barks).toHaveLength(JOURNAL_CHATTER_CAP);
  });

  it("drops the oldest narrative entries only once its own cap is passed", () => {
    for (let i = 0; i < JOURNAL_CAP + 5; i += 1) {
      logJournal({ k: "memory", order: i });
    }
    const memories = journal().filter((entry) => entry.k === "memory");
    expect(memories).toHaveLength(JOURNAL_CAP);
    expect(memories[0]).toMatchObject({ order: 5 });
  });

  it("keeps chatter and narrative in one ordered record", () => {
    logJournal({ k: "memory", order: 1 });
    logBark("content:bark.resume.1");
    logJournal({ k: "memory", order: 2 });
    expect(journal().map((entry) => entry.k)).toEqual([
      "memory",
      "bark",
      "memory",
    ]);
  });
});
