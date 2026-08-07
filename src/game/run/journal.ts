import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import type { LocKey } from "@/types/content";

export type AxisSource = "choice" | "drift" | "beacon";

export type JournalBody =
  | { k: "choice"; event: string; option: string; text: LocKey; consequence?: LocKey }
  | { k: "consequence"; origin: LocKey }
  | { k: "chain"; chain: string; step: number; label: LocKey }
  | { k: "beacon"; event: string; resolved: number }
  | { k: "memory"; order: number }
  | { k: "axis"; from: number; to: number; source: AxisSource };

export type JournalEntry = JournalBody & {
  id: number;
  sector: number;
};

export const logJournal = (body: JournalBody): void => {
  useNarrativeStore
    .getState()
    .pushJournal({ ...body, sector: useRunStore.getState().sector });
};

// The one place a consequence surfaces: the toast can be missed, the journal
// entry cannot, so both are written from here and nowhere else.
export const logConsequence = (origin: LocKey): void => {
  useNarrativeStore.getState().pushConsequence(origin);
  logJournal({ k: "consequence", origin });
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
