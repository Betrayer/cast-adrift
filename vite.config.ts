import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

// Everything the menu does not need on the first frame is its own chunk. Pixi
// and Matter must never appear in the initial graph: the map screen prefetches
// the battle chunk while the player is picking a node (DESIGN §17).
// Pixi and Matter are deliberately absent: they are only reachable through the
// lazy battle and menu-background chunks, and naming them here would create a
// chunk that Vite's preload helper gets folded into, which in turn forces the
// entry to import it statically — the exact opposite of the intent.
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

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const path = id.replace(/\\/g, '/');
          // Vite's own virtual runtime modules (the preload helper and the
          // modulepreload polyfill) need an explicit home: left to the bundler
          // they land in whichever vendor chunk it picks, and the entry then
          // has to import that chunk statically — which is how Pixi ended up
          // in the initial payload.
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
});
