import { Button } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { SWEEP_MS, useMotionFlag } from '@/app/motion';
import { checkEndTurnBlocked, isTableSpent } from '@/game/battle/view';
import { useBattleStore } from '@/stores/battleStore';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const EndTurnButton = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const endTurn = useBattleStore((s) => s.endTurn);
  const checkBlocked = useBattleStore(checkEndTurnBlocked);
  const tableSpent = useBattleStore(isTableSpent);
  const disabled = phase !== 'placement' || rerollMode || checkBlocked;
  const { attach, fire } = useMotionFlag<HTMLButtonElement>('data-sweep', SWEEP_MS);
  const wasDisabled = useRef(disabled);

  useEffect(() => {
    if (wasDisabled.current && !disabled) fire();
    wasDisabled.current = disabled;
  }, [disabled, fire]);

  return (
    <Button
      ref={attach}
      className={cx(styles.clickable, styles.endTurn)}
      size="md"
      fullWidth
      disabled={disabled}
      onClick={endTurn}
      data-coach="endTurn"
      data-testid="battle-end-turn"
      data-sweep-host
      data-spent={!disabled && tableSpent ? '1' : undefined}
    >
      {t('battle:endTurn')}
    </Button>
  );
};
