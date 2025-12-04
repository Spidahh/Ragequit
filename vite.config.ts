import { defineConfig } from 'vite'

// https://vitejs.dev/config/
// RageQuit - Project Phoenix (Vanilla JS + Three.js)
export default defineConfig({
  plugins: [],
  build: {
    target: 'esnext'
  },
  define: {
    // Make environment variables available to the client
    'import.meta.env.VITE_SERVER_URL': JSON.stringify(process.env.VITE_SERVER_URL || 'http://localhost:3000')
  }
})
