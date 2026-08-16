import { ALL_ENEMIES } from "@/data/enemies";
import { MEMORY_CODEX_IDS } from "@/data/narrative/memories";
import type { LocKey } from "@/types/content";

export type CodexGroup = "world" | "dossier" | "memory";

export interface CodexEntry {
  id: string;
  group: CodexGroup;
  title: LocKey;
  body: LocKey;
  signature?: LocKey;
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

const MEMORY_ENTRIES: readonly CodexEntry[] = MEMORY_CODEX_IDS.map((id) =>
  memory(id),
);

export const dossierId = (enemyId: string): string => `dossier-${enemyId}`;

const DOSSIER_ENTRIES: readonly CodexEntry[] = ALL_ENEMIES.map((enemy) => ({
  id: dossierId(enemy.id),
  group: "dossier" as const,
  title: enemy.name,
  signature: enemy.signature,
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
  world("beyondTheCore"),
  world("echoFleetLog"),
  world("secondCaptain"),
  world("keeperBeyond"),
  world("coreRemainder"),
  world("thresholdBeacon"),
  ...MEMORY_ENTRIES,
];

export const CODEX_BY_ID: ReadonlyMap<string, CodexEntry> = new Map(
  CODEX.map((e) => [e.id, e]),
);

export const codexByGroup = (group: CodexGroup): CodexEntry[] =>
  CODEX.filter((e) => e.group === group);
