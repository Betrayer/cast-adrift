import { Button, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { AppSheet } from '@/components/AppModal';
import {
  echoBranchViews,
  echoCountLine,
  echoLockLine,
  type EchoNodeView,
} from '@/components/echoCoreView';
import { memoryFragmentCount } from '@/data/narrative/memories';
import { playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { useMetaStore } from '@/stores/metaStore';
import styles from './EchoCore.module.css';

const NodeCard = ({
  node,
  onEquip,
}: {
  node: EchoNodeView;
  onEquip: () => void;
}) => {
  const { t } = useTranslation(['run', 'content']);
  const lock = echoLockLine(node.def);
  return (
    <button
      type="button"
      className={`${styles.node ?? ''} ${
        node.equipped ? styles.nodeOn ?? '' : ''
      } ${node.unlocked ? '' : styles.nodeOff ?? ''}`}
      data-echo-node={node.def.id}
      data-echo-state={
        node.equipped ? 'equipped' : node.unlocked ? 'open' : 'locked'
      }
      aria-disabled={!node.unlocked}
      onClick={() => {
        if (!node.unlocked) return;
        onEquip();
      }}
    >
      <span className={styles.nodeHead}>
        <span className={styles.nodeName}>{t(node.def.name)}</span>
        <span className={styles.nodeTier}>
          {t('run:echo.tier', { n: node.def.threshold })}
        </span>
      </span>
      {node.unlocked ? (
        <span className={styles.nodeBody}>{t(node.def.desc, node.vars)}</span>
      ) : (
        <>
          <span className={styles.nodeBody}>{t(node.def.short, node.vars)}</span>
          <span className={styles.nodeLock} data-echo-lock={node.def.id}>
            {t(lock.key, lock.values)}
          </span>
        </>
      )}
      {node.equipped ? (
        <span className={styles.nodeMark} data-echo-equipped={node.def.id}>
          {t('run:echo.equipped')}
        </span>
      ) : null}
    </button>
  );
};

export const EchoCore = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation(['run', 'content']);
  const selected = useMetaStore((s) => s.selectedEcho);
  const codex = useMetaStore((s) => s.codex);
  const selectEcho = useMetaStore((s) => s.selectEcho);
  const fragments = memoryFragmentCount(codex);
  const branches = echoBranchViews(fragments, selected);
  const count = echoCountLine(fragments);

  return (
    <AppSheet
      label={t('run:echo.title')}
      testId="echo-core"
      onClose={onClose}
    >
      <div className={styles.head}>
        <Text fw={700} c={tokens.text}>
          {t('run:echo.title')}
        </Text>
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          data-testid="echo-close"
          onClick={onClose}
        >
          {t('run:echo.close')}
        </Button>
      </div>
      <div className={styles.body}>
        <div className={styles.core} data-echo-count={fragments}>
          <Text size="sm" fw={700} c={tokens.accent}>
            {t(count.key, count.values)}
          </Text>
          <Text size="xs" c={tokens.faint}>
            {t('run:echo.rule')}
          </Text>
        </div>
        <button
          type="button"
          className={`${styles.node ?? ''} ${
            selected === null ? styles.nodeOn ?? '' : ''
          }`}
          data-echo-node="none"
          data-echo-state={selected === null ? 'equipped' : 'open'}
          onClick={() => {
            playSfx('nudge', { rate: 0.9 });
            selectEcho(null);
          }}
        >
          <span className={styles.nodeHead}>
            <span className={styles.nodeName}>{t('run:echo.none')}</span>
          </span>
          <span className={styles.nodeBody}>{t('run:echo.noneBody')}</span>
        </button>
        <div className={styles.branches}>
          {branches.map((branch) => (
            <div
              key={branch.branch}
              className={styles.branch}
              data-echo-branch={branch.branch}
            >
              <span className={styles.branchName}>{t(branch.name)}</span>
              {branch.nodes.map((node) => (
                <NodeCard
                  key={node.def.id}
                  node={node}
                  onEquip={() => {
                    playSfx('place');
                    haptic('place');
                    selectEcho(node.def.id);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </AppSheet>
  );
};
