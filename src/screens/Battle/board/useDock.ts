import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import {
  legalTargets,
  projectBoard,
  projectPlacements,
  reserveCapacity,
  resolutionOrderFor,
  type BattleBoard,
  type LegalTargets,
  type SlotProjection,
} from '@/game/battle/view';
import {
  publishRegion,
  publishReserveAnchor,
  publishSlotAnchor,
} from '@/pixi/battle/anchors';
import { draggedDie, subscribeDrag } from '@/pixi/battle/dragState';
import { playSfx } from '@/services/audio';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import type { BattleState } from '@/stores/battleStore';
import type { RolledDie, SlotId } from '@/types/battle';
import { rectOf, useMeasured } from './measure';

const NO_TARGETS: LegalTargets = { slots: [], reserve: false };
const NO_PROJECTIONS: Partial<Record<SlotId, SlotProjection>> = {};

const targetsFor = (
  board: BattleBoard,
  subject: string | null,
): LegalTargets =>
  board.phase !== 'placement' || subject === null
    ? NO_TARGETS
    : legalTargets(board, subject);

const projectionsFor = (
  board: BattleBoard,
  subject: string | null,
  legal: LegalTargets,
): Partial<Record<SlotId, SlotProjection>> => {
  if (board.phase !== 'placement') return NO_PROJECTIONS;
  const snapshot = battleSnapshot(board);
  const placed = projectBoard(snapshot);
  if (subject === null) return placed;
  return {
    ...placed,
    ...projectPlacements(snapshot, subject, legal.slots),
  };
};

export const onSlotTap = (slotId: SlotId): void => {
  const live = useBattleStore.getState();
  if (live.phase !== 'placement' || live.rerollMode) return;
  const occupant = live.slots[slotId]?.dieUid;
  if (occupant !== undefined) {
    live.unplaceDie(occupant);
    return;
  }
  if (live.selectedDieUid === null) return;
  const seq = live.lastBlock?.seq ?? 0;
  live.placeDie(live.selectedDieUid, slotId);
  const after = useBattleStore.getState();
  const bounced = (after.lastBlock?.seq ?? 0) > seq;
  playSfx(bounced ? 'invalid' : 'place');
};

export const onReserveTap = (): void => {
  const live = useBattleStore.getState();
  if (live.phase !== 'placement' || live.rerollMode) return;
  const held = live.dice.find((d) => d.state === 'reserved');
  if (live.selectedDieUid === null) {
    if (held !== undefined) live.unreserveDie(held.uid);
    return;
  }
  if (!legalTargets(live, live.selectedDieUid).reserve) {
    playSfx('invalid');
    return;
  }
  live.reserveDie(live.selectedDieUid);
  playSfx('place');
};

export interface DockModel {
  board: BattleState;
  ordered: SlotId[];
  legal: LegalTargets;
  projections: Partial<Record<SlotId, SlotProjection>>;
  reserved: RolledDie[];
  reserveMax: number;
}

export const useDockModel = (): DockModel => {
  const board = useBattleStore();
  const dragging = useSyncExternalStore(subscribeDrag, draggedDie, draggedDie);
  const subject = dragging ?? board.selectedDieUid;

  const ordered = useMemo(() => resolutionOrderFor(board), [board]);
  const legal = useMemo(() => targetsFor(board, subject), [board, subject]);
  const projections = useMemo(
    () => projectionsFor(board, subject, legal),
    [board, subject, legal],
  );
  const reserved = useMemo(
    () => board.dice.filter((d) => d.state === 'reserved'),
    [board],
  );
  const reserveMax = useMemo(() => {
    const selected = board.dice.find((d) => d.uid === board.selectedDieUid);
    return reserveCapacity(board, selected?.school);
  }, [board]);

  return { board, ordered, legal, projections, reserved, reserveMax };
};

export interface DockAnchors {
  root: RefObject<HTMLDivElement | null>;
  measure: () => void;
}

export const useDockAnchors = (
  token?: unknown,
  extra?: () => void,
): DockAnchors => {
  const root = useRef<HTMLDivElement | null>(null);
  const publishedRef = useRef<SlotId[]>([]);

  const measure = useCallback(() => {
    const element = root.current;
    if (element === null) return;
    const seen: SlotId[] = [];
    for (const node of element.querySelectorAll<HTMLElement>('[data-slot]')) {
      const id = node.dataset.slot as SlotId | undefined;
      if (id === undefined) continue;
      const well = node.querySelector<HTMLElement>('[data-well]');
      publishSlotAnchor(id, {
        rect: rectOf(node),
        well: rectOf(well ?? node),
      });
      seen.push(id);
    }
    for (const id of publishedRef.current) {
      if (!seen.includes(id)) publishSlotAnchor(id, null);
    }
    publishedRef.current = seen;
    const reserveEl = element.querySelector<HTMLElement>('[data-reserve]');
    if (reserveEl === null) {
      publishReserveAnchor(null);
    } else {
      const wells = [
        ...reserveEl.querySelectorAll<HTMLElement>('[data-well]'),
      ].map((node) => rectOf(node));
      publishReserveAnchor(
        { rect: rectOf(reserveEl), well: wells[0] ?? rectOf(reserveEl) },
        wells,
      );
    }
    publishRegion('dock', rectOf(element));
    extra?.();
  }, [extra]);

  const release = useCallback(() => {
    for (const id of publishedRef.current) publishSlotAnchor(id, null);
    publishedRef.current = [];
    publishReserveAnchor(null);
    publishRegion('dock', null);
  }, []);

  useMeasured(root, measure, release);

  useEffect(() => {
    measure();
  }, [measure, token]);

  return { root, measure };
};
