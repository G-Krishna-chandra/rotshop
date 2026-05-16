import type { FastifyPluginAsync } from 'fastify';
import type { GenerateKeyRequest, GenerateKeyResponse } from '@rotshop/shared';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { generateApiKey, invalidateApiKeyCache } from '../services/api-keys.js';

export const keyRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: GenerateKeyRequest }>(
    '/api/keys/generate',
    { preHandler: app.requireAdmin },
    async (req, reply) => {
      const body = req.body;
      if (!body?.customerEmail || !body.customerEmail.includes('@')) {
        return reply.status(400).send({ error: 'BadRequest', message: 'customerEmail is required.' });
      }
      const rateLimit =
        typeof body.rateLimitPerHour === 'number' && body.rateLimitPerHour > 0
          ? Math.round(body.rateLimitPerHour)
          : 100;

      const generated = await generateApiKey();
      const email = body.customerEmail.trim();
      await db.insert(schema.apiKeys).values({
        id: nanoid(12).toLowerCase(),
        keyHash: generated.hash,
        keyPrefix: generated.prefix,
        customerEmail: email,
        rateLimitPerHour: rateLimit,
      });
      invalidateApiKeyCache();

      const payload: GenerateKeyResponse = {
        key: generated.plaintext,
        keyPrefix: generated.prefix,
        customerEmail: email,
      };
      return payload;
    },
  );
};
