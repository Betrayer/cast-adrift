import { ALL_ENEMIES } from "@/data/enemies";
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

// One dossier per roster entry (DESIGN §2.1, 54 of them): the title is the
// enemy's own name and the body is its hand-written flavour line. The stat block
// is rendered from the EnemyDef at read time, so no numbers live in the string.
export const dossierId = (enemyId: string): string => `dossier-${enemyId}`;

const DOSSIER_ENTRIES: readonly CodexEntry[] = ALL_ENEMIES.map((enemy) => ({
  id: dossierId(enemy.id),
  group: "dossier" as const,
  title: enemy.name,
  body: `content:dossier.${enemy.id}`,
}));

export const CODEX: readonly CodexEntry[] = [
  ...DOSSIER_ENTRIES,
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
