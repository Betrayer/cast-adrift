import type { SlotId } from "@/types/battle";
import type { LocKey } from "@/types/content";

export type PrologueVoice = "narration" | "echo";

export interface PrologueLine {
  voice: PrologueVoice;
  text: LocKey;
}

export interface PrologueBeat {
  id: string;
  lines: readonly PrologueLine[];
  cta: LocKey;
}

const narration = (key: string): PrologueLine => ({
  voice: "narration",
  text: `content:prologue.${key}`,
});

const echo = (key: string): PrologueLine => ({
  voice: "echo",
  text: `content:prologue.${key}`,
});

export const PROLOGUE_BEATS: readonly PrologueBeat[] = [
  {
    id: "drift",
    lines: [narration("drift1"), narration("drift2")],
    cta: "content:prologue.driftCta",
  },
  {
    id: "salvage",
    lines: [narration("salvage1"), echo("salvage2"), echo("salvage3")],
    cta: "content:prologue.salvageCta",
  },
  {
    id: "signal",
    lines: [narration("signal1"), echo("signal2"), narration("signal3")],
    cta: "content:prologue.signalCta",
  },
  {
    id: "contact",
    lines: [echo("contact1"), narration("contact2")],
    cta: "content:prologue.contactCta",
  },
];

// The scripted first fight: a PuzzleDef-style per-turn slot override rather than
// a second battle engine. Turn 1 teaches Weapons, turn 2 teaches Shields, then the
// board opens up.
export const PROLOGUE_ENEMY = "scavDrone";

export const PROLOGUE_SCRIPT: readonly (readonly SlotId[])[] = [
  ["weaponA"],
  ["shields"],
];
