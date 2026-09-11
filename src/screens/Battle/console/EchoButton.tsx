import { useTranslation } from 'react-i18next';
import { TapPopover, tapPointOf } from '@/components/TapPopover';
import { echoBranchName, echoLabelVars, type EchoNodeDef } from '@/data/echo';
import type { ConsoleAction } from '@/game/battle/view';
import { echoLabel } from './commands';
import styles from './Console.module.css';

export interface EchoButtonProps {
  def: EchoNodeDef;
  action: ConsoleAction;
  onUse: () => void;
}

export const EchoButton = ({ def, action, onUse }: EchoButtonProps) => {
  const { t } = useTranslation(['battle', 'content']);
  const math = echoLabel(t, def);

  return (
    <TapPopover
      className={`${styles.cabin ?? ''} ${
        action.enabled ? '' : styles.cabinOff ?? ''
      }`}
      testId="console-echo"
      label={t(def.name)}
      align="center"
      content={(close) => (
        <span className={styles.cabinCard}>
          <span className={styles.cabinWho}>{t(def.name)}</span>
          <span className={styles.cabinRole}>{t(echoBranchName(def.branch))}</span>
          <span className={styles.echoWhy} data-echo-math={def.id}>
            {t(def.desc, echoLabelVars(def))}
          </span>
          <button
            type="button"
            className={styles.cabinUse}
            data-testid="console-echo-use"
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
