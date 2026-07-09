import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

// Worker integration tests run in a real workerd runtime with the room and
// rate-limiter Durable Objects from wrangler.toml. Kept in its own project so
// the client suite (npx vitest run, scoped to src/) is untouched; run this with
// `npm run test:worker`.
export default defineWorkersConfig({
  test: {
    include: ['server/**/*.test.ts'],
    // Isolated storage is off: on Windows an armed Durable Object alarm holds
    // the object's SQLite file open, and the per-test unlink then fails with
    // EBUSY. Tests stay independent without it because each room gets a random
    // code and each test uses its own client IP for the rate-limit keys.
    poolOptions: {
      workers: {
        singleWorker: true,
        isolatedStorage: false,
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
})
