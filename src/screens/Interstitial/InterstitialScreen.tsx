import { Button, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { tokens } from '@/app/theme';
import { pickFragment } from '@/data/narrative/fragments';
import { sectorDef } from '@/data/sectors';
import { playSfx } from '@/services/audio';
import { createStream, deriveSeed } from '@/services/rng';
import { useAppStore } from '@/stores/appStore';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useMetaStore } from '@/stores/metaStore';
import { useRunStore } from '@/stores/runStore';
import styles from './InterstitialScreen.module.css';

export const InterstitialScreen = () => {
  const { t } = useTranslation(['run', 'content']);
  const sector = useRunStore((s) => s.sector);
  const seed = useRunStore((s) => s.seed);
  const flags = useRunStore((s) => s.flags);
  const seenFragments = useMetaStore((s) => s.seenFragments);
  const go = useAppStore((s) => s.go);
  const def = sectorDef(sector);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );

  useEffect(() => {
    playSfx('jump');
  }, []);

  const streaks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        angle: (i / 18) * 360 + (i % 3) * 7,
        delay: (i % 6) * 40,
      })),
    [],
  );

  const fragment = useMemo(() => {
    const stream = createStream(deriveSeed(seed, `jump:${String(sector)}`));
    return pickFragment(sector, flags, seenFragments, (items) =>
      stream.pick(items),
    );
    // The pool is drawn once per arrival; re-reading `seenFragments` after the
    // mark below would swap the line out from under the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector, seed, flags]);

  useEffect(() => {
    if (fragment === null) return;
    useMetaStore.getState().markFragmentSeen(fragment.id);
  }, [fragment]);

  return (
    <Screen centered width="wide" className={styles.frame}>
      <Stack align="center" justify="center" gap="lg" p="lg" style={{ background: def.wash }}>
      {reduced ? null : (
        <div className={styles.warp}>
          {streaks.map((streak) => (
            <span
              key={streak.angle}
              className={styles.streak}
              style={{
                background: def.accent,
                transform: `rotate(${String(streak.angle)}deg)`,
                animationDelay: `${String(streak.delay)}ms`,
              }}
            />
          ))}
        </div>
      )}
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
        data-interstitial-enter
        onClick={() => {
          go('map');
        }}
      >
        {t('run:interstitial.enter')}
      </Button>
      </Stack>
    </Screen>
  );
};
