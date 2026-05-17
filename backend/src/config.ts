import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error(`Env var ${name} must be a number, got: ${raw}`);
  return n;
}

export const config = {
  port: num('PORT', 3000),
  host: optional('HOST', '0.0.0.0'),
  databaseUrl: optional('DATABASE_URL', './rotshop.db'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  deepseekApiKey: optional('DEEPSEEK_API_KEY'),
  groqApiKey: optional('GROQ_API_KEY'),
  githubToken: optional('GITHUB_TOKEN'),
  adminJwtSecret: optional('ADMIN_JWT_SECRET', 'dev-change-me-immediately'),
  adminEmail: optional('ADMIN_EMAIL', 'admin@rotshop.local'),
  adminPassword: optional('ADMIN_PASSWORD', 'admin'),
  dockerSocket: optional('DOCKER_SOCKET', '/var/run/docker.sock'),
  logLevel: optional('LOG_LEVEL', 'info'),
  corsOrigin: optional('CORS_ORIGIN', '*'),
  repoCloneDir: optional('REPO_CLONE_DIR', './repos'),
  claudeModel: optional('CLAUDE_MODEL', 'claude-sonnet-4-6'),
  sandboxMode: optional('SANDBOX_MODE', 'auto') as 'auto' | 'docker' | 'simulate' | 'skip',
  proxyContainerIdleSeconds: num('PROXY_CONTAINER_IDLE_SECONDS', 300),
  proxyContainerPortRangeStart: num('PROXY_CONTAINER_PORT_RANGE_START', 4100),
  proxyContainerPortRangeEnd: num('PROXY_CONTAINER_PORT_RANGE_END', 4999),
} as const;

export type Config = typeof config;
