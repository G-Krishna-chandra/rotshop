import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const modules = sqliteTable('modules', {
  id: text('id').primaryKey(),
  githubUrl: text('github_url').notNull(),
  submitterEmail: text('submitter_email').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  category: text('category'),
  techStack: text('tech_stack'),       // JSON stringified array
  inputContract: text('input_contract'),
  outputContract: text('output_contract'),
  pricingModel: text('pricing_model'),
  price: integer('price'),
  status: text('status').notNull().default('pending_sandbox_test'),
  complexity: text('complexity'),
  repoPath: text('repo_path'),
  dockerImage: text('docker_image'),
  testResults: text('test_results'),   // JSON
  sandboxLogs: text('sandbox_logs'),
  rejectionReason: text('rejection_reason'),
  rating: real('rating'),
  integrationCount: integer('integration_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  keyHash: text('key_hash').notNull().unique(),
  keyPrefix: text('key_prefix').notNull(),
  customerEmail: text('customer_email').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  rateLimitPerHour: integer('rate_limit_per_hour').notNull().default(100),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const usageLogs = sqliteTable('usage_logs', {
  id: text('id').primaryKey(),
  apiKeyId: text('api_key_id').references(() => apiKeys.id),
  moduleId: text('module_id').references(() => modules.id),
  action: text('action'),
  statusCode: integer('status_code'),
  responseTimeMs: integer('response_time_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  moduleId: text('module_id').references(() => modules.id),
  reviewerEmail: text('reviewer_email'),
  decision: text('decision'),          // 'approved' | 'rejected'
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Customer-facing reviews of live modules (separate from admin review decisions above)
export const customerReviews = sqliteTable('customer_reviews', {
  id: text('id').primaryKey(),
  moduleId: text('module_id').notNull().references(() => modules.id),
  customerName: text('customer_name').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type ModuleRow = typeof modules.$inferSelect;
export type ModuleInsert = typeof modules.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type ApiKeyInsert = typeof apiKeys.$inferInsert;
export type UsageLogRow = typeof usageLogs.$inferSelect;
export type UsageLogInsert = typeof usageLogs.$inferInsert;
export type ReviewRow = typeof reviews.$inferSelect;
export type CustomerReviewRow = typeof customerReviews.$inferSelect;
