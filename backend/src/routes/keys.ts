import type { FastifyPluginAsync } from 'fastify';

export const keyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/keys/generate', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented', message: 'API key generation lands with admin auth.' });
  });
};
