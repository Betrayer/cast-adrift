import type { LocKey } from "@/types/content";

export type MemorySource =
  | { s: "gate"; n: number }
  | { s: "elite"; n: number }
  | { s: "beacons"; n: number }
  | { s: "ending" };

export interface MemoryDef {
  id: string;
  order: number;
  codexId: string;
  title: LocKey;
  body: LocKey;
  source: MemorySource;
}

export const MEMORY_TOTAL = 16;
export const GATE_MEMORIES = 10;
export const ELITE_THRESHOLDS: readonly number[] = [3, 6, 9];
export const BEACON_THRESHOLDS: readonly number[] = [3, 5];

const memory = (order: number, source: MemorySource): MemoryDef => ({
  id: `echo-${String(order)}`,
  order,
  codexId: `memory-${String(order)}`,
  title: `content:codex.memory-${String(order)}.title`,
  body: `content:codex.memory-${String(order)}.body`,
  source,
});

export const MEMORIES: readonly MemoryDef[] = [
  ...Array.from({ length: GATE_MEMORIES }, (_, i) =>
    memory(i + 1, { s: "gate", n: i + 1 }),
  ),
  ...ELITE_THRESHOLDS.map((n, i) =>
    memory(GATE_MEMORIES + i + 1, { s: "elite", n }),
  ),
  ...BEACON_THRESHOLDS.map((n, i) =>
    memory(GATE_MEMORIES + ELITE_THRESHOLDS.length + i + 1, {
      s: "beacons",
      n,
    }),
  ),
  {
    id: "echo-16",
    order: MEMORY_TOTAL,
    codexId: "memory-16",
    title: "content:codex.memory-16.title",
    body: "content:codex.memory-16.body",
    source: { s: "ending" },
  },
];

export const MEMORY_BY_ORDER: ReadonlyMap<number, MemoryDef> = new Map(
  MEMORIES.map((m) => [m.order, m]),
);

export const FINAL_MEMORY_BY_ENDING: Readonly<Record<string, string>> = {
  seal: "memory-16-seal",
  merge: "memory-16-merge",
  bargain: "memory-16-bargain",
  silent: "memory-16-silent",
  answer: "memory-16-answer",
};

export const FINAL_MEMORY_IDS: readonly string[] = Object.values(
  FINAL_MEMORY_BY_ENDING,
);

export const NUMBERED_MEMORIES: readonly MemoryDef[] = MEMORIES.filter(
  (m) => m.source.s !== "ending",
);

export const MEMORY_CODEX_IDS: readonly string[] = [
  ...NUMBERED_MEMORIES.map((m) => m.codexId),
  ...FINAL_MEMORY_IDS,
];

export const memoryAt = (order: number): MemoryDef | undefined =>
  MEMORY_BY_ORDER.get(order);

export const finalMemoryCodexId = (endingId: string): string =>
  FINAL_MEMORY_BY_ENDING[endingId] ?? "memory-16-seal";

export interface MemoryProgress {
  gateKills: number;
  lifetimeElites: number;
  beaconsResolved: number;
}

const reached = (source: MemorySource, p: MemoryProgress): boolean => {
  switch (source.s) {
    case "gate":
      return p.gateKills >= source.n;
    case "elite":
      return p.lifetimeElites >= source.n;
    case "beacons":
      return p.beaconsResolved >= source.n;
    case "ending":
      return false;
  }
};

export const earnedMemoryOrders = (p: MemoryProgress): number[] =>
  MEMORIES.filter((m) => reached(m.source, p)).map((m) => m.order);
