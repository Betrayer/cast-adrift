import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { consoleActions, type ConsoleActionId } from '@/game/battle/view';
import {
  boardRegion,
  selectionAnchor,
  subscribeAnchors,
  type DieAnchor,
} from '@/pixi/battle/anchors';
import { playSfx } from '@/services/audio';
import {
  nudgeLabel,
  pressReroll,
  rerollLabel,
  runActionEffect,
} from '@/screens/Battle/console/commands';
import { useBattleStore } from '@/stores/battleStore';
import styles from './Orbit.module.css';

const BUTTON = 34;
const GAP = 4;
const EDGE = 8;
const DIAGONAL = Math.SQRT2;

interface Spoke {
  id: ConsoleActionId;
  angle: number;
}

const SPOKES: readonly Spoke[] = [
  { id: 'reroll', angle: 135 },
  { id: 'reserve', angle: 45 },
  { id: 'nudgeMinus', angle: 225 },
  { id: 'nudgePlus', angle: 315 },
];

const noSelection = (): DieAnchor | null => null;

const arcMounted = (): boolean => boardRegion('ship') !== undefined;

const noArc = (): boolean => false;

const safeInset = (name: string): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const RadialMenu = () => {
  const { t } = useTranslation(['battle']);
  const board = useBattleStore();
  const anchor = useSyncExternalStore(
    subscribeAnchors,
    selectionAnchor,
    noSelection,
  );
  const onArc = useSyncExternalStore(subscribeAnchors, arcMounted, noArc);

  if (anchor === null || !onArc || board.phase !== 'placement') return null;
  const actions = consoleActions(board);
  const radius = (anchor.size / 2 + BUTTON / 2 + GAP) * DIAGONAL;
  const minX = safeInset('--ca-safe-left') + EDGE + BUTTON / 2;
  const maxX = window.innerWidth - safeInset('--ca-safe-right') - EDGE - BUTTON / 2;
  const minY = safeInset('--ca-safe-top') + EDGE + BUTTON / 2;
  const maxY =
    window.innerHeight - safeInset('--ca-safe-bottom') - EDGE - BUTTON / 2;

  return (
    <div className={styles.radial} data-radial>
      {SPOKES.map((spoke) => {
        const action = actions[spoke.id];
        const rad = (spoke.angle * Math.PI) / 180;
        const x = clamp(anchor.x + radius * Math.cos(rad), minX, maxX);
        const y = clamp(anchor.y - radius * Math.sin(rad), minY, maxY);
        const label =
          spoke.id === 'reroll'
            ? rerollLabel(t, board)
            : spoke.id === 'nudgeMinus'
              ? nudgeLabel(t, actions, '-')
              : spoke.id === 'nudgePlus'
                ? nudgeLabel(t, actions, '+')
                : t('battle:reserve');
        const active = spoke.id === 'reroll' && board.rerollMode;
        return (
          <button
            key={spoke.id}
            type="button"
            data-testid={`radial-${spoke.id}`}
            className={`${styles.radialBtn ?? ''} ${
              active ? styles.radialBtnActive ?? '' : ''
            }`}
            style={{
              left: `${String(x - BUTTON / 2)}px`,
              top: `${String(y - BUTTON / 2)}px`,
              width: `${String(BUTTON)}px`,
              height: `${String(BUTTON)}px`,
            }}
            aria-disabled={!action.enabled && !active}
            aria-label={label}
            title={label}
            onClick={() => {
              if (spoke.id === 'reroll') {
                pressReroll(() => {
                  if (!action.enabled) {
                    playSfx('invalid');
                    return;
                  }
                  runActionEffect('reroll');
                });
                return;
              }
              if (!action.enabled) {
                playSfx('invalid');
                return;
              }
              runActionEffect(spoke.id);
            }}
          >
            {t(`battle:radial.${spoke.id}`)}
          </button>
        );
      })}
    </div>
  );
};
