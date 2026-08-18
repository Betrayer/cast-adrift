import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

const VENDOR_CHUNKS: Record<string, readonly string[]> = {
  'vendor-firebase': ['/node_modules/firebase/', '/node_modules/@firebase/'],
  'vendor-howler': ['/node_modules/howler/'],
  'vendor-tma': ['/node_modules/@tma.js/'],
  'vendor-react': [
    '/node_modules/react/',
    '/node_modules/react-dom/',
    '/node_modules/scheduler/',
  ],
  'vendor-mantine': ['/node_modules/@mantine/'],
};

const E2E_MODES: readonly string[] = ['e2e', 'e2e-emu'];

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    'import.meta.env.VITE_E2E': JSON.stringify(
      E2E_MODES.includes(mode) ? '1' : '0',
    ),
    'import.meta.env.VITE_FB_EMULATOR': JSON.stringify(
      mode === 'e2e-emu' ? '1' : '0',
    ),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: E2E_MODES.includes(mode) ? 'dist-e2e' : 'dist',
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const path = id.replace(/\\/g, '/');
          if (path.includes('vite/preload-helper')) return 'vendor-runtime';
          if (path.includes('vite/modulepreload-polyfill'))
            return 'vendor-runtime';
          for (const [chunk, patterns] of Object.entries(VENDOR_CHUNKS)) {
            if (patterns.some((pattern) => path.includes(pattern))) return chunk;
          }
          return undefined;
        },
      },
    },
  },
}));
