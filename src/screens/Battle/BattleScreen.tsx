import { Box, Button, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { STARTER_DECK } from '@/data/decks';
import { ENEMY_BY_ID } from '@/data/enemies/sector1';
import { currentIntentOf } from '@/game/battle';
import { mountBattleScene } from '@/pixi/battle/BattleScene';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { createStreams } from '@/services/rng';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import styles from './BattleScreen.module.css';

const startTestBattleIfIdle = (): void => {
  const store = useBattleStore.getState();
  if (store.phase !== 'idle') return;
  store.startBattle(
    { enemyIds: ['raider'] },
    STARTER_DECK,
    createStreams(Date.now() >>> 0),
  );
};

const StatusCard = () => {
  const { t } = useTranslation(['battle']);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const shield = useBattleStore((s) => s.shield);
  const turn = useBattleStore((s) => s.turn);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const prevHull = useRef(hull);

  useEffect(() => {
    const dropped = hull < prevHull.current;
    prevHull.current = hull;
    const el = fillRef.current;
    const flashClass = styles.hullFlash;
    if (!dropped || el === null || flashClass === undefined) return;
    el.classList.remove(flashClass);
    void el.offsetWidth;
    el.classList.add(flashClass);
  }, [hull]);

  const ratio = hullMax > 0 ? Math.max(0, Math.min(1, hull / hullMax)) : 0;

  return (
    <div className={styles.statusCard}>
      <div className={styles.statusLeft}>
        <Text size="sm" c={tokens.text}>
          {t('battle:hull', { hp: hull, max: hullMax })}
        </Text>
        <div className={styles.hullTrack}>
          <div
            ref={fillRef}
            className={styles.hullFill}
            style={{ width: `${String(ratio * 100)}%` }}
          />
        </div>
        <Text size="xs" c={tokens.dim}>
          {t('battle:turn', { n: turn })}
        </Text>
      </div>
      <div className={styles.statusRight}>
        <span className={`${styles.pill ?? ''} ${styles.pillShield ?? ''}`}>
          {t('battle:shield', { n: shield })}
        </span>
        <span className={`${styles.pill ?? ''} ${styles.pillScrap ?? ''}`}>
          {t('battle:scrap', { n: 0 })}
        </span>
      </div>
    </div>
  );
};

const EnemyChips = () => {
  const { t } = useTranslation(['battle', 'content']);
  const enemies = useBattleStore((s) => s.enemies);
  return (
    <div className={styles.enemyRow}>
      {enemies.map((enemy) => {
        const def = ENEMY_BY_ID.get(enemy.defId);
        if (def === undefined) return null;
        const intent = currentIntentOf(enemy);
        return (
          <div
            key={enemy.id}
            className={styles.enemyChip}
            style={{ opacity: enemy.hp > 0 ? 1 : 0.45 }}
          >
            <Text size="sm" fw={600} c={tokens.text}>
              {t(def.name)}
            </Text>
            <Text size="xs" c={tokens.dim}>
              {t('battle:hp', { hp: enemy.hp, max: enemy.hpMax })}
              {enemy.shield > 0
                ? ` · ${t('battle:shield', { n: enemy.shield })}`
                : ''}
            </Text>
            <span
              className={`${styles.intentPill ?? ''} ${(intent.t === 'attack' ? styles.intentAttack : styles.intentShield) ?? ''
                }`}
            >
              {intent.t === 'attack'
                ? t('battle:intent.attack', { n: intent.n })
                : t('battle:intent.shield', { n: intent.n })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const BottomBar = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const endTurn = useBattleStore((s) => s.endTurn);
  return (
    <div className={styles.bottomBar}>
      <Text size="xs" c={tokens.faint} ta="center">
        {t('battle:burnHint')}
      </Text>
      <Button
        className={styles.clickable}
        size="md"
        fullWidth
        disabled={phase !== 'placement'}
        onClick={endTurn}
      >
        {t('battle:endTurn')}
      </Button>
    </div>
  );
};

const EndOverlay = () => {
  const { t } = useTranslation(['battle']);
  const outcome = useBattleStore((s) => s.outcome);
  const reset = useBattleStore((s) => s.reset);
  const go = useAppStore((s) => s.go);
  if (outcome === undefined) return null;
  return (
    <Overlay backgroundOpacity={0.82} color={tokens.bg} blur={2} zIndex={5}>
      <Stack align="center" justify="center" h="100%" gap="lg">
        <Title order={1} c={outcome === 'victory' ? tokens.text : tokens.danger}>
          {t(outcome === 'victory' ? 'battle:victory' : 'battle:defeat')}
        </Title>
        <Button
          size="md"
          onClick={() => {
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

export const BattleScreen = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);

  useEffect(() => {
    startTestBattleIfIdle();
  }, []);

  const mountScene = useMemo(
    () => (app: Application) =>
      mountBattleScene(app, {
        slotTitle: (slot) => t(`battle:slot.${slot}`),
        capLabel: (cap, mk) => t('battle:slot.cap', { cap, mk }),
      }),
    [t],
  );

  const debugEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  return (
    <Box pos="relative" mih="100dvh" bg={tokens.bg} style={{ overflow: 'hidden' }}>
      <PixiCanvas mount={mountScene} />
      <div className={styles.hud}>
        <StatusCard />
        <EnemyChips />
        <BottomBar />
      </div>
      {phase === 'ended' ? <EndOverlay /> : null}
      {debugEnabled ? <DebugPanel /> : null}
    </Box>
  );
};
