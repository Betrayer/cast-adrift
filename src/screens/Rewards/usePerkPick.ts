import { useEffect, useRef, useState, type RefObject } from "react";
import { MOTION_MS } from "@/app/motion";
import { resolvePerkChoice } from "@/game/run/flow";
import { useRunStore } from "@/stores/runStore";
import { settleEntrance } from "./entrance";

const PERK_PICK_MS = MOTION_MS.m;

interface Picking {
  draft: string;
  id: string;
}

const draftStillOffers = (draft: string, id: string): boolean => {
  const live = useRunStore.getState().pendingRewards?.perkChoices ?? [];
  return live.join("|") === draft && live.includes(id);
};

export interface PerkPick {
  pickedId: string | null;
  busy: boolean;
  isLocked: () => boolean;
  commit: (id: string) => void;
}

export const usePerkPick = (
  draft: string,
  row: RefObject<HTMLElement | null>,
  reduced: boolean,
): PerkPick => {
  const [picking, setPicking] = useState<Picking | null>(null);
  const locked = useRef<string | null>(null);
  const pickTimer = useRef(0);
  const pickedId = picking !== null && picking.draft === draft ? picking.id : null;

  useEffect(
    () => () => {
      window.clearTimeout(pickTimer.current);
      locked.current = null;
      setPicking(null);
    },
    [draft],
  );

  const isLocked = (): boolean => locked.current === draft;

  const commit = (id: string): void => {
    if (reduced) {
      resolvePerkChoice(id);
      return;
    }
    locked.current = draft;
    settleEntrance(row.current);
    setPicking({ draft, id });
    window.clearTimeout(pickTimer.current);
    pickTimer.current = window.setTimeout(() => {
      locked.current = null;
      setPicking(null);
      if (draftStillOffers(draft, id)) resolvePerkChoice(id);
    }, PERK_PICK_MS);
  };

  return { pickedId, busy: pickedId !== null, isLocked, commit };
};
