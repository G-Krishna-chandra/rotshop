import type { FastifyPluginAsync } from 'fastify';
import type {
  SubmitRequest,
  SubmitResponse,
  SubmitEditRequest,
  SubmitEditResponse,
} from '@rotshop/shared';
import { slugify } from '@rotshop/shared';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { db, schema } from '../db/index.js';
import { toModuleDTO } from '../db/serializers.js';
import { config } from '../config.js';
import { cloneRepo, analyzeRepo } from '../services/repo-analyzer.js';
import { runSandboxFlow } from '../services/sandbox.js';
import { enqueueSandboxTest } from '../queue/index.js';

// Best-effort inline sandbox so demos work without Redis. We never await this
// from the request handler — the caller's response returns immediately and the
// module flips status when the sandbox finishes.
async function runInlineSandbox(
  moduleId: string,
  repoPath: string,
  techStack: string[],
  inputContract: string,
  outputContract: string,
): Promise<void> {
  try {
    await db
      .update(schema.modules)
      .set({ status: 'sandbox_running', updatedAt: new Date() })
      .where(eq(schema.modules.id, moduleId));
    const outcome = await runSandboxFlow(moduleId, repoPath, techStack, inputContract, outputContract);
    await db
      .update(schema.modules)
      .set({
        status: outcome.passed ? 'sandbox_passed' : 'sandbox_failed',
        testResults: JSON.stringify(outcome.testResults),
        sandboxLogs: outcome.logs,
        dockerImage: outcome.imageTag ?? null,
        updatedAt: new Date(),
      })
      .where(eq(schema.modules.id, moduleId));
  } catch (err) {
    console.warn('[submit] inline sandbox failed for', moduleId, err);
    await db
      .update(schema.modules)
      .set({
        status: 'sandbox_failed',
        sandboxLogs: `inline sandbox error: ${(err as Error).message}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.modules.id, moduleId))
      .catch(() => {});
  }
}

const GITHUB_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(?:\.git)?\/?$/i;

async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || 'module';
  let suffix = 0;
  while (suffix < 50) {
    const variant = suffix === 0 ? safeBase : `${safeBase}-${suffix}`;
    const existing = await db
      .select({ id: schema.modules.id })
      .from(schema.modules)
      .where(eq(schema.modules.slug, variant))
      .limit(1);
    if (existing.length === 0) return variant;
    suffix++;
  }
  return `${safeBase}-${nanoid(6).toLowerCase()}`;
}

export const submitRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: SubmitRequest }>('/api/submit', async (req, reply) => {
    const body = req.body;
    if (!body || typeof body.githubUrl !== 'string' || typeof body.submitterEmail !== 'string') {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'githubUrl and submitterEmail are required.',
      });
    }
    const url = body.githubUrl.trim();
    const email = body.submitterEmail.trim();
    if (!GITHUB_RE.test(url)) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'githubUrl must look like https://github.com/<owner>/<repo>.',
      });
    }
    if (!email.includes('@')) {
      return reply.status(400).send({
        error: 'BadRequest',
        message: 'submitterEmail must be a valid email.',
      });
    }

    const id = nanoid(12).toLowerCase();
    const cloneRoot = resolve(config.repoCloneDir);
    await mkdir(cloneRoot, { recursive: true });
    const repoPath = join(cloneRoot, id);

    try {
      await cloneRepo(url, repoPath);
    } catch (err) {
      req.log.warn({ err, url }, 'repo clone failed');
      if (existsSync(repoPath)) {
        await rm(repoPath, { recursive: true, force: true });
      }
      return reply.status(400).send({
        error: 'CloneFailed',
        message: `Could not clone ${url}: ${(err as Error).message}`,
      });
    }

    const analysis = await analyzeRepo(repoPath, url);
    const slug = await uniqueSlug(slugify(analysis.name));
    const now = new Date();

    await db.insert(schema.modules).values({
      id,
      githubUrl: url,
      submitterEmail: email,
      name: analysis.name,
      slug,
      description: analysis.description,
      category: analysis.category,
      techStack: JSON.stringify(analysis.techStack),
      inputContract: analysis.inputContract,
      outputContract: analysis.outputContract,
      pricingModel: analysis.pricingModel,
      price: analysis.suggestedPrice,
      status: 'pending_sandbox_test',
      complexity: analysis.complexity,
      repoPath,
      createdAt: now,
      updatedAt: now,
    });

    const queued = await enqueueSandboxTest({ moduleId: id });
    if (!queued) {
      // Fire-and-forget so the response returns immediately
      void runInlineSandbox(
        id,
        repoPath,
        analysis.techStack,
        analysis.inputContract,
        analysis.outputContract,
      );
    }

    const row = (
      await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1)
    )[0];

    const payload: SubmitResponse = {
      module: toModuleDTO(row),
      message: queued
        ? 'Repo analyzed and queued for sandbox testing.'
        : 'Repo analyzed. Sandbox running inline (Redis unavailable) — poll the module for status.',
    };
    return payload;
  });

  app.patch<{ Params: { id: string }; Body: SubmitEditRequest }>(
    '/api/submit/:id',
    async (req, reply) => {
      const id = req.params.id;
      const existing = (
        await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1)
      )[0];
      if (!existing) {
        return reply.status(404).send({ error: 'NotFound', message: 'Module not found.' });
      }

      const body = req.body ?? {};
      const updates: Partial<typeof schema.modules.$inferInsert> = { updatedAt: new Date() };

      if (typeof body.name === 'string' && body.name.trim()) {
        updates.name = body.name.trim();
        // Note: leave slug stable on rename. New slug requires admin tool to avoid breaking integrations.
      }
      if (typeof body.description === 'string') updates.description = body.description;
      if (body.category) updates.category = body.category;
      if (Array.isArray(body.techStack)) updates.techStack = JSON.stringify(body.techStack.map(String));
      if (typeof body.inputContract === 'string') updates.inputContract = body.inputContract;
      if (typeof body.outputContract === 'string') updates.outputContract = body.outputContract;
      if (body.pricingModel) updates.pricingModel = body.pricingModel;
      if (typeof body.price === 'number' && body.price >= 0) updates.price = Math.round(body.price);

      await db.update(schema.modules).set(updates).where(eq(schema.modules.id, id));

      const refreshed = (
        await db.select().from(schema.modules).where(eq(schema.modules.id, id)).limit(1)
      )[0];
      const payload: SubmitEditResponse = { module: toModuleDTO(refreshed) };
      return payload;
    },
  );
};
