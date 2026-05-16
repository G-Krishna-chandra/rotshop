import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { config } from '../config.js';
import * as schema from './schema.js';

const sqlite = new Database(config.databaseUrl);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema, sqlite };

// Bootstrap the schema for fresh databases. Drizzle-kit's generate/push is the
// authoritative migration path; this is a safety net so the app boots cleanly
// against an empty file without requiring a separate setup step in dev.
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      github_url TEXT NOT NULL,
      submitter_email TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      category TEXT,
      tech_stack TEXT,
      input_contract TEXT,
      output_contract TEXT,
      pricing_model TEXT,
      price INTEGER,
      status TEXT NOT NULL DEFAULT 'pending_sandbox_test',
      complexity TEXT,
      repo_path TEXT,
      docker_image TEXT,
      test_results TEXT,
      sandbox_logs TEXT,
      rejection_reason TEXT,
      rating REAL,
      integration_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key_hash TEXT NOT NULL UNIQUE,
      key_prefix TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      api_key_id TEXT REFERENCES api_keys(id),
      module_id TEXT REFERENCES modules(id),
      action TEXT,
      status_code INTEGER,
      response_time_ms INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      module_id TEXT REFERENCES modules(id),
      reviewer_email TEXT,
      decision TEXT,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS customer_reviews (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES modules(id),
      customer_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
    CREATE INDEX IF NOT EXISTS idx_modules_category ON modules(category);
    CREATE INDEX IF NOT EXISTS idx_modules_submitter ON modules(submitter_email);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_api_key ON usage_logs(api_key_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_customer_reviews_module ON customer_reviews(module_id);
  `);
}
