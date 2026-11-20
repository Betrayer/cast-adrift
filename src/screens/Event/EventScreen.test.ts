import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme } from "@/app/theme";
import { TYPEWRITER_CAP_MS, typewriterMs } from "@/components/Typewriter";
import { ALL_EVENTS } from "@/data/events";
import { schools } from "@/data/schools";
import { speakerTone } from "@/data/speakers";
import { DEFAULT_THEME_ID } from "@/data/themes";
import { applyOutcome } from "@/game/events/apply";
import { createStream } from "@/services/rng";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { ForcedBattle, Outcome } from "@/types/events";
import { checkDismissGuard } from "./CheckModal";
import {
  DIALOGUE_GAP_MS,
  DIALOGUE_LEAD_MS,
  dialogueLineDelays,
  dialogueTone,
  dialogueTypesIn,
} from "./EventDialogue";
import { eventExit, resolveEventForNode } from "./resolveEvent";

const NODE = "s2:r3:l2";

const seatRun = (over: Partial<ReturnType<typeof createInitialRunValues>> = {}): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    seed: 918_273,
    sector: 2,
    sectorIndex: 2,
    hull: 18,
    hullMax: 30,
    position: NODE,
    ...over,
  });
};

const followUp: ForcedBattle = { enemyIds: ["drifterHusk"] };

describe("checkDismissGuard", () => {
  it("lets the player back out before the dice are rolled", () => {
    const cancel = vi.fn();
    const guard = checkDismissGuard(null, cancel);
    expect(guard.closeOnEscape).toBe(true);
    expect(guard.closeOnClickOutside).toBe(true);
    guard.onClose();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("seals the modal after a failed roll so the check cannot be rerolled", () => {
    const cancel = vi.fn();
    const guard = checkDismissGuard(
      { values: [2, 3], total: 5, success: false },
      cancel,
    );
    expect(guard.closeOnEscape).toBe(false);
    expect(guard.closeOnClickOutside).toBe(false);
    guard.onClose();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("seals the modal after a passing roll so the win cannot be discarded", () => {
    const cancel = vi.fn();
    const guard = checkDismissGuard(
      { values: [4, 4], total: 8, success: true },
      cancel,
    );
    expect(guard.closeOnEscape).toBe(false);
    expect(guard.closeOnClickOutside).toBe(false);
    guard.onClose();
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("event dialogue", () => {
  const scripted = ALL_EVENTS.filter(
    (event) => event.dialogue !== undefined && event.dialogue.length > 0,
  );

  it("is authored on the corpus the screen renders", () => {
    expect(scripted.length).toBeGreaterThan(0);
  });

  it("chains the lines, each one starting after the last has typed", () => {
    const texts = ["short", "a much longer second line of dialogue", "x".repeat(400)];
    const delays = dialogueLineDelays(texts);
    expect(delays[0]).toBe(DIALOGUE_LEAD_MS);
    expect(delays[1]).toBe(DIALOGUE_LEAD_MS + typewriterMs("short") + DIALOGUE_GAP_MS);
    expect(delays[2]).toBe(
      (delays[1] ?? 0) + typewriterMs(texts[1] ?? "") + DIALOGUE_GAP_MS,
    );
  });

  it("caps every line so four long lines stay a short scene", () => {
    const texts = Array.from({ length: 4 }, () => "y".repeat(500));
    const delays = dialogueLineDelays(texts);
    const end = (delays[3] ?? 0) + typewriterMs(texts[3] ?? "");
    expect(typewriterMs(texts[0] ?? "")).toBe(TYPEWRITER_CAP_MS);
    expect(end).toBe(DIALOGUE_LEAD_MS + 4 * TYPEWRITER_CAP_MS + 3 * DIALOGUE_GAP_MS);
  });

  it("types in on the first visit only", () => {
    expect(dialogueTypesIn(null)).toBe(true);
    expect(
      dialogueTypesIn({ eventId: "wardenInspector", outcomeText: null, follow: null }),
    ).toBe(false);
    expect(
      dialogueTypesIn({
        eventId: "wardenInspector",
        outcomeText: "content:events.wardenInspector.out.declare",
        follow: null,
      }),
    ).toBe(false);
  });

  it("gives every authored voice a tone", () => {
    for (const event of scripted) {
      for (const line of event.dialogue ?? []) {
        expect(dialogueTone(line.who), `${event.id}:${line.who}`).toMatch(/\S/);
        if (line.who !== "echo" && line.who !== "narration") {
          expect(dialogueTone(line.who)).toBe(speakerTone(line.who));
        }
      }
    }
  });
});

describe("speaker ink", () => {
  afterEach(() => {
    applyTheme(DEFAULT_THEME_ID);
  });

  it("follows a theme chosen after the speaker table loaded", () => {
    const before = dialogueTone("mara");
    applyTheme("terminal");
    expect(dialogueTone("mara")).not.toBe(before);
    expect(dialogueTone("mara")).toBe(schools.yellow.text);
    expect(speakerTone("ines")).toBe(schools.black.stroke);
  });
});

describe("eventExit", () => {
  it("ends the run when the outcome emptied the hull", () => {
    expect(eventExit(0, null, false)).toBe("death");
  });

  it("ends the run even when the outcome chains into a battle", () => {
    expect(eventExit(0, followUp, false)).toBe("death");
  });

  it("ends the run on the forced debug exit too", () => {
    expect(eventExit(0, null, true)).toBe("death");
  });

  it("treats negative hull as death, not as a survivable node", () => {
    expect(eventExit(-3, null, false)).toBe("death");
  });

  it("sends a survivor into the follow-up battle", () => {
    expect(eventExit(1, followUp, false)).toBe("battle");
  });

  it("returns a surviving debug event to the map", () => {
    expect(eventExit(1, null, true)).toBe("map");
  });

  it("completes the node for a surviving ordinary event", () => {
    expect(eventExit(1, null, false)).toBe("complete");
  });
});

describe("a lethal event outcome", () => {
  beforeEach(() => {
    seatRun({ hull: 6 });
  });

  const lethal: Outcome = {
    text: "content:events.driftingPod.text",
    effects: [{ k: "hull", n: -16 }],
  };

  it("leaves the run on zero hull, and Continue turns that into a death", () => {
    const result = applyOutcome(lethal, createStream(31));
    expect(useRunStore.getState().hull).toBe(0);
    expect(useRunStore.getState().active).toBe(true);
    expect(
      eventExit(useRunStore.getState().hull, result.follow, false),
    ).toBe("death");
  });

  it("does not end the run on damage the hull survives", () => {
    const result = applyOutcome(
      { text: lethal.text, effects: [{ k: "hull", n: -5 }] },
      createStream(31),
    );
    expect(useRunStore.getState().hull).toBe(1);
    expect(
      eventExit(useRunStore.getState().hull, result.follow, false),
    ).toBe("complete");
  });
});

describe("resolveEventForNode", () => {
  beforeEach(() => {
    seatRun();
  });

  it("draws an event for a node the run has never entered", () => {
    const first = resolveEventForNode(NODE, "event");
    expect(first.event).not.toBeNull();
    expect(first.replay).toBeNull();
  });

  it("hands a resumed node back its own event instead of drawing a second one", () => {
    const first = resolveEventForNode(NODE, "event");
    const eventId = first.event?.id;
    expect(eventId).toBeDefined();
    if (eventId === undefined) return;

    useRunStore.getState().beginEventNode(NODE, eventId);
    useRunStore.getState().markEventSeen(eventId);

    const resumed = resolveEventForNode(NODE, "event");
    expect(resumed.event?.id).toBe(eventId);
  });

  it("replays the outcome already paid for instead of re-offering the options", () => {
    const first = resolveEventForNode(NODE, "event");
    const eventId = first.event?.id;
    expect(eventId).toBeDefined();
    if (eventId === undefined) return;

    useRunStore.getState().beginEventNode(NODE, eventId);
    useRunStore.getState().markEventSeen(eventId);
    useRunStore
      .getState()
      .recordEventOutcome(NODE, eventId, "content:events.probe.good", followUp);

    const resumed = resolveEventForNode(NODE, "event");
    expect(resumed.event?.id).toBe(eventId);
    expect(resumed.replay?.outcomeText).toBe("content:events.probe.good");
    expect(resumed.replay?.follow).toEqual(followUp);
  });

  it("survives the hydrate that a resume performs", () => {
    const first = resolveEventForNode(NODE, "event");
    const eventId = first.event?.id;
    expect(eventId).toBeDefined();
    if (eventId === undefined) return;

    useRunStore.getState().beginEventNode(NODE, eventId);
    useRunStore.getState().markEventSeen(eventId);
    useRunStore
      .getState()
      .recordEventOutcome(NODE, eventId, "content:events.probe.good", null);

    const saved = JSON.parse(
      JSON.stringify({
        ...createInitialRunValues(),
        active: true,
        seed: 918_273,
        sector: 2,
        sectorIndex: 2,
        hull: 18,
        hullMax: 30,
        position: NODE,
        seenEvents: [...useRunStore.getState().seenEvents],
        eventRuns: useRunStore.getState().eventRuns,
      }),
    ) as ReturnType<typeof createInitialRunValues>;

    useRunStore.getState().reset();
    useRunStore.getState().hydrate(saved);

    const resumed = resolveEventForNode(NODE, "event");
    expect(resumed.event?.id).toBe(eventId);
    expect(resumed.replay?.outcomeText).toBe("content:events.probe.good");
  });

  it("leaves other nodes free to draw their own event", () => {
    const first = resolveEventForNode(NODE, "event");
    const eventId = first.event?.id;
    if (eventId === undefined) return;
    useRunStore.getState().beginEventNode(NODE, eventId);
    useRunStore.getState().markEventSeen(eventId);

    const other = resolveEventForNode("s2:r4:l1", "event");
    expect(other.replay).toBeNull();
    expect(other.event?.id).not.toBe(eventId);
  });
});
