import { Button, Overlay, Stack, Title } from '@mantine/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { tokens } from '@/app/theme';
import { TapPopover } from '@/components/TapPopover';
import { isInverted } from '@/game/battle/order';
import { runModifiers } from '@/game/run/weather';
import { playSfx } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useLootStore } from '@/stores/lootStore';
import styles from '@/screens/Battle/BattleScreen.module.css';
import { StatusBar } from './StatusBar';

export const CausalityBanner = () => {
  const { t } = useTranslation(['battle', 'run', 'content']);
  const inverted = useBattleStore((s) => isInverted(s));
  const storm = useBattleStore((s) => s.nodeStorm);
  const mutators = useBattleStore((s) => s.mutators);
  const modifiers = runModifiers(mutators);

  useEffect(() => {
    if (inverted) playSfx('inversionCue');
  }, [inverted]);

  if (!inverted && !storm && modifiers.length === 0) return null;
  return (
    <div
      className={cx(styles.causalityBanner, inverted && styles.causalitySlide)}
      data-band="causality"
    >
      {inverted ? (
        <TapPopover
          className={styles.clickable}
          label={t('battle:inverted')}
          testId="causality-inverted"
          content={t('battle:invertedHint')}
        >
          <span className={cx(styles.pill, styles.pillDanger)} data-causality="inverted">
            {t('battle:inverted')}
          </span>
        </TapPopover>
      ) : null}
      {storm ? (
        <TapPopover
          className={styles.clickable}
          label={t('battle:storm')}
          testId="causality-storm"
          content={t('battle:stormHint')}
        >
          <span className={cx(styles.pill, styles.pillCharge)} data-causality="storm">
            {t('battle:storm')}
          </span>
        </TapPopover>
      ) : null}
      {modifiers.map((mod) => (
        <TapPopover
          key={mod.id}
          className={styles.clickable}
          label={t(mod.name)}
          testId={`causality-mod-${mod.id}`}
          content={
            <>
              <b>{t(mod.name)}</b>
              <br />
              {t(mod.desc)}
            </>
          }
        >
          <span
            className={cx(styles.pill, styles.pillCondition)}
            data-causality={mod.weather ? 'weather' : 'mutator'}
          >
            {t(mod.name)}
          </span>
        </TapPopover>
      ))}
    </div>
  );
};

export const TopBands = ({ wide = false }: { wide?: boolean }) => (
  <div className={styles.topBands}>
    <CausalityBanner />
    <StatusBar wide={wide} />
  </div>
);

export const EndOverlay = () => {
  const { t } = useTranslation(['battle']);
  const outcome = useBattleStore((s) => s.outcome);
  const reset = useBattleStore((s) => s.reset);
  const lootPending = useLootStore((s) => s.pending);
  const clearLoot = useLootStore((s) => s.clear);
  const go = useAppStore((s) => s.go);
  if (outcome === undefined || lootPending !== null) return null;
  return (
    <Overlay backgroundOpacity={0.82} color={tokens.bg} blur={2} zIndex="var(--z-modal)">
      <Stack align="center" justify="center" h="100%" gap="lg">
        <Title order={1} c={outcome === 'victory' ? tokens.text : tokens.danger}>
          {t(outcome === 'victory' ? 'battle:victory' : 'battle:defeat')}
        </Title>
        <Button
          size="md"
          data-testid="battle-to-menu"
          onClick={() => {
            clearLoot();
            reset();
            go('menu');
          }}
        >
          {t('battle:toMenu')}
        </Button>
      </Stack>
    </Overlay>
  );
};
