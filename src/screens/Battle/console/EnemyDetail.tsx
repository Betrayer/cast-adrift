import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMY_BY_ID } from '@/data/enemies';
import { schools } from '@/data/schools';
import { intentHits } from '@/game/battle/resolver';
import { expectedHit } from '@/game/battle/view';
import { focusEnemy, focusedEnemy, subscribeEnemyFocus } from '@/pixi/battle/enemyFocus';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import { intentLabel } from './intentLabel';
import styles from './Console.module.css';

const useFocusedEnemy = (): string | null =>
  useSyncExternalStore(subscribeEnemyFocus, focusedEnemy, focusedEnemy);

export const EnemyDetail = () => {
  const { t } = useTranslation(['battle', 'content']);
  const focused = useFocusedEnemy();
  const enemies = useBattleStore((s) => s.enemies);
  const targetId = useBattleStore((s) => s.targetId);
  const shield = useBattleStore((s) => s.shield);
  const setTarget = useBattleStore((s) => s.setTarget);
  const enemy = enemies.find((e) => e.id === focused);
  if (focused === null || enemy === undefined) return null;
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return null;

  const snapshot = battleSnapshot(useBattleStore.getState());
  const raw = intentHits(snapshot, enemy, enemy.nextIntent);
  const expected = raw.reduce(
    (sum, hit) => sum + expectedHit(hit, snapshot.evasion),
    0,
  );
  const absorbed = Math.min(shield, expected);
  const close = (): void => {
    focusEnemy(null);
  };

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
      <div className={styles.sheetMath} data-enemy-math>
        {raw.length === 0
          ? t('battle:mitigationNone')
          : t('battle:mitigation', {
              raw: raw.reduce((sum, hit) => sum + hit, 0),
              expected: Math.round(expected),
              shield: Math.round(absorbed),
              hull: Math.round(expected - absorbed),
            })}
      </div>
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
              {t('battle:targetSub', {
                name: subDef === undefined ? sub.key : t(subDef.name),
                hp: sub.hp,
                max: sub.hpMax,
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
};
