import type { FastifyPluginAsync } from 'fastify';
import { inArray, eq, and, sql } from 'drizzle-orm';
import { config } from '../config.js';
import { db, schema } from '../db/index.js';
import { toModuleDTO } from '../db/serializers.js';

// ─── Shared types ──────────────────────────────────────────────────────────────

interface ChatMessage { role: 'user' | 'assistant'; content: string; }
interface ChatBody { messages: ChatMessage[]; }

export interface ChatAction {
  type: 'navigate';
  page: 'landing' | 'discovery' | 'submit' | 'dashboard';
}

interface StatItem { label: string; value: string | number; }

export interface ChatResponse {
  reply: string;
  modules?: ModuleCard[];
  stats?: StatItem[];
  action?: ChatAction;
}

interface ModuleCard {
  id: string; slug: string; name: string; description: string;
  category: string; pricingModel: string; price: number;
  rating: number | null; integrationCount: number;
  complexity: string; techStack: string[];
  inputContract: string; outputContract: string;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Hackmarket Assistant — an expert AI embedded in the Hackmarket API marketplace.

## About Hackmarket
Two-sided API marketplace: builders monetize their AI/API tools (hackathon demos, side projects) without building billing or infra; buyers consume many tools through one gateway, one key, unified billing.
Tagline: "Every hackathon builds tools that die on GitHub. We bring them back to life."

Sellers: submit a GitHub repo → Hackmarket clones, AI-extracts metadata, sandboxes in Docker, publishes after review.
Buyers: browse Discovery, demo tools, integrate via /v1/:module/:action proxy using one Hackmarket API key.
Pricing: "buy" (per-request) or "royalty" (monthly subscription). Price stored in cents.
Categories: Auth, Payments, Notifications, Analytics, AI/ML, DevOps, UI Components, Data Pipelines.

## Your tools — use them proactively
- **search_modules**: search by any query. Call MULTIPLE TIMES for different capability needs.
- **get_module_detail**: get full schema, pricing, contracts for a named tool.
- **list_modules**: browse all live tools, optionally by category.
- **get_category_breakdown**: see how many modules exist per category — great for "what categories do you have?" questions.
- **get_marketplace_stats**: pull real-time platform stats (total modules, integrations, top tools, API activity).
- **navigate_to**: send the user to a page. **Only call this when the user explicitly asks to go somewhere** ("take me to", "open the", "show me the submit page", etc.). Never call it just because a topic came up.

## Recommendation mode — CRITICAL
When a user describes a project they're building or a workflow they have:
1. Identify ALL distinct capabilities they will likely need (e.g. auth, payments, email, analytics, scraping, AI inference, data storage, notifications…)
2. Call **search_modules once per capability** — do NOT combine everything into one query
3. After collecting results across all searches, synthesise a prioritised recommendation plan
4. Be specific: explain WHY each module fits their exact use case
5. If no results exist for a needed capability, give 2-3 concrete hypothetical examples of what a module for that capability WOULD look like on Hackmarket (name, what it does, rough price). Make them feel real and useful, not theoretical. Then mention the user could submit one.

## Response style — STRICT
- **Default: 1-3 sentences max.** Short and direct.
- Module cards and stats grids are rendered visually by the UI — never repeat their contents in text.
- Casual greetings ("hey", "hi", "hello") = one casual sentence back. Nothing more.
- When navigating, one sentence telling them where you're sending them.
- **Use markdown formatting** — bold with **text**, bullet lists with "- item", numbered lists with "1. item". The UI renders these properly.
- **Exception — listing items or recommendations**: Use a bullet list when you enumerate 2+ tools, steps, or capabilities. Keep each bullet short (one line).
- **Exception — hypothetical examples**: When the marketplace is empty and the user asks to browse or see examples, give 2-3 hypothetical modules as a bullet list in format "- **Name** — what it does ($price)". This is the ONE case where you write more than 3 sentences.
- Never use markdown headers (##) or emoji unless the user used them first.`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

const LIVE_STATUSES = ['live', 'approved', 'sandbox_passed'];

const STOP_WORDS = new Set([
  'a','an','the','for','to','of','in','on','at','with','and','or','but','is','are',
  'do','does','did','i','we','you','my','our','your','it','its','that','this','from',
  'have','has','had','want','need','how','can','could','should','would','will',
  'app','project','build','using','use','make','get','some','any',
]);

function tokenize(query: string): string[] {
  return query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function safeArray(raw: string | null): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

function scoreModule(tokens: string[], query: string, row: typeof schema.modules.$inferSelect) {
  const lq = query.toLowerCase();
  const name = (row.name ?? '').toLowerCase();
  const desc = (row.description ?? '').toLowerCase();
  const cat = (row.category ?? '').toLowerCase();
  const stack = safeArray(row.techStack).join(' ').toLowerCase();
  const inC = (row.inputContract ?? '').toLowerCase();
  const outC = (row.outputContract ?? '').toLowerCase();
  const full = [name, desc, cat, stack, inC, outC].join(' ');

  let score = 0;
  const matched = new Set<string>();

  for (const tok of tokens) {
    if (name.includes(tok))  { score += 4; matched.add(tok); }
    if (desc.includes(tok))  { score += 3; matched.add(tok); }
    if (cat.includes(tok))   { score += 3; matched.add(tok); }
    if (stack.includes(tok)) { score += 2; matched.add(tok); }
    if (inC.includes(tok) || outC.includes(tok)) { score += 2; matched.add(tok); }
  }

  // Phrase-level bonus: if the whole query (or 3+ word segment) appears verbatim
  if (tokens.length >= 2 && full.includes(lq)) score += 6;

  // Popularity bonus so well-used modules rank slightly higher when score is tied
  score += Math.min((row.integrationCount ?? 0) * 0.1, 2);

  return { score, matched: [...matched] };
}

function toCard(dto: ReturnType<typeof toModuleDTO>): ModuleCard {
  return {
    id: dto.id, slug: dto.slug, name: dto.name, description: dto.description,
    category: dto.category, pricingModel: dto.pricingModel, price: dto.price,
    rating: dto.rating, integrationCount: dto.integrationCount,
    complexity: dto.complexity, techStack: dto.techStack,
    inputContract: dto.inputContract, outputContract: dto.outputContract,
  };
}

// ─── Tool definitions ──────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  'Auth','Payments','Notifications','Analytics',
  'AI/ML','DevOps','UI Components','Data Pipelines',
];

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_modules',
      description:
        'Search the live Hackmarket marketplace for API tools matching a capability or use-case. ' +
        'For project recommendations, call this once PER capability (e.g. separately for "auth", "payments", "analytics"). ' +
        'Do NOT merge all needs into one query — parallel searches produce better results.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Specific capability or use-case to search for (e.g. "authentication", "image analysis", "email sending")' },
          category: { type: 'string', enum: ALL_CATEGORIES, description: 'Optional: restrict to one category' },
          limit: { type: 'number', description: 'Max results (default 5, max 10)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_module_detail',
      description: 'Get full detail for a specific module by slug — pricing, input/output contract, tech stack, status.',
      parameters: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'URL-safe module slug (e.g. "home-accessibility-checker")' },
        },
        required: ['slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_modules',
      description: 'List all live marketplace modules, optionally filtered by category. Good for "show me everything" or browsing.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ALL_CATEGORIES, description: 'Optional category filter' },
          limit: { type: 'number', description: 'Max results (default 8, max 20)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_category_breakdown',
      description: 'Get a count of live modules in each category. Use this to understand what the marketplace offers before making recommendations.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_marketplace_stats',
      description: 'Get real-time platform stats: total modules, integrations, top tools, recent activity, API key count.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'navigate_to',
      description: 'Navigate the user to a page. ONLY call this when the user explicitly requests navigation ("take me to X", "open X", "go to X"). Do NOT call it proactively just because a topic is relevant.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: ['landing','discovery','submit','dashboard'] },
          reason: { type: 'string', description: 'Short reason for the user' },
        },
        required: ['page'],
      },
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────

interface ToolResult {
  content: string;
  modules?: ModuleCard[];
  stats?: StatItem[];
  action?: ChatAction;
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  // ── search_modules ──────────────────────────────────────────────────────────
  if (name === 'search_modules') {
    const query = String(args.query ?? '').trim();
    const category = args.category as string | undefined;
    const limit = Math.min(Number(args.limit ?? 5), 10);
    const tokens = tokenize(query);

    const conds: ReturnType<typeof inArray>[] = [inArray(schema.modules.status, LIVE_STATUSES)];
    if (category) conds.push(inArray(schema.modules.category, [category]));
    const rows = await db.select().from(schema.modules).where(and(...conds));

    const scored = rows.map((row) => ({ row, ...scoreModule(tokens, query, row) }));
    const filtered = tokens.length === 0
      ? scored.sort((a, b) => b.score - a.score)
      : scored.filter((r) => r.score > 0).sort((a, b) => b.score - a.score);

    const results = filtered.slice(0, limit).map((r) => toCard(toModuleDTO(r.row)));

    if (results.length === 0) {
      return { content: JSON.stringify({ found: 0, query, message: `No live modules for "${query}" yet. Describe 2-3 hypothetical examples of what such a module would look like on Hackmarket.` }), modules: [] };
    }
    const summary = results.map((m) =>
      `• ${m.name} [${m.category}] — ${m.description.slice(0, 100)} | ${m.pricingModel === 'royalty' ? `$${Math.round(m.price/100)}/mo` : `$${Math.round(m.price/100)}`}`
    ).join('\n');
    return { content: JSON.stringify({ found: results.length, query, summary }), modules: results };
  }

  // ── get_module_detail ───────────────────────────────────────────────────────
  if (name === 'get_module_detail') {
    const slug = String(args.slug ?? '');
    const rows = await db.select().from(schema.modules).where(eq(schema.modules.slug, slug));
    if (rows.length === 0) return { content: JSON.stringify({ error: `No module with slug "${slug}"` }) };
    const dto = toModuleDTO(rows[0]);
    return {
      content: JSON.stringify({
        name: dto.name, category: dto.category, description: dto.description,
        techStack: dto.techStack, inputContract: dto.inputContract, outputContract: dto.outputContract,
        pricingModel: dto.pricingModel, price: dto.price, rating: dto.rating,
        integrationCount: dto.integrationCount, complexity: dto.complexity, status: dto.status,
      }),
      modules: [toCard(dto)],
    };
  }

  // ── list_modules ────────────────────────────────────────────────────────────
  if (name === 'list_modules') {
    const category = args.category as string | undefined;
    const limit = Math.min(Number(args.limit ?? 8), 20);

    const conds: ReturnType<typeof inArray>[] = [inArray(schema.modules.status, LIVE_STATUSES)];
    if (category) conds.push(inArray(schema.modules.category, [category]));
    const rows = await db.select().from(schema.modules).where(and(...conds));
    const sorted = rows.sort((a, b) => (b.integrationCount ?? 0) - (a.integrationCount ?? 0)).slice(0, limit);
    const results = sorted.map((r) => toCard(toModuleDTO(r)));

    if (results.length === 0) {
      return { content: JSON.stringify({ found: 0, message: 'No live modules yet. Give the user 2-3 punchy hypothetical examples of tools that would fit this marketplace (name, one-line pitch, rough price). Make them feel real.' }), modules: [] };
    }
    return {
      content: JSON.stringify({ found: results.length, modules: results.map((m) => `• ${m.name} [${m.category}]`).join('\n') }),
      modules: results,
    };
  }

  // ── get_category_breakdown ──────────────────────────────────────────────────
  if (name === 'get_category_breakdown') {
    const rows = await db.select().from(schema.modules).where(inArray(schema.modules.status, LIVE_STATUSES));
    const counts: Record<string, number> = {};
    for (const cat of ALL_CATEGORIES) counts[cat] = 0;
    for (const row of rows) {
      const c = row.category ?? 'Unknown';
      counts[c] = (counts[c] ?? 0) + 1;
    }
    const breakdown = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => `${cat}: ${n} module${n !== 1 ? 's' : ''}`)
      .join('\n');
    return {
      content: JSON.stringify({ total: rows.length, breakdown }),
      stats: Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([label, value]) => ({ label, value })),
    };
  }

  // ── get_marketplace_stats ───────────────────────────────────────────────────
  if (name === 'get_marketplace_stats') {
    const [allModules, allKeys] = await Promise.all([
      db.select().from(schema.modules),
      db.select().from(schema.apiKeys),
    ]);

    const live = allModules.filter((m) => LIVE_STATUSES.includes(m.status));
    const pending = allModules.filter((m) => ['pending_sandbox_test','sandbox_running','pending_review'].includes(m.status));
    const totalIntegrations = live.reduce((s, m) => s + (m.integrationCount ?? 0), 0);
    const ratings = live.filter((m) => m.rating != null).map((m) => m.rating!);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'N/A';
    const topModules = [...live].sort((a, b) => (b.integrationCount ?? 0) - (a.integrationCount ?? 0)).slice(0, 3);
    const activeKeys = allKeys.filter((k) => k.isActive).length;

    // Category breakdown
    const catCounts: Record<string, number> = {};
    for (const m of live) { catCounts[m.category ?? 'Unknown'] = (catCounts[m.category ?? 'Unknown'] ?? 0) + 1; }
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];

    const stats: StatItem[] = [
      { label: 'Live modules', value: live.length },
      { label: 'In review', value: pending.length },
      { label: 'Total integrations', value: totalIntegrations },
      { label: 'Avg rating', value: avgRating },
      { label: 'API keys issued', value: allKeys.length },
      { label: 'Active keys', value: activeKeys },
      ...(topCat ? [{ label: `Top category`, value: `${topCat[0]} (${topCat[1]})` }] : []),
    ];

    const topList = topModules.map((m) => `• ${m.name} — ${m.integrationCount} integrations`).join('\n');
    return {
      content: JSON.stringify({
        liveModules: live.length, pendingModules: pending.length, totalModules: allModules.length,
        totalIntegrations, avgRating, apiKeysIssued: allKeys.length, activeKeys,
        topModules: topList, categoryBreakdown: catCounts,
      }),
      stats,
    };
  }

  // ── navigate_to ─────────────────────────────────────────────────────────────
  if (name === 'navigate_to') {
    const page = String(args.page ?? 'landing') as ChatAction['page'];
    return {
      content: JSON.stringify({ navigating: page, reason: args.reason }),
      action: { type: 'navigate', page },
    };
  }

  return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
}

// ─── DeepSeek call ─────────────────────────────────────────────────────────────

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

type DSMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string; tool_calls?: never }
  | { role: 'assistant'; content: null | string; tool_calls: DSToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

interface DSToolCall {
  id: string; type: 'function';
  function: { name: string; arguments: string };
}

interface DSResponse {
  choices: Array<{ message: DSMessage & { role: 'assistant' }; finish_reason: string }>;
}

async function callDeepSeek(messages: DSMessage[]): Promise<DSResponse> {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.deepseekApiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      max_tokens: 350,
      temperature: 1.0,
      stream: false,
      tools: TOOLS,
      tool_choice: 'auto',
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<DSResponse>;
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ChatBody }>('/api/chat', async (req, reply) => {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'BadRequest', message: 'messages array is required.' });
    }
    for (const m of messages) {
      if (!m.role || !m.content || typeof m.content !== 'string') {
        return reply.status(400).send({ error: 'BadRequest', message: 'Each message needs role and content.' });
      }
    }

    if (!config.deepseekApiKey) {
      return { reply: "Add DEEPSEEK_API_KEY to the backend .env to activate me!" } as ChatResponse;
    }

    let dsMessages: DSMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content } as DSMessage)),
    ];

    let collectedModules: ModuleCard[] = [];
    let collectedStats: StatItem[] | undefined;
    let collectedAction: ChatAction | undefined;
    let finalText = '';

    // Agentic loop — up to 6 rounds so multi-search recommendations can complete
    for (let round = 0; round < 6; round++) {
      const data = await callDeepSeek(dsMessages);
      const choice = data.choices[0];

      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
        dsMessages.push(choice.message);

        // Execute all tool calls in this round in parallel
        const results = await Promise.all(
          choice.message.tool_calls.map(async (tc) => {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.function.arguments); } catch { /**/ }
            req.log.info({ tool: tc.function.name, args }, 'chat tool call');
            const result = await executeTool(tc.function.name, args);

            if (result.modules?.length) collectedModules.push(...result.modules);
            if (result.stats)  collectedStats = result.stats;
            if (result.action) collectedAction = result.action;

            return { role: 'tool' as const, content: result.content, tool_call_id: tc.id };
          })
        );

        dsMessages.push(...results);
        continue; // let DeepSeek process the tool results
      }

      finalText = (typeof choice.message.content === 'string' ? choice.message.content : '').trim();
      break;
    }

    // Deduplicate modules by slug
    const seen = new Set<string>();
    const uniqueModules = collectedModules.filter((m) => {
      if (seen.has(m.slug)) return false;
      seen.add(m.slug);
      return true;
    });

    const resp: ChatResponse = {
      reply: finalText || 'Something went wrong — please try again.',
      ...(uniqueModules.length > 0 && { modules: uniqueModules }),
      ...(collectedStats && { stats: collectedStats }),
      ...(collectedAction && { action: collectedAction }),
    };

    return resp;
  });
};
