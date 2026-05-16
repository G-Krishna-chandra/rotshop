import type { FastifyPluginAsync } from 'fastify';

// Placeholder — full review flow lands in a later step (admin auth + sandbox).
export const reviewRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/review', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented', message: 'Review endpoints land after the sandbox runner is in place.' });
  });
  app.post('/api/review/:id/approve', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented' });
  });
  app.post('/api/review/:id/reject', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented' });
  });
};
