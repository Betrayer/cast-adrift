import {
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
import { STAGGER_MS } from "@/app/motion";
import { LEGACY_ENTRANCE, type RewardEntrance } from "@/game/run/rewardEntrance";
import { playSfx } from "@/services/audio";
import { useRunStore } from "@/stores/runStore";

export const ENTRANCE_CARD_SELECTOR = "[data-entrance-card]";

const TALLY_SELECTOR = "[data-battle-tally]";

const POP_FROM_ATTRIBUTE = "data-pop-from";

const POP_FROM_X = "--ca-pop-from-x";

const POP_FROM_Y = "--ca-pop-from-y";

const useRewardEntrance = (): RewardEntrance =>
  useRunStore((s) => s.pendingRewards?.entrance ?? LEGACY_ENTRANCE);

export const fanSpread = (index: number, count: number): number =>
  count <= 1 ? -1 : (2 * index) / (count - 1) - 1;

export const entranceCardStyle = (
  index: number,
  count: number,
): CSSProperties =>
  ({
    "--ca-card-index": String(Math.max(0, index)),
    "--ca-card-fan": fanSpread(index, count).toFixed(3),
  }) as CSSProperties;

interface Point {
  x: number;
  y: number;
}

const centreOf = (rect: DOMRect): Point => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

const onScreen = (rect: DOMRect): boolean =>
  rect.width > 0 &&
  rect.height > 0 &&
  rect.bottom > 0 &&
  rect.right > 0 &&
  rect.top < window.innerHeight &&
  rect.left < window.innerWidth;

const px = (value: number): string => `${String(Math.round(value))}px`;

export type PopOrigin = "tally" | "row";

const usePopOrigin = (
  row: RefObject<HTMLElement | null>,
  entrance: RewardEntrance,
  signature: string,
): void => {
  useLayoutEffect(() => {
    const node = row.current;
    if (node === null) return;
    const cards = [
      ...node.querySelectorAll<HTMLElement>(ENTRANCE_CARD_SELECTOR),
    ];
    for (const card of cards) {
      card.style.removeProperty(POP_FROM_X);
      card.style.removeProperty(POP_FROM_Y);
    }
    if (entrance !== "pop") {
      node.removeAttribute(POP_FROM_ATTRIBUTE);
      return;
    }
    const tally = document
      .querySelector(TALLY_SELECTOR)
      ?.getBoundingClientRect();
    const tallyRect = tally !== undefined && onScreen(tally) ? tally : null;
    const origin: PopOrigin = tallyRect === null ? "row" : "tally";
    const from = centreOf(tallyRect ?? node.getBoundingClientRect());
    const centres = cards.map((card) =>
      centreOf(card.getBoundingClientRect()),
    );
    node.setAttribute(POP_FROM_ATTRIBUTE, origin);
    cards.forEach((card, index) => {
      const at = centres[index];
      if (at === undefined) return;
      card.style.setProperty(POP_FROM_X, px(from.x - at.x));
      card.style.setProperty(POP_FROM_Y, px(from.y - at.y));
    });
  }, [row, entrance, signature]);
};

export const useEntranceRow = (
  signature: string,
): { entrance: RewardEntrance; row: RefObject<HTMLDivElement | null> } => {
  const entrance = useRewardEntrance();
  const row = useRef<HTMLDivElement | null>(null);
  usePopOrigin(row, entrance, signature);
  return { entrance, row };
};

export const useCardRevealSfx = (
  cards: readonly unknown[],
  rateStep: number,
): void => {
  useEffect(() => {
    const timers = cards.map((_, index) =>
      window.setTimeout(() => {
        playSfx("unlockCard", { rate: 1 + index * rateStep });
      }, index * STAGGER_MS.card),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [cards, rateStep]);
};

export const settleEntrance = (row: HTMLElement | null): void => {
  if (row === null || !("getAnimations" in Element.prototype)) return;
  for (const card of row.querySelectorAll<HTMLElement>(
    ENTRANCE_CARD_SELECTOR,
  )) {
    for (const animation of card.getAnimations()) {
      if ("animationName" in animation) animation.finish();
    }
  }
};
