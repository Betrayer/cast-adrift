import { Box } from '@mantine/core';
import { lazy, Suspense } from 'react';
import { tokens } from '@/app/theme';
import { StubScreen } from '@/components/StubScreen';
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

// Battle drags in Pixi and Matter, the Star Chart its own SVG engine, the Codex
// the whole lore corpus, and the ceremonies their particle work — none of it
// belongs in the chunk that has to paint the menu (DESIGN §17).
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
const EndingScreen = lazy(() =>
  import('@/screens/Ending/EndingScreen').then((m) => ({
    default: m.EndingScreen,
  })),
);

const screenFor = (screen: ScreenId) => {
  if (screen === 'menu') return <MenuScreen />;
  if (screen === 'settings') return <SettingsScreen />;
  if (screen === 'battle') return <BattleScreen />;
  if (screen === 'map') return <MapScreen />;
  if (screen === 'event') return <EventScreen />;
  if (screen === 'puzzle') return <PuzzleScreen />;
  if (screen === 'shop') return <ShopScreen />;
  if (screen === 'shipyard') return <ShipyardScreen />;
  if (screen === 'rewards') return <RewardsScreen />;
  if (screen === 'summary') return <SummaryScreen />;
  if (screen === 'driftSummary') return <DriftSummaryScreen />;
  if (screen === 'modes') return <ModesScreen />;
  if (screen === 'contracts') return <ContractsScreen />;
  if (screen === 'leaderboard') return <LeaderboardScreen />;
  if (screen === 'profile') return <ProfileScreen />;
  if (screen === 'codex') return <CodexScreen />;
  if (screen === 'chart') return <ChartScreen />;
  if (screen === 'hangar') return <HangarScreen />;
  if (screen === 'collection') return <CollectionScreen />;
  if (screen === 'engraving') return <EngravingScreen />;
  if (screen === 'runSetup') return <RunSetupScreen />;
  if (screen === 'prologue') return <PrologueScreen />;
  if (screen === 'interstitial') return <InterstitialScreen />;
  if (screen === 'finale') return <FinaleScreen />;
  if (screen === 'ending') return <EndingScreen />;
  return <StubScreen screen={screen} />;
};

// Screens crossfade on entry (DESIGN §10 transitions). The wrapper is keyed by
// screen id so React remounts it and the animation replays every navigation.
export const Router = () => {
  const screen = useAppStore((s) => s.screen);
  return (
    <div key={screen} className={styles.screen}>
      <Suspense fallback={<Box mih="var(--ca-vh)" bg={tokens.bg} />}>
        {screenFor(screen)}
      </Suspense>
    </div>
  );
};
