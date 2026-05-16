import { exec, execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import type { TestResult } from '@rotshop/shared';
import { config } from '../config.js';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = resolve(HERE, '..', '..');
const DOCKERFILE_DIR = join(BACKEND_ROOT, 'docker');

export type SandboxLanguage = 'node' | 'python';

export interface SandboxOutcome {
  passed: boolean;
  testResults: TestResult[];
  logs: string;
  imageTag?: string;
}

export function detectLanguage(techStack: string[]): SandboxLanguage | null {
  const lower = techStack.map((t) => t.toLowerCase());
  if (lower.some((t) => ['node.js', 'nodejs', 'node', 'javascript', 'typescript', 'express', 'fastify', 'koa', 'next.js'].includes(t))) {
    return 'node';
  }
  if (lower.some((t) => ['python', 'fastapi', 'flask', 'django', 'aiohttp'].includes(t))) {
    return 'python';
  }
  return null;
}

let dockerAvailableCache: boolean | null = null;
export function isDockerAvailable(): boolean {
  if (dockerAvailableCache !== null) return dockerAvailableCache;
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 3000 });
    dockerAvailableCache = true;
  } catch {
    dockerAvailableCache = false;
  }
  return dockerAvailableCache;
}

export function effectiveSandboxMode(): 'docker' | 'simulate' | 'skip' {
  if (config.sandboxMode === 'docker' || config.sandboxMode === 'simulate' || config.sandboxMode === 'skip') {
    return config.sandboxMode;
  }
  // auto: prefer docker, fall back to simulate
  return isDockerAvailable() ? 'docker' : 'simulate';
}

const inUsePorts = new Set<number>();

export async function pickAvailablePort(): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const port =
      config.proxyContainerPortRangeStart +
      Math.floor(Math.random() * (config.proxyContainerPortRangeEnd - config.proxyContainerPortRangeStart + 1));
    if (inUsePorts.has(port)) continue;
    if (await isPortFree(port)) {
      inUsePorts.add(port);
      return port;
    }
  }
  throw new Error('No free port available in configured range');
}

export function releasePort(port: number): void {
  inUsePorts.delete(port);
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolveResult) => {
    const srv = createServer();
    srv.once('error', () => resolveResult(false));
    srv.once('listening', () => {
      srv.close(() => resolveResult(true));
    });
    srv.listen(port, '127.0.0.1');
  });
}

export function imageTagForModule(moduleId: string): string {
  return `rotshop-sandbox-${moduleId}`;
}

export async function buildSandboxImage(
  moduleId: string,
  repoPath: string,
  language: SandboxLanguage,
): Promise<string> {
  const dockerfileName = language === 'node' ? 'sandbox-node.Dockerfile' : 'sandbox-python.Dockerfile';
  const src = join(DOCKERFILE_DIR, dockerfileName);
  const dest = join(repoPath, 'Dockerfile.rotshop');
  await copyFile(src, dest);

  const tag = imageTagForModule(moduleId);
  // 5-minute hard cap on build to avoid runaway repos
  await execAsync(`docker build -f Dockerfile.rotshop -t ${tag} .`, {
    cwd: repoPath,
    timeout: 5 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return tag;
}

export interface RunningContainer {
  containerId: string;
  port: number;
}

export async function runSandboxContainer(imageTag: string): Promise<RunningContainer> {
  const port = await pickAvailablePort();
  try {
    const { stdout } = await execFileAsync('docker', [
      'run',
      '-d',
      '--rm',
      '--memory=512m',
      '--cpus=1',
      '-p', `127.0.0.1:${port}:3001`,
      imageTag,
    ], { timeout: 30_000 });
    const containerId = stdout.trim();

    // Wait for the container's HTTP endpoint to come up. Cap total wait at ~15s.
    await waitForResponsive(`http://127.0.0.1:${port}/`, 15_000);
    return { containerId, port };
  } catch (err) {
    releasePort(port);
    throw err;
  }
}

async function waitForResponsive(url: string, totalMs: number): Promise<void> {
  const deadline = Date.now() + totalMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
      // Any HTTP response means the server is alive (even 404 means it's listening)
      if (res.status < 600) return;
    } catch (err) {
      lastError = err;
    }
    await sleep(500);
  }
  throw new Error(`Container at ${url} never responded: ${(lastError as Error)?.message ?? 'timeout'}`);
}

export async function stopContainer(containerId: string, port?: number): Promise<void> {
  try {
    await execFileAsync('docker', ['stop', containerId], { timeout: 10_000 });
  } catch {
    // ignore — container may already be gone
  }
  if (port !== undefined) releasePort(port);
}

export async function fetchContainerLogs(containerId: string): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync('docker', ['logs', containerId], { timeout: 5000, maxBuffer: 2 * 1024 * 1024 });
    return `${stdout}\n${stderr}`.slice(0, 16_000);
  } catch (err) {
    return `(logs unavailable: ${(err as Error).message})`;
  }
}

// ─── Contract-based test generation ───────────────────────────────────────────

function extractJsonExample(text: string): unknown | null {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function mutateValues(value: unknown, marker: string): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return marker;
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'boolean') return !value;
  if (Array.isArray(value)) return value.map((v) => mutateValues(v, marker));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as object)) out[k] = mutateValues(v, marker);
    return out;
  }
  return value;
}

function topLevelKeys(value: unknown): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.keys(value);
  return [];
}

function buildTestPayloads(inputContract: string): Array<{ name: string; payload: unknown }> {
  const base = extractJsonExample(inputContract) ?? { input: 'sample-input' };
  return [
    { name: 'baseline-shape', payload: mutateValues(base, 'rotshop-test-1') },
    { name: 'mutated-values', payload: mutateValues(base, 'rotshop-test-2') },
    { name: 'edge-shape', payload: mutateValues(base, '') },
  ];
}

export async function testIOContract(
  port: number,
  inputContract: string,
  outputContract: string,
): Promise<TestResult[]> {
  const payloads = buildTestPayloads(inputContract);
  const expectedKeys = topLevelKeys(extractJsonExample(outputContract));
  const results: TestResult[] = [];

  for (const { name, payload } of payloads) {
    const expected =
      expectedKeys.length > 0
        ? `JSON object with keys: ${expectedKeys.join(', ')}`
        : 'valid JSON response (200 status)';
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      let actual: unknown;
      try { actual = JSON.parse(text); } catch { actual = text; }

      let passed = res.ok;
      let error: string | undefined;
      if (!res.ok) error = `HTTP ${res.status}: ${text.slice(0, 200)}`;
      if (passed && expectedKeys.length > 0) {
        const gotKeys = topLevelKeys(actual);
        const missing = expectedKeys.filter((k) => !gotKeys.includes(k));
        if (missing.length > 0) {
          passed = false;
          error = `Response missing expected keys: ${missing.join(', ')}`;
        }
      }
      results.push({ testCase: name, input: payload, expectedOutputShape: expected, actualOutput: actual, passed, error });
    } catch (err) {
      results.push({
        testCase: name,
        input: payload,
        expectedOutputShape: expected,
        actualOutput: null,
        passed: false,
        error: (err as Error).message,
      });
    }
  }
  return results;
}

// ─── Top-level orchestration used by the worker ───────────────────────────────

export async function runRealSandbox(
  moduleId: string,
  repoPath: string,
  techStack: string[],
  inputContract: string,
  outputContract: string,
): Promise<SandboxOutcome> {
  const lang = detectLanguage(techStack);
  if (!lang) {
    return {
      passed: false,
      testResults: [],
      logs: `Sandbox skipped: could not detect runtime from techStack=${JSON.stringify(techStack)}. Add Node.js or Python to the tech stack to enable sandbox testing.`,
    };
  }
  if (!existsSync(repoPath)) {
    return {
      passed: false,
      testResults: [],
      logs: `Sandbox skipped: cloned repo at ${repoPath} no longer exists.`,
    };
  }

  let imageTag: string | undefined;
  let container: RunningContainer | undefined;
  let logs = '';
  try {
    imageTag = await buildSandboxImage(moduleId, repoPath, lang);
    container = await runSandboxContainer(imageTag);
    const testResults = await testIOContract(container.port, inputContract, outputContract);
    logs = await fetchContainerLogs(container.containerId);
    const passed = testResults.length > 0 && testResults.every((r) => r.passed);
    return { passed, testResults, logs, imageTag };
  } catch (err) {
    const message = (err as Error).message;
    if (container) {
      logs = await fetchContainerLogs(container.containerId).catch(() => '');
    }
    return {
      passed: false,
      testResults: [],
      logs: `${logs}\n\nSandbox error: ${message}`.trim(),
      imageTag,
    };
  } finally {
    if (container) await stopContainer(container.containerId, container.port);
  }
}

export async function runSimulatedSandbox(
  moduleId: string,
  inputContract: string,
  outputContract: string,
): Promise<SandboxOutcome> {
  await sleep(1500);
  const payloads = buildTestPayloads(inputContract);
  const expectedKeys = topLevelKeys(extractJsonExample(outputContract));
  const fakeResponse: Record<string, unknown> = expectedKeys.length > 0
    ? Object.fromEntries(expectedKeys.map((k) => [k, 'simulated']))
    : { result: 'simulated', module: moduleId };
  const testResults: TestResult[] = payloads.map((p) => ({
    testCase: `${p.name} (simulated)`,
    input: p.payload,
    expectedOutputShape: expectedKeys.length > 0 ? `JSON with keys: ${expectedKeys.join(', ')}` : 'valid JSON response',
    actualOutput: fakeResponse,
    passed: true,
  }));
  return {
    passed: true,
    testResults,
    logs: '[sandbox: simulate mode — no container was built or executed]',
  };
}

export async function runSandboxFlow(
  moduleId: string,
  repoPath: string,
  techStack: string[],
  inputContract: string,
  outputContract: string,
): Promise<SandboxOutcome> {
  const mode = effectiveSandboxMode();
  switch (mode) {
    case 'docker':
      return runRealSandbox(moduleId, repoPath, techStack, inputContract, outputContract);
    case 'simulate':
      return runSimulatedSandbox(moduleId, inputContract, outputContract);
    case 'skip':
      return {
        passed: false,
        testResults: [],
        logs: '[sandbox: skip mode — job not processed]',
      };
  }
}
