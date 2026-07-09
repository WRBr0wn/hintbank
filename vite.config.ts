import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hintbank/',
  server: {
    // Same-origin path to the local worker (`wrangler dev`, port 8787) so the
    // multiplayer client reaches it without CORS in dev. Production points at
    // the worker's own origin via VITE_ROOMS_URL instead. ws:true proxies the
    // room WebSocket upgrade too.
    proxy: {
      '/rooms': { target: 'http://localhost:8787', ws: true },
    },
  },
  build: {
    // Hand-declared, one input per static page; a new edition adds one HTML file
    // plus one line here. Paths are relative to the project root, so no node
    // imports are needed.
    rollupOptions: {
      input: {
        menu: 'index.html',
        'pokemon-game': 'pokemon-edition/index.html',
        'geography-game': 'geography-edition/index.html',
        randomizer: 'randomizer/index.html',
        'pokemon-randomizer': 'pokemon-edition/randomizer/index.html',
        'geography-randomizer': 'geography-edition/randomizer/index.html',
      },
    },
  },
  test: {
    environment: 'node',
  },
})
