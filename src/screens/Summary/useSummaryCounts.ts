import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { rafTweens, UI_GROUP } from "@/pixi/tween";
import {
  SUMMARY_CEREMONY_AT_MS,
  SUMMARY_COUNT_ORDER,
  SUMMARY_COUNT_STEPS,
  type SummaryCountId,
} from "./countSequence";

export const useSummaryCounts = (
  targets: Readonly<Record<SummaryCountId, number>>,
  reduced: boolean,
): {
  slots: Record<SummaryCountId, RefObject<HTMLSpanElement | null>>;
  countsDone: boolean;
} => {
  const [sequenceDone, setSequenceDone] = useState(reduced);

  const xpSlot = useRef<HTMLSpanElement>(null);
  const shardsSlot = useRef<HTMLSpanElement>(null);
  const nodesSlot = useRef<HTMLSpanElement>(null);
  const killsSlot = useRef<HTMLSpanElement>(null);
  const scrapSlot = useRef<HTMLSpanElement>(null);
  const sequenceFinished = useRef(false);

  const { xp, shards, nodes, kills, scrap } = targets;

  useLayoutEffect(() => {
    const slots: Record<SummaryCountId, HTMLSpanElement | null> = {
      xp: xpSlot.current,
      shards: shardsSlot.current,
      nodes: nodesSlot.current,
      kills: killsSlot.current,
      scrap: scrapSlot.current,
    };
    const finals: Record<SummaryCountId, number> = {
      xp,
      shards,
      nodes,
      kills,
      scrap,
    };
    const writer = (id: SummaryCountId) => (value: number): void => {
      const slot = slots[id];
      if (slot !== null) slot.textContent = String(value);
    };
    if (reduced || sequenceFinished.current) {
      for (const id of SUMMARY_COUNT_ORDER) writer(id)(finals[id]);
      return;
    }
    const { tweens, destroy } = rafTweens();
    for (const step of SUMMARY_COUNT_STEPS) {
      tweens.count(0, finals[step.id], step.ms, writer(step.id), {
        delay: step.delay,
        group: UI_GROUP,
      });
    }
    tweens.after(
      SUMMARY_CEREMONY_AT_MS,
      () => {
        sequenceFinished.current = true;
        setSequenceDone(true);
      },
      { group: UI_GROUP },
    );
    return () => {
      destroy();
    };
  }, [reduced, xp, shards, nodes, kills, scrap]);

  return {
    slots: {
      xp: xpSlot,
      shards: shardsSlot,
      nodes: nodesSlot,
      kills: killsSlot,
      scrap: scrapSlot,
    },
    countsDone: sequenceDone || reduced,
  };
};
