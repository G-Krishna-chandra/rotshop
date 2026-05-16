import type { FastifyPluginAsync } from 'fastify';

export const proxyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/v1/:module/:action', async (_req, reply) => {
    reply.status(501).send({ error: 'NotImplemented', message: 'Proxy lands once the sandbox container pool is wired.' });
  });
};
