import { create } from "zustand";
import type { JournalBody, JournalEntry } from "@/game/run/journal";

export const JOURNAL_CAP = 160;
export const JOURNAL_CHATTER_CAP = 60;
export const FEED_CAP = 3;
export const FEED_MS = 8000;
export const FEED_CONSEQUENCE_MS = 10000;

export type FeedSource = "bark" | "consequence" | "achievement" | "system";

export type FeedTone = "normal" | "alert";

export type FeedScope = "run" | "app";

export interface FeedMessage {
  id: number;
  source: FeedSource;
  key: string;
  journalId: number | null;
  ttlMs: number;
  tone: FeedTone;
  scope: FeedScope;
  interactive: boolean;
}

export interface FeedPush {
  source: FeedSource;
  key: string;
  journalId?: number | null;
  tone?: FeedTone;
  scope?: FeedScope;
  interactive?: boolean;
}

export const feedTtl = (source: FeedSource): number =>
  source === "consequence" ? FEED_CONSEQUENCE_MS : FEED_MS;

export const isChatterEntry = (entry: JournalEntry): boolean =>
  entry.k === "bark" || entry.k === "system";

export const capJournal = (
  entries: readonly JournalEntry[],
): JournalEntry[] => {
  let chatter = 0;
  let narrative = 0;
  const dropped = new Set<number>();
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry === undefined) continue;
    if (isChatterEntry(entry)) {
      chatter += 1;
      if (chatter > JOURNAL_CHATTER_CAP) dropped.add(i);
    } else {
      narrative += 1;
      if (narrative > JOURNAL_CAP) dropped.add(i);
    }
  }
  if (dropped.size === 0) return [...entries];
  return entries.filter((_, i) => !dropped.has(i));
};

export interface NarrativeState {
  feed: FeedMessage[];
  journal: JournalEntry[];
  memoryQueue: number[];
  seq: number;
  pushFeed: (push: FeedPush) => number;
  dismissFeed: (id: number) => void;
  clearFeed: () => void;
  dropRunFeed: () => void;
  pushJournal: (entry: JournalBody & { sector: number }) => number;
  pushMemory: (order: number) => void;
  dismissMemory: () => void;
  setJournal: (entries: readonly JournalEntry[]) => void;
  reset: () => void;
}

export const useNarrativeStore = create<NarrativeState>()((set, get) => ({
  feed: [],
  journal: [],
  memoryQueue: [],
  seq: 0,

  pushFeed: (push) => {
    const id = get().seq + 1;
    set((s) => ({
      feed: [
        {
          id,
          source: push.source,
          key: push.key,
          journalId: push.journalId ?? null,
          ttlMs: feedTtl(push.source),
          tone: push.tone ?? "normal",
          scope: push.scope ?? "run",
          interactive: push.interactive ?? true,
        },
        ...s.feed,
      ].slice(0, FEED_CAP),
      seq: id,
    }));
    return id;
  },

  dismissFeed: (id) => {
    set((s) => ({ feed: s.feed.filter((message) => message.id !== id) }));
  },

  clearFeed: () => {
    set({ feed: [] });
  },

  dropRunFeed: () => {
    set((s) => ({ feed: s.feed.filter((message) => message.scope === "app") }));
  },

  pushJournal: (entry) => {
    const id = get().seq + 1;
    set((s) => ({
      journal: capJournal([...s.journal, { ...entry, id }]),
      seq: id,
    }));
    return id;
  },

  pushMemory: (order) => {
    set((s) =>
      s.memoryQueue.includes(order)
        ? s
        : { memoryQueue: [...s.memoryQueue, order] },
    );
  },

  dismissMemory: () => {
    set((s) => ({ memoryQueue: s.memoryQueue.slice(1) }));
  },

  setJournal: (entries) => {
    set((s) => ({
      journal: capJournal(entries),
      seq: Math.max(s.seq, ...entries.map((e) => e.id), 0),
    }));
  },

  reset: () => {
    set({ feed: [], journal: [], memoryQueue: [] });
  },
}));
