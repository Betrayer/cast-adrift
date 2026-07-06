import { StubScreen } from '@/components/StubScreen';
import { BattleScreen } from '@/screens/Battle/BattleScreen';
import { CodexScreen } from '@/screens/Codex/CodexScreen';
import { EventScreen } from '@/screens/Event/EventScreen';
import { MapScreen } from '@/screens/Map/MapScreen';
import { MenuScreen } from '@/screens/Menu/MenuScreen';
import { PuzzleScreen } from '@/screens/Puzzle/PuzzleScreen';
import { RewardsScreen } from '@/screens/Rewards/RewardsScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { ShipyardScreen } from '@/screens/Shipyard/ShipyardScreen';
import { ShopScreen } from '@/screens/Shop/ShopScreen';
import { SummaryScreen } from '@/screens/Summary/SummaryScreen';
import { useAppStore } from '@/stores/appStore';

export const Router = () => {
  const screen = useAppStore((s) => s.screen);
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
  if (screen === 'codex') return <CodexScreen />;
  return <StubScreen screen={screen} />;
};
