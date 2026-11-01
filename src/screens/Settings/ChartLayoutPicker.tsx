import { Button, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { CHART_LAYOUTS } from '@/data/chartLayouts';
import { playSfx } from '@/services/audio';
import { chooseChartLayout, useChartLayoutId } from '@/services/prefs';
import { useAppStore } from '@/stores/appStore';
import type { ChartLayoutId } from '@/types';
import { ChartLayoutThumb } from './ChartLayoutThumb';
import { PickerHeading, PickerInfo, PickerSynced } from './PickerParts';
import styles from './ChartLayoutPicker.module.css';

const FULL_THUMB = 96;
const COMPACT_THUMB = 84;

interface Props {
  compact?: boolean;
  onPick?: (id: ChartLayoutId) => void;
}

export const ChartLayoutPicker = ({ compact = false, onPick }: Props) => {
  const { t } = useTranslation(['settings']);
  const active = useChartLayoutId();
  const go = useAppStore((s) => s.go);

  const pick = (id: ChartLayoutId): void => {
    if (id === active) return;
    chooseChartLayout(id);
    playSfx('buy');
    onPick?.(id);
  };

  return (
    <Stack gap="xs" data-chart-layout-picker={compact ? 'compact' : 'full'}>
      {compact ? null : (
        <PickerHeading
          title={t('settings:chartLayout.title')}
          hint={t('settings:chartLayout.hint')}
        />
      )}
      <div className={compact ? styles.grid : styles.list}>
        {CHART_LAYOUTS.map((def) => {
          const selected = active === def.id;
          return (
            <button
              key={def.id}
              type="button"
              data-testid={`chart-layout-${def.id}`}
              data-active={selected ? '1' : undefined}
              data-press
              className={`${compact ? styles.tile ?? '' : styles.card ?? ''} ${
                selected ? styles.active ?? '' : ''
              }`}
              onClick={() => {
                pick(def.id);
              }}
            >
              <span className={styles.stage}>
                <ChartLayoutThumb id={def.id} size={compact ? COMPACT_THUMB : FULL_THUMB} />
              </span>
              {compact ? (
                <span className={styles.name}>{t(def.name)}</span>
              ) : (
                <PickerInfo
                  classes={styles}
                  name={t(def.name)}
                  desc={t(def.desc)}
                  selected={selected}
                />
              )}
            </button>
          );
        })}
      </div>
      {compact ? null : (
        <Button
          variant="subtle"
          size="compact-sm"
          data-testid="chart-layout-open"
          onClick={() => {
            go('chart');
          }}
        >
          {t('settings:chartLayout.open')}
        </Button>
      )}
      {compact ? null : <PickerSynced marker="chart-layout" />}
    </Stack>
  );
};
