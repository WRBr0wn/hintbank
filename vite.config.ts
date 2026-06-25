import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/hintbank/',
  build: {
    // Two static pages: the game and the standalone randomizer tool. Declaring
    // both as inputs makes Vite emit dist/index.html and dist/randomizer/index.html.
    // Paths are relative to the project root, so no node imports are needed here.
    rollupOptions: {
      input: {
        main: 'index.html',
        randomizer: 'randomizer/index.html',
      },
    },
  },
  test: {
    environment: 'node',
  },
})
