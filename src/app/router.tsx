import { StubScreen } from '@/components/StubScreen';
import { BattleScreen } from '@/screens/Battle/BattleScreen';
import { MenuScreen } from '@/screens/Menu/MenuScreen';
import { SettingsScreen } from '@/screens/Settings/SettingsScreen';
import { useAppStore } from '@/stores/appStore';

export const Router = () => {
  const screen = useAppStore((s) => s.screen);
  if (screen === 'menu') return <MenuScreen />;
  if (screen === 'settings') return <SettingsScreen />;
  if (screen === 'battle') return <BattleScreen />;
  return <StubScreen screen={screen} />;
};
