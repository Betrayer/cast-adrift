import { Button, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/app/Screen';
import { LootReveal } from '@/screens/Battle/LootReveal';
import { useLootStore } from '@/stores/lootStore';
import type { Application } from 'pixi.js';
import { tokens } from '@/app/theme';
import { WarpStreaks } from '@/components/WarpStreaks';
import { STARTER_DECK } from '@/data/decks';
import { schools } from '@/data/schools';
import {
  activeThresholds,
  RESONANCE_THRESHOLDS,
  SCHOOL_ORDER,
} from '@/game/battle/resonance';
import { CHARGE_CAP } from '@/game/battle/resolver';
import { isInverted } from '@/game/battle/order';
import { allowedSlotsForTurn } from '@/game/battle/view';
import { resolveActiveBattle } from '@/game/run/flow';
import { emitBark } from '@/game/narrative';
import { mountBattleScene } from '@/pixi/battle/BattleScene';
import { PixiCanvas } from '@/pixi/PixiCanvas';
import { initAudio, playSfx } from '@/services/audio';
import { now } from '@/services/clock';
import { haptic } from '@/services/tma';
import { createStreams } from '@/services/rng';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useRunStore } from '@/stores/runStore';
import { BossIntro } from '@/screens/Battle/BossIntro';
import { FateInvocation } from '@/screens/Battle/FateInvocation';
import { DebugPanel } from '@/screens/Battle/DebugPanel';
import { BuildSheet } from '@/screens/Build/BuildSheet';
import { SlotDock } from '@/screens/Battle/board/SlotDock';
import { useRegion } from '@/screens/Battle/board/measure';
import { Console } from '@/screens/Battle/console/Console';
import { EnemyDetail } from '@/screens/Battle/console/EnemyDetail';
import { Forecast } from '@/screens/Battle/console/Forecast';
import bossStyles from './BossIntro.module.css';
import boardStyles from './board/Board.module.css';
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

const CausalityBanner = () => {
  const { t } = useTranslation(['battle']);
  const inverted = useBattleStore((s) => isInverted(s));
  const storm = useBattleStore((s) => s.nodeStorm);

  useEffect(() => {
    if (inverted) playSfx('inversionCue');
  }, [inverted]);

  if (!inverted && !storm) return null;
  return (
    <div
      className={`${styles.causalityBanner ?? ''} ${inverted ? styles.causalitySlide ?? '' : ''}`}
      data-band="causality"
    >
      {inverted ? (
        <span
          className={`${styles.pill ?? ''} ${styles.pillDanger ?? ''}`}
          data-causality="inverted"
          title={t('battle:invertedHint')}
        >
          {t('battle:inverted')}
        </span>
      ) : null}
      {storm ? (
        <span
          className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}
          data-causality="storm"
          title={t('battle:stormHint')}
        >
          {t('battle:storm')}
        </span>
      ) : null}
    </div>
  );
};

const StatusBar = ({ onOpenBuild }: { onOpenBuild: () => void }) => {
  const { t } = useTranslation(['battle', 'run']);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const shield = useBattleStore((s) => s.shield);
  const charge = useBattleStore((s) => s.charge);
  const scrap = useBattleStore((s) => s.scrap);
  const interference = useBattleStore((s) => s.interference);
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
    <div className={styles.statusCard} data-band="status">
      <div className={styles.statusLeft}>
        <div className={styles.statusHeadline}>
          <Text size="sm" c={tokens.text}>
            {t('battle:hull', { hp: hull, max: hullMax })}
          </Text>
          <Text size="xs" c={tokens.dim}>
            {t('battle:turn', { n: turn })}
          </Text>
        </div>
        <div className={styles.hullTrack}>
          <div
            ref={fillRef}
            className={styles.hullFill}
            style={{ width: `${String(ratio * 100)}%` }}
          />
        </div>
      </div>
      <div className={styles.statusRight}>
        {shield > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillShield ?? ''}`}>
            {t('battle:shield', { n: shield })}
          </span>
        ) : null}
        {interference > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillDanger ?? ''}`}>
            {t('battle:interference', { n: interference })}
          </span>
        ) : null}
        {scrap > 0 ? (
          <span className={`${styles.pill ?? ''} ${styles.pillScrap ?? ''}`}>
            {t('battle:scrap', { n: scrap })}
          </span>
        ) : null}
        <span
          className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}
          data-coach="charge"
        >
          {t('battle:charge', { n: charge, max: CHARGE_CAP })}
        </span>
        <Button
          className={styles.clickable}
          size="compact-xs"
          variant="subtle"
          color="gray"
          data-open-build
          onClick={onOpenBuild}
        >
          {t('run:build.open')}
        </Button>
      </div>
    </div>
  );
};

const ResonanceChips = () => {
  const { t } = useTranslation(['battle']);
  const resonance = useBattleStore((s) => s.resonance);
  const dice = useBattleStore((s) => s.dice);
  const [open, setOpen] = useState(false);

  const census = useMemo(() => {
    const rows = SCHOOL_ORDER.map((school) => {
      const owned = dice.filter((d) => d.school === school);
      return {
        school,
        deck: resonance.counts[school],
        prism: resonance.counts[school] > owned.length,
        placed: owned.filter((d) => d.state === 'placed').length,
        tray: owned.filter((d) => d.state === 'tray').length,
        reserved: owned.filter((d) => d.state === 'reserved').length,
      };
    });
    return rows.filter(
      (row) => row.deck > 0 || row.placed + row.tray + row.reserved > 0,
    );
  }, [dice, resonance]);

  if (census.length === 0) return null;
  return (
    <div className={styles.resonanceWrap}>
      {open ? (
        <div className={styles.resPopover} data-res-popover>
          {census.map((row) => (
            <div key={row.school} className={styles.resPopRow}>
              <span style={{ color: schools[row.school].text }}>
                {t(`battle:school.${row.school}`)}
              </span>
              <span>
                {t('battle:resDetail', {
                  deck: row.deck,
                  placed: row.placed,
                  tray: row.tray,
                  reserved: row.reserved,
                })}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className={styles.resonanceRow}
        data-testid="resonance-row"
        onClick={() => {
          setOpen((value) => !value);
        }}
      >
        {census.map((row) => {
          const active = activeThresholds(resonance, row.school);
          const colors = schools[row.school];
          return (
            <span
              key={row.school}
              className={`${styles.resChip ?? ''} ${
                active.length > 0 ? styles.resChipActive ?? '' : ''
              }`}
              style={{ borderColor: colors.stroke, color: colors.text }}
              data-res-school={row.school}
            >
              {t('battle:resBoard', {
                school: t(`battle:school.${row.school}`),
                placed: row.placed,
                tray: row.tray,
              })}
              {row.prism ? (
                <span
                  className={styles.resPrism}
                  data-res-prism={row.school}
                  title={t('battle:resPrism')}
                />
              ) : null}
              <span className={styles.resPips}>
                {RESONANCE_THRESHOLDS.map((th) => (
                  <span
                    key={th}
                    className={`${styles.resPip ?? ''} ${
                      active.includes(th) ? styles.resPipOn ?? '' : ''
                    }`}
                  />
                ))}
              </span>
            </span>
          );
        })}
      </button>
    </div>
  );
};

const ScriptHint = () => {
  const { t } = useTranslation(['battle']);
  const scriptedSlots = useBattleStore((s) => s.scriptedSlots);
  const turn = useBattleStore((s) => s.turn);
  const allowed = allowedSlotsForTurn(scriptedSlots, turn);
  if (allowed === null || allowed.length === 0) return null;
  return (
    <Text size="xs" c={tokens.amber} ta="center">
      {t('battle:scriptHint', {
        slots: allowed.map((slot) => t(`battle:slot.${slot}`)).join(' · '),
      })}
    </Text>
  );
};

const EndTurnButton = () => {
  const { t } = useTranslation(['battle']);
  const phase = useBattleStore((s) => s.phase);
  const rerollMode = useBattleStore((s) => s.rerollMode);
  const endTurn = useBattleStore((s) => s.endTurn);
  return (
    <Button
      className={styles.clickable}
      size="md"
      fullWidth
      disabled={phase !== 'placement' || rerollMode}
      onClick={endTurn}
      data-coach="endTurn"
      data-testid="battle-end-turn"
    >
      {t('battle:endTurn')}
    </Button>
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

const BoardColumn = () => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <div className={boardStyles.column}>
      <div ref={enemyRef} className={boardStyles.enemyBand} data-band="enemies" />
      <div ref={trayRef} className={boardStyles.trayBand} data-band="tray" />
      <SlotDock />
    </div>
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
  const bossFight = introEnemyId !== null;
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const bossFall =
    bossFight && phase === 'ended' && outcome === 'victory' && !reduced;
  const droppedRef = useRef(false);
  const resolvedRef = useRef(false);
  const lowHullRef = useRef(false);
  const [buildOpen, setBuildOpen] = useState(false);
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

  return (
    <Screen
      width="full"
      pad={false}
      scroll={false}
      passThrough
      bodyClassName={styles.board}
      innerClassName={styles.inner}
      header={
        <div className={styles.topBands}>
          <CausalityBanner />
          <StatusBar
            onOpenBuild={() => {
              setBuildOpen(true);
            }}
          />
        </div>
      }
      footer={
        <div className={styles.centreColumn}>
          <ResonanceChips />
          <ScriptHint />
          <Forecast />
          <Console />
          <EndTurnButton />
        </div>
      }
      overlay={
        <>
          <PixiCanvas mount={mountScene} transparent />
          <EnemyDetail />
          {buildOpen ? (
            <BuildSheet
              onClose={() => {
                setBuildOpen(false);
              }}
            />
          ) : null}
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
      <BoardColumn />
    </Screen>
  );
};
