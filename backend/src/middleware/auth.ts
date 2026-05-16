import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export interface AdminPayload {
  sub: string;       // admin email
  role: 'admin';
}

// Tell @fastify/jwt the shape of req.user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AdminPayload;
    user: AdminPayload;
  }
}

// Tell Fastify about the decorator we register below
declare module 'fastify' {
  interface FastifyInstance {
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, { secret: config.adminJwtSecret });

  app.decorate('requireAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid admin JWT required in Authorization: Bearer <token> header.',
      });
    }
    if (req.user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden', message: 'Admin role required.' });
    }
  });
}
