import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  consoleActions,
  consoleShape,
  type ActiveActionId,
  type ConsoleAction,
  type ConsoleActionId,
  type ConsoleShape,
} from '@/game/battle/view';
import { playSfx } from '@/services/audio';
import { useBattleStore } from '@/stores/battleStore';
import { DieMiniCard } from './DieMiniCard';
import styles from './Console.module.css';

const ACTIVE_ORDER: readonly ActiveActionId[] = [
  'flip',
  'copy',
  'swap',
  'bank',
  'split',
];

const grow = (prev: ConsoleShape, next: ConsoleShape): ConsoleShape => {
  const actives = ACTIVE_ORDER.filter(
    (id) => prev.actives.includes(id) || next.actives.includes(id),
  );
  const fate = prev.fate || next.fate;
  const bloodReactor = prev.bloodReactor || next.bloodReactor;
  const sacrifice = prev.sacrifice || next.sacrifice;
  if (
    fate === prev.fate &&
    bloodReactor === prev.bloodReactor &&
    sacrifice === prev.sacrifice &&
    actives.length === prev.actives.length
  ) {
    return prev;
  }
  return { fate, bloodReactor, sacrifice, actives };
};

export const Console = () => {
  const { t } = useTranslation(['battle']);
  const [reason, setReason] = useState<string | null>(null);
  const board = useBattleStore();
  const [shape, setShape] = useState<ConsoleShape>(() =>
    consoleShape(useBattleStore.getState()),
  );

  useEffect(() => {
    setShape((prev) => grow(prev, consoleShape(useBattleStore.getState())));
  }, [board]);

  const actions = useMemo(() => consoleActions(board), [board]);

  const run = useCallback((action: ConsoleAction, effect: () => void) => {
    if (!action.enabled) {
      setReason(action.block === null ? null : `battle:block.${action.block}`);
      playSfx('invalid');
      return;
    }
    setReason(null);
    effect();
  }, []);

  const activeEffect = useCallback((id: ActiveActionId) => {
    const live = useBattleStore.getState();
    const uid = live.selectedDieUid;
    if (uid === null) return;
    if (id === 'flip') live.flipDie(uid);
    if (id === 'copy') live.copyDie(uid);
    if (id === 'bank') live.bankDie(uid);
    if (id === 'split') live.splitDie(uid);
    if (id === 'swap') {
      if (live.swapSourceUid === uid) live.cancelSwap();
      else live.beginSwap(uid);
    }
  }, []);

  const button = (
    id: ConsoleActionId,
    label: string,
    effect: () => void,
    extra?: string,
  ) => {
    const action = actions[id];
    return (
      <button
        key={id}
        type="button"
        data-testid={`console-${id}`}
        data-coach={id === 'reroll' ? 'reroll' : undefined}
        className={`${styles.btn ?? ''} ${extra ?? ''}`}
        aria-disabled={!action.enabled}
        onClick={() => {
          run(action, effect);
        }}
      >
        {label}
      </button>
    );
  };

  const nudgeLabel = (dir: '-' | '+'): string => {
    const action = dir === '-' ? actions.nudgeMinus : actions.nudgePlus;
    if (action.free) {
      return t(dir === '-' ? 'battle:nudgeFree' : 'battle:nudgeFreePlus');
    }
    return t(dir === '-' ? 'battle:nudgeMinus' : 'battle:nudgePlus', {
      n: action.cost,
    });
  };

  const rerollLabel = board.rerollMode
    ? board.rerollSelection.length === 0
      ? t('battle:rerollCancel')
      : t('battle:rerollConfirm', {
          k: board.rerollSelection.length,
          size: board.rerollSize,
        })
    : t('battle:reroll', { n: board.rerollsLeft });

  return (
    <div className={styles.console} data-band="console" data-console>
      <DieMiniCard />
      <div className={styles.row}>
        <button
          type="button"
          data-testid="battle-reroll"
          data-coach="reroll"
          className={`${styles.btn ?? ''} ${
            board.rerollMode ? styles.btnActive ?? '' : ''
          }`}
          aria-disabled={!actions.reroll.enabled && !board.rerollMode}
          onClick={() => {
            const live = useBattleStore.getState();
            if (live.rerollMode) {
              if (live.rerollSelection.length === 0) {
                live.toggleRerollMode();
                return;
              }
              playSfx('reroll');
              live.confirmReroll();
              return;
            }
            run(actions.reroll, () => {
              live.toggleRerollMode();
            });
          }}
        >
          {rerollLabel}
        </button>
        {button('nudgeMinus', nudgeLabel('-'), () => {
          playSfx('nudge');
          const live = useBattleStore.getState();
          if (live.selectedDieUid !== null) {
            live.spendNudge(live.selectedDieUid, -1);
          }
        })}
        {button('nudgePlus', nudgeLabel('+'), () => {
          playSfx('nudge');
          const live = useBattleStore.getState();
          if (live.selectedDieUid !== null) {
            live.spendNudge(live.selectedDieUid, 1);
          }
        })}
        {button('reserve', t('battle:reserve'), () => {
          const live = useBattleStore.getState();
          if (live.selectedDieUid !== null) live.reserveDie(live.selectedDieUid);
        })}
        {shape.fate
          ? button(
              'fate',
              t('battle:fate'),
              () => {
                useBattleStore.getState().rollFate();
              },
              styles.btnFate ?? '',
            )
          : null}
      </div>
      <div className={styles.row}>
        {button(
          'buyReroll',
          t('battle:buyReroll', { n: actions.buyReroll.cost }),
          () => {
            playSfx('reroll');
            useBattleStore.getState().spendBonusReroll();
          },
        )}
        {button('surge', t('battle:surge', { n: actions.surge.cost }), () => {
          playSfx('surge');
          useBattleStore.getState().spendSurge();
        })}
        {shape.bloodReactor
          ? button('bloodReactor', t('battle:bloodReactor'), () => {
              useBattleStore.getState().bloodReactor();
            })
          : null}
        {shape.sacrifice
          ? button('sacrifice', t('battle:sacrifice'), () => {
              const live = useBattleStore.getState();
              if (live.selectedDieUid !== null) {
                live.sacrificeDie(live.selectedDieUid);
              }
            })
          : null}
      </div>
      {shape.actives.length === 0 ? null : (
        <div className={styles.row} data-console-actives>
          {shape.actives.map((id) =>
            button(
              id,
              id === 'swap' && board.swapSourceUid !== null
                ? t('battle:swapPick')
                : t(`battle:${id}`),
              () => {
                activeEffect(id);
              },
              id === 'swap' && board.swapSourceUid !== null
                ? styles.btnActive ?? ''
                : '',
            ),
          )}
        </div>
      )}
      <div className={styles.reason} data-console-reason>
        {reason === null
          ? board.rerollMode
            ? t('battle:rerollHint', { size: board.rerollSize })
            : t('battle:burnHint')
          : t(reason)}
      </div>
    </div>
  );
};
