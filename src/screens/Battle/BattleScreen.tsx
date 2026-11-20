import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtLeast } from '@/app/breakpoints';
import { debugRequested } from '@/app/debug';
import { Screen } from '@/app/Screen';
import { LootReveal } from '@/screens/Battle/LootReveal';
import { useLootStore } from '@/stores/lootStore';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { WarpStreaks } from '@/components/WarpStreaks';
import { STARTER_DECK } from '@/data/decks';
import { resolveActiveBattle } from '@/game/run/flow';
import { emitBark } from '@/game/narrative/barks';
import { offerLayoutHint } from '@/game/onboarding';
import { mountBattleScene } from '@/pixi/battle/BattleScene';
import { focusEnemy } from '@/pixi/battle/enemyFocus';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { initAudio } from '@/services/audio';
import { now } from '@/services/clock';
import { haptic } from '@/services/tma';
import { useBattleLayoutId } from '@/services/prefs';
import { createStreams } from '@/services/rng';
import { isLowHull } from '@/services/vignette';
import { useReducedMotion } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useRunStore } from '@/stores/runStore';
import { BossIntro } from '@/screens/Battle/BossIntro';
import { FateInvocation } from '@/screens/Battle/FateInvocation';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import { EnemyDetail } from '@/screens/Battle/console/EnemyDetail';
import { LAYOUT_VIEWS } from '@/screens/Battle/layouts/registry';
import { useSlotArm } from '@/screens/Battle/board/slotArm';
import { EndOverlay, TopBands } from '@/screens/Battle/shell/BattleShell';
import { endHoldMs } from '@/screens/Battle/shell/endHold';
import bossStyles from './BossIntro.module.css';
import styles from './BattleScreen.module.css';
import { noteDragTally } from '@/game/meta/counters';
import { takeDragTally } from '@/pixi/battle/dragState';

const DragDiagnostics = lazy(() =>
  import('@/screens/Battle/DragDiagnostics').then((m) => ({
    default: m.DragDiagnostics,
  })),
);

const BATTLE_WARP_MS = 400;

const startTestBattleIfIdle = (): void => {
  const store = useBattleStore.getState();
  if (store.phase !== 'idle') return;
  store.startBattle(
    { enemyIds: ['raider'] },
    STARTER_DECK,
    createStreams(now() >>> 0),
  );
};

export const BattleScreen = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const outcome = useBattleStore((s) => s.outcome);
  const runActive = useRunStore((s) => s.active);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const dropLoot = useLootStore((s) => s.drop);
  const introEnemyId = useBattleStore((s) => s.introEnemyId);
  const beats = useBattleStore((s) => s.beats);
  const enemyBeats = useBattleStore((s) => s.enemyBeats);
  const beatSeq = useBattleStore((s) => s.beatSeq);
  const preferredLayout = useBattleLayoutId();
  const wide = useAtLeast('lg');
  const checkActive = useBattleStore((s) => s.checkSteps !== null);
  const layoutId = checkActive ? 'console' : preferredLayout;
  const bossFight = introEnemyId !== null;
  const reduced = useReducedMotion();
  const bossFall =
    bossFight && phase === 'ended' && outcome === 'victory' && !reduced;
  const holdOutcome =
    runActive && phase === 'ended' && !reduced ? outcome : undefined;
  const droppedRef = useRef(false);
  const resolvedRef = useRef(false);
  const lowHullRef = useRef(false);
  const [warping, setWarping] = useState(true);

  useSlotArm();

  useEffect(() => {
    if (!runActive || hullMax <= 0) {
      lowHullRef.current = false;
      return;
    }
    const low = isLowHull(hull, hullMax);
    if (low && !lowHullRef.current) emitBark('lowHull');
    lowHullRef.current = low;
  }, [hull, hullMax, runActive]);

  useEffect(() => {
    initAudio();
    if (!useRunStore.getState().active) startTestBattleIfIdle();
    if (useBattleStore.getState().checkSteps === null) offerLayoutHint();
  }, []);

  useEffect(() => {
    focusEnemy(null);
    return () => {
      focusEnemy(null);
      const tally = takeDragTally();
      noteDragTally(tally.drops, tally.cancels);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = window.setTimeout(() => {
      setWarping(false);
    }, BATTLE_WARP_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [reduced]);

  useEffect(() => {
    if (!bossFight || beatSeq === 0) return;
    if (enemyBeats.some((b) => b.kind === 'phase')) emitBark('bossPhase');
  }, [beatSeq, enemyBeats, bossFight]);

  useEffect(() => {
    if (!bossFight || beatSeq === 0) return;
    if (beats.some((b) => b.kind === 'partDown')) emitBark('bossPartDown');
  }, [beatSeq, beats, bossFight]);

  useEffect(() => {
    if (runActive) return;
    if (outcome === 'victory' && !droppedRef.current) {
      droppedRef.current = true;
      if (useBattleStore.getState().checkSandbox) {
        useBattleStore.getState().reset();
        useAppStore.getState().go('codex');
        return;
      }
      dropLoot('vulture');
    }
    if (outcome === undefined) droppedRef.current = false;
  }, [outcome, dropLoot, runActive]);

  useEffect(() => {
    if (!runActive) return;
    if (phase !== 'ended' || resolvedRef.current) return;
    resolvedRef.current = true;
    if (bossFall) haptic('bossIntro');
    const hold = endHoldMs(outcome, reduced);
    if (hold === 0) {
      resolveActiveBattle();
      return;
    }
    let fired = false;
    const id = window.setTimeout(() => {
      fired = true;
      resolveActiveBattle();
    }, hold);
    return () => {
      window.clearTimeout(id);
      if (!fired) resolvedRef.current = false;
    };
  }, [phase, runActive, bossFall, outcome, reduced]);

  const mountScene = useMemo(
    () => (app: Application) =>
      mountBattleScene(app, {
        statusGlyph: (key) => t(`battle:status.${key}`),
        jamLabel: t('battle:jam'),
        pierceLabel: (n) => t('battle:pierce', { n }),
        beatGlyph: (kind) => t(`battle:beat.${kind}`),
      }),
    [t],
  );

  const requested = debugRequested();
  const debugEnabled = import.meta.env.DEV && requested;

  const view = LAYOUT_VIEWS[layoutId];

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      passThrough
      shellClassName={styles.noPan}
      bodyClassName={styles.board}
      innerClassName={styles.inner}
      header={wide ? undefined : <TopBands />}
      footer={wide ? undefined : <view.Footer key={layoutId} />}
      overlay={
        <>
          <PixiCanvas mount={mountScene} transparent />
          <EnemyDetail />
          {warping && !reduced ? (
            <WarpStreaks
              color={tokens.accent}
              count={14}
              durationMs={BATTLE_WARP_MS}
            />
          ) : null}
          <LootReveal />
          <FateInvocation />
          {bossFall ? <div className={bossStyles.bossFall} /> : null}
          {holdOutcome === 'defeat' ? (
            <div
              className={styles.defeatClose}
              data-end-hold="defeat"
              data-defeat-close
              aria-hidden
            />
          ) : null}
          {holdOutcome === 'victory' ? (
            <div className={styles.endHold} data-end-hold="victory" aria-hidden />
          ) : null}
          <BossIntro />
          {phase === 'ended' && !runActive ? <EndOverlay /> : null}
          {debugEnabled ? <DebugPanel /> : null}
          {requested ? (
            <Suspense fallback={null}>
              <DragDiagnostics />
            </Suspense>
          ) : null}
        </>
      }
    >
      {wide ? (
        <view.Wide key={`wide-${layoutId}`} />
      ) : (
        <view.Body key={layoutId} composition="phone" />
      )}
    </Screen>
  );
};
