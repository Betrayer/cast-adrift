import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtLeast } from '@/app/breakpoints';
import { cx } from '@/app/cx';
import { riseStyle } from '@/app/motion';
import { RESONANCE_BONUSES } from '@/data/resonance';
import { schools } from '@/data/schools';
import {
  activeThresholds,
  RESONANCE_THRESHOLDS,
  resonanceBoardRows,
} from '@/game/battle/resonance';
import { useBattleStore } from '@/stores/battleStore';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const ResonanceChips = () => {
  const { t } = useTranslation(['battle', 'content']);
  const resonance = useBattleStore((s) => s.resonance);
  const dice = useBattleStore((s) => s.dice);
  const roomy = useAtLeast('md');
  const [open, setOpen] = useState(false);

  const census = useMemo(() => resonanceBoardRows(dice, resonance), [dice, resonance]);

  if (census.length === 0) return null;
  return (
    <div className={styles.resonanceWrap}>
      {open ? (
        <div className={styles.resPopover} data-res-popover>
          {census.map((row, index) => (
            <div
              key={row.school}
              className={styles.resPopRow}
              data-rise
              style={riseStyle(index)}
            >
              <span style={{ color: schools[row.school].text }}>
                {t(`battle:school.${row.school}`)}
              </span>
              <span>
                {t('battle:resDetail', {
                  deck: row.deck,
                  placed: row.placed,
                  tray: row.tray,
                  reserved: row.reserved,
                })}
              </span>
              {activeThresholds(resonance, row.school).map((th) => {
                const desc = RESONANCE_BONUSES.find(
                  (bonus) =>
                    bonus.school === row.school && bonus.threshold === th,
                )?.desc;
                if (desc === undefined) return null;
                return (
                  <span
                    key={th}
                    className={styles.resEarned}
                    data-res-earned={`${row.school}-${String(th)}`}
                  >
                    {t('battle:resEarnedLine', { n: th, desc: t(desc) })}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={styles.resonanceRow}
        data-testid="resonance-row"
        data-coach="resonance"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {census.map((row) => {
          const active = activeThresholds(resonance, row.school);
          const colors = schools[row.school];
          return (
            <span
              key={row.school}
              className={cx(styles.resChip, active.length > 0 && styles.resChipActive)}
              style={{ borderColor: colors.stroke, color: colors.text }}
              data-res-school={row.school}
            >
              {t('battle:resBoard', {
                school: roomy
                  ? t(`battle:school.${row.school}`)
                  : t(`battle:schoolShort.${row.school}`),
                placed: row.placed,
                tray: row.tray,
              })}
              {row.prism ? (
                <span
                  className={styles.resPrism}
                  data-res-prism={row.school}
                  aria-label={t('battle:resPrism')}
                />
              ) : null}
              <span className={styles.resPips}>
                {RESONANCE_THRESHOLDS.map((th) => (
                  <span
                    key={th}
                    className={cx(styles.resPip, active.includes(th) && styles.resPipOn)}
                  />
                ))}
              </span>
            </span>
          );
        })}
      </button>
    </div>
  );
};
