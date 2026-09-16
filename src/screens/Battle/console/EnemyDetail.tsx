import { useCallback, useSyncExternalStore, type MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { swallowNextClick, useEscapeKey } from '@/components/dismiss';
import { echoReadsIntents } from '@/data/echo';
import { ENEMY_BY_ID } from '@/data/enemies';
import { STATUS_KEYS } from '@/game/battle/statuses';
import { schools } from '@/data/schools';
import { aliveCoreParts, coreLocked, partDefOf } from '@/game/battle/damage';
import { mitigationOf } from '@/game/battle/view';
import { focusEnemy, focusedEnemy, subscribeEnemyFocus } from '@/pixi/battle/enemyFocus';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import type { EnemyState } from '@/types/battle';
import { echoReadoutFor } from './echoReadout';
import { auraExplain, intentExplain, partDeathExplain } from './intentExplain';
import { intentLabel } from './intentLabel';
import styles from './Console.module.css';

const useFocusedEnemy = (): string | null =>
  useSyncExternalStore(subscribeEnemyFocus, focusedEnemy, focusedEnemy);

export const focusedEnemyIn = (
  enemies: readonly EnemyState[],
  focused: string | null,
): EnemyState | null =>
  focused === null
    ? null
    : (enemies.find((e) => e.id === focused && e.hp > 0) ?? null);

export const EnemyDetail = () => {
  const { t } = useTranslation(['battle', 'content']);
  const focused = useFocusedEnemy();
  const enemies = useBattleStore((s) => s.enemies);
  const targetId = useBattleStore((s) => s.targetId);
  const setTarget = useBattleStore((s) => s.setTarget);
  const close = useCallback(() => {
    focusEnemy(null);
  }, []);
  const closeFromTap = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    swallowNextClick({ x: event.clientX, y: event.clientY });
    focusEnemy(null);
  }, []);
  const enemy = focusedEnemyIn(enemies, focused);
  useEscapeKey(enemy !== null, close);
  if (enemy === null) return null;
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return null;

  const snapshot = battleSnapshot(useBattleStore.getState());
  const mitigation = mitigationOf(snapshot, enemy);
  const sealed = coreLocked(snapshot, enemy);
  const partsToBreak = Math.max(
    0,
    aliveCoreParts(enemy) - (def.coreLockAt ?? 0),
  );
  const openUntil = enemy.coreOpenUntilTurn ?? 0;
  const heldOpenByWindow =
    def.shell === true && partsToBreak > 0 && snapshot.turn <= openUntil;
  const readout = echoReadsIntents(snapshot.echo)
    ? echoReadoutFor(def, enemy, snapshot.ascension)
    : null;

  return (
    <div className={styles.sheet} data-enemy-detail={enemy.id}>
      <div className={styles.sheetHead}>
        <span className={styles.sheetName}>{t(def.name)}</span>
        <button
          type="button"
          className={styles.sheetClose}
          data-testid="enemy-detail-close"
          onClick={close}
        >
          {t('battle:close')}
        </button>
      </div>
      <div className={styles.sheetRow}>
        <span>{t('battle:hp', { hp: enemy.hp, max: enemy.hpMax })}</span>
        {enemy.shield > 0 ? (
          <span style={{ color: schools.blue.text }}>
            {t('battle:shield', { n: enemy.shield })}
          </span>
        ) : null}
        {(enemy.gate ?? 0) > 0 ? (
          <span>{t('battle:enemyGate', { n: enemy.gate })}</span>
        ) : null}
        {(enemy.rage ?? 0) > 0 ? (
          <span>{t('battle:enemyRage', { n: enemy.rage })}</span>
        ) : null}
        {enemy.ward !== undefined ? (
          <span>
            {t('battle:enemyWard', { school: t(`battle:school.${enemy.ward}`) })}
          </span>
        ) : null}
        {(enemy.statuses.mark ?? 0) > 0 ? (
          <span>{t('battle:enemyVulnerable', { n: enemy.statuses.mark })}</span>
        ) : null}
      </div>
      <div className={styles.sheetIntent}>
        {intentLabel(t, enemy.nextIntent)}
      </div>
      <div className={styles.sheetWhy} data-intent-why={enemy.nextIntent.t}>
        {intentExplain(t, enemy.nextIntent)}
      </div>
      {readout === null ? null : (
        <div className={styles.sheetWhy} data-echo-readout={readout.kind}>
          {`${t('battle:echo.after')} — ${
            readout.kind === 'fork'
              ? t('battle:echo.fork', {
                  cond: t(readout.fork.cond, readout.fork.values),
                  then: intentLabel(t, readout.fork.then),
                  else: intentLabel(t, readout.fork.else),
                })
              : readout.kind === 'fixed'
                ? t('battle:echo.fixed', {
                    intent: intentLabel(t, readout.intent),
                  })
                : t('battle:echo.open')
          }`}
        </div>
      )}
      <div className={styles.sheetMath} data-enemy-math>
        {mitigation.raw === 0
          ? t('battle:mitigationNone')
          : t('battle:mitigation', {
              raw: mitigation.raw,
              expected: mitigation.expected,
              shield: mitigation.shield,
              hull: mitigation.hull,
            })}
      </div>
      {STATUS_KEYS.some((key) => (enemy.statuses[key] ?? 0) > 0) ? (
        <div className={styles.sheetStatuses} data-enemy-statuses>
          <span className={styles.sheetLabel}>{t('battle:statusLegend')}</span>
          {STATUS_KEYS.filter((key) => (enemy.statuses[key] ?? 0) > 0).map(
            (key) => (
              <span
                key={key}
                className={styles.statusRow}
                data-enemy-status={key}
              >
                <span className={styles.statusGlyph}>
                  {t(`battle:status.${key}`)}
                </span>
                <span className={styles.statusName}>
                  {t('battle:statusPair', {
                    name: t(`battle:statusName.${key}`),
                    n: enemy.statuses[key] ?? 0,
                  })}
                </span>
                <span className={styles.statusDesc}>
                  {t(`battle:statusDesc.${key}`)}
                </span>
              </span>
            ),
          )}
        </div>
      ) : null}
      <div className={styles.sheetTargets}>
        <button
          type="button"
          disabled={sealed}
          className={`${styles.targetRow ?? ''} ${
            targetId === enemy.id ? styles.targetRowOn ?? '' : ''
          } ${sealed ? styles.targetRowSealed ?? '' : ''}`}
          data-testid={`target-${enemy.id}`}
          data-core-sealed={sealed ? '1' : undefined}
          onClick={(event) => {
            setTarget(enemy.id);
            closeFromTap(event);
          }}
        >
          <span>{sealed ? t('battle:coreSealed') : t('battle:targetBody')}</span>
          {sealed ? (
            <span className={styles.subAura} data-core-why>
              {t('battle:coreSealedWhy', { n: partsToBreak })}
            </span>
          ) : null}
          {heldOpenByWindow ? (
            <span className={styles.subAura} data-core-why>
              {t('battle:coreOpenWhy', { n: openUntil })}
            </span>
          ) : null}
        </button>
        {enemy.subsystems.map((sub) => {
          const subDef = partDefOf(def, sub);
          return (
            <button
              key={sub.id}
              type="button"
              disabled={sub.hp <= 0}
              className={`${styles.targetRow ?? ''} ${
                targetId === sub.id ? styles.targetRowOn ?? '' : ''
              }`}
              data-testid={`target-${sub.id}`}
              onClick={(event) => {
                setTarget(sub.id);
                closeFromTap(event);
              }}
            >
              <span>
                {t('battle:targetSub', {
                  name: subDef === undefined ? sub.key : t(subDef.name),
                  hp: sub.hp,
                  max: sub.hpMax,
                })}
              </span>
              {subDef?.aura === undefined ? null : (
                <span className={styles.subAura} data-sub-aura={subDef.aura}>
                  {auraExplain(t, subDef.aura)}
                </span>
              )}
              {sub.nextIntent === undefined || sub.hp <= 0 ? null : (
                <span
                  className={styles.subAura}
                  data-sub-intent={sub.nextIntent.t}
                >
                  {intentExplain(t, sub.nextIntent)}
                </span>
              )}
              {subDef?.onDeath === undefined ? null : (
                <span
                  className={styles.subAura}
                  data-sub-death={subDef.onDeath.t}
                >
                  {partDeathExplain(t, subDef.onDeath)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
