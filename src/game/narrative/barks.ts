import { BARKS, type BarkDef } from "@/data/barks";
import { createStream, type RngStream } from "@/services/rng";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Outcome } from "@/types/events";

const RING = 12;
const GLOBAL_MS = 20000;

let recent: string[] = [];
let lastBarkAt = 0;
const triggerLast = new Map<string, number>();
let stream: RngStream | null = null;

const rng = (): RngStream => {
  stream ??= createStream(0x9e3779b1);
  return stream;
};

const clock = (): number => Date.now();

export const resetBarkMemory = (): void => {
  recent = [];
  lastBarkAt = 0;
  triggerLast.clear();
};

const eligible = (
  bark: BarkDef,
  now: number,
  cooldownMult: number,
): boolean => {
  const last = triggerLast.get(bark.id);
  if (last !== undefined && now - last < bark.cooldownSec * 1000 * cooldownMult)
    return false;
  return bark.lines.length > 0;
};

export const emitBark = (trigger: string): void => {
  const verbosity = useSettingsStore.getState().echoVerbosity;
  if (verbosity === "off") return;
  const now = clock();
  if (now - lastBarkAt < GLOBAL_MS) return;

  const cooldownMult = verbosity === "less" ? 2 : 1;
  const weightMult = verbosity === "less" ? 0.5 : 1;

  const candidates = BARKS.filter(
    (b) => b.trigger === trigger && eligible(b, now, cooldownMult),
  );
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1
      ? candidates[0]
      : rng().weighted(
          candidates.map(
            (b) => [b, Math.max(1, b.weight * weightMult)] as const,
          ),
        );
  if (chosen === undefined) return;

  const fresh = chosen.lines.filter((line) => !recent.includes(line));
  const pool = fresh.length > 0 ? fresh : chosen.lines;
  const line = pool.length === 1 ? pool[0] : rng().pick(pool);
  if (line === undefined) return;

  recent.push(line);
  if (recent.length > RING) recent = recent.slice(recent.length - RING);
  triggerLast.set(chosen.id, now);
  lastBarkAt = now;
  useNarrativeStore.getState().pushBark(line);
};

const outcomeNegative = (outcome: Outcome): boolean =>
  outcome.effects.some(
    (e) =>
      (e.k === "hull" && e.n < 0) ||
      (e.k === "scrap" && e.n < 0) ||
      (e.k === "tide" && e.n > 0),
  );

export const emitEventOutcome = (outcome: Outcome): void => {
  emitBark(
    outcomeNegative(outcome) ? "eventOutcome:negative" : "eventOutcome:positive",
  );
};
