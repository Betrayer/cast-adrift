import { Box, Button, Group, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LootReveal } from '@/screens/Battle/LootReveal';
import { useLootStore } from '@/stores/lootStore';
import type { TFunction } from 'i18next';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { STARTER_DECK } from '@/data/decks';
import { ENEMY_BY_ID } from '@/data/enemies/sector1';
import { DIE_BY_ID } from '@/data/dice';
import { schools } from '@/data/schools';
import { canCopy, canFlip } from '@/game/battle/actives';
import {
  activeThresholds,
  nextThreshold,
  RESONANCE_THRESHOLDS,
  SCHOOL_ORDER,
} from '@/game/battle/resonance';
import {
  BONUS_REROLL_COST,
  CHARGE_CAP,
  NUDGE_COST,
  SURGE_COST,
} from '@/game/battle/resolver';
import { mountBattleScene } from '@/pixi/battle/BattleScene';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { initAudio } from '@/services/audio';
import { createStreams } from '@/services/rng';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import type { Intent } from '@/types/content';
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

const intentLabel = (t: TFunction<['battle', 'content']>, intent: Intent): string => {
  switch (intent.t) {
    case 'attack':
      return t('battle:intent.attack', { n: intent.n });
    case 'shield':
      return t('battle:intent.shield', { n: intent.n });
    case 'shieldAll':
      return t('battle:intent.shieldAll', { n: intent.n });
    case 'multi':
      return t('battle:intent.multi', { n: intent.n, k: intent.k });
    case 'charge':
      return t('battle:intent.charge');
    case 'jamSlot':
      return t('battle:intent.jamSlot');
    case 'lockDie':
      return t('battle:intent.lockDie');
    case 'summon':
      return t('battle:intent.summon');
  }
};

const intentPillClass = (intent: Intent): string => {
  if (intent.t === 'attack' || intent.t === 'multi')
    return styles.intentAttack ?? '';
  if (intent.t === 'shield' || intent.t === 'shieldAll')
    return styles.intentShield ?? '';
  return styles.intentUtility ?? '';
};

const StatusCard = () => {
  const { t } = useTranslation(['battle']);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const shield = useBattleStore((s) => s.shield);
  const charge = useBattleStore((s) => s.charge);
  const scrap = useBattleStore((s) => s.scrap);
  const turn = useBattleStore((s) => s.turn);
  const phase = useBattleStore((s) => s.phase);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const rerollsLeft = useBattleStore((s) => s.rerollsLeft);
  const spendBonusReroll = useBattleStore((s) => s.spendBonusReroll);
  const spendSurge = useBattleStore((s) => s.spendSurge);
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
  const spendable = phase === 'placement' && !rerollMode;

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
        {scrap > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillScrap ?? ''}`}>
            {t('battle:scrap', { n: scrap })}
          </span>
        ) : null}
        <span className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}>
          {t('battle:charge', { n: charge, max: CHARGE_CAP })}
        </span>
        <Group gap={4} justify="flex-end">
          <Button
            className={styles.clickable}
            size="compact-xs"
            variant="default"
            disabled={!spendable || rerollsLeft <= 0 || charge < BONUS_REROLL_COST}
            onClick={spendBonusReroll}
          >
            {t('battle:buyReroll')}
          </Button>
          <Button
            className={styles.clickable}
            size="compact-xs"
            variant="default"
            disabled={!spendable || charge < SURGE_COST}
            onClick={spendSurge}
          >
            {t('battle:surge')}
          </Button>
        </Group>
      </div>
    </div>
  );
};

const EnemyChips = () => {
  const { t } = useTranslation(['battle', 'content']);
  const enemies = useBattleStore((s) => s.enemies);
  const targetId = useBattleStore((s) => s.targetId);
  return (
    <div className={styles.enemyRow}>
      {enemies.map((enemy) => {
        const def = ENEMY_BY_ID.get(enemy.defId);
        if (def === undefined) return null;
        const intent = enemy.nextIntent;
        const targeted =
          targetId === enemy.id ||
          enemy.subsystems.some((sub) => sub.id === targetId);
        return (
          <div
            key={enemy.id}
            className={`${styles.enemyChip ?? ''} ${targeted ? styles.enemyChipTargeted ?? '' : ''
              }`}
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
            {enemy.hp > 0 ? (
              <span
                className={`${styles.intentPill ?? ''} ${intentPillClass(intent)}`}
              >
                {intentLabel(t, intent)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const ResonanceChips = () => {
  const { t } = useTranslation(['battle']);
  const resonance = useBattleStore((s) => s.resonance);
  const present = SCHOOL_ORDER.filter((school) => resonance.counts[school] > 0);
  if (present.length === 0) return null;
  return (
    <div className={styles.resonanceRow}>
      {present.map((school) => {
        const count = resonance.counts[school];
        const next = nextThreshold(count);
        const active = activeThresholds(resonance, school);
        const colors = schools[school];
        const schoolLabel = t(`battle:school.${school}`);
        const label =
          next === null
            ? t('battle:resChipFull', { school: schoolLabel, count })
            : t('battle:resChip', { school: schoolLabel, count, next });
        return (
          <span
            key={school}
            className={`${styles.resChip ?? ''} ${active.length > 0 ? styles.resChipActive ?? '' : ''
              }`}
            style={{ borderColor: colors.stroke, color: colors.text }}
          >
            {label}
            <span className={styles.resPips}>
              {RESONANCE_THRESHOLDS.map((th) => (
                <span
                  key={th}
                  className={`${styles.resPip ?? ''} ${active.includes(th) ? styles.resPipOn ?? '' : ''
                    }`}
                />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const NudgeStrip = () => {
  const { t } = useTranslation(['battle', 'content']);
  const phase = useBattleStore((s) => s.phase);
  const charge = useBattleStore((s) => s.charge);
  const freeNudges = useBattleStore((s) => s.freeNudges);
  const resonance = useBattleStore((s) => s.resonance);
  const selectedDieUid = useBattleStore((s) => s.selectedDieUid);
  const spendNudge = useBattleStore((s) => s.spendNudge);
  const flipDie = useBattleStore((s) => s.flipDie);
  const copyDie = useBattleStore((s) => s.copyDie);
  const die = useBattleStore((s) =>
    s.dice.find((d) => d.uid === s.selectedDieUid),
  );
  if (phase !== 'placement' || selectedDieUid === null || die === undefined)
    return null;
  const def = DIE_BY_ID.get(die.defId);
  const free = freeNudges > 0;
  const affordable = free || charge >= NUDGE_COST;
  const showFlip = canFlip(die);
  const showCopy = die.state === 'tray' && canCopy(die, resonance);
  return (
    <div className={styles.nudgeStrip}>
      {def !== undefined ? (
        <Text size="xs" fw={600} c={tokens.text} style={{ alignSelf: 'center' }}>
          {`${t(def.name)} · d${String(def.tier)}`}
        </Text>
      ) : null}
      <Button
        className={styles.clickable}
        size="compact-sm"
        variant="default"
        disabled={!affordable || die.value <= 1}
        onClick={() => {
          spendNudge(selectedDieUid, -1);
        }}
      >
        {t(free ? 'battle:nudgeFree' : 'battle:nudgeMinus')}
      </Button>
      <Button
        className={styles.clickable}
        size="compact-sm"
        variant="default"
        disabled={!affordable || die.value >= die.tier}
        onClick={() => {
          spendNudge(selectedDieUid, 1);
        }}
      >
        {t(free ? 'battle:nudgeFreePlus' : 'battle:nudgePlus')}
      </Button>
      {showFlip ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            flipDie(selectedDieUid);
          }}
        >
          {t('battle:flip')}
        </Button>
      ) : null}
      {showCopy ? (
        <Button
          className={styles.clickable}
          size="compact-sm"
          variant="default"
          onClick={() => {
            copyDie(selectedDieUid);
          }}
        >
          {t('battle:copy')}
        </Button>
      ) : null}
    </div>
  );
};

const BottomBar = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const rerollsLeft = useBattleStore((s) => s.rerollsLeft);
  const rerollSize = useBattleStore((s) => s.rerollSize);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const rerollSelection = useBattleStore((s) => s.rerollSelection);
  const toggleRerollMode = useBattleStore((s) => s.toggleRerollMode);
  const confirmReroll = useBattleStore((s) => s.confirmReroll);
  const endTurn = useBattleStore((s) => s.endTurn);
  return (
    <div className={styles.bottomBar}>
      <ResonanceChips />
      {rerollMode ? (
        <Text size="xs" c={tokens.dim} ta="center">
          {t('battle:rerollHint', { size: rerollSize })}
        </Text>
      ) : (
        <Text size="xs" c={tokens.faint} ta="center">
          {t('battle:burnHint')}
        </Text>
      )}
      <div className={styles.rerollRow}>
        {rerollMode ? (
          <>
            <Button
              className={styles.clickable}
              size="sm"
              variant="default"
              onClick={toggleRerollMode}
            >
              {t('battle:rerollCancel')}
            </Button>
            <Button
              className={styles.clickable}
              size="sm"
              disabled={rerollSelection.length === 0}
              onClick={confirmReroll}
            >
              {t('battle:rerollConfirm', {
                k: rerollSelection.length,
                size: rerollSize,
              })}
            </Button>
          </>
        ) : (
          <Button
            className={styles.clickable}
            size="sm"
            variant="default"
            disabled={phase !== 'placement' || rerollsLeft <= 0}
            onClick={toggleRerollMode}
          >
            {t('battle:reroll', { n: rerollsLeft })}
          </Button>
        )}
      </div>
      <Button
        className={styles.clickable}
        size="md"
        fullWidth
        disabled={phase !== 'placement' || rerollMode}
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
  const lootPending = useLootStore((s) => s.pending);
  const clearLoot = useLootStore((s) => s.clear);
  const go = useAppStore((s) => s.go);
  if (outcome === undefined || lootPending !== null) return null;
  return (
    <Overlay backgroundOpacity={0.82} color={tokens.bg} blur={2} zIndex={5}>
      <Stack align="center" justify="center" h="100%" gap="lg">
        <Title order={1} c={outcome === 'victory' ? tokens.text : tokens.danger}>
          {t(outcome === 'victory' ? 'battle:victory' : 'battle:defeat')}
        </Title>
        <Button
          size="md"
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

export const BattleScreen = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const outcome = useBattleStore((s) => s.outcome);
  const dropLoot = useLootStore((s) => s.drop);
  const droppedRef = useRef(false);

  useEffect(() => {
    initAudio();
    startTestBattleIfIdle();
  }, []);

  useEffect(() => {
    if (outcome === 'victory' && !droppedRef.current) {
      droppedRef.current = true;
      dropLoot('vulture');
    }
    if (outcome === undefined) droppedRef.current = false;
  }, [outcome, dropLoot]);

  const mountScene = useMemo(
    () => (app: Application) =>
      mountBattleScene(app, {
        slotTitle: (slot) => t(`battle:slot.${slot}`),
        capLabel: (cap, mk) => t('battle:slot.cap', { cap, mk }),
        reserveTitle: t('battle:reserve'),
        statusGlyph: (key) => t(`battle:status.${key}`),
        jamLabel: t('battle:jam'),
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
        <NudgeStrip />
        <BottomBar />
      </div>
      <LootReveal />
      {phase === 'ended' ? <EndOverlay /> : null}
      {debugEnabled ? <DebugPanel /> : null}
    </Box>
  );
};
