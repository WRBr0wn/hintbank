import { DurableObject } from 'cloudflare:workers'
import type { Env } from './env'

// A per-key fixed-window counter, addressed by name (an IP plus a scope like
// "create:" or "join:"). Cheap and self-contained, the counter-Durable-Object
// option from the plan rather than the rate-limiting binding, so nothing here
// depends on binding terms. Single-threaded per key, so the read-modify-write
// needs no locking.
export class RateLimiterDurableObject extends DurableObject<Env> {
  // Records one hit and reports whether the caller is still within limit for
  // the current window. The window rolls forward lazily on the first hit after
  // it lapses.
  async hit(limit: number, windowMs: number): Promise<boolean> {
    const now = Date.now()
    let window = await this.ctx.storage.get<{ count: number; reset: number }>('w')
    if (!window || now >= window.reset) {
      window = { count: 0, reset: now + windowMs }
    }
    window.count += 1
    await this.ctx.storage.put('w', window)
    return window.count <= limit
  }
}
