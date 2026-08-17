import { MantineProvider } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { Router } from '@/app/router';
import {
  applyFontScale,
  applyMotion,
  applyTheme,
  mantineThemeFor,
} from '@/app/theme';
import { CoachMarks } from '@/components/CoachMarks';
import { DevOverlay } from '@/components/DevOverlay';
import { DevPanel } from '@/components/DevPanel';
import { MemoryCeremony } from '@/components/MemoryCeremony';
import { MergeCard } from '@/components/MergeCard';
import { AudioDirector } from '@/components/AudioDirector';
import { PerfOverlay } from '@/components/PerfOverlay';
import { RotateGate } from '@/components/RotateGate';
import { ToastHost } from '@/components/ToastHost';
import {
  resolveReducedMotion,
  useSettingsStore,
} from '@/stores/settingsStore';

export const App = () => {
  const themeId = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);

  const mantine = useMemo(() => mantineThemeFor(applyTheme(themeId)), [themeId]);

  useEffect(() => {
    applyFontScale(fontScale);
  }, [fontScale]);

  useEffect(() => {
    const sync = (): void => {
      applyMotion(resolveReducedMotion(reducedMotion));
    };
    sync();
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    query.addEventListener('change', sync);
    return () => {
      query.removeEventListener('change', sync);
    };
  }, [reducedMotion]);

  return (
    <MantineProvider theme={mantine} forceColorScheme="dark">
      <Router />
      <AudioDirector />
      <ToastHost />
      <MemoryCeremony />
      <MergeCard />
      <CoachMarks />
      <RotateGate />
      <DevOverlay />
      <PerfOverlay />
      <DevPanel />
    </MantineProvider>
  );
};
