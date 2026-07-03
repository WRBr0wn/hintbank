import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hintbank/',
  build: {
    // Hand-declared, one input per static page; a new edition adds one HTML file
    // plus one line here. Paths are relative to the project root, so no node
    // imports are needed.
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
