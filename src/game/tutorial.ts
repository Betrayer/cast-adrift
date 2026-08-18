import { allowedSlotsNow, consoleShape, reserveCapacity } from "@/game/battle/view";
import { NUDGE_COST } from "@/game/battle/resolver";
import { activeThresholds, SCHOOL_ORDER } from "@/game/battle/resonance";
import {
  battleAnchors,
  boardRegion,
  type BoardRegion,
} from "@/pixi/battle/anchors";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { ScreenId } from "@/types";
import type { School } from "@/types/content";

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

const regionAnchor =
  (name: BoardRegion) =>
  (): CoachRect | null => {
    const band = boardRegion(name);
    if (band === undefined || band.h === 0) return null;
    return {
      x: band.x - 6,
      y: band.y - 6,
      w: band.w + 12,
      h: band.h + 12,
    };
  };

const trayAnchor = regionAnchor("tray");

const dieAnchor =
  (school: School) =>
  (): CoachRect | null => {
    const uid = useBattleStore
      .getState()
      .dice.find((d) => d.school === school && d.state === "tray")?.uid;
    if (uid === undefined) return null;
    const die = battleAnchors()?.dice.find((d) => d.uid === uid);
    if (die === undefined) return null;
    return {
      x: die.x - die.size / 2 - 6,
      y: die.y - die.size / 2 - 6,
      w: die.size + 12,
      h: die.size + 12,
    };
  };

const battleReady = (): boolean => {
  const s = useBattleStore.getState();
  return (
    s.phase === "placement" && !s.introPending && allowedSlotsNow(s) === null
  );
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
    anchor: fromSelector('[data-coach="nudge"]'),
    ready: () => {
      const s = useBattleStore.getState();
      return battleReady() && (s.charge >= NUDGE_COST || s.freeNudges > 0);
    },
  },
  {
    id: "targeting",
    screen: "battle",
    title: "run:tutorial.targeting.title",
    body: "run:tutorial.targeting.body",
    anchor: regionAnchor("enemies"),
    ready: () => {
      const alive = useBattleStore
        .getState()
        .enemies.filter((e) => e.hp > 0);
      return (
        battleReady() &&
        (alive.length > 1 ||
          alive.some((e) => e.subsystems.some((sub) => sub.hp > 0)))
      );
    },
  },
  {
    id: "reserve",
    screen: "battle",
    title: "run:tutorial.reserve.title",
    body: "run:tutorial.reserve.body",
    anchor: fromSelector('[data-coach="reserve"]'),
    ready: () => {
      const s = useBattleStore.getState();
      return (
        battleReady() &&
        reserveCapacity(s) > 0 &&
        s.dice.some((d) => d.state === "tray")
      );
    },
  },
  {
    id: "actives",
    screen: "battle",
    title: "run:tutorial.actives.title",
    body: "run:tutorial.actives.body",
    anchor: fromSelector('[data-coach="actives"]'),
    ready: () =>
      battleReady() &&
      consoleShape(useBattleStore.getState()).actives.length > 0,
  },
  {
    id: "resonance",
    screen: "battle",
    title: "run:tutorial.resonance.title",
    body: "run:tutorial.resonance.body",
    anchor: fromSelector('[data-coach="resonance"]'),
    ready: () => {
      const census = useBattleStore.getState().resonance;
      return (
        battleReady() &&
        SCHOOL_ORDER.some(
          (school) => activeThresholds(census, school).length > 0,
        )
      );
    },
  },
  {
    id: "affinity",
    screen: "battle",
    title: "run:tutorial.affinity.title",
    body: "run:tutorial.affinity.body",
    anchor: fromSelector('[data-proj][data-tone="bonus"]'),
    ready: () =>
      battleReady() &&
      document.querySelector('[data-proj][data-tone="bonus"]') !== null,
  },
  {
    id: "prismatic",
    screen: "battle",
    title: "run:tutorial.prismatic.title",
    body: "run:tutorial.prismatic.body",
    anchor: dieAnchor("prismatic"),
    ready: () =>
      battleReady() &&
      useBattleStore
        .getState()
        .dice.some((d) => d.school === "prismatic" && d.state === "tray"),
  },
  {
    id: "fate",
    screen: "battle",
    title: "run:tutorial.fate.title",
    body: "run:tutorial.fate.body",
    anchor: fromSelector('[data-coach="fate"]'),
    ready: () => battleReady() && consoleShape(useBattleStore.getState()).fate,
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

export { BATTLE_LAYOUT_HINT, HINT_IDS } from "@/game/onboarding";
