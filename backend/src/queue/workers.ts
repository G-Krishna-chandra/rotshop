import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { db, schema } from '../db/index.js';
import { QUEUE_NAMES, type SandboxTestJobData } from './index.js';
import { effectiveSandboxMode, runSandboxFlow } from '../services/sandbox.js';

let worker: Worker<SandboxTestJobData> | null = null;
let workerConnection: Redis | null = null;

function parseTechStack(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

async function canReachRedis(): Promise<boolean> {
  // Quick, short-timeout ping so a missing Redis doesn't delay server startup.
  const probe = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
  });
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

export async function startSandboxWorker(): Promise<void> {
  if (worker) return;
  const reachable = await canReachRedis();
  if (!reachable) {
    console.warn('[worker] redis unreachable at', config.redisUrl, '— sandbox worker not started');
    return;
  }

  workerConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  const mode = effectiveSandboxMode();
  console.log(`[worker] sandbox worker online (mode=${mode}, redis=${config.redisUrl})`);

  worker = new Worker<SandboxTestJobData>(
    QUEUE_NAMES.sandboxTest,
    async (job) => {
      const { moduleId } = job.data;
      const row = (
        await db.select().from(schema.modules).where(eq(schema.modules.id, moduleId)).limit(1)
      )[0];
      if (!row) {
        throw new Error(`module ${moduleId} not found`);
      }

      await db
        .update(schema.modules)
        .set({ status: 'sandbox_running', updatedAt: new Date() })
        .where(eq(schema.modules.id, moduleId));

      const outcome = await runSandboxFlow(
        moduleId,
        row.repoPath ?? '',
        parseTechStack(row.techStack),
        row.inputContract ?? '',
        row.outputContract ?? '',
      );

      await db
        .update(schema.modules)
        .set({
          status: outcome.passed ? 'sandbox_passed' : 'sandbox_failed',
          testResults: JSON.stringify(outcome.testResults),
          sandboxLogs: outcome.logs,
          dockerImage: outcome.imageTag ?? row.dockerImage,
          updatedAt: new Date(),
        })
        .where(eq(schema.modules.id, moduleId));

      return { passed: outcome.passed, moduleId, mode };
    },
    { connection: workerConnection, concurrency: 2 },
  );

  worker.on('completed', (job, result) => {
    console.log(`[worker] ${job.id} completed:`, result);
  });
  worker.on('failed', async (job, err) => {
    console.error(`[worker] ${job?.id} failed:`, err.message);
    const moduleId = job?.data?.moduleId;
    if (moduleId) {
      try {
        await db
          .update(schema.modules)
          .set({
            status: 'sandbox_failed',
            sandboxLogs: `Worker error: ${err.message}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.modules.id, moduleId));
      } catch (dbErr) {
        console.error('[worker] failed to record failure for', moduleId, dbErr);
      }
    }
  });
}

export async function stopSandboxWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (workerConnection) {
    workerConnection.disconnect();
    workerConnection = null;
  }
}

// Standalone entry: `npm run worker` runs this file directly.
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  startSandboxWorker().catch((err) => {
    console.error('[worker] fatal:', err);
    process.exit(1);
  });

  // Keep the process alive even if the worker fails to start (so users can see the message)
  const keepAlive = setInterval(() => {}, 1 << 30);
  process.on('SIGINT', async () => {
    clearInterval(keepAlive);
    await stopSandboxWorker();
    process.exit(0);
  });
}
