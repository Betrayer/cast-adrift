import { Button, Stack, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { fragmentsForSector } from '@/data/narrative/fragments';
import { sectorDef } from '@/data/sectors';
import { createStream, deriveSeed } from '@/services/rng';
import { useAppStore } from '@/stores/appStore';
import { useRunStore } from '@/stores/runStore';
import styles from './InterstitialScreen.module.css';

export const InterstitialScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const sector = useRunStore((s) => s.sector);
  const seed = useRunStore((s) => s.seed);
  const go = useAppStore((s) => s.go);
  const def = sectorDef(sector);

  const fragment = useMemo(() => {
    const pool = fragmentsForSector(sector);
    const stream = createStream(deriveSeed(seed, `jump:${String(sector)}`));
    return pool.length === 0 ? null : stream.pick(pool);
  }, [sector, seed]);

  return (
    <Stack
      align="center"
      justify="center"
      mih="100dvh"
      p="lg"
      gap="lg"
      style={{ background: def.wash }}
    >
      <div
        className={styles.wash}
        style={{ background: `radial-gradient(circle at 50% 40%, ${def.accent}33, transparent 62%)` }}
      />
      <Stack align="center" gap={4} className={styles.plate}>
        <Text className={styles.kicker} style={{ color: def.accent }}>
          {t('run:interstitial.sector', { n: sector })}
        </Text>
        <Title order={1} c={tokens.text} ta="center">
          {t(def.name)}
        </Title>
      </Stack>
      {fragment === null ? null : (
        <Text
          size="sm"
          c={tokens.dim}
          ta="center"
          maw={420}
          className={styles.fragment}
        >
          {t(fragment.text)}
        </Text>
      )}
      <Button
        size="md"
        color="accent"
        className={styles.cta}
        onClick={() => {
          go('map');
        }}
      >
        {t('run:interstitial.enter')}
      </Button>
    </Stack>
  );
};
