export interface RateDecision { allowed: boolean; limit: number; remaining: number; retryAfterSec: number }

export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly max: number, private readonly windowMs: number, private readonly now: () => number = Date.now) {}

  hit(key: string): RateDecision {
    const t = this.now();
    if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
    let e = this.hits.get(key);
    if (!e || e.resetAt <= t) { e = { count: 0, resetAt: t + this.windowMs }; this.hits.set(key, e); }
    e.count++;
    return {
      allowed: e.count <= this.max,
      limit: this.max,
      remaining: Math.max(0, this.max - e.count),
      retryAfterSec: Math.max(1, Math.ceil((e.resetAt - t) / 1000)),
    };
  }
}
