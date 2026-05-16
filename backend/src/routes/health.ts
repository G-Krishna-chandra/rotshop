import type { FastifyPluginAsync } from 'fastify';
import { sqlite } from '../db/index.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/health', async () => {
    let dbOk = false;
    try {
      sqlite.prepare('SELECT 1').get();
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      status: 'ok',
      service: 'rotshop-backend',
      timestamp: new Date().toISOString(),
      checks: { db: dbOk },
    };
  });
};
