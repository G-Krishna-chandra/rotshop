import type { FastifyPluginAsync } from 'fastify';
import type { Module, ModuleDetailResponse } from '@rotshop/shared';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { toModuleDTO, toCustomerReviewDTO } from '../db/serializers.js';

function deriveAction(inputContract: string): string {
  // Pull a verb-ish hint from the contract if we can find one; otherwise default to 'invoke'.
  const lower = inputContract.toLowerCase();
  const verbs = ['validate', 'check', 'send', 'analyze', 'classify', 'generate', 'create', 'parse', 'detect'];
  for (const v of verbs) {
    if (lower.includes(v)) return v;
  }
  return 'invoke';
}

function apiSnippet(slug: string, inputContract: string): string {
  const action = deriveAction(inputContract);
  const exampleBodyMatch = inputContract.match(/\{[\s\S]*?\}/);
  const exampleBody = exampleBodyMatch ? exampleBodyMatch[0] : '{ "input": "..." }';
  return [
    `// Node.js`,
    `const response = await fetch('https://api.rotshop.io/v1/${slug}/${action}', {`,
    `  method: 'POST',`,
    `  headers: {`,
    `    'Authorization': 'Bearer ROTSHOP_API_KEY',`,
    `    'Content-Type': 'application/json'`,
    `  },`,
    `  body: JSON.stringify(${exampleBody})`,
    `});`,
    `const { data } = await response.json();`,
  ].join('\n');
}

export const moduleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/modules', async () => {
    const rows = await db
      .select()
      .from(schema.modules)
      .where(inArray(schema.modules.status, ['live', 'approved', 'sandbox_passed']))
      .orderBy(desc(schema.modules.integrationCount));
    const payload: { modules: Module[] } = { modules: rows.map(toModuleDTO) };
    return payload;
  });

  app.get<{ Params: { slug: string } }>('/api/modules/:slug', async (req, reply) => {
    const slug = req.params.slug;
    const row = (
      await db.select().from(schema.modules).where(eq(schema.modules.slug, slug)).limit(1)
    )[0];
    if (!row) {
      return reply.status(404).send({ error: 'NotFound', message: 'Module not found.' });
    }

    const reviewRows = await db
      .select()
      .from(schema.customerReviews)
      .where(eq(schema.customerReviews.moduleId, row.id))
      .orderBy(desc(schema.customerReviews.createdAt))
      .limit(20);

    const payload: ModuleDetailResponse = {
      module: toModuleDTO(row),
      apiSnippet: apiSnippet(row.slug, row.inputContract ?? ''),
      reviews: reviewRows.map(toCustomerReviewDTO),
    };
    return payload;
  });
};
