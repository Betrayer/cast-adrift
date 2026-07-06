import { MantineProvider } from '@mantine/core';
import { Router } from '@/app/router';
import { theme } from '@/app/theme';
import { DevOverlay } from '@/components/DevOverlay';
import { DevPanel } from '@/components/DevPanel';
import { NarrativeToasts } from '@/components/NarrativeToasts';

export const App = () => (
  <MantineProvider theme={theme} forceColorScheme="dark">
    <Router />
    <NarrativeToasts />
    <DevOverlay />
    <DevPanel />
  </MantineProvider>
);
