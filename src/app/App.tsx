import { MantineProvider } from '@mantine/core';
import { Router } from '@/app/router';
import { theme } from '@/app/theme';

export const App = () => (
  <MantineProvider theme={theme} forceColorScheme="dark">
    <Router />
  </MantineProvider>
);
