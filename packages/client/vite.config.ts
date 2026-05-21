import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    // Bundle size budget — keep the game chunk around 250 kB raw.
    // Three.js r180 plus addon loaders is intentionally isolated in
    // vendor-three and currently lands around 657 kB raw, so the global Vite
    // warning threshold is set above that known vendor chunk instead of
    // producing noise on every clean build.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/three/')) return 'vendor-three'
          return 'vendor'
        },
      },
    },
  },
})
