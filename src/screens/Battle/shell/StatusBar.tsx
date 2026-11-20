import { Text, VisuallyHidden } from '@mantine/core';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cx } from '@/app/cx';
import { useCompactBox } from '@/app/viewportBox';
import { tokens } from '@/app/theme';
import { CountNumber } from '@/components/CountNumber';
import { TapPopover } from '@/components/TapPopover';
import { factVars, systemFact } from '@/game/battle/systemFacts';
import { nudgeChargePrice } from '@/game/battle/view';
import { useBattleStore } from '@/stores/battleStore';
import styles from '@/screens/Battle/BattleScreen.module.css';
import { BagChip } from './HandSheet';
import { RunActions } from './RunActions';
import { StatusGlyph, type StatusGlyphKind } from './StatusGlyph';

const usePresentSinceMount = (present: boolean): boolean => {
  const [since, setSince] = useState(present);
  if (since && !present) setSince(false);
  return since;
};

const StatusPill = ({
  kind,
  tone,
  glyphs,
  label,
  children,
}: {
  kind: StatusGlyphKind;
  tone: string | undefined;
  glyphs: boolean;
  label: string;
  children: ReactNode;
}) => (
  <span
    className={cx(styles.pill, tone, glyphs && styles.pillGlyph)}
    title={glyphs ? label : undefined}
    data-status-pill={kind}
  >
    {glyphs ? <StatusGlyph kind={kind} /> : null}
    <span aria-hidden={glyphs || undefined}>{children}</span>
    {glyphs ? <VisuallyHidden>{label}</VisuallyHidden> : null}
  </span>
);

export const StatusBar = ({ wide = false }: { wide?: boolean }) => {
  const { t } = useTranslation(['battle', 'run']);
  const hull = useBattleStore((s) => s.hull);
  const hullMax = useBattleStore((s) => s.hullMax);
  const shield = useBattleStore((s) => s.shield);
  const charge = useBattleStore((s) => s.charge);
  const chargeCap = useBattleStore((s) => s.chargeCap);
  const nudgeCost = useBattleStore(nudgeChargePrice);
  const scrap = useBattleStore((s) => s.scrap);
  const interference = useBattleStore((s) => s.interference);
  const turn = useBattleStore((s) => s.turn);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const prevHull = useRef(hull);
  const shieldSinceMount = usePresentSinceMount(shield > 0);
  const scrapSinceMount = usePresentSinceMount(scrap > 0);
  const compact = useCompactBox();

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
  const hullLabel = (n: number): string => t('battle:hull', { hp: n, max: hullMax });
  const shieldLabel = (n: number): string => t('battle:shield', { n });
  const scrapLabel = (n: number): string => t('battle:scrap', { n });

  const glyphs = compact && !wide;

  const hullText = (
    <Text size="sm" c={tokens.text} className={styles.statusHull}>
      <CountNumber
        value={hull}
        format={hullLabel}
        data-hud="hull"
        data-hud-target={hull}
      />
    </Text>
  );

  const turnText = (
    <Text size="xs" c={tokens.dim} className={styles.statusTurn}>
      {t('battle:turn', { n: turn })}
    </Text>
  );

  const track = (
    <div className={styles.hullTrack}>
      <div
        ref={fillRef}
        className={styles.hullFill}
        style={{ transform: `translateX(${String((ratio - 1) * 100)}%)` }}
      />
    </div>
  );

  const interferenceLabel = t('battle:interference', { n: interference });
  const chargeLabel = t('battle:charge', { n: charge, max: chargeCap });

  const pills = (
    <>
      {shield > 0 ? (
        <StatusPill
          kind="shield"
          tone={styles.pillShield}
          glyphs={glyphs}
          label={shieldLabel(shield)}
        >
          <CountNumber
            value={shield}
            from={shieldSinceMount ? undefined : 0}
            format={glyphs ? undefined : shieldLabel}
            data-hud="shield"
            data-hud-target={shield}
          />
        </StatusPill>
      ) : null}
      {interference > 0 ? (
        <TapPopover
          className={styles.clickable}
          label={interferenceLabel}
          testId="interference-why"
          align="end"
          content={
            <>
              <b>{t('battle:interferenceTitle')}</b>
              <br />
              {t('battle:interferenceWhy')}
            </>
          }
        >
          <StatusPill
            kind="interference"
            tone={styles.pillDanger}
            glyphs={glyphs}
            label={interferenceLabel}
          >
            {glyphs ? interference : interferenceLabel}
          </StatusPill>
        </TapPopover>
      ) : null}
      {scrap > 0 ? (
        <StatusPill
          kind="scrap"
          tone={styles.pillScrap}
          glyphs={glyphs}
          label={scrapLabel(scrap)}
        >
          <CountNumber
            value={scrap}
            from={scrapSinceMount ? undefined : 0}
            format={glyphs ? undefined : scrapLabel}
            data-hud="scrap"
            data-hud-target={scrap}
          />
        </StatusPill>
      ) : null}
      <TapPopover
        className={styles.clickable}
        label={chargeLabel}
        testId="charge-why"
        align="end"
        content={
          <>
            <b>{t('battle:chargeTitle')}</b>
            <br />
            {t(systemFact('charge').text, factVars('charge', { nudgeCost }))}
          </>
        }
      >
        <StatusPill
          kind="charge"
          tone={styles.pillCharge}
          glyphs={glyphs}
          label={chargeLabel}
        >
          {glyphs ? `${String(charge)}/${String(chargeCap)}` : chargeLabel}
        </StatusPill>
      </TapPopover>
    </>
  );

  return (
    <div
      className={cx(
        styles.statusCard,
        wide && styles.statusCardWide,
        glyphs && styles.statusGlyphs,
      )}
      data-band="status"
      data-status-glyphs={glyphs ? '' : undefined}
    >
      <div className={styles.statusLeft}>
        <div className={styles.statusHeadline}>
          {hullText}
          {turnText}
        </div>
        {track}
      </div>
      <div className={styles.statusRight}>
        <div className={styles.statusPills}>{pills}</div>
        <div className={styles.statusActions}>
          {wide ? null : <RunActions />}
          <BagChip />
        </div>
      </div>
    </div>
  );
};
