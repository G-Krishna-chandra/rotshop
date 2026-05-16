import type { FastifyPluginAsync } from 'fastify';
import type { ProxyResponse } from '@rotshop/shared';
import { eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { requireApiKey } from '../middleware/api-key.js';
import { callModuleProxy } from '../services/container-pool.js';

export const proxyRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { module: string; action: string } }>(
    '/v1/:module/:action',
    { preHandler: requireApiKey },
    async (req, reply) => {
      const requestId = `req_${nanoid(12).toLowerCase()}`;
      const { module: slug, action } = req.params;
      const start = Date.now();

      const mod = (
        await db.select().from(schema.modules).where(eq(schema.modules.slug, slug)).limit(1)
      )[0];
      if (!mod) {
        return reply.status(404).send({ error: 'NotFound', message: `No module with slug '${slug}'.` });
      }
      if (mod.status !== 'live') {
        return reply.status(403).send({
          error: 'NotLive',
          message: `Module '${slug}' is in status '${mod.status}', not 'live'.`,
        });
      }

      let envelope: ProxyResponse;
      let outboundStatus = 200;

      try {
        const result = await callModuleProxy(mod.id, slug, action, req.body);
        outboundStatus = result.status >= 200 && result.status < 300 ? 200 : 502;
        envelope = {
          success: outboundStatus === 200,
          data: result.data,
          module: slug,
          version: '1.0',
          requestId,
          ...(outboundStatus !== 200 ? { error: `Module returned HTTP ${result.status}` } : {}),
        };
      } catch (err) {
        outboundStatus = 502;
        envelope = {
          success: false,
          data: null,
          module: slug,
          version: '1.0',
          requestId,
          error: (err as Error).message,
        };
      }

      // Log + increment integration count regardless of outcome
      const responseTimeMs = Date.now() - start;
      try {
        await db.insert(schema.usageLogs).values({
          id: nanoid(12).toLowerCase(),
          apiKeyId: req.apiKey!.id,
          moduleId: mod.id,
          action,
          statusCode: outboundStatus,
          responseTimeMs,
        });
        if (outboundStatus === 200) {
          await db
            .update(schema.modules)
            .set({ integrationCount: sql`${schema.modules.integrationCount} + 1` })
            .where(eq(schema.modules.id, mod.id));
        }
      } catch (logErr) {
        req.log.warn({ err: logErr }, 'usage log insert failed');
      }

      return reply.status(outboundStatus).send(envelope);
    },
  );
};
