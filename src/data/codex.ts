import { FUSION_MAP } from "@/data/dice/fusion";
import { ALL_ENEMIES } from "@/data/enemies";
import { MEMORY_CODEX_IDS } from "@/data/narrative/memories";
import { SCHOOL_ORDER } from "@/data/schools";
import type { LocKey, School } from "@/types/content";

export type CodexGroup = "world" | "dossier" | "forge" | "fusion" | "memory";

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
  "forge",
  "fusion",
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

export const forgeCodexId = (school: School): string => `forge-${school}`;

const FORGE_ENTRIES: readonly CodexEntry[] = SCHOOL_ORDER.map((school) => ({
  id: forgeCodexId(school),
  group: "forge" as const,
  title: `content:codex.${forgeCodexId(school)}.title`,
  body: `content:codex.${forgeCodexId(school)}.body`,
}));

export const fusionCodexId = (resultId: string): string => `fusion-${resultId}`;

export const FUSION_BASE_BY_CODEX_ID: ReadonlyMap<string, string> = new Map(
  [...FUSION_MAP].map(([base, result]) => [fusionCodexId(result), base]),
);

const FUSION_ENTRIES: readonly CodexEntry[] = [...FUSION_MAP.values()].map((result) => ({
  id: fusionCodexId(result),
  group: "fusion" as const,
  title: `content:dice.${result}`,
  body: `content:diceDesc.${result}`,
}));

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
  ...FORGE_ENTRIES,
  ...FUSION_ENTRIES,
  ...MEMORY_ENTRIES,
];

export const CODEX_BY_ID: ReadonlyMap<string, CodexEntry> = new Map(
  CODEX.map((e) => [e.id, e]),
);

export const codexByGroup = (group: CodexGroup): CodexEntry[] =>
  CODEX.filter((e) => e.group === group);
