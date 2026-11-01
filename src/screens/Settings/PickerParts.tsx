import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { useAppStore } from '@/stores/appStore';

export const PickerHeading = ({ title, hint }: { title: string; hint: string }) => (
  <>
    <Text size="sm" c={tokens.dim}>
      {title}
    </Text>
    <Text size="xs" c={tokens.faint}>
      {hint}
    </Text>
  </>
);

interface PickerInfoProps {
  classes: CSSModuleClasses;
  name: string;
  desc: string;
  tag?: string;
  selected: boolean;
}

export const PickerInfo = ({ classes, name, desc, tag, selected }: PickerInfoProps) => {
  const { t } = useTranslation(['settings']);
  return (
    <span className={classes.info}>
      <span className={classes.head}>
        <span className={classes.name}>{name}</span>
        <span className={classes.badge}>
          {t(selected ? 'settings:layout.active' : 'settings:layout.use')}
        </span>
      </span>
      {tag === undefined ? null : <span className={classes.tag}>{tag}</span>}
      <span className={classes.desc}>{desc}</span>
    </span>
  );
};

export const PickerSynced = ({ marker }: { marker?: 'chart-layout' | 'layout' }) => {
  const { t } = useTranslation(['settings']);
  const uid = useAppStore((s) => s.uid);
  if (uid === null) return null;
  return (
    <Text
      size="xs"
      c={tokens.faint}
      data-chart-layout-synced={marker === 'chart-layout' ? true : undefined}
      data-layout-synced={marker === 'layout' ? true : undefined}
    >
      {t('settings:layout.synced')}
    </Text>
  );
};
