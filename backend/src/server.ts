import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { ensureSchema } from './db/index.js';
import { healthRoutes } from './routes/health.js';
import { submitRoutes } from './routes/submit.js';
import { discoverRoutes } from './routes/discover.js';
import { moduleRoutes } from './routes/modules.js';
import { reviewRoutes } from './routes/review.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { keyRoutes } from './routes/keys.js';
import { proxyRoutes } from './routes/proxy.js';

const app = Fastify({
  logger: { level: config.logLevel },
});

app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
  req.log.error({ err }, 'request failed');
  const status = err.statusCode ?? 500;
  reply.status(status).send({
    error: err.name ?? 'Error',
    message: err.message,
    statusCode: status,
  });
});

await app.register(cors, {
  origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

ensureSchema();

await app.register(healthRoutes);
await app.register(submitRoutes);
await app.register(discoverRoutes);
await app.register(moduleRoutes);
await app.register(reviewRoutes);
await app.register(dashboardRoutes);
await app.register(keyRoutes);
await app.register(proxyRoutes);

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`rotshop backend ready on http://${config.host}:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
