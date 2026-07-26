import type { LocKey } from "@/types/content";

export interface MemoryDef {
  id: string;
  order: number;
  codexId: string;
  title: LocKey;
  body: LocKey;
}

// Echo's arc: 11 fragments unlock in order on each boss / mini-boss first kill of
// the campaign; the twelfth is written at the finale and varies by ending.
const memory = (order: number): MemoryDef => ({
  id: `echo-${String(order)}`,
  order,
  codexId: `memory-${String(order)}`,
  title: `content:codex.memory-${String(order)}.title`,
  body: `content:codex.memory-${String(order)}.body`,
});

export const MEMORIES: readonly MemoryDef[] = Array.from(
  { length: 11 },
  (_, i) => memory(i + 1),
);

export const MEMORY_SLOTS = 12;

export const FINAL_MEMORY_BY_ENDING: Readonly<Record<string, string>> = {
  seal: "memory-12-seal",
  merge: "memory-12-merge",
  bargain: "memory-12-bargain",
  silent: "memory-12-silent",
};

export const memoryAt = (index: number): MemoryDef | undefined =>
  MEMORIES[index - 1];

export const finalMemoryCodexId = (endingId: string): string =>
  FINAL_MEMORY_BY_ENDING[endingId] ?? "memory-12-seal";
