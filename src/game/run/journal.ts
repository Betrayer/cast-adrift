import type { NodeId } from "@/game/map/types";
import type { ThrowDirection } from "@/game/map/wormhole";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import type { LocKey } from "@/types/content";

export type AxisSource = "choice" | "drift" | "beacon";

export type WormholeBranch = "ride" | "bypass";

export type CargoStep =
  | "taken"
  | "moved"
  | "delivered"
  | "dropped"
  | "lapsed";

export type JournalBody =
  | { k: "choice"; event: string; option: string; text: LocKey; consequence?: LocKey }
  | { k: "consequence"; origin: LocKey }
  | { k: "chain"; chain: string; step: number; label: LocKey }
  | { k: "beacon"; event: string; resolved: number }
  | { k: "memory"; order: number }
  | { k: "achievement"; achievement: string }
  | { k: "axis"; from: number; to: number; source: AxisSource }
  | {
      k: "wormhole";
      branch: WormholeBranch;
      to: NodeId;
      rows: number;
      direction: ThrowDirection;
    }
  | { k: "cargo"; step: CargoStep; cargo: string; n: number }
  | { k: "singularity" }
  | { k: "bark"; line: LocKey }
  | { k: "system"; line: LocKey };

export type JournalEntry = JournalBody & {
  id: number;
  sector: number;
};

export const AUTH_ERROR_PREFIX = "settings:account.error.";

export const logJournal = (body: JournalBody): number =>
  useNarrativeStore
    .getState()
    .pushJournal({ ...body, sector: useRunStore.getState().sector });

const inRun = (): boolean => useRunStore.getState().active;

export const logConsequence = (origin: LocKey): void => {
  const journalId = logJournal({ k: "consequence", origin });
  useNarrativeStore
    .getState()
    .pushFeed({ source: "consequence", key: origin, journalId });
};

export const logBark = (line: LocKey): void => {
  const journalId = inRun() ? logJournal({ k: "bark", line }) : null;
  useNarrativeStore.getState().pushFeed({ source: "bark", key: line, journalId });
};

export const logSystemLine = (line: LocKey): void => {
  const journalId = inRun() ? logJournal({ k: "system", line }) : null;
  useNarrativeStore
    .getState()
    .pushFeed({ source: "system", key: line, journalId });
};

export const logAuthError = (code: string): void => {
  useNarrativeStore.getState().pushFeed({
    source: "system",
    key: `${AUTH_ERROR_PREFIX}${code}`,
    journalId: null,
    tone: "alert",
    scope: "app",
    interactive: false,
  });
};

export const logAchievement = (achievement: string): void => {
  const journalId = inRun() ? logJournal({ k: "achievement", achievement }) : null;
  useNarrativeStore
    .getState()
    .pushFeed({ source: "achievement", key: achievement, journalId });
};

export const applyAxisDelta = (n: number, source: AxisSource): void => {
  if (n === 0) return;
  const before = useRunStore.getState().axis;
  useRunStore.getState().addAxis(n);
  const after = useRunStore.getState().axis;
  if (after === before) return;
  logJournal({ k: "axis", from: before, to: after, source });
};

export const settleSectorDrift = (): void => {
  const before = useRunStore.getState().axis;
  const delta = useRunStore.getState().settleSectorDrift();
  if (delta === 0) return;
  logJournal({
    k: "axis",
    from: before,
    to: useRunStore.getState().axis,
    source: "drift",
  });
};

export const journalAxisHistory = (
  entries: readonly JournalEntry[],
): number[] => {
  const points = [0];
  for (const entry of entries) {
    if (entry.k === "axis") points.push(entry.to);
  }
  return points;
};

export const journalBySector = (
  entries: readonly JournalEntry[],
): Map<number, JournalEntry[]> => {
  const out = new Map<number, JournalEntry[]>();
  for (const entry of entries) {
    const list = out.get(entry.sector);
    if (list === undefined) out.set(entry.sector, [entry]);
    else list.push(entry);
  }
  return out;
};
