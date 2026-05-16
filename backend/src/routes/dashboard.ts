import type { FastifyPluginAsync } from 'fastify';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/dashboard', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented', message: 'Dashboard aggregates land alongside the keys + usage-logging step.' });
  });
};
