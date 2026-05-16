import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export const QUEUE_NAMES = {
  sandboxTest: 'sandbox-test',
} as const;

export interface SandboxTestJobData {
  moduleId: string;
}

let connection: Redis | null = null;
let sandboxQueue: Queue<SandboxTestJobData> | null = null;
let queueAvailable = false;

function tryConnect(): void {
  try {
    connection = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    connection.on('error', (err: Error) => {
      // Suppress reconnection noise; we report once at startup.
      if (queueAvailable) {
        queueAvailable = false;
        console.warn('[queue] redis disconnected:', err.message);
      }
    });
    sandboxQueue = new Queue<SandboxTestJobData>(QUEUE_NAMES.sandboxTest, { connection });
    queueAvailable = true;
  } catch (err) {
    console.warn('[queue] failed to construct redis connection:', (err as Error).message);
    queueAvailable = false;
  }
}

tryConnect();

export async function enqueueSandboxTest(data: SandboxTestJobData): Promise<boolean> {
  if (!sandboxQueue) return false;
  try {
    await sandboxQueue.add('test', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    return true;
  } catch (err) {
    console.warn('[queue] enqueue failed:', (err as Error).message);
    return false;
  }
}

export function isQueueAvailable(): boolean {
  return queueAvailable;
}

export function getSandboxQueue(): Queue<SandboxTestJobData> | null {
  return sandboxQueue;
}

export function getConnection(): Redis | null {
  return connection;
}
