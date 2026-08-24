import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtLeast } from '@/app/breakpoints';
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
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { initAudio } from '@/services/audio';
import { now } from '@/services/clock';
import { haptic } from '@/services/tma';
import { useBattleLayoutId } from '@/services/prefs';
import { createStreams } from '@/services/rng';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useRunStore } from '@/stores/runStore';
import { BossIntro } from '@/screens/Battle/BossIntro';
import { FateInvocation } from '@/screens/Battle/FateInvocation';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import { EnemyDetail } from '@/screens/Battle/console/EnemyDetail';
import { LAYOUT_VIEWS } from '@/screens/Battle/layouts/registry';
import { EndOverlay, TopBands } from '@/screens/Battle/shell/BattleShell';
import bossStyles from './BossIntro.module.css';
import styles from './BattleScreen.module.css';

const BOSS_HIT_STOP_MS = 300;
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
  const enemyBeats = useBattleStore((s) => s.enemyBeats);
  const beatSeq = useBattleStore((s) => s.beatSeq);
  const preferredLayout = useBattleLayoutId();
  const wide = useAtLeast('lg');
  const checkActive = useBattleStore((s) => s.checkSteps !== null);
  const layoutId = checkActive ? 'console' : preferredLayout;
  const bossFight = introEnemyId !== null;
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const bossFall =
    bossFight && phase === 'ended' && outcome === 'victory' && !reduced;
  const droppedRef = useRef(false);
  const resolvedRef = useRef(false);
  const lowHullRef = useRef(false);
  const [warping, setWarping] = useState(true);

  useEffect(() => {
    if (!runActive || hullMax <= 0) {
      lowHullRef.current = false;
      return;
    }
    const low = hull > 0 && hull / hullMax < 0.3;
    if (low && !lowHullRef.current) emitBark('lowHull');
    lowHullRef.current = low;
  }, [hull, hullMax, runActive]);

  useEffect(() => {
    initAudio();
    if (!useRunStore.getState().active) startTestBattleIfIdle();
    if (useBattleStore.getState().checkSteps === null) offerLayoutHint();
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
    if (!bossFall) {
      resolveActiveBattle();
      return;
    }
    haptic('bossIntro');
    const id = window.setTimeout(resolveActiveBattle, BOSS_HIT_STOP_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [phase, runActive, bossFall]);

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

  const debugEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('debug') === '1';

  const view = LAYOUT_VIEWS[layoutId];

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      passThrough
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
          <BossIntro />
          {phase === 'ended' && !runActive ? <EndOverlay /> : null}
          {debugEnabled ? <DebugPanel /> : null}
        </>
      }
    >
      {wide ? (
        <view.Wide key={`wide-${layoutId}`} />
      ) : (
        <view.Body key={layoutId} />
      )}
    </Screen>
  );
};
