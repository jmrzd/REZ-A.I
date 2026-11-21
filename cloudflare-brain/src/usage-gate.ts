/**
 * Single global SQLite-backed Durable Object. Synchronous SQLite transactions
 * prevent lost updates when requests arrive concurrently.
 *
 * This is a REQUEST limit (not actual Neurons metering). Cloudflare's own
 * 10k-Neurons free-tier limit still applies independently.
 */
import { DurableObject } from 'cloudflare:workers';
import type { BrainEnv, QuotaOutcome } from './service';

const GLOBAL_DAILY = 60;
const GLOBAL_PER_MINUTE = 10;
const VISITOR_DAILY = 12;
const VISITOR_PER_MINUTE = 3;

export class UsageGate extends DurableObject<BrainEnv> {
  constructor(ctx: DurableObjectState, env: BrainEnv) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS counts (key TEXT PRIMARY KEY, hits INTEGER NOT NULL)'
    );
  }

  async reserve(visitor: string): Promise<QuotaOutcome> {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const minute = now.toISOString().slice(0, 16);
    const fingerprint = /^[a-f0-9]{64}$/.test(visitor) ? visitor : 'unknown';
    const counters = [
      { key: 'day:global:' + day, limit: GLOBAL_DAILY, reason: 'day' },
      { key: 'minute:global:' + minute, limit: GLOBAL_PER_MINUTE, reason: 'minute' },
      { key: 'day:visitor:' + day + ':' + fingerprint, limit: VISITOR_DAILY, reason: 'visitor-day' },
      { key: 'minute:visitor:' + minute + ':' + fingerprint, limit: VISITOR_PER_MINUTE, reason: 'visitor-minute' },
    ] as const;

    return this.ctx.storage.transactionSync(() => {
      for (const item of counters) {
        const value = this.ctx.storage.sql.exec<{ hits: number }>(
          'SELECT hits FROM counts WHERE key = ?1', item.key
        ).toArray()[0]?.hits ?? 0;
        if (value >= item.limit) return { allowed: false, reason: item.reason };
      }
      for (const item of counters) {
        this.ctx.storage.sql.exec(
          'INSERT INTO counts (key, hits) VALUES (?1, 1) ON CONFLICT(key) DO UPDATE SET hits = hits + 1',
          item.key,
        );
      }
      // Reduce persistent rows without changing today's or this minute's usage.
      // Roughly once per minute; deleting an older bucket is harmless.
      if (Math.random() < 0.015) {
        const older = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
        this.ctx.storage.sql.exec('DELETE FROM counts WHERE key LIKE ?1', 'day:%:' + older + '%');
      }
      return { allowed: true };
    });
  }
}
