import { defineConfig } from 'vitest/config'

// The client suite. Scoped to src/ so the worker tests under server/ (which
// need the Cloudflare workerd runtime via their own project, server/vitest.
// config.ts) are not picked up here. `npx vitest run` stays the pure,
// runtime-free client suite.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
