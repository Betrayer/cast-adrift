import { useTranslation } from 'react-i18next';
import { TapPopover, tapPointOf } from '@/components/TapPopover';
import type { OfficerDef } from '@/data/officers';
import type { CabinActionId, ConsoleAction } from '@/game/battle/view';
import { cabinLabel } from './commands';
import styles from './Console.module.css';

export interface CabinButtonProps {
  id: CabinActionId;
  def: OfficerDef;
  action: ConsoleAction;
  onUse: () => void;
}

export const CabinButton = ({ id, def, action, onUse }: CabinButtonProps) => {
  const { t } = useTranslation(['battle', 'content']);
  const math = cabinLabel(t, def);

  return (
    <TapPopover
      className={`${styles.cabin ?? ''} ${
        action.enabled ? '' : styles.cabinOff ?? ''
      }`}
      testId={`console-${id}`}
      label={t(def.name)}
      align="center"
      content={(close) => (
        <span className={styles.cabinCard}>
          <span className={styles.cabinWho}>{t(def.name)}</span>
          <span className={styles.cabinRole}>{t(def.role)}</span>
          <button
            type="button"
            className={styles.cabinUse}
            data-testid={`console-${id}-use`}
            aria-disabled={!action.enabled}
            onClick={(event) => {
              close(tapPointOf(event));
              onUse();
            }}
          >
            {math}
          </button>
        </span>
      )}
    >
      {math}
    </TapPopover>
  );
};
