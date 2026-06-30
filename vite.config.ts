import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hintbank/',
  build: {
    // Static pages, one input each: the game, the randomizer edition selector, and
    // each edition's own randomizer. A new edition adds one HTML file plus one line
    // here. Paths are relative to the project root, so no node imports are needed.
    rollupOptions: {
      input: {
        main: 'index.html',
        randomizer: 'randomizer/index.html',
        'pokemon-randomizer': 'pokemon-edition/randomizer/index.html',
      },
    },
  },
  test: {
    environment: 'node',
  },
})
