import type { LocKey } from "@/types/content";

export type CodexGroup = "world" | "dossier" | "memory";

export interface CodexEntry {
  id: string;
  group: CodexGroup;
  title: LocKey;
  body: LocKey;
}

export const CODEX_GROUP_ORDER: readonly CodexGroup[] = [
  "world",
  "dossier",
  "memory",
];

const world = (id: string): CodexEntry => ({
  id,
  group: "world",
  title: `content:codex.${id}.title`,
  body: `content:codex.${id}.body`,
});

const memory = (id: string): CodexEntry => ({
  id,
  group: "memory",
  title: `content:codex.${id}.title`,
  body: `content:codex.${id}.body`,
});

const MEMORY_ENTRIES: readonly CodexEntry[] = [
  ...Array.from({ length: 11 }, (_, i) => memory(`memory-${String(i + 1)}`)),
  memory("memory-12-seal"),
  memory("memory-12-merge"),
  memory("memory-12-bargain"),
  memory("memory-12-silent"),
];

export const CODEX: readonly CodexEntry[] = [
  world("silentField"),
  world("oldBeacon"),
  world("choirSignal"),
  world("driftGraves"),
  world("riddleWard"),
  world("keeperCreed"),
  world("fleetBlackbox"),
  world("choirDoctrine"),
  world("pactLedger"),
  world("coreThreshold"),
  ...MEMORY_ENTRIES,
];

export const CODEX_BY_ID: ReadonlyMap<string, CodexEntry> = new Map(
  CODEX.map((e) => [e.id, e]),
);

export const codexByGroup = (group: CodexGroup): CodexEntry[] =>
  CODEX.filter((e) => e.group === group);
