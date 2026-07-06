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

export const CODEX: readonly CodexEntry[] = [
  world("silentField"),
  world("oldBeacon"),
  world("choirSignal"),
  world("driftGraves"),
  world("riddleWard"),
];

export const CODEX_BY_ID: ReadonlyMap<string, CodexEntry> = new Map(
  CODEX.map((e) => [e.id, e]),
);

export const codexByGroup = (group: CodexGroup): CodexEntry[] =>
  CODEX.filter((e) => e.group === group);
