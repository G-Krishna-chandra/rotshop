import type { FastifyPluginAsync } from 'fastify';
import type {
  ApproveRequest,
  RejectRequest,
  ReviewItem,
  ReviewListResponse,
  TestResult,
} from '@rotshop/shared';
import { desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { toModuleDTO } from '../db/serializers.js';

function safeTestResults(json: string | null): TestResult[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as TestResult[]) : [];
  } catch {
    return [];
  }
}

export const reviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/review', { preHandler: app.requireAdmin }, async () => {
    const rows = await db
      .select()
      .from(schema.modules)
      .where(inArray(schema.modules.status, ['sandbox_passed', 'pending_review']))
      .orderBy(desc(schema.modules.updatedAt));

    const items: ReviewItem[] = rows.map((row) => ({
      module: toModuleDTO(row),
      testResults: safeTestResults(row.testResults),
      sandboxLogs: row.sandboxLogs ?? '',
    }));

    const payload: ReviewListResponse = { modules: items };
    return payload;
  });

  app.post<{ Params: { id: string }; Body: ApproveRequest }>(
    '/api/review/:id/approve',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const id = req.params.id;
      const existing = (
        await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1)
      )[0];
      if (!existing) {
        return reply.status(404).send({ error: 'NotFound', message: 'Module not found.' });
      }
      if (existing.status !== 'sandbox_passed' && existing.status !== 'pending_review') {
        return reply.status(409).send({
          error: 'Conflict',
          message: `Cannot approve a module in status '${existing.status}'.`,
        });
      }

      // Skip the brief 'approved' intermediate state — the proxy dispatches by slug
      // so there's nothing extra to register; flipping straight to 'live' is enough.
      await db
        .update(schema.modules)
        .set({ status: 'live', updatedAt: new Date() })
        .where(eq(schema.modules.id, id));

      await db.insert(schema.reviews).values({
        id: nanoid(12).toLowerCase(),
        moduleId: id,
        reviewerEmail: req.user.sub,
        decision: 'approved',
        notes: req.body?.notes ?? null,
      });

      return { success: true, status: 'live' };
    },
  );

  app.post<{ Params: { id: string }; Body: RejectRequest }>(
    '/api/review/:id/reject',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const id = req.params.id;
      const body = req.body;
      if (!body?.reason || typeof body.reason !== 'string') {
        return reply.status(400).send({ error: 'BadRequest', message: 'reason is required.' });
      }
      const existing = (
        await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1)
      )[0];
      if (!existing) {
        return reply.status(404).send({ error: 'NotFound', message: 'Module not found.' });
      }

      await db
        .update(schema.modules)
        .set({ status: 'rejected', rejectionReason: body.reason, updatedAt: new Date() })
        .where(eq(schema.modules.id, id));

      await db.insert(schema.reviews).values({
        id: nanoid(12).toLowerCase(),
        moduleId: id,
        reviewerEmail: req.user.sub,
        decision: 'rejected',
        notes: body.reason,
      });

      return { success: true, status: 'rejected' };
    },
  );
};
