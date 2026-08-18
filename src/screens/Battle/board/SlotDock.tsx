import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import {
  legalTargets,
  projectBoard,
  projectPlacements,
  reserveCapacity,
  resolutionOrderFor,
  slotAllowedThisTurn,
  type BattleBoard,
  type LegalTargets,
  type SlotProjection,
} from '@/game/battle/view';
import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import {
  publishReserveAnchor,
  publishRegion,
  publishSlotAnchor,
} from '@/pixi/battle/anchors';
import { draggedDie, subscribeDrag } from '@/pixi/battle/dragState';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import { playSfx } from '@/services/audio';
import { rectOf, useMeasured } from './measure';
import { SlotCard } from './SlotCard';
import type { SlotId } from '@/types/battle';
import styles from './Board.module.css';

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

export const SlotDock = () => {
  const { t } = useTranslation(['battle']);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const publishedRef = useRef<SlotId[]>([]);
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

  const measure = useCallback(() => {
    const root = dockRef.current;
    if (root === null) return;
    const seen: SlotId[] = [];
    for (const element of root.querySelectorAll<HTMLElement>('[data-slot]')) {
      const id = element.dataset.slot as SlotId | undefined;
      if (id === undefined) continue;
      const well = element.querySelector<HTMLElement>('[data-well]');
      publishSlotAnchor(id, {
        rect: rectOf(element),
        well: rectOf(well ?? element),
      });
      seen.push(id);
    }
    for (const id of publishedRef.current) {
      if (!seen.includes(id)) publishSlotAnchor(id, null);
    }
    publishedRef.current = seen;
    const reserveEl = root.querySelector<HTMLElement>('[data-reserve]');
    if (reserveEl === null) {
      publishReserveAnchor(null);
    } else {
      const wells = [
        ...reserveEl.querySelectorAll<HTMLElement>('[data-well]'),
      ].map((element) => rectOf(element));
      publishReserveAnchor(
        { rect: rectOf(reserveEl), well: wells[0] ?? rectOf(reserveEl) },
        wells,
      );
    }
    publishRegion('dock', rectOf(root));
  }, []);

  const release = useCallback(() => {
    for (const id of publishedRef.current) publishSlotAnchor(id, null);
    publishedRef.current = [];
    publishReserveAnchor(null);
    publishRegion('dock', null);
  }, []);

  useMeasured(dockRef, measure, release);

  const onSlotTap = useCallback((slotId: SlotId) => {
    const live = useBattleStore.getState();
    if (live.phase !== 'placement' || live.rerollMode) return;
    const occupant = live.slots[slotId]?.dieUid;
    if (occupant !== undefined) {
      live.unplaceDie(occupant);
      return;
    }
    if (live.selectedDieUid === null) return;
    if (!legalTargets(live, live.selectedDieUid).slots.includes(slotId)) {
      playSfx('invalid');
      return;
    }
    live.placeDie(live.selectedDieUid, slotId);
    playSfx('place');
  }, []);

  const onReserveTap = useCallback(() => {
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
  }, []);

  return (
    <div className={styles.dock} ref={dockRef} data-band="dock">
      <div className={styles.grid}>
        {ordered.map((slotId, index) => {
          const slot = board.slots[slotId];
          if (slot === undefined) return null;
          return (
            <SlotCard
              key={slotId}
              slotId={slotId}
              slot={slot}
              order={index + 1}
              projection={projections[slotId]}
              occupiedBy={slot.dieUid}
              blocked={isSlotBlocked(board, slotId)}
              shrunk={isSlotShrunk(board, slotId)}
              legal={legal.slots.includes(slotId)}
              offTurn={!slotAllowedThisTurn(board, slotId)}
              charge={board.charge}
              onTap={onSlotTap}
            />
          );
        })}
      </div>
      <button
        type="button"
        data-reserve
        data-testid="slot-reserve"
        className={[
          styles.reserve ?? '',
          legal.reserve ? styles.cardLegal ?? '' : '',
          reserved.length > 0 ? styles.cardOccupied ?? '' : '',
        ]
          .filter((name) => name !== '')
          .join(' ')}
        onClick={onReserveTap}
      >
        <span className={styles.name}>{t('battle:reserve')}</span>
        <span className={styles.cap}>
          {t('battle:reserveCap', { n: reserved.length, max: reserveMax })}
        </span>
        <span className={styles.reserveWells}>
          {Array.from({ length: Math.max(1, reserveMax) }, (_, i) => (
            <span key={i} className={styles.wellSmall} data-well />
          ))}
        </span>
      </button>
    </div>
  );
};
