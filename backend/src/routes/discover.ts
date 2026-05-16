import type { FastifyPluginAsync } from 'fastify';
import type { DiscoverRequest, DiscoverResponse, ModuleMatch } from '@rotshop/shared';
import { and, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import type { ModuleRow } from '../db/schema.js';
import { toModuleDTO } from '../db/serializers.js';

const STOP_WORDS = new Set([
  'a','an','the','for','to','of','in','on','at','with','and','or','but','is','are','do','does','did',
  'i','we','you','my','our','your','it','its','that','this','from','have','has','had','want','need',
  'how','can','could','should','would','will','app','project','build','using','use','make','get',
]);

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function safeArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function scoreModule(tokens: string[], mod: ModuleRow): { score: number; matched: string[] } {
  const haystacks: Array<{ text: string; weight: number }> = [
    { text: (mod.name ?? '').toLowerCase(), weight: 3 },
    { text: (mod.description ?? '').toLowerCase(), weight: 2 },
    { text: (mod.category ?? '').toLowerCase(), weight: 2 },
    { text: safeArray(mod.techStack).join(' ').toLowerCase(), weight: 2 },
    { text: (mod.inputContract ?? '').toLowerCase(), weight: 1 },
    { text: (mod.outputContract ?? '').toLowerCase(), weight: 1 },
  ];
  let score = 0;
  const matched = new Set<string>();
  for (const tok of tokens) {
    for (const h of haystacks) {
      if (h.text.includes(tok)) {
        score += h.weight;
        matched.add(tok);
      }
    }
  }
  return { score, matched: [...matched] };
}

function fitLine(query: string, matched: string[], mod: ModuleRow): string {
  if (matched.length === 0) {
    const desc = mod.description ?? mod.name;
    return `Could help with what you're describing: ${desc.slice(0, 120)}`;
  }
  const top = matched.slice(0, 3).join(', ');
  const trimmedQuery = query.length > 50 ? `${query.slice(0, 47)}...` : query;
  return `Matches "${trimmedQuery}" via ${top}.`;
}

export const discoverRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: DiscoverRequest }>('/api/discover', async (req, reply) => {
    const body = req.body;
    if (!body || typeof body.query !== 'string') {
      return reply.status(400).send({ error: 'BadRequest', message: 'query is required.' });
    }
    const query = body.query.trim();
    const tokens = tokenize(query);

    // Show anything ready-or-better. Customers will integrate against 'live'; pre-live
    // modules are visible so submitters and reviewers can preview them through discover.
    const visibleStatuses = ['live', 'approved', 'sandbox_passed'];
    const conds = [inArray(schema.modules.status, visibleStatuses)];
    if (body.categories && body.categories.length > 0) {
      conds.push(inArray(schema.modules.category, body.categories));
    }
    const rows = await db.select().from(schema.modules).where(and(...conds));

    const ranked = rows.map((row) => {
      const { score, matched } = tokens.length === 0
        ? { score: 0, matched: [] as string[] }
        : scoreModule(tokens, row);
      return { row, score, matched };
    });

    const filtered = tokens.length === 0
      ? ranked.sort((a, b) => (b.row.integrationCount ?? 0) - (a.row.integrationCount ?? 0))
      : ranked.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

    const matches: ModuleMatch[] = filtered.slice(0, 12).map(({ row, score, matched }) => ({
      module: toModuleDTO(row),
      fitLine: fitLine(query, matched, row),
      matchScore: score,
      matchedKeywords: matched,
    }));

    const payload: DiscoverResponse = { matches, query };
    return payload;
  });
};
