import { Button, Overlay, Stack, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { schools } from '@/data/schools';
import { isInverted } from '@/game/battle/order';
import {
  activeThresholds,
  RESONANCE_THRESHOLDS,
  SCHOOL_ORDER,
} from '@/game/battle/resonance';
import { CHARGE_CAP } from '@/game/battle/resolver';
import { allowedSlotsForTurn } from '@/game/battle/view';
import { playSfx } from '@/services/audio';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useLootStore } from '@/stores/lootStore';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const CausalityBanner = () => {
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

export const StatusBar = ({ onOpenBuild }: { onOpenBuild: () => void }) => {
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

export const TopBands = ({ onOpenBuild }: { onOpenBuild: () => void }) => (
  <div className={styles.topBands}>
    <CausalityBanner />
    <StatusBar onOpenBuild={onOpenBuild} />
  </div>
);

export const ResonanceChips = () => {
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

export const ScriptHint = () => {
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

export const EndTurnButton = () => {
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
