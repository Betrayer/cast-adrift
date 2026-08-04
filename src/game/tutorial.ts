import { trayAnchorRect } from "@/pixi/battle/anchors";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { ScreenId } from "@/types";

export interface CoachRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoachMarkDef {
  id: string;
  screen: ScreenId;
  title: string;
  body: string;
  anchor: () => CoachRect | null;
  ready: () => boolean;
}

const fromSelector =
  (selector: string, pad = 6) =>
  (): CoachRect | null => {
    const el = document.querySelector(selector);
    if (el === null) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return {
      x: r.left - pad,
      y: r.top - pad,
      w: r.width + pad * 2,
      h: r.height + pad * 2,
    };
  };

// The dice tray lives inside the Pixi canvas, so the scene publishes the band it
// actually laid the tray into rather than letting this file guess at fractions.
const trayAnchor = (): CoachRect | null => {
  const band = trayAnchorRect();
  if (band === null || band.h === 0) return null;
  return {
    x: band.x - 6,
    y: band.y - 6,
    w: band.w + 12,
    h: band.h + 12,
  };
};

// The prologue's scripted battle already walks the player through turns 1–2
// (it hard-limits which slots are legal), so coach marks stay out of its way
// and only fire in an unscripted first fight.
const battleReady = (): boolean => {
  const s = useBattleStore.getState();
  return s.phase === "placement" && !s.introPending && s.scriptedSlots === null;
};

export const COACH_MARKS: readonly CoachMarkDef[] = [
  {
    id: "place",
    screen: "battle",
    title: "run:tutorial.place.title",
    body: "run:tutorial.place.body",
    anchor: trayAnchor,
    ready: () =>
      battleReady() &&
      useBattleStore.getState().dice.every((d) => d.state !== "placed"),
  },
  {
    id: "endTurn",
    screen: "battle",
    title: "run:tutorial.endTurn.title",
    body: "run:tutorial.endTurn.body",
    anchor: fromSelector('[data-coach="endTurn"]'),
    ready: () =>
      battleReady() &&
      useBattleStore.getState().dice.some((d) => d.state === "placed"),
  },
  {
    id: "reroll",
    screen: "battle",
    title: "run:tutorial.reroll.title",
    body: "run:tutorial.reroll.body",
    anchor: fromSelector('[data-coach="reroll"]'),
    ready: () => battleReady() && useBattleStore.getState().rerollsLeft > 0,
  },
  {
    id: "nudge",
    screen: "battle",
    title: "run:tutorial.nudge.title",
    body: "run:tutorial.nudge.body",
    anchor: fromSelector('[data-coach="charge"]'),
    ready: () => battleReady() && useBattleStore.getState().charge >= 3,
  },
  {
    id: "jump",
    screen: "map",
    title: "run:tutorial.jump.title",
    body: "run:tutorial.jump.body",
    anchor: fromSelector('[data-coach="jump"]'),
    ready: () => useRunStore.getState().map !== null,
  },
];

export const nextCoachMark = (
  screen: ScreenId,
  seen: readonly string[],
): CoachMarkDef | null =>
  COACH_MARKS.find(
    (mark) => mark.screen === screen && !seen.includes(mark.id) && mark.ready(),
  ) ?? null;

export const ALL_COACH_MARK_IDS: readonly string[] = COACH_MARKS.map(
  (mark) => mark.id,
);
