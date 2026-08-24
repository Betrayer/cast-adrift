import { Box } from '@mantine/core';
import { lazy, Suspense, type ReactElement } from 'react';
import { tokens } from '@/app/theme';
import { CollectionScreen } from '@/screens/Collection/CollectionScreen';
import { ContractsScreen } from '@/screens/Contracts/ContractsScreen';
import { EngravingScreen } from '@/screens/Engraving/EngravingScreen';
import { LeaderboardScreen } from '@/screens/Leaderboard/LeaderboardScreen';
import { ModesScreen } from '@/screens/Modes/ModesScreen';
import { AchievementsScreen } from '@/screens/Achievements/AchievementsScreen';
import { ProfileScreen } from '@/screens/Profile/ProfileScreen';
import { EventScreen } from '@/screens/Event/EventScreen';
import { HangarScreen } from '@/screens/Hangar/HangarScreen';
import { MapScreen } from '@/screens/Map/MapScreen';
import { MenuScreen } from '@/screens/Menu/MenuScreen';
import { RewardsScreen } from '@/screens/Rewards/RewardsScreen';
import { RunSetupScreen } from '@/screens/RunSetup/RunSetupScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { ShipyardScreen } from '@/screens/Shipyard/ShipyardScreen';
import { ShopScreen } from '@/screens/Shop/ShopScreen';
import { KEEP_ALIVE_SCREENS, navAttrFor } from '@/app/routes';
import { useAppStore } from '@/stores/appStore';
import type { ScreenId } from '@/types';
import styles from './Router.module.css';

const BattleScreen = lazy(() =>
  import('@/screens/Battle/BattleScreen').then((m) => ({
    default: m.BattleScreen,
  })),
);
const ChartScreen = lazy(() =>
  import('@/screens/Chart/ChartScreen').then((m) => ({
    default: m.ChartScreen,
  })),
);
const CodexScreen = lazy(() =>
  import('@/screens/Codex/CodexScreen').then((m) => ({
    default: m.CodexScreen,
  })),
);
const PuzzleScreen = lazy(() =>
  import('@/screens/Puzzle/PuzzleScreen').then((m) => ({
    default: m.PuzzleScreen,
  })),
);
const SummaryScreen = lazy(() =>
  import('@/screens/Summary/SummaryScreen').then((m) => ({
    default: m.SummaryScreen,
  })),
);
const DriftSummaryScreen = lazy(() =>
  import('@/screens/Summary/DriftSummaryScreen').then((m) => ({
    default: m.DriftSummaryScreen,
  })),
);
const PrologueScreen = lazy(() =>
  import('@/screens/Prologue/PrologueScreen').then((m) => ({
    default: m.PrologueScreen,
  })),
);
const InterstitialScreen = lazy(() =>
  import('@/screens/Interstitial/InterstitialScreen').then((m) => ({
    default: m.InterstitialScreen,
  })),
);
const FinaleScreen = lazy(() =>
  import('@/screens/Finale/FinaleScreen').then((m) => ({
    default: m.FinaleScreen,
  })),
);
const JournalScreen = lazy(() =>
  import('@/screens/Journal/JournalScreen').then((m) => ({
    default: m.JournalScreen,
  })),
);
const EndingScreen = lazy(() =>
  import('@/screens/Ending/EndingScreen').then((m) => ({
    default: m.EndingScreen,
  })),
);

const SCREENS: Record<ScreenId, () => ReactElement> = {
  menu: () => <MenuScreen />,
  settings: () => <SettingsScreen />,
  battle: () => <BattleScreen />,
  map: () => <MapScreen />,
  event: () => <EventScreen />,
  journal: () => <JournalScreen />,
  puzzle: () => <PuzzleScreen />,
  shop: () => <ShopScreen />,
  shipyard: () => <ShipyardScreen />,
  rewards: () => <RewardsScreen />,
  summary: () => <SummaryScreen />,
  driftSummary: () => <DriftSummaryScreen />,
  modes: () => <ModesScreen />,
  contracts: () => <ContractsScreen />,
  leaderboard: () => <LeaderboardScreen />,
  profile: () => <ProfileScreen />,
  achievements: () => <AchievementsScreen />,
  codex: () => <CodexScreen />,
  chart: () => <ChartScreen />,
  hangar: () => <HangarScreen />,
  collection: () => <CollectionScreen />,
  engraving: () => <EngravingScreen />,
  runSetup: () => <RunSetupScreen />,
  prologue: () => <PrologueScreen />,
  interstitial: () => <InterstitialScreen />,
  finale: () => <FinaleScreen />,
  ending: () => <EndingScreen />,
};

const visitedKeepAlive = new Set<ScreenId>();

export const forgetParkedScreens = (): void => {
  visitedKeepAlive.clear();
};

const Fallback = () => <Box mih="var(--ca-vh)" bg={tokens.bg} />;

export const Router = () => {
  const screen = useAppStore((s) => s.screen);
  const navDir = useAppStore((s) => s.navDir);
  const enterDir = navAttrFor(screen, navDir);
  const kept = KEEP_ALIVE_SCREENS.includes(screen);
  if (kept) visitedKeepAlive.add(screen);
  const alive = KEEP_ALIVE_SCREENS.filter((id) => visitedKeepAlive.has(id));

  return (
    <>
      {kept ? null : (
        <div
          key={screen}
          className={styles.screen}
          data-screen={screen}
          data-nav-dir={enterDir}
        >
          <Suspense fallback={<Fallback />}>{SCREENS[screen]()}</Suspense>
        </div>
      )}
      {alive.map((id) =>
        id === screen ? (
          <div
            key={id}
            className={styles.screen}
            data-screen={id}
            data-nav-dir={enterDir}
          >
            <Suspense fallback={<Fallback />}>{SCREENS[id]()}</Suspense>
          </div>
        ) : (
          <div key={id} className={styles.parked} data-parked-screen={id}>
            <Suspense fallback={null}>{SCREENS[id]()}</Suspense>
          </div>
        ),
      )}
    </>
  );
};
