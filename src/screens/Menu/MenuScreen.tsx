import {
  Badge,
  Button,
  Group,
  Paper,
  RingProgress,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { devDebug } from '@/app/debug';
import { Screen } from '@/app/Screen';
import { riseStyle } from '@/app/motion';
import { tokens } from '@/app/theme';
import { unseenAchievementIds } from '@/game/meta/achievements';
import { unreadMemoryIds } from '@/game/narrative/memoryArc';
import { progressWithinLevel } from '@/game/xp';
import { useMetaStore } from '@/stores/metaStore';
import { dismissCloudRun, restoreCloudRun } from '@/game/run/cloud';
import { readLocalResume, resumeLocalRun } from '@/game/run/resume';
import { MenuBadge, menuBadgeId } from '@/screens/Profile/BadgeRow';
import { ResumeCard } from '@/screens/Menu/ResumeCard';
import { haptic } from '@/services/tma';
import { APP_VERSION } from '@/services/version';
import { useAppStore } from '@/stores/appStore';
import { useReducedMotion } from '@/stores/settingsStore';
import type { ScreenId } from '@/types';
import styles from './MenuScreen.module.css';

const ASCENDANT_BADGE = 'ascendant';

const MenuBackground = lazy(() =>
  import('@/screens/Menu/MenuBackground').then((m) => ({
    default: m.MenuBackground,
  })),
);

interface MenuEntry {
  key: string;
  screen: ScreenId;
  action?: 'startCampaign';
}

const ENTRIES: readonly MenuEntry[] = [
  { key: 'newRun', screen: 'runSetup', action: 'startCampaign' },
  { key: 'modes', screen: 'modes' },
  { key: 'hangar', screen: 'hangar' },
  { key: 'starChart', screen: 'chart' },
  { key: 'collection', screen: 'collection' },
  { key: 'codex', screen: 'codex' },
  { key: 'profile', screen: 'profile' },
  { key: 'achievements', screen: 'achievements' },
  { key: 'settings', screen: 'settings' },
];

const DEV_ENTRIES: readonly MenuEntry[] = [
  { key: 'testBattle', screen: 'battle' },
];

let titleSettled = false;

const titleSettlePending = (): boolean => !titleSettled;

const markTitleSettled = (): void => {
  titleSettled = true;
};

export const MenuScreen = () => {
  const { t } = useTranslation(['common', 'menu', 'meta']);
  const go = useAppStore((s) => s.go);
  const level = useMetaStore((s) => s.level);
  const xp = useMetaStore((s) => s.xp);
  const progress = progressWithinLevel(xp);
  const cloudResume = useAppStore((s) => s.cloudResume);
  const prologueDone = useMetaStore((s) => s.stats.prologueDone);
  const codex = useMetaStore((s) => s.codex);
  const codexRead = useMetaStore((s) => s.codexRead);
  const badges = useMetaStore((s) => s.badges);
  const achievements = useMetaStore((s) => s.achievements);
  const achievementsSeen = useMetaStore((s) => s.achievementsSeen);
  const unseenAchievements = unseenAchievementIds(
    achievements,
    achievementsSeen,
  ).length;
  const topBadge = menuBadgeId(badges);
  const unreadMemories = unreadMemoryIds(codex, codexRead).length;
  const [localResume] = useState(readLocalResume);
  const [entries] = useState<readonly MenuEntry[]>(() =>
    devDebug() ? [...ENTRIES, ...DEV_ENTRIES] : ENTRIES,
  );
  const reducedMotion = useReducedMotion();
  const [settleTitle] = useState(titleSettlePending);

  useEffect(() => {
    markTitleSettled();
  }, []);

  const onSelect = useCallback(
    (entry: MenuEntry) => () => {
      if (entry.action === 'startCampaign') {
        go(prologueDone ? 'runSetup' : 'prologue');
        return;
      }
      go(entry.screen);
    },
    [go, prologueDone],
  );

  return (
    <Screen
      width="full"
      centered
      background={
        <Suspense fallback={null}>
          <MenuBackground reducedMotion={reducedMotion} />
        </Suspense>
      }
      overlay={
        <UnstyledButton
          className={styles.levelBadge}
          data-press
          onClick={() => {
            haptic(topBadge === ASCENDANT_BADGE ? 'levelUp' : 'place');
            go('chart');
          }}
          aria-label={t('meta:menu.level', { level })}
          style={{ position: 'relative' }}
        >
          <RingProgress
            size={56}
            thickness={4}
            roundCaps
            sections={[{ value: progress.pct * 100, color: 'accent' }]}
            label={
              <Text ta="center" size="xs" c={tokens.text} fw={700}>
                {level}
              </Text>
            }
          />
          {topBadge === null ? null : <MenuBadge id={topBadge} />}
        </UnstyledButton>
      }
    >
      <div className={styles.hero}>
        <div className={styles.title}>
          <Title
            order={1}
            c={tokens.text}
            className={styles.titleText}
            data-menu-title={settleTitle ? 'settle' : 'still'}
          >
            {t('common:appName')}
          </Title>
          <Text c={tokens.dim} size="sm">
            {t('menu:tagline')}
          </Text>
          <Text c={tokens.faint} size="xs" data-menu-version>
            {t('menu:version', { version: APP_VERSION })}
          </Text>
        </div>
        <div className={styles.actions}>
          {cloudResume ? (
            <Paper bg={tokens.surface1} p="sm" radius="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c={tokens.text}>
                  {t('menu:cloudFound')}
                </Text>
                <Group gap="xs" grow>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!restoreCloudRun()) resumeLocalRun();
                    }}
                  >
                    {t('menu:cloudYes')}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      dismissCloudRun();
                      if (localResume !== null) resumeLocalRun();
                    }}
                  >
                    {t('menu:cloudNo')}
                  </Button>
                </Group>
              </Stack>
            </Paper>
          ) : localResume !== null ? (
            <ResumeCard resume={localResume} />
          ) : null}
          {entries.map((entry, index) => (
            <Button
              key={entry.key}
              size="md"
              variant="filled"
              data-testid={`menu-${entry.key}`}
              data-rise
              style={riseStyle(index)}
              onClick={onSelect(entry)}
              rightSection={
                entry.key === 'codex' && unreadMemories > 0 ? (
                  <Badge size="sm" color="accent" data-unread-memories>
                    {unreadMemories}
                  </Badge>
                ) : entry.key === 'achievements' && unseenAchievements > 0 ? (
                  <Badge size="sm" color="yellow" data-unseen-achievements>
                    {unseenAchievements}
                  </Badge>
                ) : undefined
              }
            >
              {t(`menu:${entry.key}`)}
            </Button>
          ))}
        </div>
      </div>
    </Screen>
  );
};
