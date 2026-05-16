import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ApiKeyRow } from '../db/schema.js';
import { validateApiKey } from '../services/api-keys.js';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKeyRow;
  }
}

export async function requireApiKey(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Authorization: Bearer <api_key> header required.',
    });
  }
  const result = await validateApiKey(auth.slice('Bearer '.length).trim());
  if (!result.ok) {
    if (result.reason === 'rate_limited') {
      return reply.status(429).send({
        error: 'RateLimited',
        message: `API rate limit exceeded (${result.usedInLastHour}/${result.key?.rateLimitPerHour} this hour).`,
      });
    }
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid or inactive API key.',
    });
  }
  req.apiKey = result.key;
}
