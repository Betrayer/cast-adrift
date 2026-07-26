import { Button, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { ENEMY_BY_ID } from '@/data/enemies';
import { haptic } from '@/services/tma';
import { useBattleStore } from '@/stores/battleStore';
import styles from './BossIntro.module.css';

export const BossIntro = () => {
  const { t } = useTranslation(['battle', 'content']);
  const introPending = useBattleStore((s) => s.introPending);
  const introEnemyId = useBattleStore((s) => s.introEnemyId);
  const enemies = useBattleStore((s) => s.enemies);
  const dismissIntro = useBattleStore((s) => s.dismissIntro);

  useEffect(() => {
    if (introPending) haptic('heavy');
  }, [introPending]);

  if (!introPending || introEnemyId === null) return null;
  const def = ENEMY_BY_ID.get(introEnemyId);
  if (def === undefined) return null;
  const state = enemies.find((e) => e.defId === introEnemyId);
  const subsystems = state?.subsystems ?? [];

  return (
    <Overlay backgroundOpacity={0.88} color={tokens.bg} blur={3} zIndex={7}>
      <Stack align="center" justify="center" h="100%" gap="lg" p="lg">
        <Text className={styles.kicker} c={tokens.danger}>
          {t(def.boss === true ? 'battle:intro.boss' : 'battle:intro.miniboss')}
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
        <Button size="md" color="accent" onClick={dismissIntro}>
          {t('battle:intro.begin')}
        </Button>
      </Stack>
    </Overlay>
  );
};
