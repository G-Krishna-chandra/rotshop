import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ApiKeyRow } from '../db/schema.js';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const KEY_PREFIX = 'rs_key_';
const PREFIX_LEN = 12;
const CACHE_TTL_MS = 60_000;

export interface GeneratedKey {
  plaintext: string;
  prefix: string;
  hash: string;
}

export async function generateApiKey(): Promise<GeneratedKey> {
  const random = randomBytes(16).toString('hex'); // 32 hex chars
  const plaintext = `${KEY_PREFIX}${random}`;
  const prefix = plaintext.slice(0, PREFIX_LEN);
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(plaintext, salt, SCRYPT_KEYLEN);
  return { plaintext, prefix, hash: `${salt.toString('hex')}:${derived.toString('hex')}` };
}

async function verifyKey(plaintext: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = await scryptAsync(plaintext, salt, expected.length);
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// Prefix-indexed cache so we never scrypt-compare against keys that can't match.
let prefixCache: Map<string, ApiKeyRow[]> = new Map();
let cacheLoadedAt = 0;

async function ensureCache(): Promise<void> {
  if (Date.now() - cacheLoadedAt < CACHE_TTL_MS) return;
  const rows = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.isActive, true));
  const next = new Map<string, ApiKeyRow[]>();
  for (const row of rows) {
    const bucket = next.get(row.keyPrefix) ?? [];
    bucket.push(row);
    next.set(row.keyPrefix, bucket);
  }
  prefixCache = next;
  cacheLoadedAt = Date.now();
}

export function invalidateApiKeyCache(): void {
  cacheLoadedAt = 0;
}

export interface ApiKeyValidation {
  ok: boolean;
  reason?: 'not_found' | 'inactive' | 'rate_limited' | 'bad_format';
  key?: ApiKeyRow;
  usedInLastHour?: number;
}

export async function validateApiKey(plaintext: string): Promise<ApiKeyValidation> {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX) || plaintext.length < PREFIX_LEN + 8) {
    return { ok: false, reason: 'bad_format' };
  }
  const prefix = plaintext.slice(0, PREFIX_LEN);
  await ensureCache();
  const candidates = prefixCache.get(prefix) ?? [];

  for (const candidate of candidates) {
    if (!(await verifyKey(plaintext, candidate.keyHash))) continue;
    if (!candidate.isActive) return { ok: false, reason: 'inactive', key: candidate };

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const usage = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.usageLogs)
      .where(
        and(
          eq(schema.usageLogs.apiKeyId, candidate.id),
          gte(schema.usageLogs.createdAt, hourAgo),
        ),
      );
    const used = Number(usage[0]?.c ?? 0);
    if (used >= candidate.rateLimitPerHour) {
      return { ok: false, reason: 'rate_limited', key: candidate, usedInLastHour: used };
    }
    return { ok: true, key: candidate, usedInLastHour: used };
  }
  return { ok: false, reason: 'not_found' };
}
