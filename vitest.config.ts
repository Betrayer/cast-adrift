import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    // CI runs on a 2-vCPU shared runner, where the solver and draft tests lose
    // several seconds to contention that they never lose on a dev box. The cap
    // is insurance against that cliff, not permission to write slow tests: the
    // slowest test in the suite sits an order of magnitude under it.
    testTimeout: 15_000,
  },
});
