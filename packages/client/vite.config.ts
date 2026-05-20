import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: '../../apps/web/dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: true,
    // Bundle size budget — warn when game code chunk exceeds 250 kB raw
    // or any vendor chunk exceeds 550 kB raw. Three.js alone is ~490 kB.
    chunkSizeWarningLimit: 550,
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
