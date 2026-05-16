import type { FastifyPluginAsync } from 'fastify';
import { config } from '../config.js';

interface TokenBody {
  secret?: string;
  email?: string;
}

interface TokenQuery {
  secret?: string;
  email?: string;
}

function issueToken(app: import('fastify').FastifyInstance, email: string): string {
  return app.jwt.sign({ sub: email, role: 'admin' }, { expiresIn: '7d' });
}

// Dev-only token issuance. In production you'd issue tokens from a real
// identity provider; this exists so the demo can exercise admin routes
// without a separate auth stack.
export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: TokenBody }>('/api/admin/token', async (req, reply) => {
    const secret = req.body?.secret;
    if (secret !== config.adminJwtSecret) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'bad secret' });
    }
    const email = req.body?.email || config.adminEmail;
    return { token: issueToken(app, email), email, expiresIn: '7d' };
  });

  app.get<{ Querystring: TokenQuery }>('/api/admin/token', async (req, reply) => {
    const secret = req.query?.secret;
    if (secret !== config.adminJwtSecret) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'bad secret' });
    }
    const email = req.query?.email || config.adminEmail;
    return { token: issueToken(app, email), email, expiresIn: '7d' };
  });
};
