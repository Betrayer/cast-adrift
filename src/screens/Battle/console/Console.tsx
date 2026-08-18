import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  checkMovesNow,
  consoleActions,
  consoleShape,
  type ConsoleAction,
  type ConsoleActionId,
  type ConsoleShape,
} from '@/game/battle/view';
import { playSfx } from '@/services/audio';
import { useBattleStore } from '@/stores/battleStore';
import {
  ACTIVE_ORDER,
  nudgeLabel,
  pressReroll,
  rerollLabel,
  runActionEffect,
} from './commands';
import { DieMiniCard } from './DieMiniCard';
import styles from './Console.module.css';

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

export const Console = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation(['battle', 'content']);
  const board = useBattleStore();
  const reason = board.lastBlock?.key ?? null;
  const scripted = checkMovesNow(board) !== null;
  const [shape, setShape] = useState<ConsoleShape>(() =>
    consoleShape(useBattleStore.getState()),
  );

  useEffect(() => {
    setShape((prev) => grow(prev, consoleShape(useBattleStore.getState())));
  }, [board]);

  const actions = useMemo(() => consoleActions(board), [board]);

  const run = useCallback((action: ConsoleAction, effect: () => void) => {
    const note = useBattleStore.getState().noteBlock;
    if (!action.enabled) {
      note(action.block === null ? null : `battle:block.${action.block}`);
      playSfx('invalid');
      return;
    }
    note(null);
    effect();
  }, []);

  const button = (
    id: ConsoleActionId,
    label: string,
    extra?: string,
    coach?: string,
  ) => {
    const action = actions[id];
    return (
      <button
        key={id}
        type="button"
        data-testid={`console-${id}`}
        {...(coach === undefined ? {} : { 'data-coach': coach })}
        className={`${styles.btn ?? ''} ${extra ?? ''}`}
        aria-disabled={!action.enabled}
        onClick={() => {
          run(action, () => {
            runActionEffect(id);
          });
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className={`${styles.console ?? ''} ${compact ? styles.consoleCompact ?? '' : ''}`}
      data-band="console"
      data-console
    >
      {scripted ? null : <DieMiniCard compact={compact} />}
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
            pressReroll(() => {
              run(actions.reroll, () => {
                runActionEffect('reroll');
              });
            });
          }}
        >
          {rerollLabel(t, board)}
        </button>
        {button('nudgeMinus', nudgeLabel(t, actions, '-'), undefined, 'nudge')}
        {button('nudgePlus', nudgeLabel(t, actions, '+'))}
        {button('reserve', t('battle:reserve'))}
        {shape.fate
          ? button('fate', t('battle:fate'), styles.btnFate ?? '', 'fate')
          : null}
      </div>
      {scripted ? null : (
        <div className={styles.row}>
          {button(
            'buyReroll',
            t('battle:buyReroll', { n: actions.buyReroll.cost }),
          )}
          {button('surge', t('battle:surge', { n: actions.surge.cost }))}
          {shape.bloodReactor
            ? button('bloodReactor', t('battle:bloodReactor'))
            : null}
          {shape.sacrifice ? button('sacrifice', t('battle:sacrifice')) : null}
        </div>
      )}
      {scripted || shape.actives.length === 0 ? null : (
        <div className={styles.row} data-console-actives data-coach="actives">
          {shape.actives.map((id) =>
            button(
              id,
              id === 'swap' && board.swapSourceUid !== null
                ? t('battle:swapPick')
                : t(`battle:${id}`),
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
