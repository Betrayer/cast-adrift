import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '@/components/dismiss';
import { ENEMY_BY_ID } from '@/data/enemies';
import { STATUS_KEYS } from '@/game/battle/statuses';
import { schools } from '@/data/schools';
import { mitigationOf } from '@/game/battle/view';
import { focusEnemy, focusedEnemy, subscribeEnemyFocus } from '@/pixi/battle/enemyFocus';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import { auraExplain, intentExplain } from './intentExplain';
import { intentLabel } from './intentLabel';
import styles from './Console.module.css';

const useFocusedEnemy = (): string | null =>
  useSyncExternalStore(subscribeEnemyFocus, focusedEnemy, focusedEnemy);

export const EnemyDetail = () => {
  const { t } = useTranslation(['battle', 'content']);
  const focused = useFocusedEnemy();
  const enemies = useBattleStore((s) => s.enemies);
  const targetId = useBattleStore((s) => s.targetId);
  const setTarget = useBattleStore((s) => s.setTarget);
  const close = useCallback(() => {
    focusEnemy(null);
  }, []);
  useEscapeKey(focused !== null, close);
  const enemy = enemies.find((e) => e.id === focused);
  if (focused === null || enemy === undefined) return null;
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return null;

  const snapshot = battleSnapshot(useBattleStore.getState());
  const mitigation = mitigationOf(snapshot, enemy);

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
          className={`${styles.targetRow ?? ''} ${
            targetId === enemy.id ? styles.targetRowOn ?? '' : ''
          }`}
          data-testid={`target-${enemy.id}`}
          onClick={() => {
            setTarget(enemy.id);
            close();
          }}
        >
          {t('battle:targetBody')}
        </button>
        {enemy.subsystems.map((sub) => {
          const subDef = def.subsystems?.find((s) => s.id === sub.key);
          return (
            <button
              key={sub.id}
              type="button"
              disabled={sub.hp <= 0}
              className={`${styles.targetRow ?? ''} ${
                targetId === sub.id ? styles.targetRowOn ?? '' : ''
              }`}
              data-testid={`target-${sub.id}`}
              onClick={() => {
                setTarget(sub.id);
                close();
              }}
            >
              <span>
                {t('battle:targetSub', {
                  name: subDef === undefined ? sub.key : t(subDef.name),
                  hp: sub.hp,
                  max: sub.hpMax,
                })}
              </span>
              {subDef === undefined ? null : (
                <span className={styles.subAura} data-sub-aura={subDef.aura}>
                  {auraExplain(t, subDef.aura)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
