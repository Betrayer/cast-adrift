import type { TFunction } from 'i18next';
import type {
  ActiveActionId,
  ConsoleActionId,
  ConsoleActions,
} from '@/game/battle/view';
import { playSfx } from '@/services/audio';
import { useBattleStore, type BattleState } from '@/stores/battleStore';

export const ACTIVE_ORDER: readonly ActiveActionId[] = [
  'flip',
  'copy',
  'swap',
  'bank',
  'split',
];

const activeEffect = (id: ActiveActionId): void => {
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
};

export const runActionEffect = (id: ConsoleActionId): void => {
  const live = useBattleStore.getState();
  const uid = live.selectedDieUid;
  switch (id) {
    case 'reroll':
      live.toggleRerollMode();
      return;
    case 'nudgeMinus':
      playSfx('nudge');
      if (uid !== null) live.spendNudge(uid, -1);
      return;
    case 'nudgePlus':
      playSfx('nudge');
      if (uid !== null) live.spendNudge(uid, 1);
      return;
    case 'reserve':
      if (uid !== null) live.reserveDie(uid);
      return;
    case 'fate':
      live.rollFate();
      return;
    case 'buyReroll':
      playSfx('reroll');
      live.spendBonusReroll();
      return;
    case 'surge':
      playSfx('surge');
      live.spendSurge();
      return;
    case 'bloodReactor':
      live.bloodReactor();
      return;
    case 'sacrifice':
      if (uid !== null) live.sacrificeDie(uid);
      return;
    default:
      activeEffect(id);
  }
};

export const pressReroll = (onBlocked: () => void): void => {
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
  onBlocked();
};

export const rerollLabel = (
  t: TFunction<['battle']>,
  board: Pick<BattleState, 'rerollMode' | 'rerollSelection' | 'rerollSize' | 'rerollsLeft'>,
): string => {
  if (!board.rerollMode) return t('battle:reroll', { n: board.rerollsLeft });
  return board.rerollSelection.length === 0
    ? t('battle:rerollCancel')
    : t('battle:rerollConfirm', {
        k: board.rerollSelection.length,
        size: board.rerollSize,
      });
};

export const nudgeLabel = (
  t: TFunction<['battle']>,
  actions: ConsoleActions,
  dir: '-' | '+',
): string => {
  const action = dir === '-' ? actions.nudgeMinus : actions.nudgePlus;
  if (action.free) {
    return t(dir === '-' ? 'battle:nudgeFree' : 'battle:nudgeFreePlus');
  }
  return t(dir === '-' ? 'battle:nudgeMinus' : 'battle:nudgePlus', {
    n: action.cost,
  });
};
