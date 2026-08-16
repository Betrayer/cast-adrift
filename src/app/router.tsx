import { Box } from '@mantine/core';
import { lazy, Suspense, type ReactElement } from 'react';
import { tokens } from '@/app/theme';
import { CollectionScreen } from '@/screens/Collection/CollectionScreen';
import { ContractsScreen } from '@/screens/Contracts/ContractsScreen';
import { EngravingScreen } from '@/screens/Engraving/EngravingScreen';
import { LeaderboardScreen } from '@/screens/Leaderboard/LeaderboardScreen';
import { ModesScreen } from '@/screens/Modes/ModesScreen';
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

export const Router = () => {
  const screen = useAppStore((s) => s.screen);
  return (
    <div key={screen} className={styles.screen}>
      <Suspense fallback={<Box mih="var(--ca-vh)" bg={tokens.bg} />}>
        {SCREENS[screen]()}
      </Suspense>
    </div>
  );
};
