import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BARKS, BARK_QUOTA, BARK_RESERVATIONS } from "@/data/barks";
import { EVENT_BY_ID } from "@/data/events";
import { applyOutcome } from "@/game/events/apply";
import {
  barkBudgetWaitMs,
  emitEventOutcome,
  isMajorBarkTrigger,
  resetBarkMemory,
} from "@/game/narrative/barks";
import {
  officerBarkWaitMs,
  spendOfficerBark,
} from "@/game/narrative/officerBark";
import { endRun, startRun } from "@/game/run/flow";
import { createStream } from "@/services/rng";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Outcome } from "@/types/events";

const START = 2_000_000;
const PREFIX = "content:bark.officerRescued.";

const barkLines = (): string =>
  useNarrativeStore
    .getState()
    .journal.flatMap((entry) => (entry.k === "bark" ? [entry.line] : []))
    .join(" ");

const rescueOutcome = (): Outcome => {
  const event = EVENT_BY_ID.get("stowaway");
  const option = event?.options.find((candidate) => candidate.id === "keep");
  const outcome = option?.outcomes?.[0];
  if (outcome === undefined) throw new Error("the stowaway rescue is gone");
  return outcome;
};

const rescue = (): void => {
  applyOutcome(rescueOutcome(), createStream(11), {
    eventId: "stowaway",
    optionId: "keep",
    optionIndex: 0,
  });
  emitEventOutcome(rescueOutcome());
};

describe("officerRescued is declared once and only once", () => {
  it("ships exactly the three lines its quota names", () => {
    const def = BARKS.find((bark) => bark.trigger === "officerRescued");
    expect(def?.lines).toHaveLength(3);
    expect(BARK_QUOTA.officerRescued).toBe(3);
  });

  it("is no longer a reservation", () => {
    expect(
      BARK_RESERVATIONS.some((row) => row.trigger === "officerRescued"),
    ).toBe(false);
  });

  it("counts as a landmark, so verbosity 'less' still hears it", () => {
    expect(isMajorBarkTrigger("officerRescued")).toBe(true);
  });
});

describe("the rescue line waits for a budget it does not own", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    startRun(7);
    useNarrativeStore.getState().reset();
    resetBarkMemory();
    useSettingsStore.setState({ echoVerbosity: "normal" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("says nothing at the event outcome and keeps the line owed", () => {
    rescue();
    expect(useRunStore.getState().officers).toContain("mechanic");
    expect(barkLines()).toContain("content:bark.event");
    expect(barkLines()).not.toContain(PREFIX);
    expect(useRunStore.getState().pendingOfficerBark).toBe(true);
  });

  it("measures the outcome bark's window instead of talking over it", () => {
    rescue();
    expect(barkBudgetWaitMs()).toBe(20_000);
    expect(officerBarkWaitMs()).toBe(20_000);
    expect(spendOfficerBark()).toBe(false);
    expect(barkLines()).not.toContain(PREFIX);
    expect(useRunStore.getState().pendingOfficerBark).toBe(true);
  });

  it("still owes the line at a map entry inside the window", () => {
    rescue();
    vi.setSystemTime(START + 19_000);
    expect(spendOfficerBark()).toBe(false);
    expect(barkLines()).not.toContain(PREFIX);
    expect(useRunStore.getState().pendingOfficerBark).toBe(true);
  });

  it("says it at the first map entry once the window is free", () => {
    rescue();
    vi.setSystemTime(START + 20_000);
    expect(officerBarkWaitMs()).toBe(0);
    expect(spendOfficerBark()).toBe(true);
    expect(barkLines()).toContain(PREFIX);
    expect(useRunStore.getState().pendingOfficerBark).toBe(false);
  });

  it("says it once and not again", () => {
    rescue();
    vi.setSystemTime(START + 20_000);
    expect(spendOfficerBark()).toBe(true);
    vi.setSystemTime(START + 90_000);
    expect(spendOfficerBark()).toBe(false);
    expect(barkLines().split(PREFIX)).toHaveLength(2);
  });

  it("owes nothing when no cabin was filled", () => {
    expect(officerBarkWaitMs()).toBe(0);
    expect(spendOfficerBark()).toBe(false);
    expect(barkLines()).not.toContain(PREFIX);
  });

  it("releases the debt when the run ends", () => {
    rescue();
    expect(useRunStore.getState().pendingOfficerBark).toBe(true);
    endRun(false);
    expect(useRunStore.getState().pendingOfficerBark).toBe(false);
    expect(useRunStore.getState().officers).toEqual([]);
  });
});
