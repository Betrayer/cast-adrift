import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { ownedCount } from '@/game/run/inventory';
import { useRunStore } from '@/stores/runStore';

export const OwnedLine = ({ defId }: { defId: string }) => {
  const { t } = useTranslation(['run']);
  const count = useRunStore((s) => ownedCount(s.deck, defId));
  if (count === 0) return null;
  return (
    <Text size="xs" c={tokens.dim} data-owned-count={count}>
      {t('run:rewards.owned', { n: count })}
    </Text>
  );
};
