import type { FastifyPluginAsync } from 'fastify';
import type { DashboardResponse, MonthlyEarning } from '@rotshop/shared';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema, sqlite } from '../db/index.js';
import { toModuleDTO } from '../db/serializers.js';

// Demo accounting: every successful proxy call earns $1 (100 cents).
// When real billing exists, this becomes a join against modules.price.
const EARNING_PER_CALL_CENTS = 100;

const IN_REVIEW_STATUSES = [
  'pending_sandbox_test',
  'sandbox_running',
  'sandbox_passed',
  'pending_review',
] as const;

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/dashboard', async () => {
    const [liveAgg] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.modules)
      .where(eq(schema.modules.status, 'live'));

    const [inReviewAgg] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.modules)
      .where(inArray(schema.modules.status, IN_REVIEW_STATUSES as unknown as string[]));

    const [integrationsAgg] = await db
      .select({ s: sql<number>`COALESCE(SUM(${schema.modules.integrationCount}), 0)` })
      .from(schema.modules)
      .where(eq(schema.modules.status, 'live'));

    const [usageAgg] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(schema.usageLogs);

    // strftime grouping is cleanest via the raw sqlite handle
    const monthlyRows = sqlite
      .prepare<[], { month: string; amount: number }>(
        `SELECT
           strftime('%Y-%m', datetime(created_at, 'unixepoch')) AS month,
           COUNT(*) * ${EARNING_PER_CALL_CENTS} AS amount
         FROM usage_logs
         WHERE created_at IS NOT NULL
         GROUP BY month
         ORDER BY month`,
      )
      .all();

    const moduleRows = await db
      .select()
      .from(schema.modules)
      .orderBy(desc(schema.modules.createdAt))
      .limit(100);

    const earnings: MonthlyEarning[] = monthlyRows.map((r) => ({
      month: r.month,
      amount: Number(r.amount),
    }));

    const payload: DashboardResponse = {
      stats: {
        totalEarnings: Number(usageAgg?.c ?? 0) * EARNING_PER_CALL_CENTS,
        liveModules: Number(liveAgg?.c ?? 0),
        totalIntegrations: Number(integrationsAgg?.s ?? 0),
        inReview: Number(inReviewAgg?.c ?? 0),
      },
      modules: moduleRows.map(toModuleDTO),
      earnings,
    };
    return payload;
  });
};
