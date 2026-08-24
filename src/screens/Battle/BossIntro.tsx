import { Button, Stack, Text, Title } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSheet } from '@/components/AppModal';
import { WarpStreaks } from '@/components/WarpStreaks';
import { tokens } from '@/app/theme';
import { ENEMY_BY_ID } from '@/data/enemies';
import { playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useBattleStore } from '@/stores/battleStore';
import { useRunStore } from '@/stores/runStore';
import styles from './BossIntro.module.css';

const PIP_STAGGER_MS = 120;

const BOSS_SWEEP_MS = 900;

export const BossIntro = () => {
  const { t } = useTranslation(['battle', 'content']);
  const introPending = useBattleStore((s) => s.introPending);
  const introEnemyId = useBattleStore((s) => s.introEnemyId);
  const enemies = useBattleStore((s) => s.enemies);
  const dismissIntro = useBattleStore((s) => s.dismissIntro);
  const usedMinibosses = useRunStore((s) => s.usedMinibosses);
  const pipCount =
    enemies.find((e) => e.defId === introEnemyId)?.subsystems.length ?? 0;

  useEffect(() => {
    if (introPending) haptic('bossIntro');
  }, [introPending]);

  useEffect(() => {
    if (!introPending) return;
    const timers = Array.from({ length: pipCount }, (_, index) =>
      window.setTimeout(() => {
        playSfx('sensors', { gain: 0.4, rate: 0.9 + index * 0.07 });
      }, index * PIP_STAGGER_MS),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [introPending, pipCount]);

  if (!introPending || introEnemyId === null) return null;
  const def = ENEMY_BY_ID.get(introEnemyId);
  if (def === undefined) return null;
  const state = enemies.find((e) => e.defId === introEnemyId);
  const subsystems = state?.subsystems ?? [];
  const alternate =
    def.miniboss === true &&
    usedMinibosses.some((id) => id !== introEnemyId);

  return (
    <AppSheet
      label={t(def.name)}
      testId="boss-intro"
      dismiss="none"
      plain
      blur
      className={styles.introPanel}
      onClose={dismissIntro}
    >
      {def.boss === true ? (
        <WarpStreaks
          color={tokens.danger}
          count={22}
          durationMs={BOSS_SWEEP_MS}
        />
      ) : null}
      <Stack align="center" justify="center" h="100%" gap="lg" p="lg">
        <Text
          className={styles.kicker}
          c={alternate ? tokens.amber : tokens.danger}
          data-intro-kind={
            def.boss === true ? 'boss' : alternate ? 'minibossAlt' : 'miniboss'
          }
        >
          {t(
            def.boss === true
              ? 'battle:intro.boss'
              : alternate
                ? 'battle:intro.minibossAlt'
                : 'battle:intro.miniboss',
          )}
        </Text>
        <Title order={1} c={tokens.text} ta="center" className={styles.plate}>
          {t(def.name)}
        </Title>
        <Text size="sm" c={tokens.dim}>
          {t('battle:intro.hull', { n: state?.hpMax ?? def.hp })}
        </Text>
        {subsystems.length > 0 ? (
          <Stack gap={6} align="center">
            <Text size="xs" c={tokens.faint}>
              {t('battle:intro.subsystems')}
            </Text>
            <div className={styles.pips}>
              {subsystems.map((sub, index) => {
                const subDef = def.subsystems?.find((s) => s.id === sub.key);
                return (
                  <span
                    key={sub.id}
                    className={styles.pip}
                    style={{ animationDelay: `${String(index * 120)}ms` }}
                  >
                    {subDef === undefined ? sub.key : t(subDef.name)}
                  </span>
                );
              })}
            </div>
          </Stack>
        ) : null}
        <Button
          size="md"
          color="accent"
          data-testid="boss-intro-begin"
          onClick={dismissIntro}
        >
          {t('battle:intro.begin')}
        </Button>
      </Stack>
    </AppSheet>
  );
};
