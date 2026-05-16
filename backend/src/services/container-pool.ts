import { config } from '../config.js';
import {
  effectiveSandboxMode,
  imageTagForModule,
  runSandboxContainer,
  stopContainer,
} from './sandbox.js';

interface PooledContainer {
  moduleId: string;
  containerId: string;
  port: number;
  lastUsed: number;
  startedAt: number;
}

const pool = new Map<string, PooledContainer>();
const idleMs = config.proxyContainerIdleSeconds * 1000;
let cleanupInterval: NodeJS.Timeout | null = null;
let inFlightStarts = new Map<string, Promise<PooledContainer>>();

function startCleanupLoop(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    const now = Date.now();
    const toEvict: PooledContainer[] = [];
    for (const [id, c] of pool) {
      if (now - c.lastUsed > idleMs) {
        toEvict.push(c);
        pool.delete(id);
      }
    }
    if (pool.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    for (const c of toEvict) {
      await stopContainer(c.containerId, c.port).catch(() => {});
    }
  }, 30_000);
  // Don't block process exit on the interval
  cleanupInterval.unref?.();
}

async function startContainerFor(moduleId: string): Promise<PooledContainer> {
  const imageTag = imageTagForModule(moduleId);
  const { containerId, port } = await runSandboxContainer(imageTag);
  const pooled: PooledContainer = {
    moduleId,
    containerId,
    port,
    lastUsed: Date.now(),
    startedAt: Date.now(),
  };
  pool.set(moduleId, pooled);
  startCleanupLoop();
  return pooled;
}

export async function getWarmContainer(moduleId: string): Promise<PooledContainer> {
  const existing = pool.get(moduleId);
  if (existing && Date.now() - existing.lastUsed < idleMs) {
    existing.lastUsed = Date.now();
    return existing;
  }
  // De-dupe concurrent cold starts for the same module
  const inFlight = inFlightStarts.get(moduleId);
  if (inFlight) return inFlight;

  const promise = startContainerFor(moduleId).finally(() => {
    inFlightStarts.delete(moduleId);
  });
  inFlightStarts.set(moduleId, promise);
  return promise;
}

export interface ProxyCallResult {
  status: number;
  data: unknown;
  durationMs: number;
}

export async function callModuleProxy(
  moduleId: string,
  slug: string,
  action: string,
  body: unknown,
): Promise<ProxyCallResult> {
  const start = Date.now();
  const mode = effectiveSandboxMode();

  // In non-docker modes we never built an image, so synthesize a deterministic
  // response so the demo can still complete end-to-end through the proxy.
  if (mode !== 'docker') {
    return {
      status: 200,
      data: {
        result: 'simulated',
        module: slug,
        action,
        echo: body,
        note: `proxy is running in '${mode}' mode — no container was invoked`,
      },
      durationMs: Date.now() - start,
    };
  }

  const container = await getWarmContainer(moduleId);
  const url = `http://127.0.0.1:${container.port}/${action}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, durationMs: Date.now() - start };
}

export async function shutdownPool(): Promise<void> {
  const all = [...pool.values()];
  pool.clear();
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  for (const c of all) {
    await stopContainer(c.containerId, c.port).catch(() => {});
  }
}

export function poolStatus(): Array<Pick<PooledContainer, 'moduleId' | 'containerId' | 'port' | 'lastUsed' | 'startedAt'>> {
  return [...pool.values()];
}
